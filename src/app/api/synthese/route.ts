// src/app/api/synthese/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeElevesAvecRangs } from '@/lib/utils'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div = searchParams.get('div')
    const compo = parseInt(searchParams.get('compo') || '1')

    if (!niveau || !div) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (session.user.role === 'maitre') {
      if (session.user.niveau !== niveau || session.user.div !== div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const [eleves, matieres, notes] = await Promise.all([
      prisma.eleve.findMany({ where: { niveau, div }, orderBy: { nom: 'asc' } }),
      prisma.matiere.findMany({ where: { niveau, div, compo }, orderBy: { ordre: 'asc' } }),
      prisma.note.findMany({ where: { compo, eleve: { niveau, div } } }),
    ])

    const elevesAvecRangs = computeElevesAvecRangs(eleves as any, notes as any, matieres as any)

    const avecNote = elevesAvecRangs.filter((e) => e.moyenne !== null)
    const moyenneClasse = avecNote.length
      ? Math.round((avecNote.reduce((s, e) => s + (e.moyenne ?? 0), 0) / avecNote.length) * 100) / 100
      : null

    // Statistiques par matière (note sur 20, seuil réussite = 10/20)
    const matiereStats = matieres.map((m) => {
      const notesMat = notes
        .filter((n) => n.matiereId === m.id && n.valeur !== null)
        .map((n) => n.valeur as number)

      const moyenneClasse = notesMat.length
        ? Math.round((notesMat.reduce((s, n) => s + n, 0) / notesMat.length) * 100) / 100
        : null

      // Réussite : note >= 10/20
      const avecReussite = notesMat.filter((v) => v >= 10).length
      const pctReussite = notesMat.length
        ? Math.round((avecReussite / notesMat.length) * 100)
        : null

      return {
        matiere: m,
        moyenneClasse,
        max: notesMat.length ? Math.max(...notesMat) : null,
        min: notesMat.length ? Math.min(...notesMat) : null,
        pctReussite,
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