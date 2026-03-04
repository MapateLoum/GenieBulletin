'use client'
// src/app/(dashboard)/notes/page.tsx
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import type { Niveau, Division, Eleve, Matiere, Note } from '@/types'

export default function NotesPage() {
  const qc = useQueryClient()
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [compo, setCompo] = useState(1)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const { data: eleves = [] } = useQuery<Eleve[]>({
    queryKey: ['eleves', niveau, div],
queryFn: async () => {
  const r = await fetch(`/api/eleves?niveau=${niveau}&div=${div}`)
  if (!r.ok) return []
  return r.json()
},  })

  const { data: matieres = [] } = useQuery<Matiere[]>({
  queryKey: ['matieres', niveau, div],
  queryFn: () => fetch(`/api/matieres?niveau=${niveau}&div=${div}`).then(r => r.json()),
})

  const { data: notes = [], refetch } = useQuery<Note[]>({
    queryKey: ['notes', niveau, div, compo],
    queryFn: () => fetch(`/api/notes?niveau=${niveau}&div=${div}&compo=${compo}`).then(r => r.json()),
    enabled: eleves.length > 0,
  })

  // Indexed notes for fast lookup: eleveId-matiereId => valeur
  const notesMap: Record<string, number | null> = {}
  notes.forEach(n => { notesMap[`${n.eleveId}-${n.matiereId}`] = n.valeur })

  function handleNoteChange(eleveId: number, matiereId: number, rawVal: string, bareme: number) {
    const key = `${eleveId}-${matiereId}-${compo}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const val = rawVal === '' ? null : parseFloat(rawVal)
      if (val !== null && (val < 0 || val > bareme)) {
        toast.error(`Note invalide (max ${bareme})`)
        return
      }
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eleveId, matiereId, compo, valeur: val }),
      })
      qc.invalidateQueries({ queryKey: ['notes', niveau, div, compo] })
    }, 600)
  }

  if (!eleves.length) return (
    <Card title="Saisie des notes">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
      </SelectorBar>
      <div className="empty"><div className="empty-icon">📋</div>
        <p>Aucun élève dans cette classe. Allez dans l'onglet Élèves.</p>
      </div>
    </Card>
  )

  if (!matieres.length) return (
    <Card title="Saisie des notes">
      <div className="empty"><div className="empty-icon">📚</div>
        <p>Aucune matière configurée. Allez dans Configuration.</p>
      </div>
    </Card>
  )

  return (
    <Card title="Saisie des notes">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
      </SelectorBar>

      <div style={{ marginBottom: '0.8rem' }}>
        <span className="badge badge-info">
          Composition {compo} — Classe {niveau}{div}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--txt2)', marginLeft: '1rem' }}>
          Les notes sont sauvegardées automatiquement
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Élève</th>
              {matieres.map(m => (
                <th key={m.id} title={m.nom}>
                  {m.nom}<br />
                  <small>/{m.bareme} (×{m.coef})</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eleves.map(e => (
              <tr key={e.id}>
                <td><strong>{e.nom}</strong></td>
                {matieres.map(m => {
                  const val = notesMap[`${e.id}-${m.id}`]
                  return (
                    <td key={m.id}>
                      <input
                        type="number"
                        min={0}
                        max={m.bareme}
                        step={0.25}
                        defaultValue={val !== undefined && val !== null ? val : ''}
                        key={`${e.id}-${m.id}-${compo}`}
                        style={{ width: 70, padding: '4px 6px', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.85rem' }}
                        onChange={ev => handleNoteChange(e.id, m.id, ev.target.value, m.bareme)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
