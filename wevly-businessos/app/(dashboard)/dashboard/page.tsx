import { getServerSession } from '@/lib/auth/session'
import type { BusinessCategory } from '@/types/app.types'

// Category-specific dashboard components (lazy imported at build time)
import RetailDashboard from '@/components/dashboards/retail-dashboard'
import WholesaleDashboard from '@/components/dashboards/wholesale-dashboard'
import ServicesDashboard from '@/components/dashboards/services-dashboard'
import ManufacturingDashboard from '@/components/dashboards/manufacturing-dashboard'
import RestaurantDashboard from '@/components/dashboards/restaurant-dashboard'
import FreelancerDashboard from '@/components/dashboards/freelancer-dashboard'
import JewelryDashboard from '@/components/dashboards/jewelry-dashboard'
import MedicalDashboard from '@/components/dashboards/medical-dashboard'

export default async function DashboardPage() {
  const session = await getServerSession()
  const category: BusinessCategory = session.organization.business_category ?? 'retail'

  switch (category) {
    case 'retail':
      return <RetailDashboard />
    case 'wholesale':
      return <WholesaleDashboard />
    case 'services':
      return <ServicesDashboard />
    case 'manufacturing':
      return <ManufacturingDashboard />
    case 'restaurant':
      return <RestaurantDashboard />
    case 'freelancer':
      return <FreelancerDashboard />
    case 'jewelry':
      return <JewelryDashboard />
    case 'medical':
      return <MedicalDashboard />
    default:
      return <RetailDashboard />
  }
}
