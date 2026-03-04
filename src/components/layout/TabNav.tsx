'use client'
// src/components/layout/TabNav.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './TabNav.module.css'

const TABS = [
  { href: '/configuration', label: '⚙️ Configuration',  key: 'config' },
  { href: '/eleves',        label: '👨‍🎓 Élèves',         key: 'eleves' },
  { href: '/notes',         label: '📝 Notes',           key: 'notes' },
  { href: '/synthese',      label: '📊 Synthèse',        key: 'synthese' },
  { href: '/bulletins',     label: '🖨️ Bulletins',       key: 'bulletins' },
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
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
