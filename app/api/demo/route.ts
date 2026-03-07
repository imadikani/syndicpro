import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, buildings, plan, message } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const existing = await prisma.demoRequest.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Déjà enregistré. Nous vous contacterons bientôt." },
        { status: 200 }
      );
    }

    const demo = await prisma.demoRequest.create({
      data: {
        name: name || null,
        email,
        phone: phone || null,
        buildings: buildings ? parseInt(buildings) : null,
        plan: plan || null,
        message: message || null,
      },
    });

    return NextResponse.json({ success: true, id: demo.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const demos = await prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(demos);
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
