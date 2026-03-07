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
  matiere, groupesExistants, onClose, onSave, isPending,
}: {
  matiere: Matiere
  groupesExistants: string[]
  onClose: () => void
  onSave: (nom: string, coef: number, bareme: number, groupeNom: string | null) => void
  isPending: boolean
}) {
  const [nom, setNom]           = useState(matiere.nom)
  const [coef, setCoef]         = useState(matiere.coef)
  const [bareme, setBareme]     = useState(matiere.bareme)
  const [groupe, setGroupe]     = useState(matiere.groupeNom ?? '')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = groupesExistants.filter(
    g => g.toLowerCase().includes(groupe.toLowerCase()) && g !== groupe
  )

  function handleSubmit() {
    if (!nom.trim())   { toast.error('Entrez le nom');        return }
    if (bareme < 1)    { toast.error('Barème invalide');      return }
    onSave(nom.trim(), coef, bareme, groupe.trim() || null)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>✏️ Modifier la matière</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Nom de la matière</label>
            <input type="text" value={nom} autoFocus onChange={e => setNom(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label>Noté sur</label>
            <input type="text" inputMode="numeric" value={bareme === 0 ? '' : bareme} style={{ width: 90 }}
              onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setBareme(v === '' ? 0 : parseInt(v)) }} />
          </div>
          {/* Champ groupe */}
          <div style={{ position: 'relative' }}>
            <label>Groupe <span style={{ fontSize: '0.72rem', color: 'var(--txt2)' }}>(optionnel — ex : Mathématiques)</span></label>
            <input
              type="text"
              value={groupe}
              placeholder="Laisser vide si pas de groupe"
              onChange={e => { setGroupe(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: '#fff', border: '1px solid var(--border)', borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden'
              }}>
                {suggestions.map(g => (
                  <div key={g}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
                    onMouseDown={() => { setGroupe(g); setShowSuggestions(false) }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
            {groupe && (
              <button
                style={{ position: 'absolute', right: 8, top: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1rem' }}
                onClick={() => setGroupe('')}
              >✕</button>
            )}
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

  const [matNiveau, setMatNiveau] = useState('CI')
  const [matDiv, setMatDiv]       = useState('A')
  const [matCompo, setMatCompo]   = useState(1)

  const effectifNiveau = isDirecteur ? matNiveau : (session?.user?.niveau ?? 'CI')
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

  // Groupes existants (uniques, non null)
  const groupesExistants: string[] = Array.from(
    new Set(matieres.map(m => m.groupeNom).filter(Boolean) as string[])
  )

  const [form, setForm] = useState({
    nomEcole: '', annee: '', nomDirecteur: '', localite: '', nomMaitre: '',
    classeActive: 'CI', divActive: 'A',
  })
  const [newMat, setNewMat]                 = useState({ nom: '', coef: 1, bareme: 10, groupeNom: '' })
  const [editMatiere, setEditMatiere]       = useState<Matiere | null>(null)
  const [showGroupeSuggestions, setShowGroupeSuggestions] = useState(false)

  const groupeSuggestions = groupesExistants.filter(
    g => g.toLowerCase().includes(newMat.groupeNom.toLowerCase()) && g !== newMat.groupeNom
  )

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
      fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); toast.success('Configuration sauvegardée') },
    onError: () => toast.error('Accès refusé — seul le directeur peut modifier la configuration'),
  })

  const addMatiere = useMutation({
    mutationFn: (data: { nom: string; coef: number; bareme: number; groupeNom: string | null; compo: number; niveau?: string; div?: string }) =>
      fetch('/api/matieres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres', effectifNiveau, effectifDiv, effectifCompo] })
      setNewMat({ nom: '', coef: 1, bareme: 10, groupeNom: '' })
      toast.success('Matière ajoutée')
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  })

  const updateMatiere = useMutation({
    mutationFn: ({ id, nom, coef, bareme, groupeNom }: { id: number; nom: string; coef: number; bareme: number; groupeNom: string | null }) =>
      fetch(`/api/matieres/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, coef, bareme, groupeNom }),
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
    if (!newMat.nom.trim()) { toast.error('Entrez le nom de la matière'); return }
    if (!newMat.bareme || newMat.bareme < 1) { toast.error('Entrez un barème valide'); return }
    const payload = {
      ...newMat,
      groupeNom: newMat.groupeNom.trim() || null,
      compo: effectifCompo,
      ...(isDirecteur ? { niveau: effectifNiveau, div: effectifDiv } : {}),
    }
    addMatiere.mutate(payload)
  }

  return (
    <>
      {editMatiere && (
        <EditMatiereModal
          matiere={editMatiere}
          groupesExistants={groupesExistants}
          onClose={() => setEditMatiere(null)}
          onSave={(nom, coef, bareme, groupeNom) => updateMatiere.mutate({ id: editMatiere.id, nom, coef, bareme, groupeNom })}
          isPending={updateMatiere.isPending}
        />
      )}

      {isDirecteur && (
        <Card title="Informations de l'établissement">
          <FormGrid>
            <Field label="Nom de l'école">
              <input type="text" value={form.nomEcole} placeholder="Ex : École Élémentaire Dakar"
                onChange={e => handleFieldChange('nomEcole', e.target.value)} />
            </Field>
            <Field label="Année scolaire">
              <input type="text" value={form.annee} placeholder="Ex : 2025 - 2026"
                onChange={e => handleFieldChange('annee', e.target.value)} />
            </Field>
            <Field label="Nom du directeur">
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
        <Card title="Mon profil de classe">
          <FormGrid>
            <Field label="Mon nom (affiché sur les bulletins)">
              <input type="text" value={form.nomMaitre} placeholder="Ex : Mme Faye"
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
                  <th>Groupe</th>
                  <th>Barème</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m, i) => (
                  <tr key={m.id}>
                    <td>{i + 1}</td>
                    <td><strong>{m.nom}</strong></td>
                    <td>
                      {m.groupeNom
                        ? <span style={{ background: 'var(--vert)', color: '#fff', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {m.groupeNom}
                          </span>
                        : <span style={{ color: 'var(--txt2)', fontSize: '0.75rem' }}>—</span>
                      }
                    </td>
                    <td>/{m.bareme}</td>
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
            <input type="text" value={newMat.nom} placeholder="Ex : Activité numérique"
              onChange={e => setNewMat(m => ({ ...m, nom: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddMatiere()} />
          </Field>
          <Field label="Noté sur">
            <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex : 10"
              value={newMat.bareme === 0 ? '' : newMat.bareme} style={{ width: 100 }}
              onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setNewMat(m => ({ ...m, bareme: val === '' ? 0 : parseInt(val) })) }} />
          </Field>
          {/* Champ groupe avec autocomplete */}
          <Field label="Groupe (optionnel)">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={newMat.groupeNom}
                placeholder="Ex : Mathématiques"
                onChange={e => { setNewMat(m => ({ ...m, groupeNom: e.target.value })); setShowGroupeSuggestions(true) }}
                onFocus={() => setShowGroupeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowGroupeSuggestions(false), 150)}
              />
              {newMat.groupeNom && (
                <button
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
                  onClick={() => setNewMat(m => ({ ...m, groupeNom: '' }))}
                >✕</button>
              )}
              {showGroupeSuggestions && groupeSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden'
                }}>
                  {groupeSuggestions.map(g => (
                    <div key={g}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
                      onMouseDown={() => { setNewMat(m => ({ ...m, groupeNom: g })); setShowGroupeSuggestions(false) }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {g}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleAddMatiere} disabled={addMatiere.isPending}>
              ➕ Ajouter
            </button>
          </div>
        </FormGrid>

        {/* Légende groupes existants */}
        {groupesExistants.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8fffe', border: '1px solid #c3e6cb', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--txt2)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Groupes existants
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {groupesExistants.map(g => (
                <span key={g} style={{ background: 'var(--vert)', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  )
}