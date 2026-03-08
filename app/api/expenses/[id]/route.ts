import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/expenses/:id — mark as paid / unpaid
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, building: { userId: user.id } },
    });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { isPaid } = await req.json();

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: { isPaid },
      include: { building: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/expenses/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, building: { userId: user.id } },
    });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
