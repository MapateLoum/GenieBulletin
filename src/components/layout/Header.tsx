// src/components/layout/Header.tsx
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>📚 GénieBulletin</h1>
        <span className={styles.sub}>Gestion des bulletins scolaires — École primaire</span>
      </div>
      <div className={styles.badge}>🇸🇳 Sénégal</div>
    </header>
  )
}
