import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_EMAIL = 'contact@orvane.ma';
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@orvane.ma';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ error: 'Email et message requis' }, { status: 400 });
    }

    await resend.emails.send({
      from: FROM,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[Orvane Contact] Message de ${name || email}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;">
          <p><strong>De :</strong> ${name || '—'} (${email})</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
          <p style="white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
