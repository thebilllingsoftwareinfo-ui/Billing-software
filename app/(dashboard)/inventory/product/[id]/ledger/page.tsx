'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/empty-state'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'

interface ProductLedgerPageProps {
  params: Promise<{ id: string }>
}

interface ProductDetails {
  id: string
  name: string
  sku: string | null
  current_stock: number
  reorder_level: number
  primary_unit: string
  secondary_unit?: string | null
  conversion_rate?: number | null
  stock_status: {
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
    label: string
    color: 'green' | 'amber' | 'red'
  }
}

interface MovementRecord {
  id: string
  movement_date: string
  movement_type: string
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  running_balance: number | null
  reference_type: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
}

export default function ProductStockLedgerPage({ params }: ProductLedgerPageProps) {
  const { id: productId } = use(params)
  const router = useRouter()

  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [movementType, setMovementType] = useState('ALL')
  const [direction, setDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLedger = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (dateFrom) sp.set('date_from', dateFrom)
      if (dateTo) sp.set('date_to', dateTo)
      if (movementType !== 'ALL') sp.set('movement_type', movementType)
      if (direction !== 'ALL') sp.set('direction', direction)
      if (reference) sp.set('reference', reference)
      if (reason) sp.set('reason', reason)
      sp.set('page', page.toString())
      sp.set('limit', limit.toString())

      const res = await fetch(`/api/inventory/product/${productId}/movements?${sp.toString()}`)
      const json = await res.json()

      if (json.success) {
        setProduct(json.product)
        setMovements(json.data || [])
        setTotalCount(json.pagination.total || 0)
        setTotalPages(json.pagination.totalPages || 1)
      } else {
        toast.error(json.error || 'Failed to load stock ledger')
      }
    } catch (err) {
      console.error('Failed to load ledger:', err)
      toast.error('Network error loading stock ledger')
    } finally {
      setLoading(false)
    }
  }, [productId, dateFrom, dateTo, movementType, direction, reference, reason, page, limit])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const sp = new URLSearchParams()
      if (dateFrom) sp.set('date_from', dateFrom)
      if (dateTo) sp.set('date_to', dateTo)
      if (movementType !== 'ALL') sp.set('movement_type', movementType)
      if (direction !== 'ALL') sp.set('direction', direction)
      if (reference) sp.set('reference', reference)
      if (reason) sp.set('reason', reason)
      sp.set('format', 'csv')

      const res = await fetch(`/api/inventory/product/${productId}/movements?${sp.toString()}`)
      if (!res.ok) throw new Error('Failed to generate CSV export')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stock-ledger-${(product?.sku || product?.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Stock ledger exported successfully')
    } catch (err: any) {
      console.error('Export error:', err)
      toast.error(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => {
    setDateFrom('')
    setDateTo('')
    setMovementType('ALL')
    setDirection('ALL')
    setReference('')
    setReason('')
    setPage(1)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/inventory')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Product Stock Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable transaction history, chronologically ordered stock movements, and running stock balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLedger()}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => setAdjustmentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            + Adjust Stock
          </button>
        </div>
      </div>

      {/* Product Summary Header Card */}
      {product && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-6">
          <div className="sm:col-span-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Product Name</span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h2>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              SKU: <span className="text-gray-900 font-semibold">{product.sku || 'N/A'}</span>
            </p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Current Stock</span>
            <div className="text-xl font-black text-gray-900 mt-1">
              {product.current_stock} <span className="text-xs font-normal text-gray-500">{product.primary_unit}</span>
            </div>
            {product.secondary_unit && product.conversion_rate && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                (1 {product.primary_unit} = {product.conversion_rate} {product.secondary_unit})
              </p>
            )}
          </div>

          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Reorder Level</span>
            <div className="text-xl font-bold text-gray-700 mt-1">
              {product.reorder_level} <span className="text-xs font-normal text-gray-500">{product.primary_unit}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Stock Status</span>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                  product.stock_status.color === 'green'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : product.stock_status.color === 'amber'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {product.stock_status.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-indigo-600" /> Filter Movement Ledger
          </span>
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Date From */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Movement Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Movement Type</label>
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="opening">Opening Stock</option>
              <option value="purchase">Purchase (Inbound)</option>
              <option value="sale">Sale (Outbound)</option>
              <option value="return_in">Sales Return (In)</option>
              <option value="return_out">Purchase Return (Out)</option>
              <option value="adjustment_in">Adjustment (In)</option>
              <option value="adjustment_out">Adjustment (Out)</option>
              <option value="damage">Damage / Loss</option>
            </select>
          </div>

          {/* Direction */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Direction</label>
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as any)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Directions</option>
              <option value="IN">IN (+ Stock)</option>
              <option value="OUT">OUT (- Stock)</option>
            </select>
          </div>

          {/* Reference Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Reference #</label>
            <input
              type="text"
              placeholder="e.g. INV-2026, PO-102"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Reason / Notes</label>
            <input
              type="text"
              placeholder="Search in remarks..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
            Loading movement history...
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No movements found"
            description="No inventory transactions match the active filter criteria."
            actionLabel="Reset Filters"
            onAction={resetFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4">Direction</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Unit Cost</th>
                  <th className="py-3.5 px-4 text-right">Total Cost</th>
                  <th className="py-3.5 px-4 text-right">Stock Balance After</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {movements.map((m) => {
                  const qty = Number(m.quantity) || 0
                  const isPositive = qty >= 0
                  const running = m.running_balance !== null && m.running_balance !== undefined ? Number(m.running_balance) : '—'

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-600 whitespace-nowrap">
                        {m.movement_date || m.created_at?.split('T')[0]}
                      </td>
                      <td className="py-3.5 px-4 font-semibold capitalize text-gray-900">
                        {m.movement_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingUp className="h-3 w-3" /> IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <TrendingDown className="h-3 w-3" /> OUT
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {m.reference_number ? (
                          <span className="font-mono font-medium text-gray-900">
                            {m.reference_number}
                            {m.reference_type && (
                              <span className="block text-[10px] text-gray-400 capitalize">
                                {m.reference_type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">Manual / Initial</span>
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${qty}` : qty} {product?.primary_unit || 'PCS'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                        ₹{Number(m.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-900 font-semibold">
                        ₹{Number(m.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                        {running} {typeof running === 'number' ? product?.primary_unit : ''}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate" title={m.notes || ''}>
                        {m.notes || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
            <span>
              Showing {movements.length} of {totalCount} movements (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        onSuccess={() => fetchLedger()}
        preselectedProductId={productId}
      />
    </div>
  )
}
