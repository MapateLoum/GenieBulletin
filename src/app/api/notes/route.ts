// src/app/api/notes/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const NoteSchema = z.object({
  eleveId:   z.number().int(),
  matiereId: z.number().int(),
  compo:     z.number().int().min(1).max(3),
  valeur:    z.number().nullable(),
})

const BulkNotesSchema = z.array(NoteSchema)

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
    const div = searchParams.get('div')
    const compo = searchParams.get('compo')

    if (!niveau || !div || !compo) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (!peutAcceder(session, niveau, div)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const data = NoteSchema.parse(body)

    // Vérifier que l'élève appartient à la classe du maître
    if (session.user.role === 'maitre') {
      const eleve = await prisma.eleve.findUnique({ where: { id: data.eleveId } })
      if (!eleve || eleve.niveau !== session.user.niveau || eleve.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    // Validation du barème côté serveur — filet de sécurité
    if (data.valeur !== null) {
      const matiere = await prisma.matiere.findUnique({ where: { id: data.matiereId } })
      if (!matiere) {
        return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
      }
      if (data.valeur < 0 || data.valeur > matiere.bareme) {
        return NextResponse.json(
          { error: `Note invalide : la valeur doit être entre 0 et ${matiere.bareme}` },
          { status: 400 }
        )
      }
    }

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

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const notes = BulkNotesSchema.parse(body)

    // Vérifier accès pour chaque note (on prend le premier élève comme référence)
    if (session.user.role === 'maitre' && notes.length > 0) {
      const eleve = await prisma.eleve.findUnique({ where: { id: notes[0].eleveId } })
      if (!eleve || eleve.niveau !== session.user.niveau || eleve.div !== session.user.div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    // Validation des barèmes pour chaque note côté serveur
    const matiereIds = [...new Set(notes.map(n => n.matiereId))]
    const matieres = await prisma.matiere.findMany({
      where: { id: { in: matiereIds } },
    })
    const matiereMap = new Map(matieres.map(m => [m.id, m]))

    for (const data of notes) {
      if (data.valeur !== null) {
        const matiere = matiereMap.get(data.matiereId)
        if (!matiere) {
          return NextResponse.json({ error: `Matière ${data.matiereId} introuvable` }, { status: 404 })
        }
        if (data.valeur < 0 || data.valeur > matiere.bareme) {
          return NextResponse.json(
            { error: `Note invalide pour "${matiere.nom}" : max ${matiere.bareme}` },
            { status: 400 }
          )
        }
      }
    }

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
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div    = searchParams.get('div')
    const compo  = Number(searchParams.get('compo'))

    if (!niveau || !div || !compo)
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    if (!peutAcceder(session, niveau, div))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const matieres = await prisma.matiere.findMany({
      where: { niveau, div, compo },
      select: { id: true },
    })
    const matiereIds = matieres.map(m => m.id)

    const { count } = await prisma.note.deleteMany({
      where: { matiereId: { in: matiereIds }, compo },
    })

    return NextResponse.json({ success: true, deleted: count })
  } catch (e) {
    console.error('[delete notes]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}