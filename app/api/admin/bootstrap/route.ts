import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/admin/bootstrap
// Elevates the calling user to ADMIN — only works if no ADMIN exists yet.
// Delete this file after first use.
export async function POST(req: NextRequest) {
  try {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount > 0) {
      return NextResponse.json({ error: "An ADMIN already exists. Endpoint disabled." }, { status: 403 });
    }

    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Must be logged in." }, { status: 401 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    return NextResponse.json({ ok: true, message: `${user.email} is now ADMIN.` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
