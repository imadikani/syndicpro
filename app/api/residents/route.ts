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
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, phone, email, isOwner, unitId } = await req.json();

    if (!name || !phone || !unitId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify unit belongs to user's building
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, building: { userId: user.id } },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const resident = await prisma.resident.create({
      data: { name, phone, email, isOwner: isOwner || false, unitId },
    });

    return NextResponse.json(resident, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Unit already has a resident" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
