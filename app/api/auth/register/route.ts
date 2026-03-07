// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, phone, password: hashed, role: "SYNDIC" },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    const res = NextResponse.json({ user, token }, { status: 201 });
    res.cookies.set("token", token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
