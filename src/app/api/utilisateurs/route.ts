// src/app/api/utilisateurs/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const UserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
  nom:      z.string().min(1),
  role:     z.enum(['maitre', 'directeur']),
  niveau:   z.string().nullable().optional(),
  div:      z.string().nullable().optional(),
})

// Vérifier que c'est le directeur
async function checkDirecteur() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'directeur') return false
  return true
}

export async function GET() {
  if (!await checkDirecteur()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, nom: true, role: true, niveau: true, div: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  if (!await checkDirecteur()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const data = UserSchema.parse(body)
    const hash = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: {
        email:    data.email,
        password: hash,
        nom:      data.nom,
        role:     data.role,
        niveau:   data.role === 'maitre' ? data.niveau ?? null : null,
        div:      data.role === 'maitre' ? data.div ?? null : null,
      },
      select: { id: true, email: true, nom: true, role: true, niveau: true, div: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Email déjà utilisé ou erreur serveur' }, { status: 500 })
  }
}