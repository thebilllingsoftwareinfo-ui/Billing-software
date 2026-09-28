import { getServerSession } from '@/lib/auth/session'
import type { BusinessCategory } from '@/types/app.types'
import { DashboardSwitcherContainer } from '@/components/dashboards/dashboard-switcher-container'
import { createClient } from '@/lib/supabase/server'
import { demoGetInvoices } from '@/lib/services/demo-store'

export default async function DashboardPage() {
  const session = await getServerSession()
  const category: BusinessCategory = session.organization.business_category ?? 'retail'

  let hasInvoices = false
  const isDemo =
    Boolean(session.user?.email?.includes('demo')) ||
    Boolean(session.user_id?.includes('demo')) ||
    session.organization?.id === '11111111-1111-1111-1111-111111111111' ||
    session.organization_id === '11111111-1111-1111-1111-111111111111' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY

  if (isDemo) {
    const demo = demoGetInvoices({ limit: 1 })
    hasInvoices = Boolean(demo.invoices && demo.invoices.length > 0)
  } else {
    try {
      const supabase = await createClient()
      const { count } = await Promise.race([
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', session.organization.id),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Supabase timeout')), 800)),
      ])
      hasInvoices = (count ?? 0) > 0
    } catch {
      hasInvoices = false
    }
  }

  return (
    <DashboardSwitcherContainer
      initialCategory={category}
      organizationId={session.organization.id}
      hasInvoices={hasInvoices}
    />
  )
}

