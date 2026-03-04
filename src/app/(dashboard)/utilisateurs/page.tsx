'use client'
// src/app/(dashboard)/utilisateurs/page.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, FormGrid, Field } from '@/components/ui/Card'
import { NIVEAUX, DIVISIONS } from '@/lib/utils'

type User = {
  id: number
  email: string
  nom: string
  role: string
  niveau: string | null
  div: string | null
  createdAt: string
}

export default function UtilisateursPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    email: '', password: '', nom: '', role: 'maitre', niveau: 'CI', div: 'A',
  })

  // Rediriger si pas directeur
  if (status === 'authenticated' && session?.user?.role !== 'directeur') {
    router.push('/eleves')
    return null
  }

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['utilisateurs'],
    queryFn: () => fetch('/api/utilisateurs').then(r => r.json()),
    enabled: status === 'authenticated',
  })

  const addUser = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/utilisateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      setForm({ email: '', password: '', nom: '', role: 'maitre', niveau: 'CI', div: 'A' })
      toast.success('Utilisateur créé')
    },
    onError: () => toast.error('Email déjà utilisé ou erreur'),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/utilisateurs/${id}`, { method: 'DELETE' }).then(r => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      toast.success('Utilisateur supprimé')
    },
    onError: () => toast.error('Impossible de supprimer cet utilisateur'),
  })

  function handleAdd() {
    if (!form.email || !form.password || !form.nom) {
      toast.error('Remplissez tous les champs')
      return
    }
    if (form.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères')
      return
    }
    addUser.mutate(form)
  }

  return (
    <>
      {/* Liste des utilisateurs */}
      <Card title="👥 Gestion des utilisateurs">
        {isLoading ? (
          <p style={{ color: 'var(--txt2)' }}>Chargement...</p>
        ) : users.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👤</div>
            <p>Aucun utilisateur. Ajoutez des maîtres ci-dessous.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ marginBottom: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Classe</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td><strong>{u.nom}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'directeur' ? 'badge-success' : 'badge-info'}`}>
                        {u.role === 'directeur' ? '👑 Directeur' : '👤 Maître'}
                      </span>
                    </td>
                    <td>
                      {u.niveau && u.div
                        ? <strong>{u.niveau}{u.div}</strong>
                        : <span style={{ color: 'var(--txt2)' }}>—</span>}
                    </td>
                    <td className="no-print">
                      {u.role !== 'directeur' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            toast((t) => (
                              <span>
                                Supprimer <strong>{u.nom}</strong> ?{' '}
                                <button className="btn btn-danger btn-sm"
                                  onClick={() => { deleteUser.mutate(u.id); toast.dismiss(t.id) }}>
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Formulaire ajout */}
      <Card title="➕ Ajouter un utilisateur">
        <FormGrid>
          <Field label="Nom complet">
            <input
              type="text"
              placeholder="Ex : Mme Faye"
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              placeholder="email@ecole.sn"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Mot de passe">
            <input
              type="password"
              placeholder="Min. 6 caractères"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label="Rôle">
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="maitre">👤 Maître</option>
              <option value="directeur">👑 Directeur</option>
            </select>
          </Field>
          {form.role === 'maitre' && (
            <>
              <Field label="Niveau">
                <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))}>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Division">
                <select value={form.div} onChange={e => setForm(f => ({ ...f, div: e.target.value }))}>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </>
          )}
        </FormGrid>
        <div style={{ marginTop: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={addUser.isPending}
          >
            ➕ Créer l'utilisateur
          </button>
        </div>
      </Card>
    </>
  )
}