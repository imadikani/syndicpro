// app/api/payments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/payments/:id — mark as paid
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { method, notes } = await req.json();

    // Verify the payment belongs to user's building
    const existing = await prisma.payment.findFirst({
      where: {
        id: params.id,
        unit: { building: { userId: user.id } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const dueDate = new Date(existing.year, existing.month - 1, 10); // due on 10th
    const now = new Date();
    const status = now > dueDate ? "LATE" : "PAID";

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        status,
        method: method || "VIREMENT",
        paidAt: now,
        notes,
      },
    });

    return NextResponse.json(payment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
