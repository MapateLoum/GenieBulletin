'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, SelectorBar } from '@/components/ui/Card'
import ClasseSelector from '@/components/ui/ClasseSelector'
import type { Niveau, Division, Eleve } from '@/types'

// ── Normalisation pour comparaison souple ─────────────────────
function normalizeHeader(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime accents
    .replace(/\s+/g, '')             // supprime espaces
    .trim()
}

// ── Modale d'édition ──────────────────────────────────────────
function EditModal({
  eleve,
  onClose,
  onSave,
  isPending,
}: {
  eleve: Eleve
  onClose: () => void
  onSave: (nom: string, sexe: 'G' | 'F') => void
  isPending: boolean
}) {
  const [nom, setNom]   = useState(eleve.nom)
  const [sexe, setSexe] = useState<'G' | 'F'>(eleve.sexe)

  function handleSubmit() {
    if (!nom.trim()) { toast.error('Entrez le nom'); return }
    onSave(nom.trim(), sexe)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg, #fff)',
          borderRadius: '12px',
          padding: '2rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>
          ✏️ Modifier l'élève
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Prénom et Nom</label>
            <input
              type="text" value={nom} autoFocus
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <label>Sexe</label>
            <select value={sexe} onChange={e => setSexe(e.target.value as 'G' | 'F')}>
              <option value="F">Fille (F)</option>
              <option value="G">Garçon (G)</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? '...' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function ElevesPage() {
  const qc = useQueryClient()
  const [niveau, setNiveau] = useState<Niveau>('6ème')
  const [div, setDiv]       = useState<Division>('A')
  const [nom, setNom]       = useState('')
  const [sexe, setSexe]     = useState<'G' | 'F'>('F')
  const [editEleve, setEditEleve] = useState<Eleve | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: eleves = [], isLoading } = useQuery<Eleve[]>({
    queryKey: ['eleves', niveau, div],
    queryFn: async () => {
      const r = await fetch(`/api/eleves?niveau=${niveau}&div=${div}`)
      if (!r.ok) return []
      return r.json()
    },
  })

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

  const updateEleve = useMutation({
    mutationFn: ({ id, nom, sexe }: { id: number; nom: string; sexe: 'G' | 'F' }) =>
      fetch(`/api/eleves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, sexe }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
      setEditEleve(null)
      toast.success('Élève modifié(e)')
    },
    onError: () => toast.error('Erreur lors de la modification'),
  })

  const deleteEleve = useMutation({
    mutationFn: (id: number) => fetch(`/api/eleves/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
      toast.success('Élève retiré(e)')
    },
  })

  const deleteAll = useMutation({
    mutationFn: () =>
      fetch(`/api/eleves?niveau=${niveau}&div=${div}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
      toast.success('Classe vidée')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  // ── Import Excel intelligent (recherche par en-têtes) ─────────
  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 }) as any[][]

    if (rows.length < 2) { toast.error('Fichier vide'); return }

    // ── 1. Lire et normaliser les en-têtes (Array.from pour gérer les tableaux sparse) ──
    const rawHeaders = rows[0] as any[]
    const headers = Array.from({ length: rawHeaders.length }, (_, i) =>
      normalizeHeader(String(rawHeaders[i] ?? ''))
    )

    // ── 2. Trouver les colonnes prenom, nom, sexe ─────────────
    const colPrenom = headers.findIndex(h =>
      h.includes('prenom') || h.includes('prenoms')
    )
    const colNom = headers.findIndex(h =>
      (h === 'nom' || h === 'noms' || h.startsWith('nom')) && !h.includes('prenom')
    )
    const colSexe = headers.findIndex(h => h.includes('sexe'))

    // ── 3. Fallback : si pas d'en-têtes trouvés, ancienne logique (col B=1, C=2, D=3)
    const useFallback = colPrenom === -1 && colNom === -1

    if (useFallback) {
      const elevesToImport = rows.slice(1)
        .filter(r => Array.isArray(r) && (r[1] != null || r[2] != null))
        .map(r => {
          const sexeRaw = String(r[3] ?? 'F').trim().toUpperCase()
          const sexe: 'G' | 'F' = (sexeRaw === 'M' || sexeRaw === 'G') ? 'G' : 'F'
          return {
            nom:  `${String(r[1] ?? '').trim()} ${String(r[2] ?? '').trim()}`.trim(),
            sexe,
            niveau,
            div,
          }
        })
        .filter(e => e.nom)

      if (!elevesToImport.length) { toast.error('Aucun élève trouvé dans le fichier'); return }

      const toastId = toast.loading(`Import de ${elevesToImport.length} élèves...`)
      try {
        const res = await fetch('/api/eleves/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eleves: elevesToImport }),
        })
        if (!res.ok) throw new Error()
        await qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
        toast.success(`${elevesToImport.length} élèves importés`, { id: toastId })
      } catch {
        toast.error("Erreur lors de l'import", { id: toastId })
      }
      e.target.value = ''
      return
    }

    // ── 4. Import avec en-têtes détectés ──────────────────────
    const elevesToImport = rows.slice(1)
      .filter(r => {
        if (!Array.isArray(r)) return false
        const prenom = colPrenom !== -1 ? String(r[colPrenom] ?? '').trim() : ''
        const nomVal = colNom    !== -1 ? String(r[colNom]    ?? '').trim() : ''
        return prenom || nomVal
      })
      .map(r => {
        const prenom = colPrenom !== -1 ? String(r[colPrenom] ?? '').trim() : ''
        const nomVal = colNom    !== -1 ? String(r[colNom]    ?? '').trim() : ''
        const nomComplet = [prenom, nomVal].filter(Boolean).join(' ').trim()
        const sexeRaw = colSexe !== -1
          ? String(r[colSexe] ?? 'F').trim().toUpperCase()
          : 'F'
        const sexe: 'G' | 'F' = (sexeRaw === 'M' || sexeRaw === 'G') ? 'G' : 'F'
        return { nom: nomComplet, sexe, niveau, div }
      })
      .filter(e => e.nom)

    if (!elevesToImport.length) {
      toast.error('Aucun élève trouvé dans le fichier')
      e.target.value = ''
      return
    }

    // ── 5. Résumé des colonnes détectées ──────────────────────
    const detected = [
      colPrenom !== -1 ? `Prénom → col ${colPrenom + 1}` : null,
      colNom    !== -1 ? `Nom → col ${colNom + 1}`       : null,
      colSexe   !== -1 ? `Sexe → col ${colSexe + 1}`     : null,
    ].filter(Boolean).join(', ')

    const toastId = toast.loading(`Import de ${elevesToImport.length} élèves... (${detected})`)
    try {
      const res = await fetch('/api/eleves/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eleves: elevesToImport }),
      })
      if (!res.ok) throw new Error()
      await qc.invalidateQueries({ queryKey: ['eleves', niveau, div] })
      toast.success(`${elevesToImport.length} élèves importés`, { id: toastId })
    } catch {
      toast.error("Erreur lors de l'import", { id: toastId })
    }
    e.target.value = ''
  }

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
      <p class="info">Année : — | Professeur principal : —</p>
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
  const filles  = eleves.filter(e => e.sexe === 'F').length

  return (
    <>
      {editEleve && (
        <EditModal
          eleve={editEleve}
          onClose={() => setEditEleve(null)}
          onSave={(nom, sexe) => updateEleve.mutate({ id: editEleve.id, nom, sexe })}
          isPending={updateEleve.isPending}
        />
      )}

      <Card title={`Liste des élèves — ${niveau}${div}`}>
        <SelectorBar>
          <ClasseSelector
            niveau={niveau} div={div}
            onNiveauChange={setNiveau} onDivChange={setDiv}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImportExcel}
          />
          <button
            className="btn btn-secondary btn-sm no-print"
            onClick={() => fileInputRef.current?.click()}
          >
            📥 Importer Excel
          </button>
          <button className="btn btn-secondary btn-sm no-print" onClick={handlePrintListe}>
            📄 Imprimer liste
          </button>
          <button
            className="btn btn-danger btn-sm no-print"
            disabled={eleves.length === 0 || deleteAll.isPending}
            onClick={() => {
              toast((t) => (
                <span>
                  Supprimer <strong>tous les élèves</strong> de {niveau}{div} ?{' '}
                  <button className="btn btn-danger btn-sm"
                    onClick={() => { deleteAll.mutate(); toast.dismiss(t.id) }}>
                    Confirmer
                  </button>{' '}
                  <button className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(t.id)}>
                    Annuler
                  </button>
                </span>
              ), { duration: 6000 })
            }}
          >
            🗑️ Vider la classe
          </button>
        </SelectorBar>

        {/* Formulaire ajout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label>Prénom et Nom</label>
            <input
              type="text" value={nom} placeholder="Ex : Fatou Diallo"
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditEleve(e)}>
                            ✏️ Modifier
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              toast((t) => (
                                <span>
                                  Retirer <strong>{e.nom}</strong> ?{' '}
                                  <button className="btn btn-danger btn-sm"
                                    onClick={() => { deleteEleve.mutate(e.id); toast.dismiss(t.id) }}>
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
                        </div>
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
    </>
  )
}