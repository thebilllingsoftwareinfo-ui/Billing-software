'use client'

import { useState } from 'react'
import {
  X,
  AlertTriangle,
  FileX,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

interface DocumentCancellationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  documentType: 'Sales Invoice' | 'Purchase Bill'
  documentNumber: string
  partyName: string
  amount: number
}

export function DocumentCancellationModal({
  open,
  onClose,
  onConfirm,
  documentType,
  documentNumber,
  partyName,
  amount,
}: DocumentCancellationModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please provide a specific reason for cancellation')
      return
    }

    setLoading(true)
    setError('')
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <FileX className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Cancel & Reverse {documentType}</h2>
              <p className="text-xs text-rose-700 font-medium">Reverses inventory, ledgers, and tax impacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Document Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Document Number</span>
              <span className="font-mono font-bold text-gray-900 text-sm mt-0.5 block">{documentNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Party / Contact</span>
              <span className="font-semibold text-gray-900 mt-0.5 block truncate">{partyName}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Amount</span>
              <span className="font-mono font-bold text-gray-900 mt-0.5 block">
                ₹{Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Target State</span>
              <span className="font-bold text-rose-700 mt-0.5 block uppercase text-[11px]">VOID / CANCELLED</span>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Cancellation Warning</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Cancelling this {documentType.toLowerCase()} will atomically reverse all posted inventory movements,
                restore customer/supplier ledger balances, and reverse applicable accounting and tax journal entries.
                This action preserves history in the audit ledger and cannot be undone.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Reason for Cancellation <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              placeholder="e.g. Order cancelled by buyer prior to dispatch, duplicate entry, incorrect pricing"
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-gray-900"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {error}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Keep Document
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cancelling & Reversing...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
