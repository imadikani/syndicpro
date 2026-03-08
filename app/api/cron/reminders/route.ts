// POST /api/cron/reminders
// Automated monthly reminder endpoint — sends WhatsApp reminders to ALL
// unpaid residents across ALL buildings. Protected by CRON_SECRET.
// Intended to be called by Railway cron on the 1st, 10th, and 15th of each month.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPaymentReminder, buildReminderMessage } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const unpaid = await prisma.payment.findMany({
      where: {
        status: { in: ['PENDING', 'LATE'] },
        month,
        year,
      },
      include: {
        unit: {
          include: {
            resident: true,
            building: { select: { name: true } },
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      unpaid
        .filter((p) => p.unit.resident)
        .map(async (p) => {
          const resident = p.unit.resident!;
          const message = buildReminderMessage(
            { name: resident.name, phone: resident.phone },
            { amount: p.amount, month: p.month, year: p.year },
            { name: p.unit.building.name, unitNumber: p.unit.number }
          );

          let status: 'SENT' | 'FAILED' = 'SENT';
          try {
            await sendPaymentReminder(
              { name: resident.name, phone: resident.phone },
              { amount: p.amount, month: p.month, year: p.year },
              { name: p.unit.building.name, unitNumber: p.unit.number }
            );
            sent++;
          } catch (e) {
            console.error('Cron WhatsApp send failed:', e);
            status = 'FAILED';
            failed++;
          }

          await prisma.reminder.create({
            data: { residentId: resident.id, message, channel: 'WHATSAPP', status },
          });
        })
    );

    console.log(`[cron/reminders] ${sent} sent, ${failed} failed for ${month}/${year}`);
    return NextResponse.json({ sent, failed, total: sent + failed, month, year });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
