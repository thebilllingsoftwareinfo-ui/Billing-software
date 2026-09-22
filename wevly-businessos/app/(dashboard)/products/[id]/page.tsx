'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  Tag,
  Boxes,
  Edit2,
  Loader2,
  History,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { ProductFormModal } from '@/components/products/product-form-modal'

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [productData, setProductData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fetchProductDetails = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/products/${id}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setProductData(data.data)
      } else {
        toast.error(data.error || 'Failed to load product details.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProductDetails()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-medium">Loading product inventory & movements...</p>
      </div>
    )
  }

  if (!productData) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <p className="text-sm font-semibold text-gray-800">Product not found</p>
        <Link href="/products" className="mt-4 inline-block text-xs text-indigo-600 font-bold hover:underline">
          ← Back to Product Catalog
        </Link>
      </div>
    )
  }

  const { product, movements } = productData
  const currentStock = Number(product.current_stock) || 0
  const minStock = Number(product.min_stock_level) || 0
  const isLowStock = minStock > 0 && currentStock <= minStock

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Products Catalog
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit Product
          </button>
        </div>
      </div>

      {/* Product Banner */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-indigo-600/20">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-gray-900">{product.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {product.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2 font-mono">
              <span>SKU: <strong>{product.sku}</strong></span>
              {product.barcode && <span>Barcode: <strong>{product.barcode}</strong></span>}
              {product.hsn_sac_code && <span>HSN: <strong>{product.hsn_sac_code}</strong></span>}
            </div>
          </div>
        </div>

        {/* Category & Unit Badge */}
        <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-xs text-gray-500 space-y-1 min-w-[200px]">
          <p className="font-bold text-gray-900 uppercase tracking-wider text-[10px]">Category & Unit</p>
          <p className="font-semibold text-gray-800">{product.product_categories?.name || 'Unassigned'}</p>
          <p className="text-[11px] text-gray-400">Unit: {product.product_units?.name || 'Pieces'} ({product.product_units?.abbreviation || 'pcs'})</p>
        </div>
      </div>

      {/* Pricing & Stock KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Selling Price */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Selling Price</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{formatCurrency(product.sale_price)}</p>
          <p className="text-[11px] text-gray-400 mt-1">Excl. GST Tax</p>
        </div>

        {/* Purchase Price */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Purchase Price</p>
          <p className="text-2xl font-extrabold text-gray-700 mt-1">{formatCurrency(product.purchase_price)}</p>
          <p className="text-[11px] text-gray-400 mt-1">Cost price</p>
        </div>

        {/* GST Tax Rate */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">GST Tax Rate</p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{product.gst_rate}%</p>
          <p className="text-[11px] text-gray-400 mt-1">HSN/SAC Code: {product.hsn_sac_code || 'N/A'}</p>
        </div>

        {/* Current Stock */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Stock</p>
          <p className={`text-2xl font-extrabold mt-1 ${isLowStock ? 'text-amber-600' : currentStock === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {currentStock} <span className="text-sm font-normal text-gray-500">{product.product_units?.abbreviation || 'pcs'}</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Low stock alert level: <strong className="text-gray-700">{minStock}</strong>
          </p>
        </div>
      </div>

      {/* Stock Movements Ledger Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-900">Inventory Movement History</h2>
          </div>
          <span className="text-xs text-gray-400">{movements.length} transactions recorded</span>
        </div>

        <div className="p-6">
          {movements.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs font-medium">
              No inventory movements recorded yet. Movements populate automatically on sales invoices, purchase bills, and stock adjustments.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Movement Type</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5 text-right">Quantity</th>
                  <th className="py-2.5 text-right">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {movements.map((m: any) => {
                  const isIn = ['opening', 'purchase', 'return_in', 'adjustment_in'].includes(m.movement_type)
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-600">{new Date(m.created_at).toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isIn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{m.description || '—'}</td>
                      <td className={`py-3 text-right font-extrabold ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIn ? `+${m.quantity}` : `-${m.quantity}`}
                      </td>
                      <td className="py-3 text-right text-gray-600 font-semibold">{formatCurrency(m.unit_cost || 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Product Modal */}
      <ProductFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchProductDetails}
        initialData={product}
      />
    </div>
  )
}
