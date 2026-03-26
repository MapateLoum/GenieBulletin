// src/app/api/eleves/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const EleveSchema = z.object({
  nom:    z.string().min(1).max(150),
  sexe:   z.enum(['G', 'F']),
  niveau: z.enum(['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2']),
  div:    z.enum(['A', 'B']),
})

function peutAcceder(session: any, niveau: string, div: string): boolean {
  if (session.user.role === 'directeur') return true
  return session.user.niveau === niveau && session.user.div === div
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div    = searchParams.get('div')

    if (session.user.role === 'maitre') {
      if (!niveau || !div || !peutAcceder(session, niveau, div)) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const where: Record<string, string> = {}
    if (niveau) where.niveau = niveau
    if (div)    where.div    = div

    const eleves = await prisma.eleve.findMany({
      where,
      // orderBy: { nom: 'asc' },
    })
    return NextResponse.json(eleves)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const data = EleveSchema.parse(body)

    if (!peutAcceder(session, data.niveau, data.div)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const eleve = await prisma.eleve.create({ data })
    return NextResponse.json(eleve, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div    = searchParams.get('div')

    if (!niveau || !div)
      return NextResponse.json({ error: 'niveau et div requis' }, { status: 400 })

    if (!peutAcceder(session, niveau, div))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { count } = await prisma.eleve.deleteMany({ where: { niveau, div } })
    return NextResponse.json({ success: true, count })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}