'use client'
// src/app/(dashboard)/bulletins/page.tsx
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import { getMoyenne, getMention, computeElevesAvecRangs } from '@/lib/utils'
import type { Niveau, Division, Eleve, Matiere, Note, Appreciation, EleveMoyenne } from '@/types'

export default function BulletinsPage() {
  const qc = useQueryClient()
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [compo, setCompo] = useState(1)
  const apprTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => fetch('/api/config').then(r => r.json()),
  })

  const { data: eleves = [] } = useQuery<Eleve[]>({
    queryKey: ['eleves', niveau, div],
    queryFn: () => fetch(`/api/eleves?niveau=${niveau}&div=${div}`).then(r => r.json()),
  })

  const { data: matieres = [] } = useQuery<Matiere[]>({
    queryKey: ['matieres'],
    queryFn: () => fetch('/api/matieres').then(r => r.json()),
  })

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ['notes', niveau, div, compo],
    queryFn: () => fetch(`/api/notes?niveau=${niveau}&div=${div}&compo=${compo}`).then(r => r.json()),
    enabled: eleves.length > 0,
  })

  const { data: appreciations = [], refetch: refetchApprs } = useQuery<Appreciation[]>({
    queryKey: ['appreciations', niveau, div, compo],
    queryFn: () => fetch(`/api/appreciations?niveau=${niveau}&div=${div}&compo=${compo}`).then(r => r.json()),
    enabled: eleves.length > 0,
  })

  const elevesAvecRangs: EleveMoyenne[] = computeElevesAvecRangs(eleves, notes, matieres)

  function getAppr(eleveId: number): string {
    return appreciations.find(a => a.eleveId === eleveId)?.texte ?? ''
  }

  function handleApprChange(eleveId: number, texte: string) {
    clearTimeout(apprTimers.current[eleveId])
    apprTimers.current[eleveId] = setTimeout(async () => {
      await fetch('/api/appreciations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eleveId, compo, texte }),
      })
      refetchApprs()
    }, 800)
  }

  function handlePrint() {
    window.print()
  }

  if (!eleves.length) return (
    <Card title="Génération des bulletins">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
        <button className="btn btn-or" onClick={handlePrint}>🖨️ Imprimer tous</button>
      </SelectorBar>
      <div className="empty">
        <div className="empty-icon">📄</div>
        <p>Aucun élève dans cette classe.</p>
      </div>
    </Card>
  )

  return (
    <Card title="Génération des bulletins">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
        <button className="btn btn-or" onClick={handlePrint}>🖨️ Imprimer tous</button>
      </SelectorBar>

      {/* Liste des bulletins */}
      {elevesAvecRangs.map((e) => {
        const apprText = getAppr(e.id)

        return (
          <div key={e.id} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
            padding: '1.5rem', marginBottom: '1rem', pageBreakInside: 'avoid',
          }}>
            {/* En-tête bulletin */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              marginBottom: '1rem', borderBottom: '2px solid var(--vert)', paddingBottom: '0.8rem',
              flexWrap: 'wrap', gap: '1rem',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '1rem', color: 'var(--vert)', fontWeight: 700 }}>
                  REPUBLIQUE DU SÉNÉGAL
                </div>
                <div style={{ fontSize: '0.82rem', color: '#555' }}>Un Peuple — Un But — Une Foi</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{config?.nomEcole || 'École Élémentaire'}</div>
                <div style={{ fontSize: '0.8rem', color: '#777' }}>{config?.localite || ''}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-playfair)', fontSize: '1.1rem', fontWeight: 700,
                  color: 'var(--vert)', border: '2px solid var(--vert)', padding: '6px 14px', borderRadius: 8,
                }}>
                  BULLETIN DE NOTES
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Composition N°{compo}</div>
                <div style={{ fontSize: '0.8rem' }}>Année : {config?.annee || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Élève</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{e.nom}</div>
                <div style={{ fontSize: '0.85rem' }}>Classe : <strong>{niveau}{div}</strong> | Sexe : {e.sexe}</div>
                <div style={{ fontSize: '0.85rem' }}>Effectif : {eleves.length} élèves</div>
              </div>
            </div>

            {/* Tableau des notes */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ background: 'var(--vert)', color: '#fff' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Matière</th>
                  <th style={{ padding: '8px 10px' }}>Coef</th>
                  <th style={{ padding: '8px 10px' }}>Barème</th>
                  <th style={{ padding: '8px 10px' }}>Note</th>
                  <th style={{ padding: '8px 10px' }}>Note/20</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map(m => {
                  const note = notes.find(n => n.eleveId === e.id && n.matiereId === m.id)
                  const val = note?.valeur
                  const moy20 = val !== null && val !== undefined ? Math.round((val / m.bareme) * 20 * 100) / 100 : null
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '7px 10px' }}>{m.nom}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>{m.coef}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>/{m.bareme}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <strong>{val !== null && val !== undefined ? val : '—'}</strong>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        {moy20 !== null ? `${moy20}/20` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Résumé + appréciation */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ flex: 1, minWidth: 180, background: '#f0faf5', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moyenne générale</div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: 'var(--vert)', fontWeight: 700 }}>
                  {e.moyenne !== null ? `${e.moyenne}/20` : '—'}
                </div>
                <span className={`mention ${e.mention.cls}`}>{e.mention.label}</span>
              </div>
              <div style={{ flex: 1, minWidth: 180, background: '#fffbe6', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rang</div>
                <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '2rem', color: 'var(--or)', fontWeight: 700 }}>
                  {e.rang ? `${e.rang} / ${eleves.length}` : '—'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#888' }}>
                  {e.moyenne !== null ? (e.aMoyenne ? '✅ A la moyenne' : "❌ N'a pas la moyenne") : ''}
                </div>
              </div>
              <div style={{ flex: 2, minWidth: 220 }}>
                <label>Appréciation du maître</label>
                <textarea
                  rows={3}
                  defaultValue={apprText}
                  placeholder="Commentaire sur l'élève..."
                  style={{ width: '100%', padding: 8, border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.85rem', resize: 'none' }}
                  onChange={ev => handleApprChange(e.id, ev.target.value)}
                  className="no-print"
                />
                <p style={{ fontSize: '0.82rem', color: '#777', marginTop: 4 }} className="print-only">
                  {apprText || ''}
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666', borderTop: '1px solid #eee', paddingTop: 10 }}>
              <div>Maître(sse) : <strong>{config?.nomMaitre || '—'}</strong></div>
              <div>Signature du directeur : ___________________</div>
              <div>Signature des parents : ___________________</div>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
