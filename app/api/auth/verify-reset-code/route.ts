import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ valid: false, error: 'Missing fields' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ valid: false, error: 'Code invalide ou expiré' });

    const reset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) return NextResponse.json({ valid: false, error: 'Code invalide ou expiré' });

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error('[verify-reset-code]', err);
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
