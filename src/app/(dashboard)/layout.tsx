// src/app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Header from '@/components/layout/Header'
import TabNav from '@/components/layout/TabNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <>
      <Header />
      <TabNav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', paddingBottom: '70px' }}>
        {children}
      </main>
    </>
  )
}