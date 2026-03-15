import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/reminders";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Query all payments pending confirmation for 3+ days
    const pendingPayments = await prisma.payment.findMany({
      where: {
        receiptStatus: "APPROVED_PENDING_RECEIPT",
        approvedAt: { lt: threeDaysAgo },
      },
      include: {
        unit: {
          include: {
            building: {
              include: {
                managedBy: true,
              },
            },
            resident: true,
          },
        },
      },
    });

    if (pendingPayments.length === 0) {
      return NextResponse.json({ message: "No pending receipts", sent: 0 });
    }

    // Group by syndic
    const bySyndic = new Map<
      string,
      {
        syndic: { id: string; phone: string | null; name: string; lastBatchNotifiedAt: Date | null };
        payments: typeof pendingPayments;
      }
    >();

    for (const payment of pendingPayments) {
      const syndic = payment.unit.building.managedBy;
      if (!bySyndic.has(syndic.id)) {
        bySyndic.set(syndic.id, { syndic, payments: [] });
      }
      bySyndic.get(syndic.id)!.payments.push(payment);
    }

    let sentCount = 0;

    for (const [syndicId, { syndic, payments }] of bySyndic) {
      // Check lastBatchNotifiedAt — skip if already notified today
      if (syndic.lastBatchNotifiedAt) {
        const today = new Date();
        const lastNotified = new Date(syndic.lastBatchNotifiedAt);
        if (
          lastNotified.getDate() === today.getDate() &&
          lastNotified.getMonth() === today.getMonth() &&
          lastNotified.getFullYear() === today.getFullYear()
        ) {
          console.log(`[check-pending] Skipping syndic ${syndicId} — already notified today`);
          continue;
        }
      }

      if (!syndic.phone) {
        console.log(`[check-pending] Skipping syndic ${syndicId} — no phone`);
        continue;
      }

      // Group payments by building
      const byBuilding = new Map<string, typeof payments>();
      for (const p of payments) {
        const bName = p.unit.building.name;
        if (!byBuilding.has(bName)) byBuilding.set(bName, []);
        byBuilding.get(bName)!.push(p);
      }

      // Build message
      let totalAmount = 0;
      let totalCount = 0;
      let message = "🔔 Virements en attente de confirmation\n";

      for (const [buildingName, bPayments] of byBuilding) {
        message += `\n[${buildingName}]:\n`;
        for (const p of bPayments) {
          const residentName = p.unit.resident?.name || "Résident";
          const unit = p.unit.number;
          const daysAgo = Math.floor(
            (Date.now() - (p.approvedAt?.getTime() || Date.now())) /
              (1000 * 60 * 60 * 24)
          );
          message += ` • ${residentName}, Appt ${unit} — ${p.amount} MAD (il y a ${daysAgo} jours)\n`;
          totalAmount += p.amount;
          totalCount++;
        }
      }

      message += `\nTotal: ${totalCount} virement${totalCount > 1 ? "s" : ""} — ${totalAmount.toLocaleString()} MAD`;
      message += "\n👉 Confirmer: orvane.ma/dashboard/receipts";

      try {
        await sendWhatsApp(syndic.phone, message);
        sentCount++;

        // Update lastBatchNotifiedAt
        await prisma.user.update({
          where: { id: syndicId },
          data: { lastBatchNotifiedAt: new Date() },
        });
      } catch (err) {
        console.error(`[check-pending] Failed to notify syndic ${syndicId}:`, err);
      }
    }

    return NextResponse.json({
      message: `Notified ${sentCount} syndic(s)`,
      sent: sentCount,
      pendingPayments: pendingPayments.length,
    });
  } catch (error) {
    console.error("[check-pending-receipts] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
