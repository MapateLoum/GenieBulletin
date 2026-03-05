// src/app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export async function POST(req: Request) {
  try {
    const { email, code, nouveau } = z.object({
      email:   z.string().email(),
      code:    z.string().length(6),
      nouveau: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
    }).parse(await req.json())

    // Trouver le token valide
    const resetToken = await prisma.resetToken.findFirst({
      where: {
        email,
        token:     code,
        used:      false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // Marquer le token comme utilisé
    await prisma.resetToken.update({
      where: { id: resetToken.id },
      data:  { used: true },
    })

    // Mettre à jour le mot de passe
    const hash = await bcrypt.hash(nouveau, 12)
    await prisma.user.update({
      where: { email },
      data:  { password: hash },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}