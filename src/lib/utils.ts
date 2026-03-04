// src/lib/utils.ts
import type { Matiere, Note, EleveMoyenne, Eleve, Mention } from '@/types'

export function getMoyenne(
  eleveId: number,
  notes: Note[],
  matieres: Matiere[]
): number | null {
  let totalPts = 0
  let totalCoef = 0

  for (const m of matieres) {
    const note = notes.find(
      (n) => n.eleveId === eleveId && n.matiereId === m.id
    )
    if (note?.valeur !== undefined && note.valeur !== null) {
      totalPts += (note.valeur / m.bareme) * 20 * m.coef
      totalCoef += m.coef
    }
  }

  if (totalCoef === 0) return null
  return Math.round((totalPts / totalCoef) * 100) / 100
}

export function getMention(moy: number | null): Mention {
  if (moy === null) return { label: '—', cls: '' }
  if (moy >= 18) return { label: 'Excellent', cls: 'mention-excellent' }
  if (moy >= 16) return { label: 'Très Bien', cls: 'mention-tbi' }
  if (moy >= 14) return { label: 'Bien', cls: 'mention-bi' }
  if (moy >= 12) return { label: 'Assez Bien', cls: 'mention-ab' }
  if (moy >= 10) return { label: 'Passable', cls: 'mention-pc' }
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

  // Calculer les rangs
  const avecNote = avecMoy
    .filter((e) => e.moyenne !== null)
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))

  avecNote.forEach((e, i) => {
    e.rang = i + 1
  })

  return avecMoy.map((e) => ({
    ...e,
    mention: getMention(e.moyenne),
    aMoyenne: e.moyenne !== null ? e.moyenne >= 10 : false,
  }))
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const NIVEAUX = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] as const
export const DIVISIONS = ['A', 'B'] as const
export const COMPOS = [1, 2, 3] as const
export const COMPO_LABELS: Record<number, string> = {
  1: '1ère Composition',
  2: '2ème Composition',
  3: '3ème Composition',
}
