// app/api/buildings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/buildings — list all buildings for logged-in syndic
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const buildings = await prisma.building.findMany({
      where: { userId: user.id },
      include: {
        units: {
          include: {
            resident: true,
            payments: {
              where: {
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
              },
            },
          },
        },
        expenses: {
          orderBy: { date: "desc" },
          take: 5,
        },
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute collection stats per building
    const enriched = buildings.map((b) => {
      const allPayments = b.units.flatMap((u) => u.payments);
      const totalExpected = allPayments.reduce((s, p) => s + p.amount, 0);
      const totalCollected = allPayments
        .filter((p) => p.status === "PAID" || p.status === "LATE")
        .reduce((s, p) => s + p.amount, 0);
      const collectionRate =
        totalExpected > 0
          ? Math.round((totalCollected / totalExpected) * 100)
          : 0;

      return { ...b, stats: { totalExpected, totalCollected, collectionRate } };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/buildings — create a new building
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, address, city, totalUnits, monthlyFee, color } = await req.json();

    if (!name || !address || !city || !totalUnits || !monthlyFee) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const building = await prisma.building.create({
      data: {
        name,
        address,
        city,
        totalUnits: parseInt(totalUnits),
        monthlyFee: parseFloat(monthlyFee),
        color: color || "#4F8EF7",
        userId: user.id,
      },
    });

    // Auto-create unit records if totalUnits provided
    // (syndic can rename them later)
    await prisma.unit.createMany({
      data: Array.from({ length: parseInt(totalUnits) }, (_, i) => ({
        buildingId: building.id,
        number: `${i + 1}`,
        monthlyFee: parseFloat(monthlyFee),
      })),
    });

    return NextResponse.json(building, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
