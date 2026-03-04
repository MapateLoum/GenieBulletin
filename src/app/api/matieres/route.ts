// src/app/api/matieres/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const MatiereSchema = z.object({
  nom:    z.string().min(1).max(100),
  coef:   z.number().int().min(1).max(10),
  bareme: z.number().int(),
})

function getClasseFromSession(session: any) {
  return {
    niveau: session.user.niveau as string,
    div:    session.user.div as string,
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    let niveau = searchParams.get('niveau')
    let div    = searchParams.get('div')

    // Maître : forcer sa propre classe
    if (session.user.role === 'maitre') {
      niveau = session.user.niveau
      div    = session.user.div
    }

    const where: Record<string, string> = {}
    if (niveau) where.niveau = niveau
    if (div)    where.div    = div

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

    // Déterminer niveau/div selon le rôle
    let niveau: string
    let div: string

    if (session.user.role === 'maitre') {
      niveau = session.user.niveau!
      div    = session.user.div!
    } else {
      // Directeur doit passer niveau/div dans le body
      niveau = body.niveau
      div    = body.div
      if (!niveau || !div) {
        return NextResponse.json({ error: 'niveau et div requis' }, { status: 400 })
      }
    }

    const count = await prisma.matiere.count({ where: { niveau, div } })
    const matiere = await prisma.matiere.create({
      data: { ...data, niveau, div, ordre: count + 1 },
    })
    return NextResponse.json(matiere, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}