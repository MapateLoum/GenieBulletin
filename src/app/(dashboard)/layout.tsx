// src/app/(dashboard)/layout.tsx
import Header from '@/components/layout/Header'
import TabNav from '@/components/layout/TabNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <TabNav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem',paddingBottom: '70px' }}>
        {children}
      </main>
    </>
  )
}
