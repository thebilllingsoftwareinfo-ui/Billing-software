'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toast } from 'sonner'

interface ProductOption {
  id: string
  name: string
  sku: string | null
  current_stock: number
  unit_abbreviation?: string
}

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedProductId?: string
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProductId,
}: StockAdjustmentModalProps) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || '')
  const [newQuantity, setNewQuantity] = useState<string>('')
  const [reason, setReason] = useState<string>('stocktake')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
      if (preselectedProductId) {
        setSelectedProductId(preselectedProductId)
      }
    } else {
      resetForm()
    }
  }, [isOpen, preselectedProductId])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/products?limit=200&track_inventory=true')
      const json = await res.json()
      if (json.success) {
        setProducts(
          (json.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            current_stock: Number(p.current_stock) || 0,
            unit_abbreviation: p.product_units?.abbreviation || 'units',
          }))
        )
      }
    } catch (err) {
      console.error('Failed to load products for stock adjustment:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const resetForm = () => {
    setSelectedProductId('')
    setNewQuantity('')
    setReason('stocktake')
    setNotes('')
    setError(null)
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const currentStock = selectedProduct ? selectedProduct.current_stock : 0
  const targetQty = newQuantity !== '' ? parseFloat(newQuantity) : currentStock
  const stockDifference = targetQty - currentStock

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId) {
      setError('Please select a product to adjust.')
      return
    }
    if (newQuantity === '' || isNaN(parseFloat(newQuantity))) {
      setError('Please enter a valid physical count quantity.')
      return
    }
    if (parseFloat(newQuantity) < 0) {
      setError('Stock count cannot be negative.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        reason,
        notes: notes.trim() || undefined,
        items: [
          {
            product_id: selectedProductId,
            new_quantity: parseFloat(newQuantity),
            notes: notes.trim() || undefined,
          },
        ],
      }

      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply stock adjustment.')
      }

      toast.success(`Stock adjusted successfully for ${selectedProduct?.name}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Stock Adjustment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Reconcile physical inventory count against system ledger</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Product <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value)
                const p = products.find((prod) => prod.id === e.target.value)
                if (p) {
                  setNewQuantity(p.current_stock.toString())
                }
              }}
              disabled={loadingProducts || submitting}
              className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
            >
              <option value="">-- Choose tracked product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} — Current Stock: {p.current_stock} {p.unit_abbreviation}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-500">Book Stock</span>
                <span className="text-sm font-semibold text-gray-900">
                  {currentStock} {selectedProduct.unit_abbreviation}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-500">Physical Count</span>
                <span className="text-sm font-semibold text-indigo-600">
                  {targetQty} {selectedProduct.unit_abbreviation}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-500">Adjustment</span>
                <span
                  className={`text-sm font-semibold inline-flex items-center gap-0.5 ${
                    stockDifference > 0
                      ? 'text-emerald-600'
                      : stockDifference < 0
                      ? 'text-rose-600'
                      : 'text-gray-600'
                  }`}
                >
                  {stockDifference > 0 && <ArrowUpRight className="h-3.5 w-3.5" />}
                  {stockDifference < 0 && <ArrowDownRight className="h-3.5 w-3.5" />}
                  {stockDifference > 0 ? `+${stockDifference}` : stockDifference}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              New Physical Count Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 50"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              disabled={!selectedProductId || submitting}
              className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Adjustment Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              <option value="stocktake">Periodic Physical Stock Audit (Stocktake)</option>
              <option value="damage">Damaged / Broken Goods</option>
              <option value="expiry">Expired Stock Write-off</option>
              <option value="theft">Inventory Shrinkage / Theft</option>
              <option value="correction">Data Entry Correction</option>
              <option value="opening">Initial Opening Stock Adjustment</option>
              <option value="other">Other Reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Internal Explanation</label>
            <textarea
              rows={2}
              placeholder="Add details about physical count discrepancy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedProductId}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                </>
              ) : (
                'Post Stock Movement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
