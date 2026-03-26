// src/app/api/matieres/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const MatiereSchema = z.object({
  nom:    z.string().min(1).max(100),
  bareme: z.number().int().min(1),
})

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    let niveau = searchParams.get('niveau')
    let div    = searchParams.get('div')
    const compoParam = searchParams.get('compo')
    const compo = compoParam ? parseInt(compoParam) : undefined

    if (session.user.role === 'maitre') {
      niveau = session.user.niveau
      div    = session.user.div
    }

    const where: Record<string, any> = {}
    if (niveau) where.niveau = niveau
    if (div)    where.div    = div
    if (compo)  where.compo  = compo

    const matieres = await prisma.matiere.findMany({
      where,
      orderBy: { ordre: 'asc' },
    })
    return NextResponse.json(matieres)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const data = MatiereSchema.parse(body)

    let niveau: string
    let div: string
    const compo: number = body.compo ?? 1

    if (session.user.role === 'maitre') {
      niveau = session.user.niveau!
      div    = session.user.div!
    } else {
      niveau = body.niveau
      div    = body.div
      if (!niveau || !div) {
        return NextResponse.json({ error: 'niveau et div requis' }, { status: 400 })
      }
    }

    // Vérification unicité
    const existing = await prisma.matiere.findFirst({
      where: {
        nom:    { equals: data.nom.trim(), mode: 'insensitive' },
        niveau,
        div,
        compo,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: `La matière "${data.nom}" existe déjà dans cette classe pour cette composition.` },
        { status: 409 }
      )
    }

    const count = await prisma.matiere.count({ where: { niveau, div, compo } })
    const matiere = await prisma.matiere.create({
      data: {
        nom:    data.nom.trim(),
        bareme: data.bareme,
        niveau,
        div,
        compo,
        ordre: count + 1,
      },
    })
    return NextResponse.json(matiere, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}