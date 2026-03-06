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

// ── Modale d'édition ─────────────────────────────────────────
function EditUserModal({
  user,
  onClose,
  onSave,
  isPending,
}: {
  user: User
  onClose: () => void
  onSave: (data: { nom: string; email: string; password: string; niveau: string; div: string }) => void
  isPending: boolean
}) {
  const [nom, setNom]           = useState(user.nom)
  const [email, setEmail]       = useState(user.email)
  const [password, setPassword] = useState('')
  const [niveau, setNiveau]     = useState(user.niveau ?? 'CI')
  const [div, setDiv]           = useState(user.div ?? 'A')

  function handleSubmit() {
    if (!nom.trim())   { toast.error('Entrez le nom');    return }
    if (!email.trim()) { toast.error("Entrez l'email");   return }
    if (password && password.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères'); return }
    onSave({ nom: nom.trim(), email: email.trim(), password, niveau, div })
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
          maxWidth: '480px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>
          ✏️ Modifier — {user.nom}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Nom complet</label>
            <input type="text" value={nom} autoFocus onChange={e => setNom(e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label>
              Nouveau mot de passe{' '}
              <span style={{ color: 'var(--txt2)', fontWeight: 400 }}>(laisser vide pour ne pas changer)</span>
            </label>
            <input
              type="password"
              placeholder="6 caractères minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label>Niveau</label>
              <select value={niveau} onChange={e => setNiveau(e.target.value)}>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Division</label>
              <select value={div} onChange={e => setDiv(e.target.value)}>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
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
export default function UtilisateursPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    email: '', password: '', nom: '', role: 'maitre', niveau: 'CI', div: 'A',
  })
  const [editUser, setEditUser] = useState<User | null>(null)

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
      }).then(async r => {
        if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? 'Erreur') }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      setForm({ email: '', password: '', nom: '', role: 'maitre', niveau: 'CI', div: 'A' })
      toast.success('Utilisateur créé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }: { id: number; nom: string; email: string; password: string; niveau: string; div: string }) =>
      fetch(`/api/utilisateurs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async r => {
        if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? 'Erreur') }
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      setEditUser(null)
      toast.success('Utilisateur modifié')
    },
    onError: (e: Error) => toast.error(e.message),
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
    if (!form.email || !form.password || !form.nom) { toast.error('Remplissez tous les champs'); return }
    if (form.password.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères'); return }
    addUser.mutate(form)
  }

  return (
    <>
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={(data) => updateUser.mutate({ id: editUser.id, ...data })}
          isPending={updateUser.isPending}
        />
      )}

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
                  <th className="no-print">Actions</th>
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditUser(u)}
                          >
                            ✏️
                          </button>
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
                        </div>
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
            <input type="text" placeholder="Ex : Mme Faye" value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input type="email" placeholder="email@ecole.sn" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Mot de passe">
            <input type="password" placeholder="Min. 6 caractères" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
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
          <button className="btn btn-primary" onClick={handleAdd} disabled={addUser.isPending}>
            ➕ Créer l'utilisateur
          </button>
        </div>
      </Card>
    </>
  )
}