'use client'
// src/components/layout/TabNav.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './TabNav.module.css'

const TABS = [
  { href: '/configuration', emoji: '⚙️', label: 'Config',    key: 'config' },
  { href: '/eleves',        emoji: '👨‍🎓', label: 'Élèves',    key: 'eleves' },
  { href: '/notes',         emoji: '📝', label: 'Notes',     key: 'notes' },
  { href: '/synthese',      emoji: '📊', label: 'Synthèse',  key: 'synthese' },
  { href: '/bulletins',     emoji: '🖨️', label: 'Bulletins', key: 'bulletins' },
]

export default function TabNav() {
  const pathname = usePathname()
  return (
    <nav className={styles.tabs}>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`${styles.tab} ${pathname === tab.href ? styles.active : ''}`}
        >
          <span className={styles.emoji}>{tab.emoji}</span>
          <span className={styles.label}>{tab.label}</span>
        </Link>
      ))}
    </nav>
  )
}