import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/expenses/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify expense belongs to this user's building
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
