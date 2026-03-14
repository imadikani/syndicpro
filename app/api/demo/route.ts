import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = "contact@orvane.ma";
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@orvane.ma";

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

    // Notify team via email
    try {
      await resend.emails.send({
        from: FROM,
        to: CONTACT_EMAIL,
        replyTo: email,
        subject: `[Orvane] Nouvelle demande de démo — ${name || email}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;">
            <h2 style="color:#7c5cbf;margin-bottom:24px;">Nouvelle demande de démo</h2>
            <table style="border-collapse:collapse;width:100%;">
              <tr><td style="padding:8px 12px;font-weight:600;color:#555;">Nom</td><td style="padding:8px 12px;">${(name || "—").replace(/</g, "&lt;")}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#555;">Email</td><td style="padding:8px 12px;">${email.replace(/</g, "&lt;")}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;color:#555;">Téléphone</td><td style="padding:8px 12px;">${(phone || "—").replace(/</g, "&lt;")}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#555;">Immeubles</td><td style="padding:8px 12px;">${buildings || "—"}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;color:#555;">Plan</td><td style="padding:8px 12px;">${(plan || "—").replace(/</g, "&lt;")}</td></tr>
              ${message ? `<tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:600;color:#555;">Message</td><td style="padding:8px 12px;white-space:pre-wrap;">${message.replace(/</g, "&lt;")}</td></tr>` : ""}
            </table>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[demo] email notification failed:", emailErr);
    }

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
