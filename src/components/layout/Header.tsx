// src/components/layout/Header.tsx
'use client'
import { useSession, signOut } from 'next-auth/react'
import styles from './Header.module.css'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>📚 GénieBulletin</h1>
        <span className={styles.sub}>Gestion des bulletins scolaires — École primaire</span>
      </div>

      <div className={styles.right}>
        {session?.user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {session.user.role === 'directeur' ? '👑' : '👤'} {session.user.name}
            </span>
            {session.user.role === 'maitre' && session.user.niveau && (
              <span className={styles.userClasse}>
                Classe {session.user.niveau}{session.user.div}
              </span>
            )}
          </div>
        )}
        <div className={styles.badge}>🇸🇳 Sénégal</div>
        <button
          className={styles.logoutBtn}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          🚪 Déconnexion
        </button>
      </div>
    </header>
  )
}