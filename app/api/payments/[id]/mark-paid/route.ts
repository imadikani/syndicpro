import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/reminders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "SYNDIC" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: paymentId } = await params;
    const { forceNoReceipt } = await req.json();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        unit: {
          include: {
            building: true,
            resident: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify syndic owns this building
    if (payment.unit.building.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Already paid
    if (payment.status === "PAID") {
      return NextResponse.json(
        { error: "Payment already marked as paid" },
        { status: 400 }
      );
    }

    // If no receipt and not forcing, ask for confirmation
    const hasReceipt = payment.receiptStatus === "APPROVED_PENDING_RECEIPT";
    if (!hasReceipt && !forceNoReceipt) {
      return NextResponse.json({
        requiresConfirmation: true,
        missingReceipt: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          receiptStatus: payment.receiptStatus,
          receiptAiData: payment.receiptAiData,
          resident: payment.unit.resident
            ? { name: payment.unit.resident.name }
            : null,
          unit: payment.unit.number,
        },
      });
    }

    // Mark as paid
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        method: "VIREMENT",
        receiptStatus: hasReceipt ? "CONFIRMED" : payment.receiptStatus,
        confirmToken: null,
        disputeToken: null,
      },
    });

    // Write audit log
    await prisma.paymentAuditLog.create({
      data: {
        paymentId,
        syndicId: user.id,
        action: hasReceipt
          ? "confirmed_with_receipt"
          : "manual_override_no_receipt",
        reason: hasReceipt ? undefined : "syndic_manual",
        metadata: hasReceipt
          ? {
              confidence:
                (payment.receiptAiData as Record<string, unknown>)?.confidence ?? null,
            }
          : undefined,
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
        console.error("[mark-paid] WhatsApp notification failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[mark-paid] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
