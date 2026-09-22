'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Package,
  Search,
  Plus,
  ArrowUpDown,
  Edit2,
  Archive,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Boxes,
  Tag,
} from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ProductFormModal } from '@/components/products/product-form-modal'
import { formatRupees } from '@/lib/utils/currency'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const actionParam = searchParams.get('action')

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalStockValue: 0,
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)

  // Filters state
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all')
  const [sortBy, setSortBy] = useState('name_asc')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  useEffect(() => {
    if (actionParam === 'new') {
      setSelectedProduct(null)
      setIsModalOpen(true)
    }
  }, [actionParam])

  // Fetch categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data)
      })
  }, [])

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        category_id: selectedCategory,
        status: statusFilter,
        stock_status: stockFilter,
        sort: sortBy,
        page: pagination.page.toString(),
        limit: '15',
      })

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setProducts(data.data)
        setPagination(data.pagination)
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        toast.error(data.error || 'Failed to load products.')
      }
    } catch {
      toast.error('Error connecting to server.')
    } finally {
      setIsLoading(false)
    }
  }, [query, selectedCategory, statusFilter, stockFilter, sortBy, pagination.page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleArchiveToggle = async (product: any) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(data.message)
        fetchProducts()
      } else {
        toast.error(data.error || 'Failed to update product status.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Products Catalog</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage product items, SKUs, pricing, GST tax rates, and inventory alerts.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedProduct(null)
            setIsModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Items</p>
            <p className="text-lg font-extrabold text-gray-900">{summary.totalProducts}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Low Stock</p>
            <p className="text-lg font-extrabold text-amber-600">{summary.lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Out of Stock</p>
            <p className="text-lg font-extrabold text-red-600">{summary.outOfStockCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Stock Value</p>
            <p className="text-lg font-extrabold text-emerald-600">{formatRupees(summary.totalStockValue)}</p>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, Sorting */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
              placeholder="Search by name, SKU, HSN..."
              className="w-full h-9 pl-9 pr-4 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
            className="w-full sm:w-44 h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Stock Filter Pills */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {(['all', 'low_stock', 'out_of_stock'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStockFilter(st)
                  setPagination((p) => ({ ...p, page: 1 }))
                }}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  stockFilter === st ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-2 text-xs bg-white border border-gray-200 rounded-xl text-gray-800 focus:outline-none"
            >
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="stock_desc">Stock Level (Highest)</option>
              <option value="stock_asc">Stock Level (Lowest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs font-medium">Loading catalog products...</p>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={query ? 'No matching products found' : 'No products in catalog'}
          description={
            query
              ? `No catalog item matches "${query}".`
              : 'Add products to your catalog to auto-populate invoices, quotations, and track inventory movements.'
          }
          actionLabel="+ Add Product"
          onAction={() => {
            setSelectedProduct(null)
            setIsModalOpen(true)
          }}
        />
      ) : (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Product Name & SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">HSN / GST</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-right">Purchase Price</th>
                  <th className="py-3.5 px-4 text-center">Current Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
                {products.map((p) => {
                  const stock = Number(p.current_stock) || 0
                  const minLevel = Number(p.min_stock_level) || 0
                  const isOutOfStock = stock === 0
                  const isLowStock = minLevel > 0 && stock <= minLevel && !isOutOfStock

                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-3.5 px-4">
                        <Link href={`/products/${p.id}`} className="flex items-center gap-3 group-hover:text-indigo-600">
                          <div className="h-9 w-9 rounded-xl bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-xs flex-shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[11px] font-mono text-gray-400">SKU: {p.sku}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {p.product_categories?.name || <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-gray-600">{p.hsn_sac_code || '—'}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                            {p.gst_rate}% GST
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-gray-900">
                        {formatRupees(p.sale_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-500 font-semibold">
                        {formatRupees(p.purchase_price)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.product_type === 'service' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                            Service
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {stock} {p.product_units?.abbreviation || 'pcs'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${p.id}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title="View Stock Ledger"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedProduct(p)
                              setIsModalOpen(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(p)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600"
                            title={p.is_active ? 'Archive' : 'Unarchive'}
                          >
                            {p.is_active ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 border-t border-gray-200 text-xs text-gray-500">
              <span>
                Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
                <strong className="text-gray-900">{pagination.totalPages}</strong> ({pagination.total} items)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProducts}
        initialData={selectedProduct}
      />
    </div>
  )
}
