// src/app/api/eleves/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const EleveSchema = z.object({
  nom:    z.string().min(1).max(150),
  sexe:   z.enum(['G', 'F']),
  niveau: z.enum(['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']),
  div:    z.enum(['A', 'B']),
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div = searchParams.get('div')

    const where: Record<string, string> = {}
    if (niveau) where.niveau = niveau
    if (div) where.div = div

    const eleves = await prisma.eleve.findMany({
      where,
      orderBy: { nom: 'asc' },
    })
    return NextResponse.json(eleves)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = EleveSchema.parse(body)
    const eleve = await prisma.eleve.create({ data })
    return NextResponse.json(eleve, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
