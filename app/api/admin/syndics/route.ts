import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return null;
  if (user.role !== "ADMIN") return null;
  return user;
}

// GET /api/admin/syndics — list all syndic accounts
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const syndics = await prisma.user.findMany({
      where: { role: "SYNDIC" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { buildings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(syndics);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/admin/syndics — create a new syndic account
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const syndic = await prisma.user.create({
      data: { name, email, password: hashed, phone: phone || null, role: "SYNDIC" },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });

    return NextResponse.json(syndic, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
