'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, History, ArrowDownRight, ArrowUpRight, FileText, AlertCircle } from 'lucide-react'

interface MovementItem {
  id: string
  movement_type: string
  quantity: number
  unit_cost: number
  total_cost: number
  running_balance: number
  reference_type: string
  reference_number?: string
  notes?: string
  created_at: string
}

interface StockHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  productSku?: string
}

export function StockHistoryModal({
  isOpen,
  onClose,
  productId,
  productName,
  productSku,
}: StockHistoryModalProps) {
  const [movements, setMovements] = useState<MovementItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory()
    }
  }, [isOpen, productId])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inventory/movements?product_id=${productId}&limit=100`)
      const json = await res.json()
      if (json.success) {
        setMovements(json.data || [])
      } else {
        setError(json.error || 'Failed to load stock movements history')
      }
    } catch (err) {
      console.error('Error fetching stock history:', err)
      setError('Network error fetching stock history.')
    } finally {
      setLoading(false)
    }
  }

  const formatMovementBadge = (type: string) => {
    const t = type.toLowerCase()
    switch (t) {
      case 'opening':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded-md text-[10px] uppercase">Opening</span>
      case 'purchase':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-medium rounded-md text-[10px] uppercase">Purchase</span>
      case 'sale':
        return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded-md text-[10px] uppercase">Sale</span>
      case 'return_in':
      case 'sale_return':
        return <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-medium rounded-md text-[10px] uppercase">Sale Return</span>
      case 'return_out':
      case 'purchase_return':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-medium rounded-md text-[10px] uppercase">Purchase Return</span>
      case 'adjustment_in':
        return <span className="px-2 py-0.5 bg-green-50 text-green-700 font-medium rounded-md text-[10px] uppercase">Adjustment +</span>
      case 'adjustment_out':
        return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-medium rounded-md text-[10px] uppercase">Adjustment -</span>
      case 'damage':
        return <span className="px-2 py-0.5 bg-red-50 text-red-700 font-medium rounded-md text-[10px] uppercase">Damage</span>
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-medium rounded-md text-[10px] uppercase">{type}</span>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{productName}</h2>
              <p className="text-xs text-gray-500">{productSku ? `SKU: ${productSku} • ` : ''}Immutable Stock Movement History</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-indigo-600" />
              Loading stock ledger logs...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 text-xs font-medium rounded-xl">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No stock movement entries recorded yet for this product.
            </div>
          ) : (
            <div className="space-y-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 px-2">Date</th>
                    <th className="pb-3 px-2">Type</th>
                    <th className="pb-3 px-2 text-right">Quantity</th>
                    <th className="pb-3 px-2 text-right">Balance</th>
                    <th className="pb-3 px-2 text-right">Unit Cost</th>
                    <th className="pb-3 px-2">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {movements.map((m) => {
                    const qty = Number(m.quantity)
                    const isPositive = qty > 0
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-2 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                          {new Date(m.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">{formatMovementBadge(m.movement_type)}</td>
                        <td className="py-3 px-2 text-right whitespace-nowrap font-medium">
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {isPositive ? `+${qty}` : qty}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-gray-900 whitespace-nowrap">
                          {m.running_balance}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500 whitespace-nowrap">
                          ₹{Number(m.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          {m.reference_number ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                              <FileText className="h-3 w-3 text-gray-400" />
                              {m.reference_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px]">Manual</span>
                          )}
                          {m.notes && <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">{m.notes}</p>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
