// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    console.log('[login] email:', email, '| user found:', !!user);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log('[login] password match:', valid);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    console.log('[login] JWT_SECRET present:', !!process.env.JWT_SECRET);
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const { password: _, ...safeUser } = user;

    const res = NextResponse.json({ user: safeUser, token });
    res.cookies.set("token", token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
