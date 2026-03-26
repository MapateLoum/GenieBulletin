// src/app/api/synthese-annuelle/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const niveau = searchParams.get('niveau')
    const div    = searchParams.get('div')

    if (!niveau || !div) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (session.user.role === 'maitre') {
      if (session.user.niveau !== niveau || session.user.div !== div) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const eleves = await prisma.eleve.findMany({
      where: { niveau, div },
      orderBy: { nom: 'asc' },
    })

    const [matieres1, matieres2, matieres3, notes1, notes2, notes3] = await Promise.all([
      prisma.matiere.findMany({ where: { niveau, div, compo: 1 } }),
      prisma.matiere.findMany({ where: { niveau, div, compo: 2 } }),
      prisma.matiere.findMany({ where: { niveau, div, compo: 3 } }),
      prisma.note.findMany({ where: { compo: 1, eleve: { niveau, div } } }),
      prisma.note.findMany({ where: { compo: 2, eleve: { niveau, div } } }),
      prisma.note.findMany({ where: { compo: 3, eleve: { niveau, div } } }),
    ])

    // Moyenne = (somme des notes / somme des barèmes) × 10
    function getMoyenneCompo(
      eleveId: number,
      notes: typeof notes1,
      matieres: typeof matieres1
    ): number | null {
      let totalPts    = 0
      let totalBareme = 0
      for (const m of matieres) {
        const note = notes.find(n => n.eleveId === eleveId && n.matiereId === m.id)
        if (note?.valeur !== undefined && note.valeur !== null) {
          totalPts    += note.valeur
          totalBareme += m.bareme
        }
      }
      if (totalBareme === 0) return null
      return Math.round((totalPts / totalBareme) * 10 * 100) / 100
    }

    const elevesAvecMoyAnnuelle = eleves.map(e => {
      const moy1 = getMoyenneCompo(e.id, notes1, matieres1)
      const moy2 = getMoyenneCompo(e.id, notes2, matieres2)
      const moy3 = getMoyenneCompo(e.id, notes3, matieres3)

      const moyennes = [moy1, moy2, moy3].filter((m): m is number => m !== null)
      const moyenneAnnuelle = moyennes.length > 0
        ? Math.round((moyennes.reduce((s, m) => s + m, 0) / moyennes.length) * 100) / 100
        : null

      const decision = moyenneAnnuelle === null
        ? null
        : moyenneAnnuelle >= 5
          ? 'Admis(e) en classe supérieure'
          : 'Redouble'

      return {
        eleveId: e.id,
        nom: e.nom,
        sexe: e.sexe,
        moyenneCompo1: moy1,
        moyenneCompo2: moy2,
        moyenneCompo3: moy3,
        moyenneAnnuelle,
        decision,
      }
    })

    // Rang annuel avec ex-æquo
    const avecMoy = elevesAvecMoyAnnuelle
      .filter(e => e.moyenneAnnuelle !== null)
      .sort((a, b) => (b.moyenneAnnuelle ?? 0) - (a.moyenneAnnuelle ?? 0))

    let rangActuel = 1
    avecMoy.forEach((e, i) => {
      if (i === 0) {
        (e as any).rangAnnuel = 1
      } else {
        if (e.moyenneAnnuelle === avecMoy[i - 1].moyenneAnnuelle) {
          (e as any).rangAnnuel = (avecMoy[i - 1] as any).rangAnnuel
        } else {
          rangActuel++
          ;(e as any).rangAnnuel = rangActuel
        }
      }
    })

    const result = elevesAvecMoyAnnuelle.map(e => ({
      ...e,
      rangAnnuel: (avecMoy.find(a => a.eleveId === e.eleveId) as any)?.rangAnnuel ?? null,
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}