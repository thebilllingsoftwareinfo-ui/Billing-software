import { EmptyState } from '@/components/common/empty-state'
import { Truck, Plus } from 'lucide-react'
import Link from 'next/link'

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suppliers & Vendors</h1>
          <p className="text-xs text-gray-500 mt-1">Directory of wholesale suppliers, manufacturers, and vendor ledgers.</p>
        </div>
        <Link
          href="/suppliers?action=new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </Link>
      </div>

      <EmptyState
        icon={Truck}
        title="No suppliers added yet"
        description="Add your vendors and suppliers to track purchase histories, balances, and payment terms."
        actionLabel="+ Add Supplier"
        actionHref="/suppliers?action=new"
      />
    </div>
  )
}
