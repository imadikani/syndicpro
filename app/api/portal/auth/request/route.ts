import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function sendWhatsApp(phone: string, message: string) {
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

async function sendSms(phone: string, message: string) {
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
        From: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER!,
        To: normalized,
        Body: message,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Twilio SMS error: ${err.message}`);
  }
  return response.json();
}

// POST /api/portal/auth/request
export async function POST(req: NextRequest) {
  try {
    const { phone, channel = "whatsapp" } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
    }

    const normalized = phone.replace(/\s/g, "").replace(/^0/, "+212");

    // Check resident exists with this phone
    const resident = await prisma.resident.findFirst({
      where: { phone: { contains: normalized.slice(-9) } },
      include: { unit: { include: { building: true } } },
    });

    if (!resident) {
      // Return success anyway to avoid phone enumeration
      return NextResponse.json({ success: true });
    }

    // Generate 4-digit PIN
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pinHash = await bcrypt.hash(pin, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this phone
    await prisma.residentOtp.updateMany({
      where: { phone: normalized, used: false },
      data: { used: true },
    });

    await prisma.residentOtp.create({
      data: { phone: normalized, pinHash, expiresAt },
    });

    const message = `🏢 SyndicPro\n\nVotre code de connexion est : *${pin}*\n\nValable 10 minutes. Ne le partagez avec personne.`;

    try {
      if (channel === "sms") {
        await sendSms(resident.phone, message);
      } else {
        await sendWhatsApp(resident.phone, message);
      }
    } catch (sendErr) {
      // If WhatsApp fails, try SMS as fallback
      if (channel !== "sms") {
        try {
          await sendSms(resident.phone, message);
        } catch {
          console.error("Both WhatsApp and SMS failed:", sendErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
