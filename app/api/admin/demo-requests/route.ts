import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// GET /api/admin/demo-requests
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requests = await prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/admin/demo-requests — mark as contacted
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, contacted } = await req.json();

    const updated = await prisma.demoRequest.update({
      where: { id },
      data: { contacted },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
