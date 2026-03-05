'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type Step =
  | 'login'         // formulaire de connexion
  | 'forgot-email'  // saisie email pour reset
  | 'forgot-code'   // saisie code + nouveau mot de passe

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  // Forgot password
  const [resetEmail, setResetEmail]   = useState('')
  const [resetCode, setResetCode]     = useState('')
  const [nouveauMdp, setNouveauMdp]   = useState('')
  const [confirmMdp, setConfirmMdp]   = useState('')
  const [sending, setSending]         = useState(false)
  const [resetting, setResetting]     = useState(false)

  async function handleLogin() {
    if (!email || !password) { toast.error('Remplissez tous les champs'); return }
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      toast.error('Email ou mot de passe incorrect')
    } else {
      toast.success('Connexion réussie')
      router.push('/configuration')
      router.refresh()
    }
  }

  async function handleSendCode() {
    if (!resetEmail) { toast.error('Entrez votre email'); return }
    setSending(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      // Toujours afficher succès (sécurité)
      toast.success('Si cet email existe, un code a été envoyé 📧')
      setStep('forgot-code')
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setSending(false)
    }
  }

  async function handleResetPassword() {
    if (!resetCode)             { toast.error('Entrez le code reçu par email'); return }
    if (nouveauMdp.length < 6)  { toast.error('Le mot de passe doit faire au moins 6 caractères'); return }
    if (nouveauMdp !== confirmMdp) { toast.error('Les mots de passe ne correspondent pas'); return }

    setResetting(true)
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, nouveau: nouveauMdp }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error ?? 'Erreur')
      } else {
        toast.success('Mot de passe réinitialisé ! Connectez-vous.')
        setStep('login')
        setResetEmail(''); setResetCode(''); setNouveauMdp(''); setConfirmMdp('')
      }
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setResetting(false)
    }
  }

  function handleRetourLogin() {
    setStep('login')
    setResetEmail(''); setResetCode(''); setNouveauMdp(''); setConfirmMdp('')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '2.5rem 2rem',
        width: '100%', maxWidth: 400, boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📚</div>
          <h1 style={{
            fontFamily: 'var(--font-playfair)', fontSize: '1.6rem',
            color: 'var(--vert)', fontWeight: 700,
          }}>
            GénieBulletin
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--txt2)', marginTop: 4 }}>
            {step === 'login'        ? 'Gestion des bulletins scolaires' :
             step === 'forgot-email' ? 'Réinitialisation du mot de passe' :
                                       'Entrez le code reçu par email'}
          </p>
        </div>

        {/* ── ÉTAPE 1 : Connexion ── */}
        {step === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="email"
              />
            </div>
            <div>
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleLogin}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            >
              {loading ? 'Connexion...' : '🔐 Se connecter'}
            </button>
            <button
              onClick={() => setStep('forgot-email')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--vert)', fontSize: '0.85rem', textAlign: 'center',
                textDecoration: 'underline', padding: 0,
              }}
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Saisie email ── */}
        {step === 'forgot-email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--txt2)', margin: 0 }}>
              Entrez votre adresse email. Si elle est enregistrée, vous recevrez un code à 6 chiffres valable 15 minutes.
            </p>
            <div>
              <label>Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSendCode}
              disabled={sending}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {sending ? 'Envoi...' : '📧 Envoyer le code'}
            </button>
            <button
              onClick={handleRetourLogin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt2)', fontSize: '0.85rem', textAlign: 'center',
                textDecoration: 'underline', padding: 0,
              }}
            >
              ← Retour à la connexion
            </button>
          </div>
        )}

        {/* ── ÉTAPE 3 : Code + nouveau mot de passe ── */}
        {step === 'forgot-code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--txt2)', margin: 0 }}>
              Un code a été envoyé à <strong>{resetEmail}</strong>. Entrez-le ci-dessous avec votre nouveau mot de passe.
            </p>
            <div>
              <label>Code à 6 chiffres</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={resetCode}
                onChange={e => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
                style={{ letterSpacing: '6px', fontSize: '1.2rem', textAlign: 'center' }}
              />
            </div>
            <div>
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                placeholder="6 caractères minimum"
                value={nouveauMdp}
                onChange={e => setNouveauMdp(e.target.value)}
              />
            </div>
            <div>
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmMdp}
                onChange={e => setConfirmMdp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleResetPassword}
              disabled={resetting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {resetting ? 'Enregistrement...' : '🔒 Réinitialiser le mot de passe'}
            </button>
            <button
              onClick={() => setStep('forgot-email')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--txt2)', fontSize: '0.85rem', textAlign: 'center',
                textDecoration: 'underline', padding: 0,
              }}
            >
              ← Renvoyer un code
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--txt2)', marginTop: '1.5rem' }}>
          🇸🇳 École Primaire — Sénégal
        </p>
      </div>
    </div>
  )
}