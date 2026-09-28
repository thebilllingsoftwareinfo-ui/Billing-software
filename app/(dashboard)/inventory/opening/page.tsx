'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  Layers,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlusCircle,
} from 'lucide-react'

interface ProductOption {
  id: string
  name: string
  sku?: string | null
  primary_unit?: string | null
  secondary_unit?: string | null
  conversion_rate?: number | null
  current_stock?: number
}

export default function OpeningStockPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [unitCost, setUnitCost] = useState<string>('')
  const [notes, setNotes] = useState<string>('Opening stock entry')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?limit=200')
        const json = await res.json()
        if (json.success) {
          const list: ProductOption[] = (json.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            primary_unit: p.primary_unit || 'PCS',
            secondary_unit: p.secondary_unit,
            conversion_rate: p.conversion_rate,
            current_stock: Number(p.current_stock) || 0,
          }))
          setProducts(list)
        } else {
          toast.error(json.error || 'Failed to load products')
        }
      } catch (err) {
        console.error(err)
        toast.error('Network error while loading products')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Update selected unit when product changes
  useEffect(() => {
    if (selectedProduct) {
      setSelectedUnit(selectedProduct.primary_unit || 'PCS')
    } else {
      setSelectedUnit('')
    }
  }, [selectedProductId, selectedProduct])

  // Conversion calculation preview
  const numQty = parseFloat(quantity) || 0
  const isSecondary =
    selectedProduct &&
    selectedProduct.secondary_unit &&
    selectedUnit === selectedProduct.secondary_unit &&
    (selectedProduct.conversion_rate || 0) > 0

  const calculatedBaseQty = isSecondary
    ? numQty * (selectedProduct.conversion_rate || 1)
    : numQty

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!selectedProductId) {
      setErrorMessage('Please select a product')
      return
    }

    if (numQty <= 0) {
      setErrorMessage('Opening stock quantity must be strictly greater than 0')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        product_id: selectedProductId,
        movement_type: 'opening',
        quantity: numQty,
        unit: selectedUnit || selectedProduct?.primary_unit || 'PCS',
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        reference_type: 'manual',
        notes: notes.trim() || 'Opening stock entry',
      }

      const res = await fetch('/api/inventory/opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(`Opening stock of ${calculatedBaseQty} ${selectedProduct?.primary_unit || 'PCS'} recorded!`)
        router.push('/inventory')
      } else {
        setErrorMessage(json.error || 'Failed to record opening stock')
        toast.error(json.error || 'Failed to record opening stock')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || 'Network error while submitting')
      toast.error('Network error while submitting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Record Opening Stock</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Establish initial inventory balances with base and secondary unit conversion support.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Loading catalog products...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Product Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Select Product <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium"
              >
                <option value="">-- Choose a Product from Catalog --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(SKU: ${p.sku})` : ''} — Current: {p.current_stock} {p.primary_unit || 'PCS'}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Product Context Banner */}
            {selectedProduct && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold">{selectedProduct.name}</span>
                    <span className="text-indigo-600 ml-2">Current Stock: {selectedProduct.current_stock} {selectedProduct.primary_unit}</span>
                  </div>
                </div>
                {selectedProduct.secondary_unit && (
                  <div className="text-[11px] font-medium bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-700">
                    1 {selectedProduct.secondary_unit} = {selectedProduct.conversion_rate} {selectedProduct.primary_unit}
                  </div>
                )}
              </div>
            )}

            {/* Quantity and Unit Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Opening Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Unit of Measure <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={!selectedProduct}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium disabled:opacity-50"
                >
                  {selectedProduct?.primary_unit && (
                    <option value={selectedProduct.primary_unit}>
                      {selectedProduct.primary_unit} (Primary Base Unit)
                    </option>
                  )}
                  {selectedProduct?.secondary_unit && (
                    <option value={selectedProduct.secondary_unit}>
                      {selectedProduct.secondary_unit} (Secondary Unit)
                    </option>
                  )}
                  {!selectedProduct && <option value="">Select product first</option>}
                </select>
              </div>
            </div>

            {/* Conversion Math Preview */}
            {isSecondary && numQty > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <span>
                    Conversion Applied: <strong>{numQty} {selectedUnit}</strong> &times; {selectedProduct.conversion_rate}
                  </span>
                </div>
                <span className="font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  = {calculatedBaseQty} {selectedProduct.primary_unit} in Base Stock
                </span>
              </div>
            )}

            {/* Unit Cost & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Unit Valuation / Purchase Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="e.g. 120.00"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Notes / Audit Reference
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Opening financial year count"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium"
                />
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Link
                href="/inventory"
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !selectedProductId || numQty <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Recording Opening Stock...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" /> Save Opening Stock
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
