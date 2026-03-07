import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalResident } from "@/lib/portal-auth";

// GET /api/portal/me — current resident profile + active payment
export async function GET(req: NextRequest) {
  try {
    const resident = await getPortalResident(req);
    if (!resident) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentPayment = await prisma.payment.findFirst({
      where: {
        unitId: resident.unit.id,
        month: currentMonth,
        year: currentYear,
      },
    });

    return NextResponse.json({
      id: resident.id,
      name: resident.name,
      phone: resident.phone,
      isOwner: resident.isOwner,
      unit: resident.unit.number,
      buildingId: resident.unit.buildingId,
      building: {
        id: resident.unit.building.id,
        name: resident.unit.building.name,
        address: resident.unit.building.address,
        city: resident.unit.building.city,
        color: resident.unit.building.color,
      },
      currentPayment: currentPayment
        ? {
            id: currentPayment.id,
            month: currentPayment.month,
            year: currentPayment.year,
            amount: currentPayment.amount,
            status: currentPayment.status,
            paidAt: currentPayment.paidAt,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
