// src/app/api/me/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  nom: z.string().min(1).max(100),
})

// GET /api/me — récupérer son propre profil
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true, nom: true, email: true, role: true, niveau: true, div: true },
  })

  return NextResponse.json(user)
}

// PUT /api/me — mettre à jour son propre nom
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await req.json()
    const { nom } = UpdateSchema.parse(body)

    const user = await prisma.user.update({
      where: { email: session.user.email! },
      data: { nom },
      select: { id: true, nom: true, email: true, role: true, niveau: true, div: true },
    })

    return NextResponse.json(user)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}