// prisma/seed.ts
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SyndicPro database...");

  // Create admin syndic user
  const hashedPassword = await bcrypt.hash("syndic123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@syndicpro.ma" },
    update: {},
    create: {
      email: "admin@syndicpro.ma",
      name: "Mohammed Alami",
      phone: "+212 6 12 34 56 78",
      password: hashedPassword,
      role: "SYNDIC",
    },
  });
  console.log("✅ User created:", user.email);

  // Building 1
  const building1 = await prisma.building.upsert({
    where: { id: "building-1" },
    update: {},
    create: {
      id: "building-1",
      name: "Résidence Al Andalous",
      address: "Bd Zerktouni",
      city: "Casablanca",
      totalUnits: 4,
      monthlyFee: 350,
      color: "#4F8EF7",
      userId: user.id,
    },
  });

  // Building 2
  const building2 = await prisma.building.upsert({
    where: { id: "building-2" },
    update: {},
    create: {
      id: "building-2",
      name: "Immeuble Safae",
      address: "Hay Riad",
      city: "Rabat",
      totalUnits: 3,
      monthlyFee: 250,
      color: "#34D399",
      userId: user.id,
    },
  });

  console.log("✅ Buildings created");

  // Units + Residents for Building 1
  const b1residents = [
    { unit: "A1", name: "Karim Benali", phone: "+212 6 11 22 33 44", email: "k.benali@gmail.com" },
    { unit: "A2", name: "Fatima Zahra Idrissi", phone: "+212 6 55 66 77 88", email: "fz.idrissi@gmail.com" },
    { unit: "B1", name: "Omar Tazi", phone: "+212 6 99 00 11 22", email: "omar.tazi@hotmail.com" },
    { unit: "B2", name: "Nadia Cherkaoui", phone: "+212 6 33 44 55 66", email: "n.cherkaoui@gmail.com" },
  ];

  for (const r of b1residents) {
    const unit = await prisma.unit.upsert({
      where: { buildingId_number: { buildingId: building1.id, number: r.unit } },
      update: {},
      create: { buildingId: building1.id, number: r.unit, monthlyFee: 350 },
    });
    await prisma.resident.upsert({
      where: { unitId: unit.id },
      update: {},
      create: { unitId: unit.id, name: r.name, phone: r.phone, email: r.email },
    });
  }

  // Units + Residents for Building 2
  const b2residents = [
    { unit: "1A", name: "Youssef Alami", phone: "+212 6 77 88 99 00", email: "y.alami@gmail.com" },
    { unit: "2B", name: "Samira Fassi", phone: "+212 6 22 33 44 55", email: "s.fassi@outlook.com" },
    { unit: "3C", name: "Hassan Belkadi", phone: "+212 6 66 77 88 99", email: "h.belkadi@gmail.com" },
  ];

  for (const r of b2residents) {
    const unit = await prisma.unit.upsert({
      where: { buildingId_number: { buildingId: building2.id, number: r.unit } },
      update: {},
      create: { buildingId: building2.id, number: r.unit, monthlyFee: 250 },
    });
    await prisma.resident.upsert({
      where: { unitId: unit.id },
      update: {},
      create: { unitId: unit.id, name: r.name, phone: r.phone, email: r.email },
    });
  }

  console.log("✅ Units and residents created");

  // Generate payments for Jan, Feb, Mar 2026
  const allUnits = await prisma.unit.findMany({
    where: { buildingId: { in: [building1.id, building2.id] } },
  });

  for (const unit of allUnits) {
    for (const month of [1, 2, 3]) {
      const paid = Math.random() > 0.3;
      await prisma.payment.upsert({
        where: { unitId_month_year: { unitId: unit.id, month, year: 2026 } },
        update: {},
        create: {
          unitId: unit.id,
          month,
          year: 2026,
          amount: unit.monthlyFee || 300,
          status: paid ? "PAID" : "PENDING",
          method: paid ? (Math.random() > 0.5 ? "VIREMENT" : "CMI") : null,
          paidAt: paid ? new Date(2026, month - 1, Math.floor(Math.random() * 15) + 1) : null,
        },
      });
    }
  }

  console.log("✅ Payments seeded");

  // Sample expenses
  await prisma.expense.createMany({
    skipDuplicates: true,
    data: [
      { buildingId: building1.id, label: "Nettoyage escaliers", amount: 1200, category: "ENTRETIEN", date: new Date("2026-03-05") },
      { buildingId: building1.id, label: "Réparation ascenseur", amount: 3500, category: "REPARATION", date: new Date("2026-02-12") },
      { buildingId: building2.id, label: "Gardien février", amount: 2000, category: "SECURITE", date: new Date("2026-02-01") },
    ],
  });

  console.log("✅ Expenses seeded");
  console.log("\n🎉 Seed complete! Login: admin@syndicpro.ma / syndic123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
