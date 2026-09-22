import { EmptyState } from '@/components/common/empty-state'
import { Calculator } from 'lucide-react'

export default function GSTPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">GST Compliance & Filing</h1>
        <p className="text-xs text-gray-500 mt-1">GSTR-1, GSTR-3B summary reports, HSN breakdown, and tax liability calculator.</p>
      </div>

      <EmptyState
        icon={Calculator}
        title="No GST transactions recorded for this period"
        description="Outward B2B/B2C sales and inward purchases will generate GSTR-1 and ITC summaries automatically."
      />
    </div>
  )
}
