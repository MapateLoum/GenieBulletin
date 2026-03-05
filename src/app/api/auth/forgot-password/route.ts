// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendResetCode } from '@/lib/mail'
import { z } from 'zod'

function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(await req.json())

    const user = await prisma.user.findUnique({ where: { email } })

    // Répondre toujours succès pour ne pas révéler si l'email existe
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Invalider les anciens tokens de cet email
    await prisma.resetToken.updateMany({
      where: { email, used: false },
      data:  { used: true },
    })

    // Créer un nouveau token
    const code = genCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

    await prisma.resetToken.create({
      data: { email, token: code, expiresAt },
    })

    await sendResetCode({ to: email, nom: user.nom, code })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}