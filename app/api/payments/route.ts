// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildPeriodLabel } from "@/lib/billing";

// GET /api/payments?buildingId=xxx&month=3&year=2026
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const payments = await prisma.payment.findMany({
      where: {
        ...(month && { month: parseInt(month) }),
        ...(year && { year: parseInt(year) }),
        unit: {
          ...(buildingId && { buildingId }),
          building: { userId: user.id }, // only their buildings
        },
      },
      include: {
        unit: {
          include: {
            resident: true,
            building: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/payments — generate monthly payments for a building
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { buildingId, month, year } = await req.json();

    // Verify ownership
    const building = await prisma.building.findFirst({
      where: { id: buildingId, userId: user.id },
      include: { units: true },
    });

    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const label = buildPeriodLabel('MONTHLY', month, year);

    // Create payment records for all units (skip if already exists)
    const created = await Promise.allSettled(
      building.units.map((unit) =>
        prisma.payment.upsert({
          where: {
            unitId_year_month_billingPeriod: {
              unitId: unit.id, year, month, billingPeriod: 'MONTHLY',
            },
          },
          create: {
            unitId:        unit.id,
            month,
            year,
            chargeMonth:   month,
            billingPeriod: 'MONTHLY',
            periodLabel:   label,
            amount:        unit.monthlyFee || building.monthlyFee,
            status:        "PENDING",
          },
          update: {}, // don't overwrite if exists
        })
      )
    );

    const successCount = created.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ created: successCount }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
