// src/app/api/eleves/import/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const EleveImportSchema = z.object({
  nom:    z.string().min(1).max(150),
  sexe:   z.enum(['G', 'F']),
  niveau: z.enum(['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle']),
  div:    z.enum(['A', 'B', 'C', 'D']),
})

const ImportBodySchema = z.object({
  eleves: z.array(EleveImportSchema).min(1).max(200),
})

function peutAcceder(session: any, niveau: string, div: string): boolean {
  if (session.user.role === 'directeur') return true
  return session.user.niveau === niveau && session.user.div === div
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { eleves } = ImportBodySchema.parse(body)

    const niveaux = [...new Set(eleves.map(e => e.niveau))]
    const divs    = [...new Set(eleves.map(e => e.div))]

    if (niveaux.length > 1 || divs.length > 1) {
      return NextResponse.json(
        { error: 'Tous les élèves doivent appartenir à la même classe' },
        { status: 400 },
      )
    }

    if (!peutAcceder(session, niveaux[0], divs[0])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const result = await prisma.eleve.createMany({
      data: eleves,
      skipDuplicates: false,
    })

    return NextResponse.json({ success: true, count: result.count }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}