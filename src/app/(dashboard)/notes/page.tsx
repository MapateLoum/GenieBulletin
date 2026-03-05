'use client'
// src/app/(dashboard)/notes/page.tsx
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import type { Niveau, Division, Eleve, Matiere, Note } from '@/types'

const COMPO_LABELS: Record<number, string> = {
  1: '1ère Composition', 2: '2ème Composition', 3: '3ème Composition'
}

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

  function handlePrint() {
    const rowsHTML = eleves.map((e, i) => {
      const cols = matieres.map(m => {
        const val = notesMap[`${e.id}-${m.id}`]
        return `<td>${val !== null && val !== undefined ? val : ''}</td>`
      }).join('')
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${e.nom}</strong></td>
        <td>${e.sexe}</td>
        ${cols}
      </tr>`
    }).join('')

    const theadCols = matieres.map(m =>
      `<th>${m.nom}<br/><small>/${m.bareme}</small></th>`
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Notes — Classe ${niveau}${div} — ${COMPO_LABELS[compo]}</title>
  <style>
  * { box-sizing: border-box; margin: 0; padding: 0; 
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, sans-serif; padding: 1.5rem; font-size: 0.82rem; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #1a6b3a; padding-bottom: 0.8rem; margin-bottom: 1rem; }
  .titre { font-size: 1.1rem; font-weight: 700; color: #1a6b3a; }
  .sous-titre { font-size: 0.8rem; color: #555; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
  th { background: #1a6b3a; color: #fff; padding: 6px 8px; text-align: center;
       font-size: 0.72rem; border: 1px solid #155c30; }
  th:first-child, th:nth-child(2), th:nth-child(3) { text-align: left; }
  td { padding: 5px 8px; border: 1px solid #ddd; text-align: center; vertical-align: middle; }
  td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
  tr:nth-child(even) { background: #f8faf8; }
  .footer { margin-top: 1.5rem; display: flex; justify-content: space-between;
            font-size: 0.75rem; color: #777; border-top: 1px solid #ddd; padding-top: 0.8rem; }
  @media print {
    body { padding: 0.8rem; }
    @page { size: A4 landscape; margin: 1cm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-weight:700;color:#1a6b3a;font-size:0.9rem">REPUBLIQUE DU SÉNÉGAL</div>
      <div style="font-size:0.75rem;color:#777">Un Peuple — Un But — Une Foi</div>
    </div>
    <div style="text-align:center">
      <div class="titre">FEUILLE DE NOTES</div>
      <div class="sous-titre">${COMPO_LABELS[compo]} — Classe <strong>${niveau}${div}</strong></div>
    </div>
    <div style="text-align:right;font-size:0.78rem;color:#555">
      <div>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</div>
      <div>Effectif : <strong>${eleves.length} élèves</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nom et Prénom</th>
        <th>Sexe</th>
        ${theadCols}
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>

  <div class="footer">
    <div>Signature du Maître/Maîtresse : _______________________</div>
    <div>Signature du Directeur : _______________________</div>
  </div>
</body>
</html>`

    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

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
              <th>Élève</th>
              {matieres.map(m => (
                <th key={m.id} title={m.nom}>
                  {m.nom}<br />
                  <small>/{m.bareme}</small>
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