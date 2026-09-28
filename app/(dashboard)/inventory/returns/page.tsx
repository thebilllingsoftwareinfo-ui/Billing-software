'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RotateCcw,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  FileText,
  User,
  Building2,
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/empty-state'
import { SalesReturnModal } from '@/components/inventory/sales-return-modal'
import { PurchaseReturnModal } from '@/components/inventory/purchase-return-modal'

export default function StockReturnsPage({ initialTab = 'sales' }: { initialTab?: 'sales' | 'purchases' } = {}) {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>(initialTab)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals state
  const [salesModalOpen, setSalesModalOpen] = useState(false)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)

  // Records state
  const [salesReturns, setSalesReturns] = useState<any[]>([])
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([])

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'sales') {
        const res = await fetch(`/api/returns/sales?q=${encodeURIComponent(search)}`)
        const json = await res.json()
        if (json.success) {
          setSalesReturns(json.data || [])
        } else {
          toast.error(json.error || 'Failed to load sales returns')
        }
      } else {
        const res = await fetch(`/api/returns/purchases?q=${encodeURIComponent(search)}`)
        const json = await res.json()
        if (json.success) {
          setPurchaseReturns(json.data || [])
        } else {
          toast.error(json.error || 'Failed to load purchase returns')
        }
      }
    } catch (err) {
      console.error('Failed to fetch returns:', err)
      toast.error('Network error loading returns')
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const totalSalesReturnVal = salesReturns.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
  const totalPurchaseReturnVal = purchaseReturns.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Returns & Reversals Hub</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage sales returns (Credit Notes) and purchase returns (Debit Notes) with automatic stock and ledger reversal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReturns()}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Refresh Returns"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'sales' ? (
            <button
              onClick={() => setSalesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Sales Return
            </button>
          ) : (
            <button
              onClick={() => setPurchaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Purchase Return
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-8">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'sales' ? 'text-rose-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Sales Returns (Credit Notes)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
            {salesReturns.length}
          </span>
          {activeTab === 'sales' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'purchases' ? 'text-amber-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Purchase Returns (Debit Notes)
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
            {purchaseReturns.length}
          </span>
          {activeTab === 'purchases' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-t-full" />
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activeTab === 'sales' ? (
          <>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Sales Returns</span>
              <h3 className="text-xl font-black text-gray-900 mt-1">{salesReturns.length} records</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Credit Issued to Customers</span>
              <h3 className="text-xl font-black text-rose-600 mt-1 font-mono">
                ₹{totalSalesReturnVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Stock Restocked</span>
              <h3 className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                <TrendingUp className="h-5 w-5" /> Stock In
              </h3>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Purchase Returns</span>
              <h3 className="text-xl font-black text-gray-900 mt-1">{purchaseReturns.length} records</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Debit Claimed from Suppliers</span>
              <h3 className="text-xl font-black text-amber-600 mt-1 font-mono">
                ₹{totalPurchaseReturnVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Stock Returned</span>
              <h3 className="text-xl font-black text-rose-600 mt-1 flex items-center gap-1.5">
                <TrendingDown className="h-5 w-5" /> Stock Out
              </h3>
            </div>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'sales' ? 'Search note #, invoice #, customer...' : 'Search note #, bill #, supplier...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-rose-600 mr-2" />
            Loading return records...
          </div>
        ) : activeTab === 'sales' ? (
          salesReturns.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No sales returns recorded"
              description="Issue credit notes for customer returns to adjust inventory and customer receivables."
              actionLabel="+ Create Sales Return"
              onAction={() => setSalesModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Credit Note #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4 text-right">Subtotal</th>
                    <th className="py-3.5 px-4 text-right">Tax (GST)</th>
                    <th className="py-3.5 px-4 text-right">Total Credit</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {salesReturns.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {record.credit_note_number}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {record.credit_note_date || record.created_at?.split('T')[0]}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {record.invoice_number || record.against_invoice_id?.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">
                        {record.customer_name || record.customers?.name || 'Customer'}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-gray-600">
                        {(record.reason || 'other').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                        ₹{Number(record.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                        ₹{Number(record.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                        ₹{Number(record.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {record.status || 'issued'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : purchaseReturns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No purchase returns recorded"
            description="Raise debit notes against supplier purchase bills to deduct stock and reduce payables."
            actionLabel="+ Create Purchase Return"
            onAction={() => setPurchaseModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Debit Note #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Bill #</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4 text-right">Subtotal</th>
                  <th className="py-3.5 px-4 text-right">Input Tax</th>
                  <th className="py-3.5 px-4 text-right">Total Debit</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {purchaseReturns.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {record.debit_note_number}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {record.debit_note_date || record.created_at?.split('T')[0]}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {record.bill_number || record.against_bill_id?.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      {record.supplier_name || record.suppliers?.name || 'Supplier'}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-gray-600">
                      {(record.reason || 'other').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                      ₹{Number(record.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                      ₹{Number(record.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                      ₹{Number(record.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        {record.status || 'issued'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <SalesReturnModal
        open={salesModalOpen}
        onClose={() => setSalesModalOpen(false)}
        onSuccess={() => fetchReturns()}
      />
      <PurchaseReturnModal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={() => fetchReturns()}
      />
    </div>
  )
}
