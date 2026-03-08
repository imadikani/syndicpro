// POST /api/cron/generate-charges
// Generates PENDING payment records for the current month for every occupied unit
// across all buildings. Safe to call multiple times — skips units that already
// have a charge this month (enforced by the unique(unitId, month, year) constraint).
// Protected by CRON_SECRET. Intended to run on the 1st of each month at midnight UTC.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const month = parseInt(req.nextUrl.searchParams.get('month') ?? '') || now.getMonth() + 1;
    const year = parseInt(req.nextUrl.searchParams.get('year') ?? '') || now.getFullYear();

    // Fetch all buildings with their occupied units and per-unit fee overrides
    const buildings = await prisma.building.findMany({
      select: {
        id: true,
        name: true,
        monthlyFee: true,
        units: {
          where: { resident: { isNot: null } }, // occupied units only
          select: {
            id: true,
            monthlyFee: true, // unit-level override, nullable
          },
        },
      },
    });

    // Build a flat list of { unitId, amount } for every occupied unit
    const candidates: { unitId: string; amount: number }[] = [];
    for (const building of buildings) {
      for (const unit of building.units) {
        candidates.push({
          unitId: unit.id,
          amount: unit.monthlyFee ?? building.monthlyFee,
        });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, month, year });
    }

    // Find which units already have a payment this month
    const existing = await prisma.payment.findMany({
      where: {
        unitId: { in: candidates.map((c) => c.unitId) },
        month,
        year,
      },
      select: { unitId: true },
    });
    const existingUnitIds = new Set(existing.map((p) => p.unitId));

    const toCreate = candidates.filter((c) => !existingUnitIds.has(c.unitId));
    const skipped = candidates.length - toCreate.length;

    // Batch insert — skipDuplicates as a safety net for race conditions
    const result = await prisma.payment.createMany({
      data: toCreate.map((c) => ({
        unitId: c.unitId,
        month,
        year,
        amount: c.amount,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });

    const created = result.count;

    console.log(
      `[cron/generate-charges] ${month}/${year} — ${created} created, ${skipped} skipped`
    );

    return NextResponse.json({ created, skipped, month, year });
  } catch (err) {
    console.error('[cron/generate-charges] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
