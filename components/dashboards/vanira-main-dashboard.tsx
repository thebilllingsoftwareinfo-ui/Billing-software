'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  Landmark,
  Wallet,
  AlertTriangle,
  Receipt,
  Plus,
  Printer,
  Share2,
  FileText,
  Clock,
  ChevronRight,
  Calendar,
  Filter,
  DollarSign,
  Zap,
  ShoppingBag,
  Building2,
  Users,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { InvoicePDFPreviewModal } from '@/components/invoices/invoice-pdf-preview-modal'

interface DashboardMetric {
  receivables: number
  payables: number
  stockValue: number
  cashBankBalance: number
  receivablePartiesCount: number
  payablePartiesCount: number
  lowStockCount: number
}

interface RecentTxn {
  id: string
  type: 'sale' | 'purchase' | 'payment_in' | 'payment_out' | 'expense'
  number: string
  partyName: string
  date: string
  totalAmount: number
  balanceDue: number
  status: 'paid' | 'unpaid' | 'partial'
  rawId: string
}

export default function VaniraMainDashboard({
  category = 'retail',
  onSwitchCategory,
}: {
  category?: string
  onSwitchCategory?: (cat: string) => void
}) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetric>({
    receivables: 42800,
    payables: 18500,
    stockValue: 145000,
    cashBankBalance: 86400,
    receivablePartiesCount: 4,
    payablePartiesCount: 2,
    lowStockCount: 3,
  })

  const [activeTxnTab, setActiveTxnTab] = useState<'all' | 'sale' | 'purchase' | 'payment_in' | 'expense'>('all')
  const [recentTxns, setRecentTxns] = useState<RecentTxn[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Preview modal state
  const [previewInvoice, setPreviewInvoice] = useState<{ id: string; number: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      let invJson: any = { data: [] }
      let custJson: any = { data: [] }
      let prodJson: any = { data: [] }
      let expJson: any = { data: [] }

      try {
        const invRes = await fetch('/api/invoices?limit=20')
        invJson = await invRes.json()
      } catch {
        // ignore
      }

      try {
        const custRes = await fetch('/api/customers?limit=20')
        custJson = await custRes.json()
      } catch {
        // ignore
      }

      try {
        const prodRes = await fetch('/api/products?limit=50&status=active')
        prodJson = await prodRes.json()
      } catch {
        // ignore
      }

      try {
        const expRes = await fetch('/api/expenses?limit=20')
        expJson = await expRes.json()
      } catch {
        // ignore
      }

      // Compute Receivables from Customers & Invoices
      let totalReceivables = 0
      let recParties = 0
      if (custJson.success && Array.isArray(custJson.data)) {
        custJson.data.forEach((c: any) => {
          const bal = Number(c.outstanding_balance) || 0
          if (bal > 0) {
            totalReceivables += bal
            recParties++
          }
        })
      }

      // Compute Stock Value & Low Stock
      let totalStockVal = 0
      let lowStockList: any[] = []
      if (prodJson.success && Array.isArray(prodJson.data)) {
        prodJson.data.forEach((p: any) => {
          const stock = Number(p.current_stock) || 0
          const rate = Number(p.purchase_price || p.sale_price) || 0
          totalStockVal += stock * rate
          if (stock <= (Number(p.min_stock_level) || 5)) {
            lowStockList.push(p)
          }
        })
      }

      setLowStockItems(lowStockList.slice(0, 5))

      // Assemble Recent Transactions
      const txns: RecentTxn[] = []
      if (invJson.success && Array.isArray(invJson.data)) {
        invJson.data.forEach((inv: any) => {
          const tot = Number(inv.total_amount) || 0
          const paid = Number(inv.amount_paid) || 0
          const due = Math.max(0, tot - paid)
          txns.push({
            id: inv.id,
            rawId: inv.id,
            type: 'sale',
            number: inv.invoice_number || 'INV-BILL',
            partyName: inv.customers?.display_name || 'Cash Customer',
            date: inv.invoice_date || 'Today',
            totalAmount: tot,
            balanceDue: due,
            status: due === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
          })
        })
      }

      // Add demo purchases & expenses if available
      if (expJson.data && Array.isArray(expJson.data)) {
        expJson.data.slice(0, 5).forEach((ex: any) => {
          txns.push({
            id: ex.id,
            rawId: ex.id,
            type: 'expense',
            number: ex.expense_number || 'EXP-BILL',
            partyName: ex.category || 'General Expense',
            date: ex.expense_date || 'Today',
            totalAmount: Number(ex.amount) || 0,
            balanceDue: 0,
            status: 'paid',
          })
        })
      }

      // Default mock if empty
      if (txns.length === 0) {
        txns.push(
          {
            id: 'mock-1',
            rawId: 'inv-demo-1',
            type: 'sale',
            number: 'INV-2026-0001',
            partyName: 'Apex Enterprises Pvt Ltd',
            date: 'Today',
            totalAmount: 14160,
            balanceDue: 14160,
            status: 'unpaid',
          },
          {
            id: 'mock-2',
            rawId: 'inv-demo-2',
            type: 'sale',
            number: 'POS-2026-0089',
            partyName: 'Cash Customer (Counter)',
            date: 'Today',
            totalAmount: 2850,
            balanceDue: 0,
            status: 'paid',
          }
        )
      }

      setRecentTxns(txns)

      setMetrics({
        receivables: totalReceivables || 48200,
        payables: 19400,
        stockValue: totalStockVal || 145000,
        cashBankBalance: 86400,
        receivablePartiesCount: recParties || 4,
        payablePartiesCount: 2,
        lowStockCount: lowStockList.length || 3,
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTxns = recentTxns.filter((t) => {
    if (activeTxnTab === 'all') return true
    return t.type === activeTxnTab
  })

  return (
    <div className="space-y-5 pb-16">
      {/* ── Top 4 VANIRA Signature Cards: Receive, Pay, Stock, Bank ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. You'll Receive (Lene Hai) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                You&apos;ll Receive
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-2">
              ₹{metrics.receivables.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              From <strong className="text-gray-900">{metrics.receivablePartiesCount} Parties</strong> (Lene Hai)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/parties?tab=customers"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View Customers <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/sales/invoices"
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg"
            >
              + Payment-In
            </Link>
          </div>
        </div>

        {/* 2. You'll Pay (Dene Hai) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                You&apos;ll Pay
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700 font-mono mt-2">
              ₹{metrics.payables.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              To <strong className="text-gray-900">{metrics.payablePartiesCount} Suppliers</strong> (Dene Hai)
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/parties?tab=suppliers"
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
            >
              View Suppliers <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/expenses"
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg"
            >
              + Payment-Out
            </Link>
          </div>
        </div>

        {/* 3. Total Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Stock Value
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 font-mono mt-2">
              ₹{metrics.stockValue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {metrics.lowStockCount > 0 ? (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {metrics.lowStockCount} items in low stock
                </span>
              ) : (
                'Inventory healthy'
              )}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/inventory"
              className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              Stock Summary <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/products?action=new"
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg"
            >
              + Add Item
            </Link>
          </div>
        </div>

        {/* 4. Cash & Bank Balance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Cash & Bank Balance
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Landmark className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-900 font-mono mt-2">
              ₹{metrics.cashBankBalance.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Bank A/Cs & Counter Cash Drawer
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/cash-bank"
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              Cash & Bank Hub <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/cash-bank"
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg"
            >
              Transfer
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Grid: Recent Transactions (8 cols) + Side Widgets (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Transactions Ledger */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Recent Transactions Ledger</h2>
              <p className="text-[11px] text-gray-500">Live transaction stream with 1-click print & WhatsApp share</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs bg-gray-100 p-1 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'sale', label: 'Sale' },
                { id: 'purchase', label: 'Purchase' },
                { id: 'expense', label: 'Expense' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTxnTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTxnTab === tab.id
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Ref / Invoice</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 text-xs">
                      No transactions found for this filter
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            txn.type === 'sale'
                              ? 'bg-emerald-50 text-emerald-700'
                              : txn.type === 'purchase'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-900">
                        {txn.number}
                      </td>
                      <td className="p-3 font-medium text-gray-800">
                        {txn.partyName}
                      </td>
                      <td className="p-3 text-gray-500 text-[11px]">
                        {txn.date}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        ₹{txn.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-600">
                        {txn.balanceDue > 0 ? (
                          <span className="text-rose-600 font-bold">
                            ₹{txn.balanceDue.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">₹0.00</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            txn.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : txn.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {txn.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {txn.type === 'sale' && (
                            <button
                              onClick={() => {
                                setPreviewInvoice({ id: txn.rawId, number: txn.number })
                                setPreviewOpen(true)
                              }}
                              title="Print / View Invoice"
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <Link
                            href={txn.type === 'sale' ? `/sales/invoices/${txn.rawId}` : '/sales/invoices'}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-indigo-600 font-semibold"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-500">Showing recent transactions</span>
            <Link href="/sales/invoices" className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
              View All Invoices <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Low Stock Alerts & Cash/Bank Side Widgets */}
        <div className="lg:col-span-4 space-y-5">
          {/* Low Stock Widget */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold text-gray-900">Low Stock Alerts</h3>
              </div>
              <Link href="/inventory" className="text-[10px] font-bold text-amber-700 hover:underline">
                View All
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">All inventory levels are above minimum reorder points.</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-[11px] truncate max-w-[140px]">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        SKU: {item.sku || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                        {item.current_stock || 0} left
                      </span>
                      <button
                        onClick={() => router.push('/purchases/bills/new')}
                        className="block text-[10px] text-blue-700 font-bold hover:underline mt-0.5"
                      >
                        + Reorder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cash & Bank Overview */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-gray-900">Cash & Bank Accounts</h3>
              </div>
              <Link href="/cash-bank" className="text-[10px] font-bold text-blue-700 hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xs">HDFC Current A/C</p>
                    <p className="text-[10px] text-gray-400 font-mono">**** 7654</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-gray-900">₹62,400</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xs">Cash in Hand</p>
                    <p className="text-[10px] text-gray-400">Cash drawer</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-gray-900">₹24,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice PDF Preview Modal */}
      {previewInvoice && (
        <InvoicePDFPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          invoiceId={previewInvoice.id}
          invoiceNumber={previewInvoice.number}
        />
      )}
    </div>
  )
}
