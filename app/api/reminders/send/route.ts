// POST /api/reminders/send
// Sends WhatsApp payment reminders to unpaid residents.
// Body: { residentId? } | { buildingId? } | { all: true }
// Scoped to the authenticated syndic's buildings.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendPaymentReminder, buildReminderMessage } from '@/lib/reminders';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { residentId, buildingId } = await req.json();

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const buildingFilter = buildingId
      ? { userId: user.id, id: buildingId }
      : { userId: user.id };

    const unitFilter = residentId
      ? { building: buildingFilter, resident: { id: residentId } }
      : { building: buildingFilter };

    const unpaid = await prisma.payment.findMany({
      where: {
        status: { in: ['PENDING', 'LATE'] },
        month,
        year,
        unit: unitFilter,
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
            console.error('WhatsApp send failed:', e);
            status = 'FAILED';
            failed++;
          }

          await prisma.reminder.create({
            data: { residentId: resident.id, message, channel: 'WHATSAPP', status },
          });
        })
    );

    return NextResponse.json({ sent, failed, total: sent + failed });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
