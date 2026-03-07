'use client'
// src/app/(dashboard)/notes/page.tsx
import React, { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import type { Niveau, Division, Eleve, Matiere, Note } from '@/types'

const COMPO_LABELS: Record<number, string> = {
  1: '1ère Composition', 2: '2ème Composition', 3: '3ème Composition'
}

// ─── helpers ────────────────────────────────────────────────────────────────

interface GroupeMatiere {
  groupeNom: string
  matieres: Matiere[]
  baremeTotal: number
  isGroupe: boolean
}

function buildGroupes(matieres: Matiere[]): GroupeMatiere[] {
  const map = new Map<string, Matiere[]>()
  const order: string[] = []
  for (const m of matieres) {
    const key = m.groupeNom ?? `__solo__${m.id}`
    if (!map.has(key)) { map.set(key, []); order.push(key) }
    map.get(key)!.push(m)
  }
  return order.map(key => {
    const mats = map.get(key)!
    const isGroupe = !key.startsWith('__solo__')
    return {
      groupeNom: isGroupe ? key : mats[0].nom,
      matieres: mats,
      baremeTotal: mats.reduce((s, m) => s + m.bareme, 0),
      isGroupe,
    }
  })
}

// ─── composant ──────────────────────────────────────────────────────────────

export default function NotesPage() {
  const qc = useQueryClient()
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [compo, setCompo] = useState(1)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({})

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

  const notesMap: Record<string, number | null> = {}
  notes.forEach(n => { notesMap[`${n.eleveId}-${n.matiereId}`] = n.valeur })

  function getVal(eleveId: number, matiereId: number): string {
    const localKey = `${eleveId}-${matiereId}`
    if (localKey in localNotes) return localNotes[localKey]
    const v = notesMap[localKey]
    return v !== null && v !== undefined ? String(v) : ''
  }

  function getGroupeTotal(eleveId: number, mats: Matiere[]): string {
    let sum = 0
    for (const m of mats) {
      const raw = getVal(eleveId, m.id)
      if (raw === '') return ''
      const v = parseFloat(raw)
      if (isNaN(v)) return ''
      sum += v
    }
    return String(sum)
  }

  const groupes = buildGroupes(matieres)

  function handleNoteChange(eleveId: number, matiereId: number, rawVal: string, bareme: number) {
    setLocalNotes(prev => ({ ...prev, [`${eleveId}-${matiereId}`]: rawVal }))
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

  // ─── impression ──────────────────────────────────────────────────────────

  function handlePrint() {
    // Nombre total de colonnes matières
    const totalCols = groupes.reduce((acc, g) => acc + (g.isGroupe ? g.matieres.length + 1 : 1), 0)
    // > 8 colonnes → 2 pages portrait, sinon 1 page paysage
    const needsMultiPage = totalCols > 8

    function buildTheadRow1(gs: GroupeMatiere[]) {
      return gs.map(g => {
        if (!g.isGroupe)
          return `<th rowspan="2" style="vertical-align:middle">${g.groupeNom}<br/><small>/${g.baremeTotal}</small></th>`
        return `<th colspan="${g.matieres.length + 1}" style="background:#155c30">${g.groupeNom}<br/><small>/${g.baremeTotal}</small></th>`
      }).join('')
    }

    function buildTheadRow2(gs: GroupeMatiere[]) {
      return gs.map(g => {
        if (!g.isGroupe) return ''
        const subCols = g.matieres.map(m => `<th>${m.nom}<br/><small>/${m.bareme}</small></th>`).join('')
        return subCols + `<th style="background:#0f4a27">Total<br/><small>/${g.baremeTotal}</small></th>`
      }).join('')
    }

    function buildRows(gs: GroupeMatiere[]) {
      return eleves.map((e, i) => {
        const cols = gs.map(g => {
          const subCols = g.matieres.map(m => {
            const val = notesMap[`${e.id}-${m.id}`]
            return `<td>${val !== null && val !== undefined ? val : ''}</td>`
          }).join('')
          if (!g.isGroupe) return subCols
          let sum = 0; let complete = true
          for (const m of g.matieres) {
            const v = notesMap[`${e.id}-${m.id}`]
            if (v === null || v === undefined) { complete = false; break }
            sum += v
          }
          return subCols + `<td style="font-weight:600">${complete ? sum : ''}</td>`
        }).join('')
        return `<tr><td>${i + 1}</td><td><strong>${e.nom}</strong></td><td>${e.sexe}</td>${cols}</tr>`
      }).join('')
    }

    function buildPage(gs: GroupeMatiere[], pageLabel = '') {
      const labelHtml = pageLabel
        ? ` <span style="font-size:0.75rem;font-weight:400;color:#888">(${pageLabel})</span>`
        : ''
      return `
      <div class="header">
        <div>
          <div style="font-weight:700;color:#1a6b3a;font-size:0.9rem">REPUBLIQUE DU SENEGAL</div>
          <div style="font-size:0.75rem;color:#777">Un Peuple - Un But - Une Foi</div>
        </div>
        <div style="text-align:center">
          <div class="titre">FEUILLE DE NOTES${labelHtml}</div>
          <div class="sous-titre">${COMPO_LABELS[compo]} - Classe <strong>${niveau}${div}</strong></div>
        </div>
        <div style="text-align:right;font-size:0.78rem;color:#555">
          <div>Imprime le ${new Date().toLocaleDateString('fr-FR')}</div>
          <div>Effectif : <strong>${eleves.length} eleves</strong></div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="vertical-align:middle">#</th>
            <th rowspan="2" style="vertical-align:middle">Nom et Prenom</th>
            <th rowspan="2" style="vertical-align:middle">Sexe</th>
            ${buildTheadRow1(gs)}
          </tr>
          <tr>${buildTheadRow2(gs)}</tr>
        </thead>
        <tbody>${buildRows(gs)}</tbody>
      </table>
      <div class="footer">
        <div>Signature du Maitre/Maitresse : _______________________</div>
        <div>Signature du Directeur : _______________________</div>
      </div>`
    }

    let bodyContent = ''
    const orientation = needsMultiPage ? 'portrait' : 'landscape'
    const pageWidth = needsMultiPage ? '190mm' : '277mm'

    if (!needsMultiPage) {
      bodyContent = `<div class="page">${buildPage(groupes)}</div>`
    } else {
      const mid = Math.ceil(groupes.length / 2)
      const part1 = groupes.slice(0, mid)
      const part2 = groupes.slice(mid)
      bodyContent = `
        <div class="page">${buildPage(part1, 'Page 1 / 2')}</div>
        <div class="page page-break">${buildPage(part2, 'Page 2 / 2')}</div>`
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Notes - Classe ${niveau}${div} - ${COMPO_LABELS[compo]}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 1cm; }
    * { box-sizing: border-box; margin: 0; padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important; }
    html, body { width: ${pageWidth}; font-family: Arial, sans-serif; font-size: 0.78rem; color: #1a1a1a; }
    body { padding: 0; }
    .page { padding: 0 0 1rem 0; }
    .page-break { page-break-before: always; padding-top: 0.5rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start;
              border-bottom: 2px solid #1a6b3a; padding-bottom: 0.6rem; margin-bottom: 0.8rem; }
    .titre { font-size: 1rem; font-weight: 700; color: #1a6b3a; }
    .sous-titre { font-size: 0.75rem; color: #555; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    th { background: #1a6b3a !important; color: #fff !important; padding: 5px 6px; text-align: center;
         font-size: 0.68rem; border: 1px solid #155c30; }
    th:first-child, th:nth-child(2), th:nth-child(3) { text-align: left; }
    td { padding: 4px 6px; border: 1px solid #ddd; text-align: center; vertical-align: middle; }
    td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
    tr:nth-child(even) { background: #f8faf8 !important; }
    .footer { margin-top: 4rem; display: flex; justify-content: space-between;
              font-size: 0.72rem; color: #777; padding-top: 0.8rem; }
  </style>
</head>
<body>${bodyContent}</body>
</html>`

    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    w.onload = () => setTimeout(() => { w.focus(); w.print() }, 300)
    setTimeout(() => { w.focus(); w.print() }, 800)
  }

  // ─── états vides ─────────────────────────────────────────────────────────

  if (!eleves.length) return (
    <Card title="Saisie des notes">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
      </SelectorBar>
      <div className="empty">
        <div className="empty-icon">📋</div>
        <p>Aucun élève dans cette classe. Allez dans l'onglet Élèves.</p>
      </div>
    </Card>
  )

  if (!matieres.length) return (
    <Card title="Saisie des notes">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
      </SelectorBar>
      <div className="empty">
        <div className="empty-icon">📚</div>
        <p>Aucune matière pour cette composition. Allez dans Configuration.</p>
      </div>
    </Card>
  )

  // ─── rendu principal ─────────────────────────────────────────────────────

  return (
    <Card title="Saisie des notes">
      <SelectorBar>
        <ClasseSelector niveau={niveau} div={div} compo={compo}
          onNiveauChange={setNiveau} onDivChange={setDiv}
          onCompoChange={setCompo} showCompo />
        <button className="btn btn-or btn-sm no-print" onClick={handlePrint}>
          🖨️ Imprimer les notes
        </button>
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
              <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Élève</th>
              {groupes.map((g, gi) => {
                if (!g.isGroupe) {
                  return (
                    <th key={`g-${gi}`} rowSpan={2} style={{ verticalAlign: 'middle' }}>
                      {g.groupeNom}<br /><small>/{g.baremeTotal}</small>
                    </th>
                  )
                }
                return (
                  <th
                    key={`g-${gi}`}
                    colSpan={g.matieres.length + 1}
                    style={{ background: 'var(--vert-fonce, #155c30)', borderBottom: '2px solid #fff4' }}
                  >
                    {g.groupeNom}<br /><small>/{g.baremeTotal}</small>
                  </th>
                )
              })}
            </tr>
            <tr>
              {groupes.map((g, gi) => {
                if (!g.isGroupe) return null
                return (
                  <React.Fragment key={`g2-${gi}`}>
                    {g.matieres.map(m => (
                      <th key={m.id} style={{ fontWeight: 400, opacity: 0.9 }}>
                        {m.nom}<br /><small>/{m.bareme}</small>
                      </th>
                    ))}
                    <th style={{ background: 'var(--vert-fonce, #0f4a27)' }}>
                      Total<br /><small>/{g.baremeTotal}</small>
                    </th>
                  </React.Fragment>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {eleves.map(e => (
              <tr key={e.id}>
                <td><strong>{e.nom}</strong></td>
                {groupes.map((g, gi) => (
                  <React.Fragment key={`row-${e.id}-g${gi}`}>
                    {g.matieres.map(m => (
                      <td key={m.id}>
                        <input
                          type="number" min={0} max={m.bareme} step={0.25}
                          value={getVal(e.id, m.id)}
                          key={`${e.id}-${m.id}-${compo}`}
                          style={{
                            width: 70, padding: '4px 6px',
                            border: '1px solid #ccc', borderRadius: 6,
                            fontSize: '0.85rem'
                          }}
                          onChange={ev => handleNoteChange(e.id, m.id, ev.target.value, m.bareme)}
                        />
                      </td>
                    ))}
                    {g.isGroupe && (
                      <td style={{
                        fontWeight: 700,
                        background: 'var(--vert-pale, #f0f7f2)',
                        color: 'var(--vert, #1a6b3a)',
                        minWidth: 60,
                        textAlign: 'center',
                      }}>
                        {getGroupeTotal(e.id, g.matieres)}
                      </td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}