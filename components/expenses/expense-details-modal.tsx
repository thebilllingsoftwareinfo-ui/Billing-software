'use client'

import React, { useState } from 'react'
import {
  X,
  Calendar,
  FileText,
  DollarSign,
  Landmark,
  User,
  Paperclip,
  Printer,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { DocumentCancellationModal } from '@/components/common/document-cancellation-modal'

interface ExpenseDetailsModalProps {
  isOpen: boolean
  expense: any
  onClose: () => void
  onCancelled?: () => void
}

export function ExpenseDetailsModal({
  isOpen,
  expense,
  onClose,
  onCancelled,
}: ExpenseDetailsModalProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (!isOpen || !expense) return null

  const isCancelled = expense.status === 'cancelled' || expense.is_cancelled
  const amountPaise = expense.amount_paise || (expense.amount ? Math.round(expense.amount * 100) : 0)
  const categoryName = expense.expense_categories?.name || expense.category_name || 'Operating Expense'

  const handleCancelConfirm = async (reason: string) => {
    try {
      setCancelling(true)
      const res = await fetch(`/api/expenses/${expense.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to cancel expense')
      }
      toast.success('Expense cancelled and ledger reversed successfully')
      setCancelModalOpen(false)
      onCancelled?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel expense')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    Expense #{expense.reference_number || expense.id.slice(0, 8)}
                  </h2>
                  {isCancelled ? (
                    <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                      CANCELLED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      POSTED
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">Operating expense voucher details & ledger impacts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Amount Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                  Total Disbursed
                </span>
                <span className="text-2xl font-black text-gray-900 font-mono mt-0.5 block">
                  {formatCurrency(amountPaise)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Category</span>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 mt-1 font-semibold">
                  {categoryName}
                </Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-white rounded-xl border border-gray-100 p-4">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Expense Date</span>
                <span className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {expense.expense_date}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
                <span className="font-semibold text-gray-800 mt-0.5 uppercase tracking-wide">
                  {expense.payment_method || 'Cash'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Vendor / Payee</span>
                <span className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {expense.vendor_name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Reference Number</span>
                <span className="font-mono text-gray-800 mt-0.5 block font-medium">
                  {expense.reference_number || '—'}
                </span>
              </div>
              {expense.gst_paise ? (
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Input GST</span>
                  <span className="font-semibold text-emerald-700 mt-0.5 block">
                    {formatCurrency(expense.gst_paise)}
                  </span>
                </div>
              ) : null}
              {expense.created_at ? (
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Recorded On</span>
                  <span className="text-gray-600 mt-0.5 block text-[11px]">
                    {new Date(expense.created_at).toLocaleString()}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Description / Notes */}
            {expense.description && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Narration / Notes</span>
                <p className="text-gray-700">{expense.description}</p>
              </div>
            )}

            {/* Cancellation Notice if cancelled */}
            {isCancelled && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Expense Cancelled & Reversed
                </p>
                {expense.cancellation_reason && (
                  <p className="text-rose-700 text-[11px]">Reason: {expense.cancellation_reason}</p>
                )}
                {expense.cancelled_at && (
                  <p className="text-rose-500 text-[10px]">Cancelled on: {new Date(expense.cancelled_at).toLocaleString()}</p>
                )}
              </div>
            )}

            {/* System Impacts (Double Entry + Cash/Bank) */}
            <div className="space-y-2 text-xs">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                Integrated Ledger Impacts
              </span>

              {/* Cash/Bank Impact */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">Cash / Bank Ledger</p>
                  <p className="text-[11px] text-slate-600">
                    Disbursed {formatCurrency(amountPaise)} via {(expense.payment_method || 'Cash').toUpperCase()} OUT
                    {isCancelled ? ' (Compensating refund entry posted)' : ''}
                  </p>
                </div>
              </div>

              {/* Double-Entry Accounting Impact */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="space-y-1 w-full">
                  <p className="font-bold text-slate-800">Double-Entry Journal Posting</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-gray-400 text-[10px] block">DEBIT</span>
                      <span className="text-gray-800 font-semibold">{categoryName} (5070)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-[10px] block">CREDIT</span>
                      <span className="text-gray-800 font-semibold">
                        {(expense.payment_method || '').toLowerCase().includes('bank') ? 'Bank (1020)' : 'Cash (1010)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <div>
              {expense.receipt_url && (
                <button
                  type="button"
                  onClick={() => window.open(expense.receipt_url, '_blank')}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  <Paperclip className="h-4 w-4" /> View Receipt
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.info(`Printing voucher for ${expense.reference_number || 'expense'}...`)
                  window.print()
                }}
                className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Print Voucher
              </button>

              {!isCancelled && (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel & Reverse
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      <DocumentCancellationModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        documentType="Purchase Bill"
        documentNumber={expense.reference_number || expense.id.slice(0, 8)}
        partyName={expense.vendor_name || categoryName}
        amount={amountPaise / 100}
      />
    </>
  )
}
