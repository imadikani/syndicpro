// POST /api/cron/generate-charges
// Generates payment records for all occupied units across all buildings.
// Supports MONTHLY (default), QUARTERLY, and ANNUAL billing periods.
// Safe to call multiple times — skips units that already have a charge
// for the same period (enforced by unique[unitId, year, month, billingPeriod]).
//
// Query params:
//   ?month=4&year=2026&period=MONTHLY    → April 2026 (default)
//   ?month=4&year=2026&period=QUARTERLY  → Q2 2026, amount × 3
//   ?year=2026&period=ANNUAL             → Année 2026, amount × 12
//
// Protected by CRON_SECRET. Intended to run on the 1st of each month at 00:00 UTC.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildPeriodLabel } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const rawMonth = parseInt(req.nextUrl.searchParams.get('month') ?? '') || now.getMonth() + 1;
    const year     = parseInt(req.nextUrl.searchParams.get('year')  ?? '') || now.getFullYear();
    const period   = (req.nextUrl.searchParams.get('period') ?? 'MONTHLY').toUpperCase();

    // Resolve the internal `month` key, display `chargeMonth`, and amount multiplier
    let month: number;
    let chargeMonth: number | null;
    let amountMultiplier: number;

    if (period === 'ANNUAL') {
      month            = 0;          // sentinel — annual charges have no calendar month
      chargeMonth      = null;
      amountMultiplier = 12;
    } else if (period === 'QUARTERLY') {
      const q = Math.ceil(rawMonth / 3);
      month            = (q - 1) * 3 + 1; // first month of the quarter
      chargeMonth      = month;
      amountMultiplier = 3;
    } else {
      // MONTHLY (default)
      month            = rawMonth;
      chargeMonth      = rawMonth;
      amountMultiplier = 1;
    }

    const periodLabel = buildPeriodLabel(period, month === 0 ? 1 : month, year);

    // Fetch all buildings with occupied units and fee overrides
    const buildings = await prisma.building.findMany({
      select: {
        id: true,
        monthlyFee: true,
        units: {
          where: { resident: { isNot: null } },
          select: { id: true, monthlyFee: true },
        },
      },
    });

    const candidates: { unitId: string; amount: number }[] = [];
    for (const building of buildings) {
      for (const unit of building.units) {
        const base = unit.monthlyFee ?? building.monthlyFee;
        candidates.push({ unitId: unit.id, amount: base * amountMultiplier });
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, month, year, period, periodLabel });
    }

    // Find units that already have a charge for this period
    const existing = await prisma.payment.findMany({
      where: {
        unitId:        { in: candidates.map((c) => c.unitId) },
        year,
        month,
        billingPeriod: period,
      },
      select: { unitId: true },
    });
    const existingSet = new Set(existing.map((p) => p.unitId));

    const toCreate = candidates.filter((c) => !existingSet.has(c.unitId));
    const skipped  = candidates.length - toCreate.length;

    const result = await prisma.payment.createMany({
      data: toCreate.map((c) => ({
        unitId:        c.unitId,
        month,
        year,
        chargeMonth,
        billingPeriod: period,
        periodLabel,
        amount:        c.amount,
        status:        'PENDING' as const,
      })),
      skipDuplicates: true,
    });

    const created = result.count;

    console.log(
      `[cron/generate-charges] ${period} ${periodLabel} — ${created} created, ${skipped} skipped`
    );

    return NextResponse.json({ created, skipped, period, periodLabel, month, year });
  } catch (err) {
    console.error('[cron/generate-charges] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
