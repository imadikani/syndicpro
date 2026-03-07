// app/api/reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/reminders — send WhatsApp reminders to unpaid residents
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { buildingId, month, year, residentIds } = await req.json();

    // Find all unpaid payments for this building/month
    const unpaidPayments = await prisma.payment.findMany({
      where: {
        status: "PENDING",
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        unit: {
          building: {
            userId: user.id,
            ...(buildingId && { id: buildingId }),
          },
          resident: {
            ...(residentIds?.length && { id: { in: residentIds } }),
          },
        },
      },
      include: {
        unit: {
          include: {
            resident: true,
            building: { select: { name: true } },
          },
        },
      },
    });

    const results = await Promise.allSettled(
      unpaidPayments
        .filter((p) => p.unit.resident) // only units with a resident
        .map(async (payment) => {
          const resident = payment.unit.resident!;
          const buildingName = payment.unit.building.name;
          const monthName = new Date(payment.year, payment.month - 1).toLocaleString("fr-FR", { month: "long" });

          const message = buildWhatsAppMessage({
            residentName: resident.name.split(" ")[0],
            buildingName,
            unitNumber: payment.unit.number,
            amount: payment.amount,
            month: monthName,
            year: payment.year,
          });

          // Send via Twilio WhatsApp
          await sendWhatsApp(resident.phone, message);

          // Log reminder in DB
          await prisma.reminder.create({
            data: {
              residentId: resident.id,
              message,
              channel: "WHATSAPP",
              status: "SENT",
            },
          });

          return { residentId: resident.id, name: resident.name, phone: resident.phone };
        })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ sent, failed, total: unpaidPayments.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function buildWhatsAppMessage({
  residentName,
  buildingName,
  unitNumber,
  amount,
  month,
  year,
}: {
  residentName: string;
  buildingName: string;
  unitNumber: string;
  amount: number;
  month: string;
  year: number;
}) {
  return `Bonjour ${residentName} 👋

Nous vous rappelons que votre charge mensuelle de *${amount} MAD* pour *${buildingName}* — unité *${unitNumber}* est due pour ${month} ${year}.

Merci de procéder au paiement par virement bancaire ou de contacter votre syndic.

Cordialement,
Le syndic de votre résidence 🏢`;
}

async function sendWhatsApp(phone: string, message: string) {
  // Normalize Moroccan phone number
  const normalized = phone.replace(/\s/g, "").replace(/^0/, "+212");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:${normalized}`,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Twilio error: ${err.message}`);
  }

  return response.json();
}
