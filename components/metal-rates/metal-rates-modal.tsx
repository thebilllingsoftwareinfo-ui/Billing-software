'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, X, TrendingUp } from 'lucide-react'

interface MetalRatesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MetalRatesModal({ isOpen, onClose }: MetalRatesModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [rates, setRates] = useState({
    gold_24k: 0,
    gold_22k: 0,
    gold_18k: 0,
    silver: 0,
    diamond: 0,
  })

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      fetch('/api/metal-rates')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setRates(data.data)
          }
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/metal-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Live Metal Rates updated successfully!')
        onClose()
      } else {
        toast.error(data.error || 'Failed to update rates')
      }
    } catch (error) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-900">Live Metal Rates</h2>
              <p className="text-xs text-amber-700">Update daily rates to auto-calculate jewelry prices.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Gold 24K (per gram) ₹</label>
                <input
                  type="number"
                  value={rates.gold_24k || ''}
                  onChange={(e) => setRates({ ...rates, gold_24k: Number(e.target.value) })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Gold 22K (per gram) ₹</label>
                <input
                  type="number"
                  value={rates.gold_22k || ''}
                  onChange={(e) => setRates({ ...rates, gold_22k: Number(e.target.value) })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Gold 18K (per gram) ₹</label>
                <input
                  type="number"
                  value={rates.gold_18k || ''}
                  onChange={(e) => setRates({ ...rates, gold_18k: Number(e.target.value) })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Silver (per gram) ₹</label>
                <input
                  type="number"
                  value={rates.silver || ''}
                  onChange={(e) => setRates({ ...rates, silver: Number(e.target.value) })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Diamond (per carat) ₹</label>
                <input
                  type="number"
                  value={rates.diamond || ''}
                  onChange={(e) => setRates({ ...rates, diamond: Number(e.target.value) })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Rates
          </button>
        </div>
      </div>
    </div>
  )
}
