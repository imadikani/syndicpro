// app/api/residents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/residents?buildingId=xxx
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");

    const residents = await prisma.resident.findMany({
      where: {
        unit: {
          building: {
            userId: user.id,
            ...(buildingId && { id: buildingId }),
          },
        },
      },
      include: {
        unit: {
          include: {
            building: { select: { id: true, name: true, color: true } },
            payments: {
              where: {
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(residents);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/residents — add a resident to a unit
// Accepts { name, phone, isOwner, buildingId, unitNumber }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, phone, isOwner, buildingId, unitNumber } = await req.json();

    if (!name || !phone || !buildingId || !unitNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify building belongs to this user
    const building = await prisma.building.findFirst({
      where: { id: buildingId, userId: user.id },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    // Find or create the unit
    const unit = await prisma.unit.upsert({
      where: { buildingId_number: { buildingId, number: unitNumber } },
      update: {},
      create: { buildingId, number: unitNumber },
    });

    // Create resident (one per unit)
    const resident = await prisma.resident.create({
      data: { name, phone, isOwner: isOwner ?? false, unitId: unit.id },
    });

    // Create a PENDING payment for the current month
    const now = new Date();
    await prisma.payment.upsert({
      where: { unitId_year_month_billingPeriod: { unitId: unit.id, year: now.getFullYear(), month: now.getMonth() + 1, billingPeriod: 'MONTHLY' } },
      update: {},
      create: {
        unitId: unit.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        chargeMonth: now.getMonth() + 1,
        billingPeriod: 'MONTHLY',
        amount: building.monthlyFee,
        status: "PENDING",
      },
    });

    return NextResponse.json(resident, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Cette unité a déjà un résident" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
