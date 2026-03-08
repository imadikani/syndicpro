import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/admin/bootstrap/check — returns whether an ADMIN account exists
export async function GET() {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  return NextResponse.json({ adminExists: adminCount > 0 });
}
