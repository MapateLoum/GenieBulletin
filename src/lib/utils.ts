// src/lib/utils.ts
import type { Matiere, Note, EleveMoyenne, Eleve, Mention } from '@/types'

export function getMoyenne(
  eleveId: number,
  notes: Note[],
  matieres: Matiere[]
): number | null {
  let totalPts    = 0
  let totalBareme = 0

  for (const m of matieres) {
    const note = notes.find(
      (n) => n.eleveId === eleveId && n.matiereId === m.id
    )
    if (note?.valeur !== undefined && note.valeur !== null) {
      totalPts    += note.valeur
      totalBareme += m.bareme
    }
  }

  if (totalBareme === 0) return null
  // Moyenne = (somme des notes / somme des barèmes) × 10
  return Math.round((totalPts / totalBareme) * 10 * 100) / 100
}

export function getMention(moy: number | null): Mention {
  if (moy === null) return { label: '—', cls: '' }
  if (moy >= 9)  return { label: 'Excellent',  cls: 'mention-excellent' }
  if (moy >= 8)  return { label: 'Très Bien',  cls: 'mention-tbi' }
  if (moy >= 7)  return { label: 'Bien',        cls: 'mention-bi' }
  if (moy >= 6)  return { label: 'Assez Bien',  cls: 'mention-ab' }
  if (moy >= 5)  return { label: 'Passable',    cls: 'mention-pc' }
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
        e.rang = avecNote[i - 1].rang  // ex-æquo, même rang
      } else {
        rangActuel++                   // rang suivant sans saut
        e.rang = rangActuel
      }
    }
  })

  return avecMoy.map((e) => ({
    ...e,
    mention: getMention(e.moyenne),
    aMoyenne: e.moyenne !== null ? e.moyenne >= 5 : false,
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