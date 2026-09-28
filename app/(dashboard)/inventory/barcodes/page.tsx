'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Barcode as BarcodeIcon,
  Search,
  Plus,
  Printer,
  Sparkles,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Layers,
  SlidersHorizontal,
  Copy,
  Scan,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  generateEan13Barcode,
  generateCode128Barcode,
  generateBarcodeSvg,
  validateBarcode,
} from '@/lib/services/barcode.service'
import { BarcodeLabelModal } from '@/components/products/barcode-label-modal'

interface BarcodeProduct {
  id: string
  name: string
  sku: string
  barcode: string | null
  barcodes?: string[]
  sale_price: number
  current_stock: number
  unit: string
  has_barcode: boolean
}

export default function BarcodeManagementPage() {
  const [products, setProducts] = useState<BarcodeProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'missing'>('all')

  // Scanner Simulator / Quick Scan State
  const [scannedInput, setScannedInput] = useState('')
  const [matchedProduct, setMatchedProduct] = useState<BarcodeProduct | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Label Printing Modal
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<any | null>(null)

  // Edit / Assign Barcode Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [targetProduct, setTargetProduct] = useState<BarcodeProduct | null>(null)
  const [barcodeValue, setBarcodeValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Products with Barcodes
  const fetchBarcodes = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/barcodes')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data)
      } else {
        // Fallback to /api/products
        const prodRes = await fetch('/api/products')
        const prodData = await prodRes.json()
        if (prodData.success && Array.isArray(prodData.data)) {
          setProducts(
            prodData.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku || `SKU-${p.id}`,
              barcode: p.barcode || null,
              barcodes: p.barcodes || (p.barcode ? [p.barcode] : []),
              sale_price: Number(p.sale_price) || 0,
              current_stock: Number(p.current_stock ?? p.opening_stock ?? 0),
              unit: p.product_units?.abbreviation || p.unit || 'PCS',
              has_barcode: Boolean(p.barcode),
            }))
          )
        }
      }
    } catch (err) {
      console.error('Failed to load barcodes:', err)
      toast.error('Failed to load catalog barcodes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBarcodes()
  }, [])

  // Quick Scanner Detection
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = scannedInput.trim()
    if (!code) return

    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
        (p.barcodes && p.barcodes.some((b) => b.toLowerCase() === code.toLowerCase()))
    )

    if (match) {
      setMatchedProduct(match)
      toast.success(`Scanned: ${match.name} (SKU: ${match.sku})`)
    } else {
      setMatchedProduct(null)
      toast.error(`No product found matching barcode "${code}"`)
    }
    setScannedInput('')
  }

  // Open Assign Modal
  const openAssignModal = (product: BarcodeProduct) => {
    setTargetProduct(product)
    setBarcodeValue(product.barcode || '')
    setIsAssignModalOpen(true)
  }

  // Generate EAN-13
  const handleGenerateEan13 = () => {
    const code = generateEan13Barcode('890')
    setBarcodeValue(code)
    toast.success(`Generated Indian EAN-13 Barcode: ${code}`)
  }

  // Generate Code-128
  const handleGenerateCode128 = () => {
    const code = generateCode128Barcode('VAN')
    setBarcodeValue(code)
    toast.success(`Generated Code-128 Barcode: ${code}`)
  }

  // Save Barcode Assignment
  const handleSaveBarcode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetProduct) return
    const cleaned = barcodeValue.trim()
    if (!cleaned) {
      toast.error('Barcode cannot be empty')
      return
    }

    const val = validateBarcode(cleaned)
    if (!val.valid) {
      toast.error(val.error || 'Invalid barcode format')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: targetProduct.id,
          barcode: cleaned,
          action: 'assign',
        }),
      })

      const result = await res.json()
      if (result.success) {
        toast.success(`Barcode assigned to ${targetProduct.name}`)
        setIsAssignModalOpen(false)
        fetchBarcodes()
      } else {
        throw new Error(result.error || 'Failed to assign barcode')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving barcode')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Label Print Modal
  const openLabelPrint = (product: BarcodeProduct) => {
    setSelectedProductForLabel({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || product.sku,
      sale_price: product.sale_price,
      unit: product.unit,
    })
    setLabelModalOpen(true)
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'assigned' && p.has_barcode) ||
        (filterType === 'missing' && !p.has_barcode)

      return matchesSearch && matchesFilter
    })
  }, [products, searchQuery, filterType])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
            <BarcodeIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Barcode Management & Label Studio</h1>
            <p className="text-xs text-gray-500">
              Generate EAN-13 / Code-128 barcodes, test scanner inputs, and print barcode stickers for your catalog.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scanInputRef.current?.focus()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <Scan className="h-3.5 w-3.5 text-purple-600" />
            <span>Barcode Scanner Input</span>
          </button>
        </div>
      </div>

      {/* ── METRIC TILES ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Products</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">{products.length}</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Active catalog items</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Barcodes Assigned</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {products.filter((p) => p.has_barcode).length}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {Math.round((products.filter((p) => p.has_barcode).length / (products.length || 1)) * 100)}% coverage
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Missing Barcodes</span>
          <span className="text-2xl font-black text-amber-500 mt-1 block">
            {products.filter((p) => !p.has_barcode).length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Awaiting barcode generation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Supported Symbologies</span>
          <span className="text-base font-black text-purple-600 mt-1 block">EAN-13 & Code-128</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Hardware & Mobile Wedge</span>
        </div>
      </div>

      {/* ── SCANNER SIMULATOR / QUICK LOOKUP BAR ─────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleScanSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xs whitespace-nowrap">
            <Scan className="h-4 w-4" />
            <span>Live Scan / Test:</span>
          </div>

          <div className="relative flex-1 w-full">
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Scan barcode with handheld gun or type code + Enter..."
              value={scannedInput}
              onChange={(e) => setScannedInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-purple-200 rounded-lg text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            Lookup Barcode
          </button>
        </form>

        {matchedProduct && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900 text-sm">{matchedProduct.name}</span>
                <span className="text-emerald-700 block text-[11px]">
                  SKU: {matchedProduct.sku} | Barcode: {matchedProduct.barcode} | Price: ₹{matchedProduct.sale_price} | Stock: {matchedProduct.current_stock} {matchedProduct.unit}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openLabelPrint(matchedProduct)}
                className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold transition-colors cursor-pointer"
              >
                Print Label
              </button>
              <button
                type="button"
                onClick={() => setMatchedProduct(null)}
                className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── SEARCH & FILTER BAR ─────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items by name, SKU or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'assigned', label: 'Barcodes Assigned' },
            { id: 'missing', label: 'Missing Barcodes' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                filterType === f.id
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRODUCTS TABLE ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            <span>Loading barcode catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
            <p className="font-semibold text-gray-700">No items match your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-slate-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Barcode Value</th>
                  <th className="py-3 px-4">Visual Barcode</th>
                  <th className="py-3 px-4">Sale Price</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const svg = p.barcode ? generateBarcodeSvg(p.barcode, { width: 120, height: 28 }) : ''
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{p.sku}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {p.barcode ? (
                          <span className="text-gray-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {p.barcode}
                          </span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200/60 font-semibold">
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {svg ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: svg }}
                            className="w-28 h-6 flex items-center"
                            title={p.barcode || ''}
                          />
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">₹{p.sale_price}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${p.current_stock <= 0 ? 'text-red-500' : 'text-gray-800'}`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAssignModal(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] cursor-pointer"
                          >
                            {p.barcode ? 'Edit' : 'Assign'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openLabelPrint(p)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                            title="Print Label"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: ASSIGN / GENERATE BARCODE ─────────────────────── */}
      {isAssignModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-sm font-bold">Assign Barcode: {targetProduct.name}</span>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBarcode} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Barcode Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter or scan barcode..."
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-gray-900 text-sm focus:outline-none focus:border-purple-600"
                  required
                  autoFocus
                />
              </div>

              {/* Generator Buttons */}
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-purple-900 block uppercase tracking-wide">
                  Automatic Barcode Generators:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateEan13}
                    className="flex-1 px-3 py-2 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    ⚡ Generate EAN-13 (890...)
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateCode128}
                    className="flex-1 px-3 py-2 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    ⚡ Generate Code-128
                  </button>
                </div>
              </div>

              {/* Live SVG Preview */}
              {barcodeValue && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] text-gray-500 mb-1 font-medium">Rendered Barcode Preview:</span>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvg(barcodeValue, { width: 180, height: 44, showText: true }),
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Barcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BARCODE LABEL PRINT STUDIO ────────────────────── */}
      {labelModalOpen && selectedProductForLabel && (
        <BarcodeLabelModal
          products={[selectedProductForLabel]}
          selectedProduct={selectedProductForLabel}
          onClose={() => {
            setLabelModalOpen(false)
            setSelectedProductForLabel(null)
          }}
        />
      )}
    </div>
  )
}
