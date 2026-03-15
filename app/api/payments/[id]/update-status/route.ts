import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { status, reason } = await req.json();

    const allowedStatuses = ["WAIVED", "DISPUTE", "APPROVED_PENDING_RECEIPT"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status transition" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        unit: {
          include: {
            building: true,
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

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status === "WAIVED") {
      updateData.status = "WAIVED";
      updateData.receiptStatus = null;
    } else if (status === "DISPUTE") {
      updateData.receiptStatus = "DISPUTE";
    } else if (status === "APPROVED_PENDING_RECEIPT") {
      updateData.receiptStatus = "APPROVED_PENDING_RECEIPT";
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });

    // Write audit log
    await prisma.paymentAuditLog.create({
      data: {
        paymentId,
        syndicId: user.id,
        action: `status_change_to_${status.toLowerCase()}`,
        reason: reason || undefined,
        metadata: {
          previousStatus: payment.status,
          previousReceiptStatus: payment.receiptStatus,
          newStatus: status,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[update-status] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
