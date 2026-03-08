import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SyndicPro database...');

  // ── USER ──────────────────────────────────────────────────────────────────
  const hashed = await bcrypt.hash('syndicpro2026', 10);
  const user = await prisma.user.upsert({
    where: { email: 'imad@syndicpro.ma' },
    update: {},
    create: {
      email: 'imad@syndicpro.ma',
      name: 'Imad Ikani',
      phone: '+212 6 00 00 00 00',
      password: hashed,
      role: 'ADMIN',
    },
  });
  console.log('✓ User:', user.email);

  // ── BUILDINGS ─────────────────────────────────────────────────────────────
  const b1 = await prisma.building.upsert({
    where: { id: 'seed-b1' },
    update: {},
    create: {
      id: 'seed-b1',
      name: 'Résidence Al Andalous',
      address: '12 Rue Ibn Battouta, Maarif',
      city: 'Casablanca',
      totalUnits: 18,
      monthlyFee: 350,
      color: '#7b5ea7',
      userId: user.id,
    },
  });

  const b2 = await prisma.building.upsert({
    where: { id: 'seed-b2' },
    update: {},
    create: {
      id: 'seed-b2',
      name: 'Résidence Safae',
      address: '45 Bd Anfa',
      city: 'Casablanca',
      totalUnits: 12,
      monthlyFee: 450,
      color: '#e8906a',
      userId: user.id,
    },
  });

  const b3 = await prisma.building.upsert({
    where: { id: 'seed-b3' },
    update: {},
    create: {
      id: 'seed-b3',
      name: 'Immeuble Atlas',
      address: '8 Rue Moulay Youssef, Gauthier',
      city: 'Casablanca',
      totalUnits: 24,
      monthlyFee: 280,
      color: '#34d399',
      userId: user.id,
    },
  });
  console.log('✓ Buildings: Al Andalous, Safae, Atlas');

  // ── UNITS & RESIDENTS ─────────────────────────────────────────────────────
  const residentsData = [
    // Al Andalous
    { buildingId: b1.id, unit: 'A3', name: 'Karim Benali',     phone: '+212 6 61 23 45 67', isOwner: true,  status: 'PAID',    paidAt: new Date('2026-03-03') },
    { buildingId: b1.id, unit: 'B1', name: 'Fatima Idrissi',   phone: '+212 6 62 34 56 78', isOwner: false, status: 'PENDING', paidAt: null },
    { buildingId: b1.id, unit: 'C2', name: 'Omar Tazi',        phone: '+212 6 63 45 67 89', isOwner: true,  status: 'PAID',    paidAt: new Date('2026-03-01') },
    { buildingId: b1.id, unit: 'A1', name: 'Nadia Cherkaoui',  phone: '+212 6 64 56 78 90', isOwner: false, status: 'LATE',    paidAt: null },
    { buildingId: b1.id, unit: 'D4', name: 'Hassan Moussaoui', phone: '+212 6 65 67 89 01', isOwner: true,  status: 'PAID',    paidAt: new Date('2026-03-02') },
    { buildingId: b1.id, unit: 'B3', name: 'Leila Bensouda',   phone: '+212 6 66 78 90 12', isOwner: true,  status: 'PENDING', paidAt: null },
    // Résidence Safae
    { buildingId: b2.id, unit: '101', name: 'Youssef Alami',   phone: '+212 6 67 89 01 23', isOwner: true,  status: 'PAID',    paidAt: new Date('2026-03-04') },
    { buildingId: b2.id, unit: '202', name: 'Sara Rhalmi',     phone: '+212 6 68 90 12 34', isOwner: false, status: 'PENDING', paidAt: null },
    { buildingId: b2.id, unit: '301', name: 'Mehdi Chraibi',   phone: '+212 6 69 01 23 45', isOwner: true,  status: 'PAID',    paidAt: new Date('2026-03-02') },
    { buildingId: b2.id, unit: '102', name: 'Amina Tahiri',    phone: '+212 6 70 12 34 56', isOwner: false, status: 'LATE',    paidAt: null },
    // Immeuble Atlas
    { buildingId: b3.id, unit: 'E1', name: 'Rachid Berrada',   phone: '+212 6 71 23 45 67', isOwner: true,  status: 'PAID',    paidAt: new Date('2026-03-01') },
    { buildingId: b3.id, unit: 'F2', name: 'Zineb Fassi',      phone: '+212 6 72 34 56 78', isOwner: true,  status: 'PENDING', paidAt: null },
    { buildingId: b3.id, unit: 'G3', name: 'Amine Kettani',    phone: '+212 6 73 45 67 89', isOwner: false, status: 'PAID',    paidAt: new Date('2026-03-03') },
    { buildingId: b3.id, unit: 'H4', name: 'Houda Lahlou',     phone: '+212 6 74 56 78 90', isOwner: true,  status: 'LATE',    paidAt: null },
    { buildingId: b3.id, unit: 'E3', name: 'Tariq Benjelloun', phone: '+212 6 75 67 89 01', isOwner: false, status: 'PAID',    paidAt: new Date('2026-03-05') },
    { buildingId: b3.id, unit: 'F4', name: 'Meryem Squalli',   phone: '+212 6 76 78 90 12', isOwner: true,  status: 'PENDING', paidAt: null },
  ];

  const buildings = { [b1.id]: b1, [b2.id]: b2, [b3.id]: b3 };

  for (const r of residentsData) {
    const building = buildings[r.buildingId];
    const unit = await prisma.unit.upsert({
      where: { buildingId_number: { buildingId: r.buildingId, number: r.unit } },
      update: {},
      create: { number: r.unit, buildingId: r.buildingId },
    });

    const resident = await prisma.resident.upsert({
      where: { unitId: unit.id },
      update: {},
      create: {
        name: r.name,
        phone: r.phone,
        isOwner: r.isOwner,
        unitId: unit.id,
      },
    });

    // Payment for March 2026
    await prisma.payment.upsert({
      where: { unitId_month_year: { unitId: unit.id, month: 3, year: 2026 } },
      update: {},
      create: {
        unitId: unit.id,
        month: 3,
        year: 2026,
        amount: building.monthlyFee,
        status: r.status as any,
        method: r.status === 'PAID' || r.status === 'LATE' ? 'CASH' : null,
        paidAt: r.paidAt,
      },
    });

    // Reminder for unpaid residents
    if (r.status !== 'PAID') {
      const existing = await prisma.reminder.findFirst({ where: { residentId: resident.id } });
      if (!existing) {
        await prisma.reminder.create({
          data: {
            residentId: resident.id,
            channel: 'WHATSAPP',
            status: r.status === 'LATE' ? 'DELIVERED' : 'SENT',
            message: r.status === 'LATE'
              ? `Rappel J+10 : Votre charge de ${building.monthlyFee} MAD pour Mars 2026 est en retard.`
              : `Rappel J+5 : Votre charge de ${building.monthlyFee} MAD pour Mars 2026 est due.`,
          },
        });
      }
    }
  }
  console.log('✓ Units, Residents, Payments, Reminders seeded');

  // ── EXPENSES ──────────────────────────────────────────────────────────────
  const expenses = [
    { buildingId: b1.id, label: 'Entretien ascenseur',              category: 'ENTRETIEN',   amount: 1200, date: new Date('2026-02-28'), dueDate: new Date('2026-03-05'), isPaid: true  },
    { buildingId: b1.id, label: 'Facture électricité parties comm.', category: 'ELECTRICITE', amount: 780,  date: new Date('2026-03-01'), dueDate: new Date('2026-03-10'), isPaid: true  },
    { buildingId: b2.id, label: 'Gardien — Mars',                   category: 'SECURITE',    amount: 2500, date: new Date('2026-03-01'), dueDate: new Date('2026-03-01'), isPaid: true  },
    { buildingId: b3.id, label: 'Réparation toiture',               category: 'REPARATION',  amount: 4500, date: new Date('2026-02-25'), dueDate: new Date('2026-03-01'), isPaid: true  },
    { buildingId: b2.id, label: 'Assurance immeuble',               category: 'ASSURANCE',   amount: 3200, date: new Date('2026-02-15'), dueDate: new Date('2026-02-28'), isPaid: true  },
    { buildingId: b3.id, label: 'Eau parties communes',             category: 'EAU',         amount: 430,  date: new Date('2026-03-05'), dueDate: new Date('2026-03-15'), isPaid: true  },
    // Example overdue (past due date, not yet paid) — triggers warning icon
    { buildingId: b1.id, label: 'Contrat nettoyage — Avril',        category: 'ENTRETIEN',   amount: 950,  date: new Date('2026-03-01'), dueDate: new Date('2026-03-05'), isPaid: false },
  ];

  for (const e of expenses) {
    await prisma.expense.create({ data: { ...e, category: e.category as any } });
  }
  console.log('✓ Expenses seeded');

  console.log('\n✅ Seed complete! Database is ready.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
