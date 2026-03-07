import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signPortalToken } from "@/lib/portal-auth";
import bcrypt from "bcryptjs";

// POST /api/portal/auth/verify
export async function POST(req: NextRequest) {
  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "Téléphone et code requis" }, { status: 400 });
    }

    const normalized = phone.replace(/\s/g, "").replace(/^0/, "+212");

    // Find valid OTP
    const otp = await prisma.residentOtp.findFirst({
      where: {
        phone: normalized,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });
    }

    const valid = await bcrypt.compare(pin, otp.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Code incorrect" }, { status: 401 });
    }

    // Mark OTP as used
    await prisma.residentOtp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    // Find resident by phone — strip spaces from both sides for matching
    const last8 = normalized.replace(/\s/g, "").slice(-8);
    const candidates = await prisma.resident.findMany({ select: { id: true, phone: true } });
    const matched = candidates.find(r => r.phone.replace(/\s/g, "").endsWith(last8));

    if (!matched) {
      return NextResponse.json({ error: "Résident introuvable" }, { status: 404 });
    }

    const resident = await prisma.resident.findUnique({
      where: { id: matched.id },
      include: { unit: { include: { building: true } } },
    });

    if (!resident) {
      return NextResponse.json({ error: "Résident introuvable" }, { status: 404 });
    }

    const token = signPortalToken({ residentId: resident.id, phone: normalized });

    const res = NextResponse.json({
      token,
      resident: {
        id: resident.id,
        name: resident.name,
        phone: resident.phone,
        unit: resident.unit.number,
        building: resident.unit.building.name,
        buildingId: resident.unit.buildingId,
      },
    });

    res.cookies.set("portal_token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
