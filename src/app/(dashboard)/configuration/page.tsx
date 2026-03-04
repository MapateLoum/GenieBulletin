'use client'
// src/app/(dashboard)/configuration/page.tsx
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card, FormGrid, Field } from '@/components/ui/Card'
import { NIVEAUX, DIVISIONS } from '@/lib/utils'
import type { Config, Matiere } from '@/types'

// ── API helpers ───────────────────────────────────────────────
const fetchConfig = (): Promise<Config> => fetch('/api/config').then(r => r.json())
const fetchMatieres = (): Promise<Matiere[]> => fetch('/api/matieres').then(r => r.json())

export default function ConfigurationPage() {
  const qc = useQueryClient()
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: fetchConfig })
  const { data: matieres = [] } = useQuery({ queryKey: ['matieres'], queryFn: fetchMatieres })

  const [form, setForm] = useState({
    nomEcole: '', annee: '', nomDirecteur: '', localite: '', nomMaitre: '',
    classeActive: 'CI', divActive: 'A',
  })

  const [newMat, setNewMat] = useState({ nom: '', coef: 0, bareme: 20 })

  useEffect(() => {
    if (config) setForm({ ...form, ...config })
  }, [config])

  const updateConfig = useMutation({
    mutationFn: (data: Partial<Config>) =>
      fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
      toast.success('Configuration sauvegardée')
    },
  })

  const addMatiere = useMutation({
    mutationFn: (data: { nom: string; coef: number; bareme: number }) =>
      fetch('/api/matieres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres'] })
      setNewMat({ nom: '', coef: 1, bareme: 20 })
      toast.success('Matière ajoutée')
    },
  })

  const deleteMatiere = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/matieres/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matieres'] })
      toast.success('Matière supprimée')
    },
  })

  function handleFieldChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSaveConfig() {
    updateConfig.mutate(form)
  }

  function handleAddMatiere() {
    if (!newMat.nom.trim()) { toast.error('Entrez le nom de la matière'); return }
    addMatiere.mutate(newMat)
  }

  return (
    <>
      {/* Établissement */}
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
          <button className="btn btn-primary" onClick={handleSaveConfig}>
            💾 Sauvegarder
          </button>
        </div>
      </Card>

      {/* Classe active */}
      <Card title="Classe active">
        <FormGrid>
          <Field label="Niveau">
            <select value={form.classeActive} onChange={e => handleFieldChange('classeActive', e.target.value)}>
              {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Division">
            <select value={form.divActive} onChange={e => handleFieldChange('divActive', e.target.value)}>
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Nom du maître/maîtresse">
            <input type="text" value={form.nomMaitre} placeholder="Ex : Mme Faye"
              onChange={e => handleFieldChange('nomMaitre', e.target.value)} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSaveConfig}>
              Enregistrer →
            </button>
          </div>
        </FormGrid>
        <div style={{ marginTop: '1rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--vert)', fontFamily: 'var(--font-playfair)' }}>
            Classe sélectionnée : {form.classeActive}{form.divActive}
          </span>
        </div>
      </Card>

      {/* Matières */}
      <Card title="Matières et coefficients">
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
      <button className="btn btn-danger btn-sm" onClick={() => { deleteMatiere.mutate(m.id); toast.dismiss(t.id) }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--txt2)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Aucune matière. Ajoutez des matières ci-dessous.
          </p>
        )}

        <FormGrid>
          <Field label="Nom de la matière">
            <input type="text" value={newMat.nom} placeholder="Ex : Mathématiques"
              onChange={e => setNewMat(m => ({ ...m, nom: e.target.value }))} />
          </Field>
          <Field label="Coefficient">
            <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ex : 2"
            value={newMat.coef === 0 ? '' : newMat.coef}
            style={{ width: 100 }}
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, '')
              setNewMat(m => ({ ...m, coef: val === '' ? 0 : parseInt(val) }))
            }}/>
          </Field>
          <Field label="Noté sur">
            <select value={newMat.bareme} onChange={e => setNewMat(m => ({ ...m, bareme: parseInt(e.target.value) }))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={100}>100</option>
            </select>
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleAddMatiere}>
              ➕ Ajouter
            </button>
          </div>
        </FormGrid>
      </Card>
    </>
  )
}
