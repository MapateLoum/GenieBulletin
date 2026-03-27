// src/app/api/notes/import/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const RowSchema = z.object({
  prenom: z.string(),
  nom:    z.string(),
  notes:  z.record(z.string(), z.number().nullable()),
})

const ImportBodySchema = z.object({
  niveau: z.enum(['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle']),
  div:    z.enum(['A', 'B', 'C', 'D']),
  compo:  z.number().int().min(1).max(3),
  rows:   z.array(RowSchema),
})

function peutAcceder(session: any, niveau: string, div: string): boolean {
  if (session.user.role === 'directeur') return true
  return session.user.niveau === niveau && session.user.div === div
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { niveau, div, compo, rows } = ImportBodySchema.parse(body)

    if (!peutAcceder(session, niveau, div))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const elevesDB   = await prisma.eleve.findMany({ where: { niveau, div } })
    const matieresDB = await prisma.matiere.findMany({ where: { niveau, div, compo } })

    const excelMap = new Map<string, Record<string, number | null>>()
    for (const row of rows) {
      const fullName = normalize(`${row.prenom} ${row.nom}`)
      excelMap.set(fullName, row.notes)
    }

    let count = 0
    const notFound: string[] = []

    for (const eleve of elevesDB) {
      const keyEleve = normalize(eleve.nom)
      const excelNotes = excelMap.get(keyEleve)

      if (!excelNotes) {
        notFound.push(eleve.nom)
        continue
      }

      for (const matiere of matieresDB) {
        const keyMatiere = normalize(matiere.nom)
        const noteEntry = Object.entries(excelNotes).find(
          ([k]) => normalize(k) === keyMatiere
        )
        if (!noteEntry) continue

        const valeur = noteEntry[1]
        if (valeur === null || valeur === undefined) continue

        // Validation barème (fixé à 20)
        if (valeur < 0 || valeur > 20) continue

        await prisma.note.upsert({
          where: {
            eleveId_matiereId_compo: {
              eleveId: eleve.id,
              matiereId: matiere.id,
              compo,
            },
          },
          update: { valeur },
          create: { eleveId: eleve.id, matiereId: matiere.id, compo, valeur },
        })
        count++
      }
    }

    return NextResponse.json({
      success: true,
      notes: count,
      elevesNonTrouves: notFound,
    }, { status: 201 })

  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.errors }, { status: 400 })
    console.error('[import notes]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}