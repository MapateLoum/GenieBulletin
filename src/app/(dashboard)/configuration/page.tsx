'use client'
// src/app/(dashboard)/configuration/page.tsx
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Card, FormGrid, Field } from '@/components/ui/Card'
import { NIVEAUX, DIVISIONS, COMPOS, COMPO_LABELS } from '@/lib/utils'
import type { Config, Matiere } from '@/types'

const fetchConfig = (): Promise<Config> => fetch('/api/config').then(r => r.json())

// ── Modale d'édition matière ──────────────────────────────────
function EditMatiereModal({
  matiere, onClose, onSave, isPending,
}: {
  matiere: Matiere
  onClose: () => void
  onSave: (nom: string, coef: number) => void
  isPending: boolean
}) {
  const [nom, setNom]   = useState(matiere.nom)
  const [coef, setCoef] = useState(matiere.coef ?? 1)

  function handleSubmit() {
    if (!nom.trim())  { toast.error('Entrez le nom');         return }
    if (coef < 1)     { toast.error('Coefficient invalide');  return }
    onSave(nom.trim(), coef)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>✏️ Modifier la matière</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Nom de la matière</label>
            <input
              type="text" value={nom} autoFocus
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <label>Coefficient</label>
            <input
              type="text" inputMode="numeric" value={coef === 0 ? '' : coef}
              style={{ width: 90 }}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                setCoef(v === '' ? 0 : parseInt(v))
              }}
            />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--txt2)' }}>
            Toutes les matières sont notées sur <strong>20</strong>
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
export default function ConfigurationPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const isDirecteur = session?.user?.role === 'directeur'

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: fetchConfig })

  const [matNiveau, setMatNiveau] = useState('6ème')
  const [matDiv, setMatDiv]       = useState('A')
  const [matCompo, setMatCompo]   = useState(1)

  const effectifNiveau = isDirecteur ? matNiveau : (session?.user?.niveau ?? '6ème')
  const effectifDiv    = isDirecteur ? matDiv    : (session?.user?.div    ?? 'A')
  const effectifCompo  = matCompo

  const { data: matieres = [] } = useQuery<Matiere[]>({
    queryKey: ['matieres', effectifNiveau, effectifDiv, effectifCompo],
    queryFn: async () => {
      const r = await fetch(`/api/matieres?niveau=${effectifNiveau}&div=${effectifDiv}&compo=${effectifCompo}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: !!session,
  })

  const [form, setForm] = useState({
    nomEcole: '', annee: '', nomDirecteur: '', localite: '', nomMaitre: '',
    classeActive: '6ème', divActive: 'A',
  })
  const [newMat, setNewMat]           = useState({ nom: '', coef: 1 })
  const [editMatiere, setEditMatiere] = useState<Matiere | null>(null)

  useEffect(() => {
    if (config) setForm(f => ({ ...f, ...config }))
  }, [config])

  useEffect(() => {
    if (!isDirecteur) {
      fetch('/api/me').then(r => r.json()).then(user => {
        if (user?.nom) setForm(f => ({ ...f, nomMaitre: user.nom }))
      })
    }
  }, [isDirecteur])

  const updateConfig = useMutation({
    mutationFn: (data: Partial<Config>) =>
      fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); toast.success('Configuration sauvegardée') },
    onError: () => toast.error('Accès refusé — seul le directeur peut modifier la configuration'),
  })

  const addMatiere = useMutation({
    mutationFn: async (data: { nom: string; coef: number; compo: number; niveau?: string; div?: string }) => {
      const r = await fetch('/api/matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.error ?? "Erreur lors de l'ajout")
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres', effectifNiveau, effectifDiv, effectifCompo] })
      setNewMat({ nom: '', coef: 1 })
      toast.success('Matière ajoutée')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMatiere = useMutation({
    mutationFn: ({ id, nom, coef }: { id: number; nom: string; coef: number }) =>
      fetch(`/api/matieres/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, coef }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres', effectifNiveau, effectifDiv, effectifCompo] })
      setEditMatiere(null)
      toast.success('Matière modifiée')
    },
    onError: () => toast.error('Erreur lors de la modification'),
  })

  const deleteMatiere = useMutation({
    mutationFn: (id: number) => fetch(`/api/matieres/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres', effectifNiveau, effectifDiv, effectifCompo] })
      toast.success('Matière supprimée')
    },
  })

  function handleFieldChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleAddMatiere() {
    if (!newMat.nom.trim())        { toast.error('Entrez le nom de la matière'); return }
    if (!newMat.coef || newMat.coef < 1) { toast.error('Entrez un coefficient valide'); return }
    addMatiere.mutate({
      nom:   newMat.nom.trim(),
      coef:  newMat.coef,
      compo: effectifCompo,
      ...(isDirecteur ? { niveau: effectifNiveau, div: effectifDiv } : {}),
    })
  }

  return (
    <>
      {editMatiere && (
        <EditMatiereModal
          matiere={editMatiere}
          onClose={() => setEditMatiere(null)}
          onSave={(nom, coef) => updateMatiere.mutate({ id: editMatiere.id, nom, coef })}
          isPending={updateMatiere.isPending}
        />
      )}

      {isDirecteur && (
        <Card title="Informations de l'établissement">
          <FormGrid>
            <Field label="Nom de l'établissement">
              <input type="text" value={form.nomEcole} placeholder="Ex : Lycée Lamine Guèye"
                onChange={e => handleFieldChange('nomEcole', e.target.value)} />
            </Field>
            <Field label="Année scolaire">
              <input type="text" value={form.annee} placeholder="Ex : 2025 - 2026"
                onChange={e => handleFieldChange('annee', e.target.value)} />
            </Field>
            <Field label="Nom du proviseur">
              <input type="text" value={form.nomDirecteur} placeholder="Ex : M. Diallo"
                onChange={e => handleFieldChange('nomDirecteur', e.target.value)} />
            </Field>
            <Field label="Localité">
              <input type="text" value={form.localite} placeholder="Ex : Dakar, Médina"
                onChange={e => handleFieldChange('localite', e.target.value)} />
            </Field>
          </FormGrid>
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={() => updateConfig.mutate(form)}>
              💾 Sauvegarder
            </button>
          </div>
        </Card>
      )}

      {!isDirecteur && (
        <Card title="Mon profil">
          <FormGrid>
            <Field label="Mon nom (affiché sur les bulletins)">
              <input type="text" value={form.nomMaitre} placeholder="Ex : M. Faye"
                onChange={e => handleFieldChange('nomMaitre', e.target.value)} />
            </Field>
          </FormGrid>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={async () => {
              const r = await fetch('/api/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: form.nomMaitre }),
              })
              if (r.ok) toast.success('Nom mis à jour')
              else toast.error('Erreur')
            }}>
              💾 Sauvegarder
            </button>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--vert)', fontFamily: 'var(--font-playfair)' }}>
              Classe : {session?.user?.niveau}{session?.user?.div}
            </span>
          </div>
        </Card>
      )}

      {/* Matières par composition */}
      <Card title={`Matières — Classe ${effectifNiveau}${effectifDiv} — ${COMPO_LABELS[effectifCompo]}`}>

        {/* Sélecteurs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {isDirecteur && (
            <>
              <Field label="Niveau">
                <select value={matNiveau} onChange={e => setMatNiveau(e.target.value)}>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Division">
                <select value={matDiv} onChange={e => setMatDiv(e.target.value)}>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="Composition">
            <select value={matCompo} onChange={e => setMatCompo(parseInt(e.target.value))}>
              {COMPOS.map(c => <option key={c} value={c}>{COMPO_LABELS[c]}</option>)}
            </select>
          </Field>
        </div>

        {matieres.length > 0 ? (
          <div className="table-wrap" style={{ marginBottom: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Matière</th>
                  <th>Barème</th>
                  <th>Coef.</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m, i) => (
                  <tr key={m.id}>
                    <td>{i + 1}</td>
                    <td><strong>{m.nom}</strong></td>
                    <td>/20</td>
                    <td><strong>{m.coef ?? 1}</strong></td>
                    <td className="no-print">
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditMatiere(m)}>✏️</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            toast((t) => (
                              <span>
                                Supprimer <strong>{m.nom}</strong> ?{' '}
                                <button className="btn btn-danger btn-sm"
                                  onClick={() => { deleteMatiere.mutate(m.id); toast.dismiss(t.id) }}>
                                  Confirmer
                                </button>{' '}
                                <button className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(t.id)}>
                                  Annuler
                                </button>
                              </span>
                            ), { duration: 5000 })
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--txt2)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Aucune matière pour cette composition. Ajoutez-en ci-dessous.
          </p>
        )}

        {/* Formulaire ajout matière */}
        <FormGrid>
          <Field label="Nom de la matière">
            <input
              type="text" value={newMat.nom} placeholder="Ex : Mathématiques"
              onChange={e => setNewMat(m => ({ ...m, nom: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddMatiere()}
            />
          </Field>
          <Field label="Coefficient">
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex : 4"
              value={newMat.coef === 0 ? '' : newMat.coef}
              style={{ width: 100 }}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setNewMat(m => ({ ...m, coef: val === '' ? 0 : parseInt(val) }))
              }}
            />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleAddMatiere} disabled={addMatiere.isPending}>
              ➕ Ajouter
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--txt2)', paddingBottom: '2px' }}>
              Noté sur 20
            </span>
          </div>
        </FormGrid>
      </Card>
    </>
  )
}