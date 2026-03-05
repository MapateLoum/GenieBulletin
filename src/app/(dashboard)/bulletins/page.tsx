'use client'
// src/app/(dashboard)/bulletins/page.tsx
import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import { computeElevesAvecRangs } from '@/lib/utils'
import type { Niveau, Division, Eleve, Matiere, Note, Appreciation, EleveMoyenne } from '@/types'

export default function BulletinsPage() {
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [compo, setCompo] = useState(1)
  const apprTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const { data: me } = useQuery({
  queryKey: ['me'],
  queryFn: () => fetch('/api/me').then(r => r.json()),
})

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => fetch('/api/config').then(r => r.json()),
  })
  const { data: eleves = [] } = useQuery<Eleve[]>({
    queryKey: ['eleves', niveau, div],
queryFn: async () => {
  const r = await fetch(`/api/eleves?niveau=${niveau}&div=${div}`)
  if (!r.ok) return []
  return r.json()
},   })
  const { data: matieres = [] } = useQuery<Matiere[]>({
  queryKey: ['matieres', niveau, div],
  queryFn: () => fetch(`/api/matieres?niveau=${niveau}&div=${div}`).then(r => r.json()),
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
  .sort((a, b) => {
    if (a.rang === null && b.rang === null) return 0
    if (a.rang === null) return 1   // sans moyenne → à la fin
    if (b.rang === null) return -1
    return a.rang - b.rang          // 1er → dernier
  })
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

  function handlePrint() { window.print() }

  if (!eleves.length) return (
    <Card title="Génération des bulletins">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
        <button className="btn btn-or" onClick={handlePrint}>🖨️ Imprimer tous</button>
      </SelectorBar>
      <div className="empty"><div className="empty-icon">📄</div><p>Aucun élève dans cette classe.</p></div>
    </Card>
  )

  return (
    <>
      <style>{`
        /* ─── Styles communs ─── */
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .bulletin-wrap {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.2rem;
          margin-bottom: 1rem;
        }
        .blt-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 0.6rem; border-bottom: 2px solid var(--vert);
          padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;
        }
        .blt-header-l, .blt-header-c, .blt-header-r { flex: 1; min-width: 110px; }
        .blt-header-c { text-align: center; }
        .blt-header-r { text-align: right; }
        .blt-table-wrap { overflow-x: auto; margin-bottom: 0.6rem; -webkit-overflow-scrolling: touch; }
        .blt-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; min-width: 300px; }
        .blt-table th { background: var(--vert); color: #fff; padding: 5px 7px; font-size: 0.72rem; text-transform: uppercase; }
        .blt-table td { padding: 4px 7px; border-bottom: 1px solid #eee; vertical-align: middle; }
        .blt-resume { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 0.6rem; }
        .blt-box { flex: 1; min-width: 110px; border-radius: 8px; padding: 8px; text-align: center; }
        .blt-appr { flex: 2; min-width: 160px; }
        .blt-sigs {
          display: flex; justify-content: space-between; font-size: 0.72rem;
          color: #666; border-top: 1px solid #eee; padding-top: 6px;
          flex-wrap: wrap; gap: 0.3rem;
          margin-top: 1rem;        /* ← ajouter */
          min-height: 40px;        /* ← ajouter */
        }

        /* Mobile */
        @media (max-width: 600px) {
          .blt-header { flex-direction: column; }
          .blt-header-c, .blt-header-r { text-align: left; }
          .blt-appr { min-width: 100%; width: 100%; }
          .blt-sigs { flex-direction: column; }
        }

        /* ─── Impression : 2 bulletins côte à côte ─── */
        @media print {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          @page { size: A4 landscape; margin: 8mm; }
          ...
          .no-print, .card-header { display: none !important; }
          body, .card { background: #fff !important; box-shadow: none !important; padding: 0 !important; }

          /* Conteneur écran masqué */
          .screen-list { display: none !important; }

          /* Grille impression visible */
          .print-list { display: block !important; }

          .print-page {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6mm;
            width: 100%;
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          .bulletin-wrap {
            border: 1px solid #bbb !important;
            border-radius: 4px !important;
            padding: 5mm !important;
            margin: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
          }

          .blt-table { font-size: 0.65rem; min-width: unset !important; }
          .blt-table th { padding: 2px 4px; font-size: 0.6rem; }
          .blt-table td { padding: 2px 4px; }
          .blt-box { padding: 4px 6px; min-width: 80px; }
          .blt-sigs { 
            font-size: 0.6rem; 
            padding-top: 4px;
            margin-top: 8mm;  /* ← ajouter */
          }          
          .blt-header { margin-bottom: 2mm; padding-bottom: 2mm; }
          .blt-resume { margin-bottom: 2mm; gap: 3px; }
          .blt-appr-print { font-size: 0.65rem; border: 1px solid #ddd; border-radius: 4px; padding: 3px 6px; min-height: 28px; }
          .blt-moyenne-val { font-size: 1.1rem !important; }
        }

        /* Masquer liste impression sur écran */
        @media screen { .print-list { display: none !important; } }
      `}</style>

      <Card title="Génération des bulletins">
        <SelectorBar>
          <ClasseSelector niveau={niveau} div={div} compo={compo}
            onNiveauChange={setNiveau} onDivChange={setDiv}
            onCompoChange={setCompo} showCompo />
          <button className="btn btn-or" onClick={handlePrint}>🖨️ Imprimer tous</button>
        </SelectorBar>

        {/* ── Affichage écran ── */}
        <div className="screen-list">
          {elevesAvecRangs.map((e) => (
            <div key={e.id} className="bulletin-wrap">
              <BulletinContent
                e={e} config={config} niveau={niveau} div={div}
                eleves={eleves} matieres={matieres} notes={notes}
                compo={compo} apprText={getAppr(e.id)}
                onApprChange={handleApprChange}
              />
            </div>
          ))}
        </div>

        {/* ── Affichage impression : paires ── */}
        <div className="print-list">
          {Array.from({ length: Math.ceil(elevesAvecRangs.length / 2) }, (_, i) => {
            const pair = elevesAvecRangs.slice(i * 2, i * 2 + 2)
            return (
              <div key={i} className="print-page">
                {pair.map((e) => (
                  <div key={e.id} className="bulletin-wrap">
                    <BulletinContent
                      e={e} config={config} niveau={niveau} div={div}
                      eleves={eleves} matieres={matieres} notes={notes}
                      compo={compo} apprText={getAppr(e.id)}
                      onApprChange={handleApprChange}
                      isPrint
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </Card>
    </>
  )
}

/* ── Composant bulletin ── */
function BulletinContent({
  e, config, niveau, div, eleves, matieres, notes, compo, apprText, onApprChange, isPrint = false
}: {
  e: EleveMoyenne; config: any; niveau: string; div: string
  eleves: Eleve[]; matieres: Matiere[]; notes: Note[]
  compo: number; apprText: string
  onApprChange: (id: number, texte: string) => void
  isPrint?: boolean
}) {
  return (
    <>
      <div className="blt-header">
        <div className="blt-header-l">
          <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '0.85rem', color: 'var(--vert)', fontWeight: 700 }}>
            REPUBLIQUE DU SÉNÉGAL
          </div>
          <div style={{ fontSize: '0.68rem', color: '#555' }}>Un Peuple — Un But — Une Foi</div>
          <div style={{ marginTop: 3, fontWeight: 700, fontSize: '0.82rem' }}>{config?.nomEcole || 'École Élémentaire'}</div>
          <div style={{ fontSize: '0.68rem', color: '#777' }}>{config?.localite || ''}</div>
        </div>
        <div className="blt-header-c">
          <div style={{
            fontFamily: 'var(--font-playfair)', fontSize: '0.88rem', fontWeight: 700,
            color: 'var(--vert)', border: '2px solid var(--vert)', padding: '3px 8px',
            borderRadius: 5, display: 'inline-block',
          }}>
            BULLETIN DE NOTES
          </div>
          <div style={{ fontSize: '0.68rem', marginTop: 3 }}>Composition N°{compo}</div>
          <div style={{ fontSize: '0.68rem' }}>Année : {config?.annee || '—'}</div>
        </div>
        <div className="blt-header-r">
          <div style={{ fontSize: '0.65rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Élève</div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{e.nom}</div>
          <div style={{ fontSize: '0.72rem' }}>Classe : <strong>{niveau}{div}</strong> | Sexe : {e.sexe}</div>
          <div style={{ fontSize: '0.72rem' }}>Effectif : {eleves.length} élèves</div>
        </div>
      </div>

      <div className="blt-table-wrap">
        <table className="blt-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Matière</th>
              <th style={{ textAlign: 'center' }}>Coef</th>
              <th style={{ textAlign: 'center' }}>Barème</th>
              <th style={{ textAlign: 'center' }}>Note</th>
              <th style={{ textAlign: 'center' }}>Note/10</th>
            </tr>
          </thead>
          <tbody>
            {matieres.map(m => {
              const note = notes.find(n => n.eleveId === e.id && n.matiereId === m.id)
              const val = note?.valeur
              const sur10 = val !== null && val !== undefined
                ? Math.round((val / m.bareme) * 10 * 100) / 100 : null
              return (
                <tr key={m.id}>
                  <td>{m.nom}</td>
                  <td style={{ textAlign: 'center' }}>{m.coef}</td>
                  <td style={{ textAlign: 'center' }}>/{m.bareme}</td>
                  <td style={{ textAlign: 'center' }}><strong>{val !== null && val !== undefined ? val : '—'}</strong></td>
                  <td style={{ textAlign: 'center' }}>{sur10 !== null ? `${sur10}/10` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="blt-resume">
        <div className="blt-box" style={{ background: '#f0faf5' }}>
          <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Moyenne générale</div>
          <div className="blt-moyenne-val" style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.6rem', color: 'var(--vert)', fontWeight: 700 }}>
            {e.moyenne !== null ? `${e.moyenne}/10` : '—'}
          </div>
          <span className={`mention ${e.mention.cls}`} style={{ fontSize: '0.65rem' }}>{e.mention.label}</span>
        </div>
        <div className="blt-box" style={{ background: '#fffbe6' }}>
          <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Rang</div>
          <div className="blt-moyenne-val" style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.6rem', color: 'var(--or)', fontWeight: 700 }}>
            {e.rang ? `${e.rang} / ${eleves.length}` : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#888' }}>
            {e.moyenne !== null ? (e.aMoyenne ? '✅ A la moyenne' : "❌ N'a pas la moyenne") : ''}
          </div>
        </div>
        <div className="blt-appr">
          {isPrint ? (
            <div className="blt-appr-print">
              <div style={{ fontSize: '0.58rem', color: '#999', marginBottom: 2 }}>APPRÉCIATION</div>
              {apprText || ''}
            </div>
          ) : (
            <>
              <label style={{ fontSize: '0.72rem' }}>Appréciation du maître</label>
              <textarea
                rows={2}
                defaultValue={apprText}
                placeholder="Commentaire sur l'élève..."
                style={{ width: '100%', padding: 6, border: '1.5px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.78rem', resize: 'none' }}
                onChange={ev => onApprChange(e.id, ev.target.value)}
              />
            </>
          )}
        </div>
      </div>

      <div className="blt-sigs">
        <div>
          <div>Maître(sse) : <strong>{config?.nomMaitre || '—'}</strong></div>
          <div style={{ marginTop: '8mm', borderTop: '1px solid #999', paddingTop: 2, fontSize: '0.6rem' }}>Signature</div>
        </div>
        <div>
          <div>Signature directeur</div>
          <div style={{ marginTop: '8mm', borderTop: '1px solid #999', paddingTop: 2, fontSize: '0.6rem' }}>Signature</div>
        </div>
        <div>
          <div>Signature parents</div>
          <div style={{ marginTop: '8mm', borderTop: '1px solid #999', paddingTop: 2, fontSize: '0.6rem' }}>Signature</div>
        </div>
      </div>
    </>
  )
}