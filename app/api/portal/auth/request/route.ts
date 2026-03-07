import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp, sendSms, normalizePhone } from "@/lib/twilio";
import bcrypt from "bcryptjs";

// POST /api/portal/auth/request
export async function POST(req: NextRequest) {
  try {
    const { phone, channel = "whatsapp" } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    // Check resident exists — match by last 8 digits, stripping spaces from both sides
    const last8 = normalized.replace(/\s/g, "").slice(-8);
    const candidates = await prisma.resident.findMany({
      select: { id: true, phone: true },
    });
    const matched = candidates.find(r => r.phone.replace(/\s/g, "").endsWith(last8));
    const resident = matched
      ? await prisma.resident.findUnique({ where: { id: matched.id } })
      : null;

    if (!resident) {
      return NextResponse.json({ success: true });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this phone
    await prisma.residentOtp.updateMany({
      where: { phone: normalized, used: false },
      data: { used: true },
    });

    await prisma.residentOtp.create({
      data: { phone: normalized, pinHash: otpHash, expiresAt },
    });

    const message = `Votre code SyndicPro est : ${otp}. Valide 10 minutes.`;

    try {
      if (channel === "sms") {
        await sendSms(normalized, message);
      } else {
        await sendWhatsApp(normalized, message);
      }
    } catch (sendErr) {
      // WhatsApp failed — fall back to SMS
      if (channel !== "sms") {
        try {
          await sendSms(normalized, message);
        } catch {
          console.error("Both WhatsApp and SMS failed:", sendErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
