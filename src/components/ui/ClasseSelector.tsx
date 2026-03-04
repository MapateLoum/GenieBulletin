'use client'
// src/components/ui/ClasseSelector.tsx
import { NIVEAUX, DIVISIONS, COMPO_LABELS, COMPOS } from '@/lib/utils'
import type { Niveau, Division } from '@/types'

interface ClasseSelectorProps {
  niveau: Niveau
  div: Division
  compo?: number
  onNiveauChange: (v: Niveau) => void
  onDivChange: (v: Division) => void
  onCompoChange?: (v: number) => void
  showCompo?: boolean
}

export default function ClasseSelector({
  niveau, div, compo, onNiveauChange, onDivChange, onCompoChange, showCompo = false,
}: ClasseSelectorProps) {
  return (
    <>
      <select value={niveau} onChange={(e) => onNiveauChange(e.target.value as Niveau)} style={{ width: 'auto' }}>
        {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={div} onChange={(e) => onDivChange(e.target.value as Division)} style={{ width: 'auto' }}>
        {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      {showCompo && onCompoChange && (
        <select value={compo} onChange={(e) => onCompoChange(parseInt(e.target.value))} style={{ width: 'auto' }}>
          {COMPOS.map((c) => <option key={c} value={c}>{COMPO_LABELS[c]}</option>)}
        </select>
      )}
    </>
  )
}
