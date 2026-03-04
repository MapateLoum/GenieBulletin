// src/app/api/matieres/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const MatiereSchema = z.object({
  nom:    z.string().min(1).max(100),
  coef:   z.number().int().min(1).max(10),
  bareme: z.number().int(),
})

export async function GET() {
  try {
    const matieres = await prisma.matiere.findMany({ orderBy: { ordre: 'asc' } })
    return NextResponse.json(matieres)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = MatiereSchema.parse(body)
    const count = await prisma.matiere.count()
    const matiere = await prisma.matiere.create({ data: { ...data, ordre: count + 1 } })
    return NextResponse.json(matiere, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
