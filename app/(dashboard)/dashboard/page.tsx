import { getServerSession } from '@/lib/auth/session'
import type { BusinessCategory } from '@/types/app.types'
import { DashboardSwitcherContainer } from '@/components/dashboards/dashboard-switcher-container'
import { createClient } from '@/lib/supabase/server'
import { demoGetInvoices } from '@/lib/services/demo-store'

export default async function DashboardPage() {
  const session = await getServerSession()
  const category: BusinessCategory = session.organization.business_category ?? 'retail'

  let hasInvoices = false
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organization.id)
    hasInvoices = (count ?? 0) > 0
  } catch {
    hasInvoices = false
  }

  // Fallback: in demo mode or when demo data is used
  if (!hasInvoices) {
    const demo = demoGetInvoices({ limit: 1 })
    if (demo.invoices && demo.invoices.length > 0) {
      hasInvoices = true
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

