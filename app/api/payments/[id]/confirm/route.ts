import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/reminders";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        confirmToken: token,
      },
      include: {
        unit: {
          include: {
            resident: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Invalid or already used token" },
        { status: 400 }
      );
    }

    // Set payment as confirmed/paid
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptStatus: "CONFIRMED",
        status: "PAID",
        paidAt: new Date(),
        method: "VIREMENT",
        confirmToken: null, // Single-use
      },
    });

    // Send WhatsApp to resident
    if (payment.unit.resident?.phone) {
      try {
        await sendWhatsApp(
          payment.unit.resident.phone,
          `✅ Paiement confirmé! Votre virement de ${payment.amount} MAD a été reçu et enregistré. Merci.\n\n— Orvane`
        );
      } catch (err) {
        console.error("[confirm] WhatsApp notification failed:", err);
      }
    }

    // Redirect to syndic dashboard
    return NextResponse.redirect(
      new URL("/dashboard/receipts?confirmed=true", req.url)
    );
  } catch (error) {
    console.error("[confirm] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
