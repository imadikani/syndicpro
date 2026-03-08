import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// DELETE /api/admin/syndics/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (target.role === "ADMIN") return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/admin/syndics/:id — update name/phone/password
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, phone } = await req.json();

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { ...(name && { name }), ...(phone !== undefined && { phone }) },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
