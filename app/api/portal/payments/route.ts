import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalResident } from "@/lib/portal-auth";

// GET /api/portal/payments — full payment history for this resident
export async function GET(req: NextRequest) {
  try {
    const resident = await getPortalResident(req);
    if (!resident) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payments = await prisma.payment.findMany({
      where: { unitId: resident.unit.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(payments);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
