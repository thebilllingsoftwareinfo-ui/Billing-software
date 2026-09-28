'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Package,
  Layers,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Loader2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/empty-state'

export default function StockReportPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'movements'>('summary')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [movementType, setMovementType] = useState('ALL')
  const [direction, setDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [rangePreset, setRangePreset] = useState('this_month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Data
  const [summaryRows, setSummaryRows] = useState<any[]>([])
  const [movementRows, setMovementRows] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [kpis, setKpis] = useState({
    totalItems: 0,
    totalCostValuation: 0,
    totalRetailValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      sp.set('subType', activeTab === 'summary' ? 'current_stock' : 'movement')
      sp.set('range', rangePreset)
      if (startDate) sp.set('startDate', startDate)
      if (endDate) sp.set('endDate', endDate)
      if (search) sp.set('search', search)
      sp.set('page', page.toString())
      sp.set('limit', limit.toString())

      const res = await fetch(`/api/reports/inventory?${sp.toString()}`)
      const json = await res.json()

      if (json.rows) {
        if (activeTab === 'summary') {
          let rows = json.rows || []

          // Collect unique categories for dropdown
          const cats = Array.from(new Set(rows.map((r: any) => r.category).filter(Boolean))) as string[]
          setCategories(cats)

          // Status filter
          if (statusFilter !== 'all') {
            rows = rows.filter((r: any) => {
              const stock = Number(r.current_stock) || 0
              const min = Number(r.min_stock) || 0
              if (statusFilter === 'out_of_stock') return stock <= 0
              if (statusFilter === 'low_stock') return stock <= min && stock > 0
              if (statusFilter === 'in_stock') return stock > min
              return true
            })
          }

          if (categoryFilter !== 'ALL') {
            rows = rows.filter((r: any) => r.category === categoryFilter)
          }

          setSummaryRows(rows)

          // Compute KPI totals
          let costVal = 0
          let retailVal = 0
          let lowCount = 0
          let outCount = 0

          json.rows.forEach((r: any) => {
            const stock = Number(r.current_stock) || 0
            const min = Number(r.min_stock) || 0
            costVal += (r.cost_valuation_paise || 0) / 100
            retailVal += (r.retail_valuation_paise || 0) / 100
            if (stock <= 0) outCount++
            else if (stock <= min) lowCount++
          })

          setKpis({
            totalItems: json.rows.length,
            totalCostValuation: costVal,
            totalRetailValuation: retailVal,
            lowStockCount: lowCount,
            outOfStockCount: outCount,
          })
        } else {
          let rows = json.rows || []
          if (movementType !== 'ALL') {
            rows = rows.filter((r: any) => (r.movement_type || '').toLowerCase() === movementType.toLowerCase())
          }
          if (direction === 'IN') {
            rows = rows.filter((r: any) => Number(r.quantity) > 0)
          } else if (direction === 'OUT') {
            rows = rows.filter((r: any) => Number(r.quantity) < 0)
          }
          setMovementRows(rows)
        }

        setTotalCount(json.pagination?.total || json.rows.length)
        setTotalPages(json.pagination?.totalPages || 1)
      }
    } catch (err) {
      console.error('Failed to load report:', err)
      toast.error('Network error loading stock report')
    } finally {
      setLoading(false)
    }
  }, [activeTab, rangePreset, startDate, endDate, search, statusFilter, categoryFilter, movementType, direction, page, limit])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const sp = new URLSearchParams()
      sp.set('subType', activeTab === 'summary' ? 'current_stock' : 'movement')
      sp.set('range', rangePreset)
      if (startDate) sp.set('startDate', startDate)
      if (endDate) sp.set('endDate', endDate)
      if (search) sp.set('search', search)
      sp.set('export', 'csv')

      const res = await fetch(`/api/reports/inventory?${sp.toString()}`)
      if (!res.ok) throw new Error('Export request failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stock-report-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report exported to CSV successfully')
    } catch (err: any) {
      console.error('Export error:', err)
      toast.error(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Stock & Inventory Reports</h1>
          <p className="text-xs text-gray-500 mt-1">
            Comprehensive audit-ready stock summary, valuation statements, and itemized inventory movements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReport()}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-8">
        <button
          onClick={() => {
            setActiveTab('summary')
            setPage(1)
          }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'summary' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="h-4 w-4" />
          Stock Summary Report
          {activeTab === 'summary' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('movements')
            setPage(1)
          }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'movements' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          Stock Movement Log
          {activeTab === 'movements' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
          )}
        </button>
      </div>

      {/* KPI Cards for Summary */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tracked Products</span>
            <h3 className="text-xl font-bold text-gray-900 mt-1">{kpis.totalItems} items</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Asset Valuation (Cost)</span>
            <h3 className="text-xl font-bold text-emerald-700 mt-1 font-mono">
              ₹{kpis.totalCostValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Low Stock Products</span>
            <h3 className={`text-xl font-bold mt-1 ${kpis.lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {kpis.lowStockCount} items
            </h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Out of Stock</span>
            <h3 className={`text-xl font-bold mt-1 ${kpis.outOfStockCount > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
              {kpis.outOfStockCount} items
            </h3>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {activeTab === 'summary' ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    setPage(1)
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter Pills */}
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-medium text-gray-600">
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setPage(1)
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs font-semibold' : 'hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('in_stock')
                    setPage(1)
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'in_stock' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'hover:text-gray-900'
                  }`}
                >
                  In Stock
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('low_stock')
                    setPage(1)
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'low_stock' ? 'bg-white text-amber-700 shadow-2xs font-semibold' : 'hover:text-gray-900'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('out_of_stock')
                    setPage(1)
                  }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'out_of_stock' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'hover:text-gray-900'
                  }`}
                >
                  Out of Stock
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={movementType}
                onChange={(e) => {
                  setMovementType(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="opening">Opening</option>
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="return_in">Sales Return</option>
                <option value="return_out">Purchase Return</option>
                <option value="adjustment_in">Adjustment In</option>
                <option value="adjustment_out">Adjustment Out</option>
              </select>

              <select
                value={direction}
                onChange={(e) => {
                  setDirection(e.target.value as any)
                  setPage(1)
                }}
                className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Directions</option>
                <option value="IN">IN (+)</option>
                <option value="OUT">OUT (-)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
            Generating stock report...
          </div>
        ) : activeTab === 'summary' ? (
          summaryRows.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description="No products match your selected filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Current Stock</th>
                    <th className="py-3.5 px-4 text-right">Reorder Level</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Cost Price</th>
                    <th className="py-3.5 px-4 text-right">Valuation (Cost)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {summaryRows.map((row) => {
                    const stock = Number(row.current_stock) || 0
                    const min = Number(row.min_stock) || 0
                    const costVal = (row.cost_valuation_paise || 0) / 100
                    const costPrice = (row.purchase_price_paise || 0) / 100

                    let badge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        In Stock
                      </span>
                    )
                    if (stock <= 0) {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Out of Stock
                        </span>
                      )
                    } else if (stock <= min) {
                      badge = (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Low Stock
                        </span>
                      )
                    }

                    return (
                      <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{row.name}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">{row.sku || '—'}</td>
                        <td className="py-3.5 px-4 text-gray-600">{row.category || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-mono">
                          {stock} <span className="font-normal text-gray-400 text-[11px]">{row.unit || 'units'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-gray-500 font-mono">
                          {min} <span className="font-normal text-gray-400 text-[11px]">{row.unit || 'units'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{badge}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                          ₹{costPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          ₹{costVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/inventory/product/${row.id}/ledger`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            View Ledger <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : movementRows.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No stock movements recorded"
            description="No inventory transactions occurred in the selected date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4">Direction</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {movementRows.map((m) => {
                  const qty = Number(m.quantity) || 0
                  const isPositive = qty >= 0

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-600">{m.date}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{m.product_name}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">{m.sku || '—'}</td>
                      <td className="py-3.5 px-4 capitalize font-medium text-gray-800">
                        {(m.movement_type || '').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingUp className="h-3 w-3" /> IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <TrendingDown className="h-3 w-3" /> OUT
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${qty}` : qty}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{m.reference || '—'}</td>
                      <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">{m.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
            <span>
              Showing {activeTab === 'summary' ? summaryRows.length : movementRows.length} of {totalCount} records (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
