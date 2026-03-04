// src/app/api/appreciations/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ApprSchema = z.object({
  eleveId: z.number().int(),
  compo:   z.number().int().min(1).max(3),
  texte:   z.string(),
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
    const eleveId = searchParams.get('eleveId')
    const compo = searchParams.get('compo')
    const niveau = searchParams.get('niveau')
    const div = searchParams.get('div')

    // Vérifier accès si niveau/div fournis
    if (niveau && div && !peutAcceder(session, niveau, div)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const where: Record<string, unknown> = {}
    if (eleveId) where.eleveId = parseInt(eleveId)
    if (compo) where.compo = parseInt(compo)
    if (niveau && div) where.eleve = { niveau, div }

    const apprs = await prisma.appreciation.findMany({ where })
    return NextResponse.json(apprs)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const data = ApprSchema.parse(body)

    // Vérifier que l'élève appartient à la classe du maître
    if (session.user.role === 'maitre') {
      const eleve = await prisma.eleve.findUnique({ where: { id: data.eleveId } })
      if (!eleve || eleve.niveau !== session.user.niveau || eleve.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const appr = await prisma.appreciation.upsert({
      where: { eleveId_compo: { eleveId: data.eleveId, compo: data.compo } },
      update: { texte: data.texte },
      create: data,
    })

    return NextResponse.json(appr)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}