// src/app/api/notes/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const NoteSchema = z.object({
  eleveId:   z.number().int(),
  matiereId: z.number().int(),
  compo:     z.number().int().min(1).max(3),
  valeur:    z.number().nullable(),
})

const BulkNotesSchema = z.array(NoteSchema)

// GET /api/notes?niveau=CI&div=A&compo=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div = searchParams.get('div')
    const compo = searchParams.get('compo')

    if (!niveau || !div || !compo) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Récupérer les notes des élèves de cette classe/compo
    const notes = await prisma.note.findMany({
      where: {
        compo: parseInt(compo),
        eleve: { niveau, div },
      },
      include: { eleve: true, matiere: true },
    })

    return NextResponse.json(notes)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/notes — Upsert une note
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = NoteSchema.parse(body)

    const note = await prisma.note.upsert({
      where: {
        eleveId_matiereId_compo: {
          eleveId: data.eleveId,
          matiereId: data.matiereId,
          compo: data.compo,
        },
      },
      update: { valeur: data.valeur },
      create: data,
    })

    return NextResponse.json(note)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/notes — Upsert en masse
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const notes = BulkNotesSchema.parse(body)

    const results = await Promise.all(
      notes.map((data) =>
        prisma.note.upsert({
          where: {
            eleveId_matiereId_compo: {
              eleveId: data.eleveId,
              matiereId: data.matiereId,
              compo: data.compo,
            },
          },
          update: { valeur: data.valeur },
          create: data,
        })
      )
    )

    return NextResponse.json(results)
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
