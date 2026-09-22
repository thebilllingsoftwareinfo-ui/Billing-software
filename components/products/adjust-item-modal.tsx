'use client'

import React, { useState } from 'react'
import { X, SlidersHorizontal, AlertCircle, CheckCircle2, Calendar, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { formatRupees } from '@/lib/utils/currency'

interface AdjustItemModalProps {
  isOpen: boolean
  onClose: () => void
  product: any
  onSave: (updatedStock: number, reason: string, notes?: string) => void
}

export function AdjustItemModal({ isOpen, onClose, product, onSave }: AdjustItemModalProps) {
  if (!isOpen || !product) return null

  const currentStock = Number(product.current_stock ?? product.opening_stock ?? 0)
  const [adjustmentType, setAdjustmentType] = useState<'set' | 'add' | 'reduce'>('set')
  const [quantity, setQuantity] = useState<number | ''>(currentStock)
  const [reason, setReason] = useState<string>('stocktake')
  const [notes, setNotes] = useState<string>('')
  const [adjustmentDate, setAdjustmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const calculateFinalStock = () => {
    const val = quantity === '' ? 0 : Number(quantity)
    if (adjustmentType === 'set') return val
    if (adjustmentType === 'add') return currentStock + val
    if (adjustmentType === 'reduce') return currentStock - val
    return currentStock
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalStock = calculateFinalStock()
    onSave(finalStock, reason, notes)
    toast.success(`Stock for "${product.name}" adjusted to ${finalStock} ${product.unit || 'PCS'}!`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm">Adjust Stock — {product.name}</h3>
              <p className="text-xs text-slate-400">Current Stock: {currentStock} {product.unit || 'PCS'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Adjustment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('set')
                  setQuantity(currentStock)
                }}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  adjustmentType === 'set'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Set Total
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('add')
                  setQuantity(1)
                }}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  adjustmentType === 'add'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                + Add Stock
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('reduce')
                  setQuantity(1)
                }}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  adjustmentType === 'reduce'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-2xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                - Reduce Stock
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {adjustmentType === 'set'
                ? `Updated Total Stock Quantity (${product.unit || 'PCS'})`
                : adjustmentType === 'add'
                ? `Quantity to Add (${product.unit || 'PCS'})`
                : `Quantity to Deduct (${product.unit || 'PCS'})`}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* Final Stock Preview Banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
            <span className="text-gray-600">Resulting Stock Level:</span>
            <span className={`font-mono font-extrabold text-sm ${
              calculateFinalStock() < 0 ? 'text-red-600' : 'text-emerald-700'
            }`}>
              {calculateFinalStock()} {product.unit || 'PCS'}
            </span>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Adjustment</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="stocktake">Physical Stocktake Audit Reconciliation</option>
              <option value="damage">Damaged or Broken Goods Write-off</option>
              <option value="expiry">Expired Stock Deduction</option>
              <option value="correction">Data Correction Entry</option>
              <option value="theft">Lost or Stolen Shrinkage</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Date</label>
            <input
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Audit conducted by store manager"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
