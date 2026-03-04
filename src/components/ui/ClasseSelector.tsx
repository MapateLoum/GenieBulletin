'use client'
// src/components/ui/ClasseSelector.tsx
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
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
  const { data: session } = useSession()
  const isMaitre = session?.user?.role === 'maitre'

  // Forcer le maître sur sa propre classe dès le montage
  useEffect(() => {
    if (isMaitre && session?.user?.niveau && session?.user?.div) {
      if (niveau !== session.user.niveau) onNiveauChange(session.user.niveau as Niveau)
      if (div !== session.user.div) onDivChange(session.user.div as Division)
    }
  }, [isMaitre, session?.user?.niveau, session?.user?.div])

  // Maître : affichage figé
  if (isMaitre) {
    return (
      <>
        <span style={{
          padding: '6px 14px', borderRadius: 8, background: 'var(--vert)',
          color: '#fff', fontWeight: 700, fontSize: '0.88rem',
        }}>
          Classe {session?.user?.niveau}{session?.user?.div}
        </span>
        {showCompo && onCompoChange && (
          <select value={compo} onChange={(e) => onCompoChange(parseInt(e.target.value))} style={{ width: 'auto' }}>
            {COMPOS.map((c) => <option key={c} value={c}>{COMPO_LABELS[c]}</option>)}
          </select>
        )}
      </>
    )
  }

  // Directeur : sélecteur complet
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