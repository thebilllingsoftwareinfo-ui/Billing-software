import type { Metadata } from 'next'
import { getServerSession } from '@/lib/auth/session'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export const metadata: Metadata = {
  title: 'Wevly BusinessOS — Dashboard',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <DashboardShell
      orgName={session.organization.name}
      userName={session.user.full_name}
      userEmail={session.user.email}
      businessCategory={session.organization.business_category}
    >
      {children}
    </DashboardShell>
  )
}
