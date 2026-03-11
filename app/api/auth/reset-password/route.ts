import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword, confirmPassword } = await req.json();

    if (!email || !code || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });

    const reset = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
