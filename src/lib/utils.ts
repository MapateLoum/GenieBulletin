// src/lib/utils.ts
import type { Matiere, Note, EleveMoyenne, Eleve, Mention } from '@/types'

/**
 * Calcule la moyenne d'un élève pour une composition.
 *
 * Formule lycée (barème fixe /20) :
 *   1. Moyenne par matière = somme des notes / nombre de notes   (→ /20)
 *   2. Moyenne générale    = Σ(moy_matière × coef) / Σ(coef)    (→ /20)
 *
 * Si une matière n'a aucune note saisie, elle est ignorée dans le calcul.
 */
export function getMoyenne(
  eleveId: number,
  notes: Note[],
  matieres: Matiere[]
): number | null {
  let totalPonderes = 0
  let totalCoefs    = 0

  for (const m of matieres) {
    // Toutes les notes de l'élève pour cette matière (une seule en général)
    const notesMat = notes.filter(
      (n) => n.eleveId === eleveId && n.matiereId === m.id && n.valeur !== null && n.valeur !== undefined
    )
    if (notesMat.length === 0) continue

    // Moyenne de la matière sur 20
    const somme = notesMat.reduce((s, n) => s + (n.valeur as number), 0)
    const moyMat = somme / notesMat.length   // barème fixe 20, donc déjà sur 20

    const coef = m.coef ?? 1
    totalPonderes += moyMat * coef
    totalCoefs    += coef
  }

  if (totalCoefs === 0) return null
  return Math.round((totalPonderes / totalCoefs) * 100) / 100
}

/**
 * Mentions calibrées sur 20.
 */
export function getMention(moy: number | null): Mention {
  if (moy === null) return { label: '—', cls: '' }
  if (moy >= 18) return { label: 'Excellent',  cls: 'mention-excellent' }
  if (moy >= 16) return { label: 'Très Bien',  cls: 'mention-tbi' }
  if (moy >= 14) return { label: 'Bien',        cls: 'mention-bi' }
  if (moy >= 12) return { label: 'Assez Bien',  cls: 'mention-ab' }
  if (moy >= 10) return { label: 'Passable',    cls: 'mention-pc' }
  return { label: 'Insuffisant', cls: 'mention-insuf' }
}

export function computeElevesAvecRangs(
  eleves: Eleve[],
  notes: Note[],
  matieres: Matiere[]
): EleveMoyenne[] {
  const avecMoy = eleves.map((e) => ({
    ...e,
    moyenne: getMoyenne(e.id, notes, matieres),
    rang: null as number | null,
    mention: getMention(null),
    aMoyenne: false,
  }))

  const avecNote = avecMoy
    .filter((e) => e.moyenne !== null)
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))

  // Ex-æquo : même moyenne = même rang, rang suivant sans saut
  let rangActuel = 1
  avecNote.forEach((e, i) => {
    if (i === 0) {
      e.rang = 1
    } else {
      if (e.moyenne === avecNote[i - 1].moyenne) {
        e.rang = avecNote[i - 1].rang
      } else {
        rangActuel++
        e.rang = rangActuel
      }
    }
  })

  return avecMoy.map((e) => ({
    ...e,
    mention: getMention(e.moyenne),
    // Moyenne de passage : 10/20
    aMoyenne: e.moyenne !== null ? e.moyenne >= 10 : false,
  }))
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const NIVEAUX = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'] as const
export const DIVISIONS = ['A', 'B', 'C', 'D'] as const
export const COMPOS = [1, 2, 3] as const
export const COMPO_LABELS: Record<number, string> = {
  1: '1ère Composition',
  2: '2ème Composition',
  3: '3ème Composition',
}