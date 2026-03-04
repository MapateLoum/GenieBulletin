// src/app/api/synthese/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMoyenne, getMention, computeElevesAvecRangs } from '@/lib/utils'

// GET /api/synthese?niveau=CI&div=A&compo=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div = searchParams.get('div')
    const compo = parseInt(searchParams.get('compo') || '1')

    if (!niveau || !div) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Récupérer tout le nécessaire
    const [eleves, matieres, notes] = await Promise.all([
      prisma.eleve.findMany({ where: { niveau, div }, orderBy: { nom: 'asc' } }),
      prisma.matiere.findMany({ orderBy: { ordre: 'asc' } }),
      prisma.note.findMany({
        where: { compo, eleve: { niveau, div } },
      }),
    ])

    const elevesAvecRangs = computeElevesAvecRangs(eleves as any, notes as any, matieres as any)

    const avecNote = elevesAvecRangs.filter((e) => e.moyenne !== null)
    const moyenneClasse = avecNote.length
      ? Math.round((avecNote.reduce((s, e) => s + (e.moyenne ?? 0), 0) / avecNote.length) * 100) / 100
      : null

    // Stats par matière
    const matiereStats = matieres.map((m) => {
      const notesMat = notes.filter((n) => n.matiereId === m.id && n.valeur !== null).map((n) => n.valeur as number)
      return {
        matiere: m,
        moyenneClasse: notesMat.length ? Math.round((notesMat.reduce((s, n) => s + n, 0) / notesMat.length) * 100) / 100 : null,
        max: notesMat.length ? Math.max(...notesMat) : null,
        min: notesMat.length ? Math.min(...notesMat) : null,
      }
    })

    return NextResponse.json({
      eleves: elevesAvecRangs,
      stats: {
        effectif: eleves.length,
        moyenneClasse,
        avecMoyenne: elevesAvecRangs.filter((e) => e.aMoyenne).length,
        sansMoyenne: elevesAvecRangs.filter((e) => e.moyenne !== null && !e.aMoyenne).length,
        maxMoyenne: avecNote.length ? Math.max(...avecNote.map((e) => e.moyenne ?? 0)) : null,
        minMoyenne: avecNote.length ? Math.min(...avecNote.map((e) => e.moyenne ?? 0)) : null,
      },
      matiereStats,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
