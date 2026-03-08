import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// DELETE /api/admin/buildings/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const building = await prisma.building.findUnique({ where: { id: params.id } });
    if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.building.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
