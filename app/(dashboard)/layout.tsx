import type { Metadata } from 'next'
import { getServerSession } from '@/lib/auth/session'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { getSubscriptionStatus } from '@/lib/services/subscription.service'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'

export const metadata: Metadata = {
  title: 'VANIRA — Smart GST Billing & Business Accounting',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  const { isActive, isExpired, daysRemaining } = await getSubscriptionStatus()

  return (
    <>
      <SubscriptionBanner isActive={isActive} isExpired={isExpired} daysRemaining={daysRemaining} />
      <DashboardShell
        orgName={session.organization.name}
        userName={session.user.full_name}
        userEmail={session.user.email}
        businessCategory={session.organization.business_category}
      >
        {children}
      </DashboardShell>
    </>
  )
}
