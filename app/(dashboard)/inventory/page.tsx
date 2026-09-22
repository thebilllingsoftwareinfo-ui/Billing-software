'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  History,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  Printer,
  Eye,
  ShoppingCart,
  FileText,
} from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'
import { StockHistoryModal } from '@/components/inventory/stock-history-modal'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { toast } from 'sonner'

interface ProductInventory {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  current_stock: number
  min_stock_level: number
  purchase_price: number
  sale_price: number
  track_inventory: boolean
  product_categories?: { name: string } | null
  product_units?: { name: string; abbreviation: string } | null
}

interface SummaryData {
  totalTrackedItems: number
  totalValuation: number
  retailValuation: number
  lowStockCount: number
}

export default function StockInventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<ProductInventory[]>([])
  const [summary, setSummary] = useState<SummaryData>({
    totalTrackedItems: 0,
    totalValuation: 0,
    retailValuation: 0,
    lowStockCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')

  // Modals state
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedProductForAdj, setSelectedProductForAdj] = useState<string | undefined>(undefined)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<{ id: string; name: string; sku?: string } | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      params.set('limit', '100')

      const res = await fetch(`/api/inventory?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setItems(json.data || [])
        if (json.summary) {
          setSummary(json.summary)
        }
      } else {
        toast.error(json.error || 'Failed to fetch inventory data')
      }
    } catch (err) {
      console.error('Failed to load inventory:', err)
      toast.error('Network error fetching inventory data')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const filteredItems = items.filter((item) => {
    const stock = Number(item.current_stock) || 0
    const minLevel = Number(item.min_stock_level) || 0

    if (stockFilter === 'low') {
      return stock <= minLevel && stock > 0
    }
    if (stockFilter === 'out') {
      return stock <= 0
    }
    return true
  })

  const handleOpenAdjustment = (productId?: string) => {
    setSelectedProductForAdj(productId)
    setAdjustmentModalOpen(true)
  }

  const handleOpenHistory = (product: ProductInventory) => {
    setSelectedProductForHistory({
      id: product.id,
      name: product.name,
      sku: product.sku || undefined,
    })
    setHistoryModalOpen(true)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Inventory & Stock Ledger</h1>
          <p className="text-xs text-gray-500 mt-1">
            Immutable movement-driven stock tracking, low-stock detection, and valuation calculations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInventory()}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs"
            title="Refresh Inventory"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenAdjustment()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> Stock Adjustment
          </button>
        </div>
      </div>

      {/* Valuation & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tracked Products</span>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">{summary.totalTrackedItems}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Cost Valuation</span>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">
              ₹{Number(summary.totalValuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Retail Valuation</span>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">
              ₹{Number(summary.retailValuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${
              summary.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Low Stock Alerts</span>
            <h3
              className={`text-lg font-bold mt-0.5 ${
                summary.lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {summary.lowStockCount} items
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-medium text-gray-600">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                stockFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs font-semibold' : 'hover:text-gray-900'
              }`}
            >
              All Stock
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg transition-all ${
                stockFilter === 'low' ? 'bg-white text-amber-700 shadow-2xs font-semibold' : 'hover:text-gray-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg transition-all ${
                stockFilter === 'out' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'hover:text-gray-900'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
            Calculating real-time stock balances...
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={search ? 'No matching products found' : 'No inventory items tracked yet'}
            description="Manage and monitor inventory levels as goods are bought, sold, or adjusted."
            actionLabel="+ Adjust Stock"
            onAction={() => handleOpenAdjustment()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">SKU / Code</th>
                  <th className="py-3.5 px-4 text-right">Current Stock</th>
                  <th className="py-3.5 px-4 text-right">Reorder Level</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Cost Price</th>
                  <th className="py-3.5 px-4 text-right">Stock Valuation</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredItems.map((item) => {
                  const stock = Number(item.current_stock) || 0
                  const minLevel = Number(item.min_stock_level) || 0
                  const cost = Number(item.purchase_price) || 0
                  const valuation = stock * cost
                  const unitAbbr = item.product_units?.abbreviation || 'units'

                  let statusBadge = (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-[11px]">
                      In Stock
                    </span>
                  )

                  if (stock <= 0) {
                    statusBadge = (
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg text-[11px]">
                        Out of Stock
                      </span>
                    )
                  } else if (stock <= minLevel) {
                    statusBadge = (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg text-[11px]">
                        Low Stock
                      </span>
                    )
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {item.name}
                        {item.product_categories?.name && (
                          <span className="block text-[11px] font-normal text-gray-400">
                            {item.product_categories.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                        {item.sku || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                        {stock} <span className="text-gray-400 font-normal text-[11px]">{unitAbbr}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-500 font-medium">
                        {minLevel} <span className="text-gray-400 font-normal text-[11px]">{unitAbbr}</span>
                      </td>
                      <td className="py-3.5 px-4">{statusBadge}</td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-mono text-[11px]">
                        ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-900 font-mono text-[11px]">
                        ₹{valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenHistory(item)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="View Stock Ledger History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAdjustment(item.id)}
                            className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Adjust
                          </button>
                          
                          <RowActionsMenu
                            items={[
                              {
                                label: 'Stock Movement History',
                                icon: History,
                                onClick: () => handleOpenHistory(item),
                              },
                              {
                                label: 'Quick Stock Adjustment',
                                icon: SlidersHorizontal,
                                onClick: () => handleOpenAdjustment(item.id),
                              },
                              {
                                label: 'View Product Details',
                                icon: Eye,
                                onClick: () => router.push(`/products/${item.id}`),
                              },
                              {
                                label: 'Create Sale Invoice',
                                icon: FileText,
                                onClick: () => router.push(`/sales/invoices/new?productId=${item.id}`),
                                divider: true,
                              },
                              {
                                label: 'Add to Purchase Order',
                                icon: ShoppingCart,
                                onClick: () => router.push(`/purchases/bills/new?productId=${item.id}`),
                              },
                              {
                                label: 'Print Stock Report',
                                icon: Printer,
                                onClick: () => {
                                  toast.success(`Printing stock ledger for ${item.name}...`)
                                  window.print()
                                },
                                divider: true,
                              },
                            ]}
                          />
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

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={adjustmentModalOpen}
        onClose={() => {
          setAdjustmentModalOpen(false)
          setSelectedProductForAdj(undefined)
        }}
        onSuccess={() => fetchInventory()}
        preselectedProductId={selectedProductForAdj}
      />

      {/* Stock History Ledger Modal */}
      {selectedProductForHistory && (
        <StockHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false)
            setSelectedProductForHistory(null)
          }}
          productId={selectedProductForHistory.id}
          productName={selectedProductForHistory.name}
          productSku={selectedProductForHistory.sku}
        />
      )}
    </div>
  )
}
