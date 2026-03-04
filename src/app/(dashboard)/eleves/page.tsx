'use client'
// src/app/(dashboard)/eleves/page.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import type { Niveau, Division, Eleve } from '@/types'

export default function ElevesPage() {
  const qc = useQueryClient()
  const [niveau, setNiveau] = useState<Niveau>('CI')
  const [div, setDiv] = useState<Division>('A')
  const [nom, setNom] = useState('')
  const [sexe, setSexe] = useState<'G' | 'F'>('F')

  const { data: eleves = [], isLoading } = useQuery<Eleve[]>({
    queryKey: ['eleves', niveau, div],
    queryFn: async () => {
      const r = await fetch(`/api/eleves?niveau=${niveau}&div=${div}`)
      if (!r.ok) return []
      return r.json()
    },
  })

  // Tri alphabétique par dernier mot (nom de famille)
  const elevesTriés = [...eleves].sort((a, b) => {
    const nomA = a.nom.split(' ').at(-1) ?? a.nom
    const nomB = b.nom.split(' ').at(-1) ?? b.nom
    return nomA.localeCompare(nomB, 'fr')
  })

  const addEleve = useMutation({
    mutationFn: (data: { nom: string; sexe: string; niveau: string; div: string }) =>
      fetch('/api/eleves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
      setNom('')
      toast.success('Élève ajouté(e)')
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  })

  const deleteEleve = useMutation({
    mutationFn: (id: number) => fetch(`/api/eleves/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
      toast.success('Élève retiré(e)')
    },
  })

  function handleAdd() {
    if (!nom.trim()) { toast.error("Entrez le nom de l'élève"); return }
    addEleve.mutate({ nom: nom.trim(), sexe, niveau, div })
  }

  function handlePrintListe() {
    const g = elevesTriés.filter(e => e.sexe === 'G').length
    const f = elevesTriés.filter(e => e.sexe === 'F').length
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{font-family:Arial;padding:2rem}h2{margin-bottom:1rem}
      table{width:100%;border-collapse:collapse}.info{font-size:0.85rem;color:#555;margin-bottom:1rem}
      th,td{border:1px solid #333;padding:8px 12px;text-align:left}th{background:#1a6b3a;color:#fff}
      </style></head><body>
      <h2>Liste des élèves — Classe ${niveau}${div}</h2>
      <p class="info">Année : — | Maître/Maîtresse : —</p>
      <table><thead><tr><th>#</th><th>Nom et Prénom</th><th>Sexe</th><th>Signature</th></tr></thead>
      <tbody>${elevesTriés.map((e, i) => `<tr><td>${i + 1}</td><td>${e.nom}</td><td>${e.sexe}</td><td></td></tr>`).join('')}</tbody></table>
      <p style="margin-top:1.5rem;font-size:0.85rem;">Total : ${elevesTriés.length} élèves (${g} G / ${f} F)</p>
      </body></html>`
    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const garcons = eleves.filter(e => e.sexe === 'G').length
  const filles = eleves.filter(e => e.sexe === 'F').length

  return (
    <Card title={`Liste des élèves — ${niveau}${div}`}>
      <SelectorBar>
        <ClasseSelector
          niveau={niveau} div={div}
          onNiveauChange={setNiveau} onDivChange={setDiv}
        />
        <button className="btn btn-secondary btn-sm no-print" onClick={handlePrintListe}>
          📄 Imprimer liste
        </button>
      </SelectorBar>

      {/* Formulaire ajout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label>Prénom et Nom</label>
          <input
            type="text"
            value={nom}
            placeholder="Ex : Fatou Diallo"
            onChange={e => setNom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div>
          <label>Sexe</label>
          <select value={sexe} onChange={e => setSexe(e.target.value as 'G' | 'F')}>
            <option value="F">Fille (F)</option>
            <option value="G">Garçon (G)</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleAdd} disabled={addEleve.isPending}>
            ➕ Ajouter l'élève
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p style={{ color: 'var(--txt2)' }}>Chargement...</p>
      ) : elevesTriés.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👤</div>
          <p>Aucun élève dans cette classe. Ajoutez des élèves ci-dessus.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nom et Prénom</th>
                  <th>Sexe</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {elevesTriés.map((e, i) => (
                  <tr key={e.id}>
                    <td>{i + 1}</td>
                    <td><strong>{e.nom}</strong></td>
                    <td>
                      <span className={`badge ${e.sexe === 'F' ? 'badge-info' : 'badge-warning'}`}>
                        {e.sexe}
                      </span>
                    </td>
                    <td className="no-print">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          toast((t) => (
                            <span>
                              Retirer <strong>{e.nom}</strong> ?{' '}
                              <button className="btn btn-danger btn-sm" onClick={() => { deleteEleve.mutate(e.id); toast.dismiss(t.id) }}>
                                Confirmer
                              </button>{' '}
                              <button className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(t.id)}>
                                Annuler
                              </button>
                            </span>
                          ), { duration: 5000 })
                        }}
                      >
                        🗑️ Retirer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--txt2)' }}>
            Total : {elevesTriés.length} élèves — {garcons} garçon(s), {filles} fille(s)
          </p>
        </>
      )}
    </Card>
  )
}