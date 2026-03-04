// src/components/ui/Card.tsx
import styles from './Card.module.css'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      {title && <div className={styles.title}>{title}</div>}
      {children}
    </div>
  )
}

// ── FormGrid ───────────────────────────────────────────────────
export function FormGrid({ children, cols }: { children: React.ReactNode; cols?: string }) {
  return (
    <div
      className={styles.formGrid}
      style={cols ? { gridTemplateColumns: cols } : undefined}
    >
      {children}
    </div>
  )
}

// ── SelectorBar ───────────────────────────────────────────────
export function SelectorBar({ children }: { children: React.ReactNode }) {
  return <div className={styles.selectorBar}>{children}</div>
}

// ── Field ─────────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────
export function StatCard({
  value,
  label,
  color = 'vert',
}: {
  value: string | number
  label: string
  color?: 'vert' | 'or' | 'rouge' | 'bleu' | 'violet'
}) {
  const bg: Record<string, string> = {
    vert:   'linear-gradient(135deg, var(--vert) 0%, #2d9a56 100%)',
    or:     'linear-gradient(135deg, var(--or) 0%, #e0a830 100%)',
    rouge:  'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
    bleu:   'linear-gradient(135deg, #1a5276 0%, #2980b9 100%)',
    violet: 'linear-gradient(135deg, #5d4e75, #8e6ba6)',
  }
  return (
    <div className="stat-card" style={{ background: bg[color] }}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  )
}

// ── StatsGrid ─────────────────────────────────────────────────
export function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.statsGrid}>{children}</div>
}
