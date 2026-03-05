'use client'
// src/app/(dashboard)/configuration/page.tsx
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Card, FormGrid, Field } from '@/components/ui/Card'
import { NIVEAUX, DIVISIONS } from '@/lib/utils'
import type { Config, Matiere } from '@/types'

const fetchConfig = (): Promise<Config> => fetch('/api/config').then(r => r.json())

export default function ConfigurationPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const isDirecteur = session?.user?.role === 'directeur'

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: fetchConfig })

  // Pour le directeur : choisir la classe dont on gère les matières
  const [matNiveau, setMatNiveau] = useState('CI')
  const [matDiv, setMatDiv]       = useState('A')

  // Niveau/div effectifs pour les matières
  const effectifNiveau = isDirecteur ? matNiveau : (session?.user?.niveau ?? 'CI')
  const effectifDiv    = isDirecteur ? matDiv    : (session?.user?.div    ?? 'A')

  const { data: matieres = [] } = useQuery<Matiere[]>({
    queryKey: ['matieres', effectifNiveau, effectifDiv],
    queryFn: () => fetch(`/api/matieres?niveau=${effectifNiveau}&div=${effectifDiv}`).then(r => r.json()),
    enabled: !!session,
  })

  const [form, setForm] = useState({
    nomEcole: '', annee: '', nomDirecteur: '', localite: '', nomMaitre: '',
    classeActive: 'CI', divActive: 'A',
  })
  const [newMat, setNewMat] = useState({ nom: '', coef: 0, bareme: 0 })

  useEffect(() => {
    if (config) setForm(f => ({ ...f, ...config }))
  }, [config])

  useEffect(() => {
  if (config) setForm(f => ({ ...f, ...config }))
}, [config])

// Charger le vrai nom du maître connecté
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
    mutationFn: (data: { nom: string; coef: number; bareme: number; niveau?: string; div?: string }) =>
      fetch('/api/matieres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres', effectifNiveau, effectifDiv] })
      setNewMat({ nom: '', coef: 0, bareme: 0 })
      toast.success('Matière ajoutée')
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  })

  const deleteMatiere = useMutation({
    mutationFn: (id: number) => fetch(`/api/matieres/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres', effectifNiveau, effectifDiv] })
      toast.success('Matière supprimée')
    },
  })

  function handleFieldChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleAddMatiere() {
    if (!newMat.nom.trim()) { toast.error('Entrez le nom de la matière'); return }
    if (!newMat.coef || newMat.coef < 1) { toast.error('Entrez un coefficient valide'); return }
    if (!newMat.bareme || newMat.bareme < 1) { toast.error('Entrez un barème valide'); return }
    addMatiere.mutate(
      isDirecteur
        ? { ...newMat, niveau: effectifNiveau, div: effectifDiv }
        : newMat
    )
  }

  return (
    <>
      {/* Établissement — directeur seulement */}
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

      {/* Nom du maître — visible par le maître uniquement */}
      {!isDirecteur && (
  <Card title="Mon profil de classe">
    <FormGrid>
      <Field label="Mon nom (affiché sur les bulletins)">
        <input
          type="text"
          value={form.nomMaitre}
          placeholder="Ex : Mme Faye"
          onChange={e => handleFieldChange('nomMaitre', e.target.value)}
        />
      </Field>
    </FormGrid>
    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <button
        className="btn btn-primary"
        onClick={async () => {
          const r = await fetch('/api/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom: form.nomMaitre }),
          })
          if (r.ok) toast.success('Nom mis à jour')
          else toast.error('Erreur')
        }}
      >
        💾 Sauvegarder
      </button>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--vert)', fontFamily: 'var(--font-playfair)' }}>
        Classe : {session?.user?.niveau}{session?.user?.div}
      </span>
    </div>
  </Card>
)}

      {/* Matières */}
      <Card title={`Matières — Classe ${effectifNiveau}${effectifDiv}`}>

        {/* Sélecteur de classe pour le directeur */}
        {isDirecteur && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
          </div>
        )}

        {matieres.length > 0 ? (
          <div className="table-wrap" style={{ marginBottom: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Matière</th>
                  <th>Coef</th>
                  <th>Barème</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m, i) => (
                  <tr key={m.id}>
                    <td>{i + 1}</td>
                    <td><strong>{m.nom}</strong></td>
                    <td>{m.coef}</td>
                    <td>/{m.bareme}</td>
                    <td className="no-print">
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
                              <button className="btn btn-secondary btn-sm"
                                onClick={() => toast.dismiss(t.id)}>
                                Annuler
                              </button>
                            </span>
                          ), { duration: 5000 })
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--txt2)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Aucune matière pour cette classe. Ajoutez-en ci-dessous.
          </p>
        )}

        <FormGrid>
          <Field label="Nom de la matière">
            <input type="text" value={newMat.nom} placeholder="Ex : Mathématiques"
              onChange={e => setNewMat(m => ({ ...m, nom: e.target.value }))} />
          </Field>
          <Field label="Coefficient">
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              placeholder="Ex : 2"
              value={newMat.coef === 0 ? '' : newMat.coef}
              style={{ width: 100 }}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setNewMat(m => ({ ...m, coef: val === '' ? 0 : parseInt(val) }))
              }}
            />
          </Field>
          <Field label="Noté sur">
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              placeholder="Ex : 20"
              value={newMat.bareme === 0 ? '' : newMat.bareme}
              style={{ width: 100 }}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '')
                setNewMat(m => ({ ...m, bareme: val === '' ? 0 : parseInt(val) }))
              }}
            />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleAddMatiere} disabled={addMatiere.isPending}>
              ➕ Ajouter
            </button>
          </div>
        </FormGrid>
      </Card>
    </>
  )
}