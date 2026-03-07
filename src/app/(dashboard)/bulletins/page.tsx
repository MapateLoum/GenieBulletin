'use client'
// src/app/(dashboard)/bulletins/page.tsx
import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import { computeElevesAvecRangs } from '@/lib/utils'
import type { Niveau, Division, Eleve, Matiere, Note, Appreciation, EleveMoyenne } from '@/types'

type BilanAnnuel = {
  eleveId:         number
  moyenneCompo1:   number | null
  moyenneCompo2:   number | null
  moyenneCompo3:   number | null
  moyenneAnnuelle: number | null
  rangAnnuel:      number | null
  decision:        string | null
}

// ── Ligne de matière regroupée (pour l'affichage bulletin) ────
type LigneBulletin =
  | { type: 'simple'; matiere: Matiere; note: number | null; sur10: number | null }
  | { type: 'groupe'; nom: string; noteTotal: number | null; baremeTotal: number; sur10: number | null; matieres: Matiere[] }

function buildLignesBulletin(matieres: Matiere[], notes: Note[], eleveId: number): LigneBulletin[] {
  const lignes: LigneBulletin[] = []
  const groupesTraites = new Set<string>()

  for (const m of matieres) {
    if (m.groupeNom) {
      if (groupesTraites.has(m.groupeNom)) continue
      groupesTraites.add(m.groupeNom)

      // Toutes les matières du groupe
      const membres = matieres.filter(x => x.groupeNom === m.groupeNom)
      const baremeTotal = membres.reduce((s, x) => s + x.bareme, 0)

      // Somme des notes — null si au moins une note manque
      let noteTotal: number | null = 0
      for (const mb of membres) {
        const n = notes.find(n => n.eleveId === eleveId && n.matiereId === mb.id)
        if (n?.valeur === null || n?.valeur === undefined) { noteTotal = null; break }
        noteTotal += n.valeur
      }

      const sur10 = noteTotal !== null && baremeTotal > 0
        ? Math.round((noteTotal / baremeTotal) * 10 * 100) / 100
        : null

      lignes.push({ type: 'groupe', nom: m.groupeNom, noteTotal, baremeTotal, sur10, matieres: membres })
    } else {
      const note = notes.find(n => n.eleveId === eleveId && n.matiereId === m.id)
      const val = note?.valeur ?? null
      const sur10 = val !== null ? Math.round((val / m.bareme) * 10 * 100) / 100 : null
      lignes.push({ type: 'simple', matiere: m, note: val, sur10 })
    }
  }

  return lignes
}

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
    },
  })

  const { data: matieres = [] } = useQuery<Matiere[]>({
    queryKey: ['matieres', niveau, div, compo],
    queryFn: async () => {
      const r = await fetch(`/api/matieres?niveau=${niveau}&div=${div}&compo=${compo}`)
      if (!r.ok) return []
      return r.json()
    },
  })

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ['notes', niveau, div, compo],
    queryFn: async () => {
      const r = await fetch(`/api/notes?niveau=${niveau}&div=${div}&compo=${compo}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: eleves.length > 0,
  })

  const { data: appreciations = [], refetch: refetchApprs } = useQuery<Appreciation[]>({
    queryKey: ['appreciations', niveau, div, compo],
    queryFn: async () => {
      const r = await fetch(`/api/appreciations?niveau=${niveau}&div=${div}&compo=${compo}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: eleves.length > 0,
  })

  const { data: bilanAnnuel = [] } = useQuery<BilanAnnuel[]>({
    queryKey: ['synthese-annuelle', niveau, div],
    queryFn: async () => {
      const r = await fetch(`/api/synthese-annuelle?niveau=${niveau}&div=${div}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: compo === 3 && eleves.length > 0,
  })

  const elevesAvecRangs: EleveMoyenne[] = computeElevesAvecRangs(eleves, notes, matieres)
    .sort((a, b) => {
      if (a.rang === null && b.rang === null) return 0
      if (a.rang === null) return 1
      if (b.rang === null) return -1
      return a.rang - b.rang
    })

  function getAppr(eleveId: number): string {
    return appreciations.find(a => a.eleveId === eleveId)?.texte ?? ''
  }

  function getBilan(eleveId: number): BilanAnnuel | null {
    return bilanAnnuel.find(b => b.eleveId === eleveId) ?? null
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
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .bulletin-wrap {
          background: #fff; border: 1px solid var(--border);
          border-radius: 12px; padding: 1.2rem; margin-bottom: 1rem;
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
        .blt-table tr.groupe-row td { background: #f0faf5; font-weight: 700; }
        .blt-resume { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: flex-start; margin-bottom: 0.6rem; }
        .blt-box { flex: 1; min-width: 110px; border-radius: 8px; padding: 8px; text-align: center; }
        .blt-appr { flex: 2; min-width: 160px; }
        .blt-annuelle { margin-top: 0.6rem; border: 2px solid var(--vert); border-radius: 8px; padding: 0.6rem; background: #f0faf5; }
        .blt-annuelle-title { font-size: 0.72rem; font-weight: 700; color: var(--vert); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem; border-bottom: 1px solid #c3e6cb; padding-bottom: 4px; }
        .blt-annuelle-grid { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .blt-annuelle-item { flex: 1; min-width: 80px; text-align: center; background: #fff; border-radius: 6px; padding: 5px; border: 1px solid #c3e6cb; }
        .blt-decision { flex: 2; min-width: 140px; text-align: center; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-size: 0.78rem; }
        .decision-admis { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .decision-redouble { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .blt-sigs { display: flex; justify-content: space-between; font-size: 0.72rem; color: #666; border-top: 1px solid #eee; padding-top: 6px; flex-wrap: wrap; gap: 0.3rem; margin-top: 1rem; min-height: 40px; }
        @media (max-width: 600px) {
          .blt-header { flex-direction: column; }
          .blt-header-c, .blt-header-r { text-align: left; }
          .blt-appr { min-width: 100%; width: 100%; }
          .blt-sigs { flex-direction: column; }
        }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 8mm; }
          .no-print, .card-header { display: none !important; }
          body, .card { background: #fff !important; box-shadow: none !important; padding: 0 !important; }
          .screen-list { display: none !important; }
          .print-list { display: block !important; }
          .print-page { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; width: 100%; page-break-after: always; break-after: page; }
          .print-page:last-child { page-break-after: avoid; break-after: avoid; }
          .bulletin-wrap { border: 1px solid #bbb !important; border-radius: 4px !important; padding: 5mm !important; margin: 0 !important; page-break-inside: avoid; break-inside: avoid; overflow: hidden; }
          .blt-table { font-size: 0.65rem; min-width: unset !important; }
          .blt-table th { padding: 2px 4px; font-size: 0.6rem; }
          .blt-table td { padding: 2px 4px; }
          .blt-box { padding: 4px 6px; min-width: 80px; }
          .blt-sigs { font-size: 0.6rem; padding-top: 4px; margin-top: 8mm; }
          .blt-header { margin-bottom: 2mm; padding-bottom: 2mm; }
          .blt-resume { margin-bottom: 2mm; gap: 3px; }
          .blt-appr-print { font-size: 0.65rem; border: 1px solid #ddd; border-radius: 4px; padding: 3px 6px; min-height: 28px; }
          .blt-moyenne-val { font-size: 1.1rem !important; }
          .blt-annuelle { padding: 3px 5px; margin-top: 3px; }
          .blt-annuelle-item { padding: 3px; font-size: 0.6rem; }
          .blt-decision { font-size: 0.65rem; padding: 3px 6px; }
          .blt-annuelle-title { font-size: 0.6rem; margin-bottom: 2px; }
        }
        @media screen { .print-list { display: none !important; } }
      `}</style>

      <Card title="Génération des bulletins">
        <SelectorBar>
          <ClasseSelector niveau={niveau} div={div} compo={compo}
            onNiveauChange={setNiveau} onDivChange={setDiv}
            onCompoChange={setCompo} showCompo />
          <button className="btn btn-or" onClick={handlePrint}>🖨️ Imprimer tous</button>
        </SelectorBar>

        <div className="screen-list">
          {elevesAvecRangs.map((e) => (
            <div key={e.id} className="bulletin-wrap">
              <BulletinContent
                e={e} config={config} me={me} niveau={niveau} div={div}
                eleves={eleves} matieres={matieres} notes={notes}
                compo={compo} apprText={getAppr(e.id)}
                bilan={compo === 3 ? getBilan(e.id) : null}
                onApprChange={handleApprChange}
              />
            </div>
          ))}
        </div>

        <div className="print-list">
          {Array.from({ length: Math.ceil(elevesAvecRangs.length / 2) }, (_, i) => {
            const pair = elevesAvecRangs.slice(i * 2, i * 2 + 2)
            return (
              <div key={i} className="print-page">
                {pair.map((e) => (
                  <div key={e.id} className="bulletin-wrap">
                    <BulletinContent
                      e={e} config={config} me={me} niveau={niveau} div={div}
                      eleves={eleves} matieres={matieres} notes={notes}
                      compo={compo} apprText={getAppr(e.id)}
                      bilan={compo === 3 ? getBilan(e.id) : null}
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

function BulletinContent({
  e, config, me, niveau, div, eleves, matieres, notes, compo, apprText, bilan, onApprChange, isPrint = false
}: {
  e: EleveMoyenne; config: any; me: any; niveau: string; div: string
  eleves: Eleve[]; matieres: Matiere[]; notes: Note[]
  compo: number; apprText: string
  bilan: BilanAnnuel | null
  onApprChange: (id: number, texte: string) => void
  isPrint?: boolean
}) {
  const nomMaitre = me?.nom || config?.nomMaitre || '—'
  const lignes = buildLignesBulletin(matieres, notes, e.id)

  return (
    <>
      <div className="blt-header">
        <div className="blt-header-l">
          <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '0.85rem', color: 'var(--vert)', fontWeight: 700 }}>REPUBLIQUE DU SÉNÉGAL</div>
          <div style={{ fontSize: '0.68rem', color: '#555' }}>Un Peuple — Un But — Une Foi</div>
          <div style={{ marginTop: 3, fontWeight: 700, fontSize: '0.82rem' }}>{config?.nomEcole || 'École Élémentaire'}</div>
          <div style={{ fontSize: '0.68rem', color: '#777' }}>{config?.localite || ''}</div>
        </div>
        <div className="blt-header-c">
          <div style={{ fontFamily: 'var(--font-playfair)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--vert)', border: '2px solid var(--vert)', padding: '3px 8px', borderRadius: 5, display: 'inline-block' }}>
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
              <th style={{ textAlign: 'center' }}>Note</th>
              <th style={{ textAlign: 'center' }}>Barème</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne, idx) => {
              if (ligne.type === 'groupe') {
                return (
                  <tr key={`groupe-${idx}`} className="groupe-row">
                    <td>{ligne.nom}</td>
                    <td style={{ textAlign: 'center' }}><strong>{ligne.noteTotal !== null ? ligne.noteTotal : '—'}</strong></td>
                    <td style={{ textAlign: 'center' }}>/{ligne.baremeTotal}</td>
                  </tr>
                )
              } else {
                return (
                  <tr key={ligne.matiere.id}>
                    <td>{ligne.matiere.nom}</td>
                    <td style={{ textAlign: 'center' }}><strong>{ligne.note !== null ? ligne.note : '—'}</strong></td>
                    <td style={{ textAlign: 'center' }}>/{ligne.matiere.bareme}</td>
                  </tr>
                )
              }
            })}
          </tbody>
        </table>
      </div>

      <div className="blt-resume">
        <div className="blt-box" style={{ background: '#f0faf5' }}>
          <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Moyenne</div>
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
              <textarea rows={2} defaultValue={apprText} placeholder="Commentaire sur l'élève..."
                style={{ width: '100%', padding: 6, border: '1.5px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: '0.78rem', resize: 'none' }}
                onChange={ev => onApprChange(e.id, ev.target.value)} />
            </>
          )}
        </div>
      </div>

      {compo === 3 && bilan && (
        <div className="blt-annuelle">
          <div className="blt-annuelle-title">📊 Bilan annuel</div>
          <div className="blt-annuelle-grid">
            <div className="blt-annuelle-item">
              <div style={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase' }}>Moy. C1</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--vert)' }}>{bilan.moyenneCompo1 !== null ? `${bilan.moyenneCompo1}/10` : '—'}</div>
            </div>
            <div className="blt-annuelle-item">
              <div style={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase' }}>Moy. C2</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--vert)' }}>{bilan.moyenneCompo2 !== null ? `${bilan.moyenneCompo2}/10` : '—'}</div>
            </div>
            <div className="blt-annuelle-item">
              <div style={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase' }}>Moy. C3</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--vert)' }}>{bilan.moyenneCompo3 !== null ? `${bilan.moyenneCompo3}/10` : '—'}</div>
            </div>
            <div className="blt-annuelle-item">
              <div style={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase' }}>Moy. Annuelle</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--vert)', fontFamily: 'var(--font-playfair)' }}>{bilan.moyenneAnnuelle !== null ? `${bilan.moyenneAnnuelle}/10` : '—'}</div>
            </div>
            <div className="blt-annuelle-item">
              <div style={{ fontSize: '0.58rem', color: '#555', textTransform: 'uppercase' }}>Rang annuel</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--or)', fontFamily: 'var(--font-playfair)' }}>{bilan.rangAnnuel !== null ? `${bilan.rangAnnuel} / ${eleves.length}` : '—'}</div>
            </div>
            <div className={`blt-decision ${bilan.decision?.includes('Admis') ? 'decision-admis' : 'decision-redouble'}`}>
              {bilan.decision === 'Admis(e) en classe supérieure' ? '✅' : '🔄'} {bilan.decision ?? '—'}
            </div>
          </div>
        </div>
      )}

      <div className="blt-sigs">
        <div>
          <div>Maître(sse) : <strong>{nomMaitre}</strong></div>
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