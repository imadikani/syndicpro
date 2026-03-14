import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { sendWhatsApp } from '@/lib/reminders';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@orvane.ma';

// Generic success — never reveal whether email exists
const OK = NextResponse.json({ success: true });

export async function POST(req: NextRequest) {
  try {
    const { email, method } = await req.json();
    if (!email || !method) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // Only ADMIN / SYNDIC can reset via this flow
    if (!user || user.role === 'RESIDENT') return OK;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.create({
      data: { userId: user.id, code, method, expiresAt },
    });

    if (method === 'EMAIL') {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Votre code de réinitialisation Orvane',
        html: buildEmailHtml(code),
      });
    } else if (method === 'WHATSAPP') {
      if (!user.phone) return OK;
      await sendWhatsApp(
        user.phone,
        `Votre code de réinitialisation Orvane : *${code}*. Valide 15 minutes.`
      );
    }

    return OK;
  } catch (err) {
    console.error('[forgot-password]', err);
    return OK; // never reveal errors to caller
  }
}

function buildEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#16131f;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#16131f;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1d1a2e;border-radius:20px;border:1px solid rgba(196,181,244,0.12);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(196,181,244,0.08);">
            <div style="font-size:22px;font-weight:600;color:#e8e0ff;letter-spacing:0.3px;">orvane</div>
            <div style="font-size:9px;color:rgba(196,181,244,0.4);letter-spacing:2px;text-transform:uppercase;margin-top:3px;">by Orvane Labs</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 32px;">
            <p style="margin:0 0 8px;font-size:15px;color:rgba(255,255,255,0.7);font-weight:300;">Bonjour,</p>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.55);font-weight:300;line-height:1.6;">
              Voici votre code de réinitialisation de mot de passe&nbsp;:
            </p>
            <!-- Code block -->
            <div style="background:rgba(124,92,191,0.12);border:1px solid rgba(124,92,191,0.3);border-radius:14px;padding:28px 20px;text-align:center;margin-bottom:32px;">
              <div style="font-size:48px;font-weight:700;letter-spacing:12px;color:#c4b5f4;font-family:'DM Sans',Arial,sans-serif;">${code}</div>
            </div>
            <p style="margin:0 0 10px;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.6;">
              Ce code expire dans <strong style="color:rgba(255,255,255,0.6);">15 minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.3);line-height:1.6;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(196,181,244,0.08);text-align:center;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">© 2026 Orvane by Orvane Labs</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
