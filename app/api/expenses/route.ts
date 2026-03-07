import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/expenses — list all expenses for this syndic's buildings
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expenses = await prisma.expense.findMany({
      where: {
        building: { userId: user.id },
      },
      include: {
        building: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/expenses — create a new expense
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { buildingId, label, amount, category, date, notes } = await req.json();

    if (!buildingId || !label || !amount || !category || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const building = await prisma.building.findFirst({
      where: { id: buildingId, userId: user.id },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const expense = await prisma.expense.create({
      data: {
        buildingId,
        label,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        notes: notes || null,
      },
      include: {
        building: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
