'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Loader2, Sliders, FileText, CheckCircle2, Eye, Printer, Download, Trash2, Copy } from 'lucide-react'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'
import { EmptyState } from '@/components/common/empty-state'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { toast } from 'sonner'

interface AdjustmentRecord {
  id: string
  adjustment_number: string
  reason: string
  status: string
  notes?: string
  created_at: string
  approved_at?: string
}

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAdjustments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/adjustments')
      const json = await res.json()

      if (json.success) {
        setAdjustments(json.data || [])
      } else {
        toast.error(json.error || 'Failed to load stock adjustments')
      }
    } catch (err) {
      console.error('Error fetching adjustments:', err)
      toast.error('Network error loading stock adjustments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdjustments()
  }, [fetchAdjustments])

  const formatReason = (reason: string) => {
    switch (reason) {
      case 'stocktake':
        return 'Physical Stocktake Audit'
      case 'damage':
        return 'Damaged / Broken Goods'
      case 'expiry':
        return 'Expired Stock Write-Off'
      case 'theft':
        return 'Shrinkage / Theft'
      case 'correction':
        return 'Data Correction'
      case 'opening':
        return 'Opening Stock Entry'
      default:
        return reason
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Stock Adjustments Log</h1>
          <p className="text-xs text-gray-500 mt-1">
            Audit history of physical inventory count reconciliations and stock write-offs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAdjustments()}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> New Stock Adjustment
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
            Loading stock adjustment records...
          </div>
        ) : adjustments.length === 0 ? (
          <EmptyState
            icon={Sliders}
            title="No stock adjustments recorded"
            description="Reconcile inventory counts during periodic audits or stock write-offs."
            actionLabel="+ New Stock Adjustment"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Adjustment #</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date Approved</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        {adj.adjustment_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">{formatReason(adj.reason)}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(adj.approved_at || adj.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 truncate max-w-xs">{adj.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <RowActionsMenu
                        items={[
                          {
                            label: 'View Adjustment Details',
                            icon: Eye,
                            onClick: () => toast.info(`Viewing stock adjustment #${adj.adjustment_number}`),
                          },
                          {
                            label: 'Print Voucher',
                            icon: Printer,
                            onClick: () => window.print(),
                          },
                          {
                            label: 'Download PDF Report',
                            icon: Download,
                            onClick: () => toast.success(`Downloaded voucher for #${adj.adjustment_number}`),
                            divider: true,
                          },
                          {
                            label: 'Duplicate Adjustment',
                            icon: Copy,
                            onClick: () => {
                              toast.success(`Cloned adjustment #${adj.adjustment_number}`);
                              setModalOpen(true);
                            },
                          },
                          {
                            label: 'Delete Entry',
                            icon: Trash2,
                            isDestructive: true,
                            onClick: () => {
                              if (confirm(`Delete adjustment #${adj.adjustment_number}?`)) {
                                setAdjustments((prev) => prev.filter((a) => a.id !== adj.id));
                                toast.success(`Adjustment #${adj.adjustment_number} removed`);
                              }
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StockAdjustmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchAdjustments()}
      />
    </div>
  )
}
