import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return { user: null, status: 401 as const };
  if (user.role !== "ADMIN") return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}

// GET /api/admin/buildings — list all buildings across all syndics
export async function GET(req: NextRequest) {
  try {
    const { user: admin, status } = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });

    const buildings = await prisma.building.findMany({
      include: {
        managedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { units: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(buildings);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/admin/buildings — create building for a specific syndic
export async function POST(req: NextRequest) {
  try {
    const { user: admin, status } = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status });

    const { name, address, city, totalUnits, monthlyFee, color, syndicId } = await req.json();

    if (!name || !address || !city || !totalUnits || !monthlyFee || !syndicId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const syndic = await prisma.user.findUnique({ where: { id: syndicId } });
    if (!syndic) return NextResponse.json({ error: "Syndic not found" }, { status: 404 });

    const building = await prisma.building.create({
      data: {
        name,
        address,
        city,
        totalUnits: parseInt(totalUnits),
        monthlyFee: parseFloat(monthlyFee),
        color: color || "#7b5ea7",
        userId: syndicId,
      },
    });

    // Auto-create unit slots
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
