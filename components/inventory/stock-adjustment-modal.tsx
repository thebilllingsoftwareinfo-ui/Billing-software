'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, Package, Scale } from 'lucide-react'
import { toast } from 'sonner'

interface ProductOption {
  id: string
  name: string
  sku: string | null
  current_stock: number
  primary_unit?: string | null
  secondary_unit?: string | null
  conversion_rate?: number | null
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
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN')
  const [quantity, setQuantity] = useState<string>('')
  const [unit, setUnit] = useState<string>('')
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
        const mapped: ProductOption[] = (json.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          current_stock: Number(p.current_stock) || 0,
          primary_unit: p.primary_unit || p.product_units?.abbreviation || 'Pcs',
          secondary_unit: p.secondary_unit || null,
          conversion_rate: Number(p.conversion_rate) || null,
          unit_abbreviation: p.product_units?.abbreviation || p.primary_unit || 'Pcs',
        }))
        setProducts(mapped)

        // Set initial unit if a product is selected
        const initProd = mapped.find((p) => p.id === (preselectedProductId || selectedProductId))
        if (initProd) {
          setUnit(initProd.primary_unit || 'Pcs')
        }
      }
    } catch (err) {
      console.error('Failed to load products for stock adjustment:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const resetForm = () => {
    setSelectedProductId('')
    setDirection('IN')
    setQuantity('')
    setUnit('')
    setReason('stocktake')
    setNotes('')
    setError(null)
  }

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )

  // When product changes, sync unit
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    const prod = products.find((p) => p.id === productId)
    if (prod) {
      setUnit(prod.primary_unit || 'Pcs')
    } else {
      setUnit('')
    }
    setError(null)
  }

  const currentStock = selectedProduct ? selectedProduct.current_stock : 0
  const primaryUnit = selectedProduct?.primary_unit || selectedProduct?.unit_abbreviation || 'Pcs'
  const secondaryUnit = selectedProduct?.secondary_unit || null
  const conversionRate = selectedProduct?.conversion_rate || 0

  // Calculate base quantity and projected stock
  const numericQty = parseFloat(quantity) || 0
  const isSecondaryUnit = Boolean(
    secondaryUnit &&
    conversionRate > 0 &&
    unit.trim().toLowerCase() === secondaryUnit.trim().toLowerCase()
  )
  const baseQuantity = isSecondaryUnit ? numericQty * conversionRate : numericQty
  const projectedStock = direction === 'IN' ? currentStock + baseQuantity : currentStock - baseQuantity
  const isInsufficient = direction === 'OUT' && numericQty > 0 && baseQuantity > currentStock

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (!selectedProductId) {
      setError('Please select a product to adjust.')
      return
    }
    if (!quantity || isNaN(numericQty) || numericQty <= 0) {
      setError('Please enter a valid adjustment quantity greater than 0.')
      return
    }
    if (!unit) {
      setError('Please select a unit.')
      return
    }
    if (!reason) {
      setError('Adjustment reason is required.')
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
            direction,
            quantity: numericQty,
            unit,
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
            <p className="text-xs text-gray-500 mt-0.5">Record authoritative stock adjustment (IN / OUT)</p>
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

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Product <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={loadingProducts || submitting}
              className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
            >
              <option value="">-- Choose tracked product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} — Current Stock: {p.current_stock} {p.primary_unit}
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Direction Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Adjustment Direction <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('IN')}
                disabled={submitting}
                className={`flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold border transition-all ${
                  direction === 'IN'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                <span>IN (Stock Increase)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('OUT')}
                disabled={submitting}
                className={`flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-semibold border transition-all ${
                  direction === 'OUT'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
                <span>OUT (Stock Decrease)</span>
              </button>
            </div>
          </div>

          {/* Quantity & Unit Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!selectedProductId || submitting}
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={!selectedProductId || submitting}
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              >
                {selectedProduct ? (
                  <>
                    <option value={primaryUnit}>{primaryUnit} (Base)</option>
                    {secondaryUnit && conversionRate > 0 && (
                      <option value={secondaryUnit}>
                        {secondaryUnit} ({conversionRate} {primaryUnit})
                      </option>
                    )}
                  </>
                ) : (
                  <option value="">-- Unit --</option>
                )}
              </select>
            </div>
          </div>

          {/* Live Conversion & Stock Summary */}
          {selectedProduct && numericQty > 0 && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-500">Current Stock</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentStock} {primaryUnit}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-500">Adjustment</span>
                  <span
                    className={`text-sm font-semibold inline-flex items-center gap-0.5 ${
                      direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {direction === 'IN' ? `+${baseQuantity}` : `-${baseQuantity}`} {primaryUnit}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-500">New Stock</span>
                  <span className={`text-sm font-semibold ${projectedStock < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                    {projectedStock} {primaryUnit}
                  </span>
                </div>
              </div>

              {isSecondaryUnit && (
                <div className="text-[11px] text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-lg text-center font-medium">
                  Unit Conversion: {numericQty} {unit} × {conversionRate} = {baseQuantity} {primaryUnit} (Base Movement)
                </div>
              )}

              {isInsufficient && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>
                    Warning: Adjustment OUT ({baseQuantity} {primaryUnit}) exceeds available stock ({currentStock} {primaryUnit}). Disallowed unless negative stock is enabled.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
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
              <option value="production">Production In / Out</option>
              <option value="other">Other Reason</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Internal Explanation</label>
            <textarea
              rows={2}
              placeholder="Add details about this stock adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={submitting || !selectedProductId || numericQty <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                </>
              ) : (
                `Post ${direction} Adjustment`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
