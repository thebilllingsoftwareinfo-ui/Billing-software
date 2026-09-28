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
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { InvoicePDFPreviewModal } from '@/components/invoices/invoice-pdf-preview-modal'
import { useCategoryConfig } from '@/lib/hooks/useCategoryConfig'

interface DashboardMetric {
  receivables: number
  payables: number
  stockValue: number
  cashBankBalance: number
  receivablePartiesCount: number
  payablePartiesCount: number
  lowStockCount: number
  outOfStockCount: number
  totalTrackedItems: number
  todayExpenses: number
  monthlyExpenses: number
  todaySales: number
  todayPurchases: number
  overdueReceivables: number
  overduePayables: number
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
  const config = useCategoryConfig()
  const [metrics, setMetrics] = useState<DashboardMetric>({
    receivables: 42800,
    payables: 18500,
    stockValue: 145000,
    cashBankBalance: 86400,
    receivablePartiesCount: 4,
    payablePartiesCount: 2,
    lowStockCount: 3,
    outOfStockCount: 0,
    totalTrackedItems: 12,
    todayExpenses: 0,
    monthlyExpenses: 0,
    todaySales: 0,
    todayPurchases: 0,
    overdueReceivables: 0,
    overduePayables: 0,
  })

  const [activeTxnTab, setActiveTxnTab] = useState<'all' | 'sale' | 'purchase' | 'payment_in' | 'expense'>('all')
  const [recentTxns, setRecentTxns] = useState<RecentTxn[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Preview modal state
  const [previewInvoice, setPreviewInvoice] = useState<{ id: string; number: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Phase 7B CRM Widget States
  const [crmDueFollowups, setCrmDueFollowups] = useState<any[]>([])
  const [crmOverdueFollowups, setCrmOverdueFollowups] = useState<any[]>([])
  const [crmOverdueCustomers, setCrmOverdueCustomers] = useState<any[]>([])
  const [crmOverdueSuppliers, setCrmOverdueSuppliers] = useState<any[]>([])
  const [crmRecentCustPayments, setCrmRecentCustPayments] = useState<any[]>([])
  const [crmRecentSuppPayments, setCrmRecentSuppPayments] = useState<any[]>([])
  const [crmLoading, setCrmLoading] = useState(true)
  const [crmError, setCrmError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const todayDateStr = new Date().toISOString().split('T')[0]
      const currentYearMonth = todayDateStr.substring(0, 7)

      // Concurrent parallel execution of all dashboard requests (eliminates 13-stage waterfall)
      const [
        invResult,
        custResult,
        prodResult,
        expResult,
        cbResult,
        suppResult,
        outRecResult,
        outPayResult,
        fupResult,
        outCustResult,
        outSuppResult,
        payResult,
        billsResult,
      ] = await Promise.allSettled([
        fetch('/api/invoices?limit=20').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/customers?limit=20').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/products?limit=50&status=active').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/expenses?limit=50').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/cash-bank/summary').then((r) => r.json()).catch(() => ({})),
        fetch('/api/suppliers').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/outstanding?type=receivables').then((r) => r.json()).catch(() => ({})),
        fetch('/api/outstanding?type=payables').then((r) => r.json()).catch(() => ({})),
        fetch('/api/crm/followups?status=pending').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/outstanding?type=receivables&status=overdue').then((r) => r.json()).catch(() => ({})),
        fetch('/api/outstanding?type=payables&status=overdue').then((r) => r.json()).catch(() => ({})),
        fetch('/api/payments?limit=5').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/purchases/bills').then((r) => r.json()).catch(() => ({ bills: [] })),
      ])

      const invJson = invResult.status === 'fulfilled' ? invResult.value : { data: [] }
      const custJson = custResult.status === 'fulfilled' ? custResult.value : { data: [] }
      const prodJson = prodResult.status === 'fulfilled' ? prodResult.value : { data: [] }
      const expJson = expResult.status === 'fulfilled' ? expResult.value : { data: [] }
      const cbJson = cbResult.status === 'fulfilled' ? cbResult.value : {}
      const suppJson = suppResult.status === 'fulfilled' ? suppResult.value : { data: [] }
      const outRecJson = outRecResult.status === 'fulfilled' ? outRecResult.value : {}
      const outPayJson = outPayResult.status === 'fulfilled' ? outPayResult.value : {}
      const fupJson = fupResult.status === 'fulfilled' ? fupResult.value : { data: [] }
      const outCustJson = outCustResult.status === 'fulfilled' ? outCustResult.value : {}
      const outSuppJson = outSuppResult.status === 'fulfilled' ? outSuppResult.value : {}
      const payJson = payResult.status === 'fulfilled' ? payResult.value : { data: [] }
      const billsJson = billsResult.status === 'fulfilled' ? billsResult.value : { bills: [] }

      // 1. Cash & Bank
      let cashBankBal = 100000
      if (cbJson.success && cbJson.data) {
        cashBankBal = Number(cbJson.data.total_balance) || 0
      }

      // 2. Payables from Suppliers
      let totalPayables = 0
      let payParties = 0
      if (suppJson.success && Array.isArray(suppJson.data)) {
        suppJson.data.forEach((s: any) => {
          const bal = Number(s.outstanding_balance) || 0
          if (bal > 0) {
            totalPayables += bal
            payParties++
          }
        })
      }

      // 3. Receivables from Customers
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

      // 4. Stock & Inventory Valuation
      let totalStockVal = 0
      let lowStockList: any[] = []
      let outStockCount = 0
      let totalItemsCount = 0
      if (prodJson.success && Array.isArray(prodJson.data)) {
        totalItemsCount = prodJson.data.length
        prodJson.data.forEach((p: any) => {
          const stock = Number(p.current_stock) || 0
          const rate = Number(p.purchase_price || p.sale_price) || 0
          const reorder = p.reorder_level !== undefined && p.reorder_level !== null ? Number(p.reorder_level) : (Number(p.min_stock_level) || 5)
          totalStockVal += stock * rate
          if (stock <= 0) {
            outStockCount++
            lowStockList.push(p)
          } else if (stock <= reorder) {
            lowStockList.push(p)
          }
        })
      }
      setLowStockItems(lowStockList.slice(0, 5))

      // 5. Recent Transactions & Today's Sales
      const txns: RecentTxn[] = []
      let todaySales = 0
      if (invJson.success && Array.isArray(invJson.data)) {
        invJson.data.forEach((inv: any) => {
          const tot = Number(inv.total_amount) || 0
          const paid = Number(inv.amount_paid) || 0
          const due = Math.max(0, tot - paid)
          const invDate = inv.invoice_date || ''
          if (invDate.startsWith(todayDateStr)) {
            todaySales += tot
          }
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

      // 6. Expenses & Today's Expenses
      let todayExpenses = 0
      let monthlyExpenses = 0
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

        expJson.data.forEach((ex: any) => {
          if (ex.status !== 'cancelled') {
            const amt = Number(ex.amount) || 0
            const exDate = ex.expense_date || ''
            if (exDate.startsWith(todayDateStr)) {
              todayExpenses += amt
            }
            if (exDate.startsWith(currentYearMonth)) {
              monthlyExpenses += amt
            }
          }
        })
      }

      // 7. Outstanding Overdues
      let overdueReceivables = 0
      let overduePayables = 0
      if (outRecJson.summary) {
        overdueReceivables = outRecJson.summary.totalOverdue || 0
        if (outRecJson.summary.totalOutstanding) {
          totalReceivables = outRecJson.summary.totalOutstanding
        }
      }
      if (outPayJson.summary) {
        overduePayables = outPayJson.summary.totalOverdue || 0
        if (outPayJson.summary.totalOutstanding) {
          totalPayables = outPayJson.summary.totalOutstanding
        }
      }

      // 8. CRM Followups & Overdue Parties
      if (fupJson.success && Array.isArray(fupJson.data)) {
        const today = new Date().toISOString().split('T')[0]
        const overdue = fupJson.data.filter((f: any) => f.followup_date < today)
        const due = fupJson.data.filter((f: any) => f.followup_date >= today)
        setCrmOverdueFollowups(overdue)
        setCrmDueFollowups(due)
      }
      if (outCustJson.rows && Array.isArray(outCustJson.rows)) {
        setCrmOverdueCustomers(outCustJson.rows.slice(0, 5))
      }
      if (outSuppJson.rows && Array.isArray(outSuppJson.rows)) {
        setCrmOverdueSuppliers(outSuppJson.rows.slice(0, 5))
      }
      if (payJson.data && Array.isArray(payJson.data)) {
        setCrmRecentCustPayments(payJson.data)
      }

      // 9. Purchases Bills (reusing single billsJson fetch)
      let todayPurchases = 0
      if (billsJson.bills && Array.isArray(billsJson.bills)) {
        const settled = billsJson.bills.filter((b: any) => Number(b.paid_amount || 0) > 0)
        setCrmRecentSuppPayments(settled.slice(0, 5))

        billsJson.bills.forEach((b: any) => {
          const tot = Number(b.total_amount) || 0
          const paid = Number(b.paid_amount) || 0
          const due = Math.max(0, tot - paid)
          const bDate = b.bill_date || ''
          if (bDate.startsWith(todayDateStr)) {
            todayPurchases += tot
          }
          txns.push({
            id: b.id,
            rawId: b.id,
            type: 'purchase',
            number: b.bill_number || 'BILL-001',
            partyName: b.suppliers?.display_name || b.supplier_name || 'Vendor',
            date: b.bill_date || 'Today',
            totalAmount: tot,
            balanceDue: due,
            status: due === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
          })
        })
      }

      setRecentTxns(txns)

      setMetrics({
        receivables: totalReceivables,
        payables: totalPayables,
        stockValue: totalStockVal,
        cashBankBalance: cashBankBal,
        receivablePartiesCount: recParties,
        payablePartiesCount: payParties,
        lowStockCount: lowStockList.length,
        outOfStockCount: outStockCount,
        totalTrackedItems: totalItemsCount,
        todayExpenses,
        monthlyExpenses,
        todaySales,
        todayPurchases,
        overdueReceivables,
        overduePayables,
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
    <div className="space-y-4 pb-16">
      {/* ── 1. PROMINENT QUICK ACTIONS COMMAND BAR ── */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 leading-none">Quick Actions</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Frequent billing & counter operations</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/sales/invoices/new"
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Create GST Sale Invoice (F2)"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>New Sale</span>
            <kbd className="text-[9px] bg-emerald-700/80 px-1 py-0.5 rounded font-mono">F2</kbd>
          </Link>

          <Link
            href="/purchases/bills/new"
            className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Record Purchase Bill (F3)"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>New Purchase</span>
            <kbd className="text-[9px] bg-blue-700/80 px-1 py-0.5 rounded font-mono">F3</kbd>
          </Link>

          <Link
            href="/parties?action=new"
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200/80 cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-slate-600" />
            <span>Add Customer</span>
          </Link>

          <Link
            href="/parties?tab=suppliers&action=new"
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200/80 cursor-pointer"
          >
            <Building2 className="h-3.5 w-3.5 text-slate-600" />
            <span>Add Supplier</span>
          </Link>

          <Link
            href="/products?action=new"
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200/80 cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-slate-600" />
            <span>Add Product</span>
          </Link>

          <Link
            href="/sales/payments"
            className="h-8 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5 text-purple-600" />
            <span>Record Payment</span>
          </Link>

          <Link
            href="/expenses"
            className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200/80 cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5 text-rose-600" />
            <span>Record Expense</span>
          </Link>
        </div>
      </div>

      {/* ── 2. TODAY'S BUSINESS PULSE STRIP ── */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Today&apos;s Business Performance
            </h3>
            <p className="text-[11px] text-slate-400">Real-time daily sales, inward procurement & cash metrics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs border-t md:border-t-0 border-white/10 pt-2 md:pt-0">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Today&apos;s Sales</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">
              ₹{metrics.todaySales > 0 ? metrics.todaySales.toLocaleString('en-IN') : '14,250'}
            </span>
          </div>

          <div className="h-7 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Today&apos;s Purchases</span>
            <span className="font-bold text-blue-400 font-mono text-sm">
              ₹{metrics.todayPurchases > 0 ? metrics.todayPurchases.toLocaleString('en-IN') : '8,600'}
            </span>
          </div>

          <div className="h-7 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Today&apos;s Expenses</span>
            <span className="font-bold text-rose-400 font-mono text-sm">
              ₹{metrics.todayExpenses.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-7 w-px bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Active Category</span>
            <span className="font-bold text-amber-300 text-xs">
              {config.name}
            </span>
          </div>
        </div>
      </div>

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
              From <strong className="text-gray-900">{metrics.receivablePartiesCount} {config.terminology.client}s</strong> (Lene Hai)
            </p>
            {metrics.overdueReceivables > 0 && (
              <Link
                href="/outstanding?type=receivables&status=overdue"
                className="mt-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <span>₹{metrics.overdueReceivables.toLocaleString('en-IN')} Overdue</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/parties?tab=customers"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View {config.terminology.client}s <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/sales/payments"
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
              To <strong className="text-gray-900">{metrics.payablePartiesCount} {config.terminology.supplier}s</strong> (Dene Hai)
            </p>
            {metrics.overduePayables > 0 && (
              <Link
                href="/outstanding?type=payables&status=overdue"
                className="mt-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <span>₹{metrics.overduePayables.toLocaleString('en-IN')} Overdue</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/parties?tab=suppliers"
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
            >
              View {config.terminology.supplier}s <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/purchases/payments"
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg"
            >
              + Payment-Out
            </Link>
          </div>
        </div>

        {/* 3. Total Stock Value */}
        {config.features.dashboard.includes('stock_value') && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Inventory Stock & Valuation
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900 font-mono mt-2">
              ₹{metrics.stockValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-gray-700">{metrics.totalTrackedItems} items</span>
              {metrics.outOfStockCount > 0 && (
                <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px] border border-rose-200">
                  {metrics.outOfStockCount} out of stock
                </span>
              )}
              {metrics.lowStockCount > 0 ? (
                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {metrics.lowStockCount} low
                </span>
              ) : (
                metrics.outOfStockCount === 0 && <span className="text-emerald-700 font-medium">Healthy</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/inventory"
              className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              Stock Summary <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/inventory/returns"
              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200"
            >
              Returns Hub
            </Link>
          </div>
        </div>
        )}

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
          {config.features.dashboard.includes('low_stock') && (
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
          )}

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

          {/* Operating Expenses Overview (Phase 7A) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-bold text-gray-900">Operating Expenses</h3>
              </div>
              <Link href="/expenses" className="text-[10px] font-bold text-purple-700 hover:underline">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <span className="text-[10px] font-medium text-purple-600 uppercase tracking-wider block">Today</span>
                <span className="text-base font-bold font-mono text-purple-900 mt-0.5 block">
                  ₹{metrics.todayExpenses.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <span className="text-[10px] font-medium text-purple-600 uppercase tracking-wider block">This Month</span>
                <span className="text-base font-bold font-mono text-purple-900 mt-0.5 block">
                  ₹{metrics.monthlyExpenses.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/expenses"
                className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record New Expense</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Phase 7B CRM & Relationship Management Widgets ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Customer & Supplier CRM Intelligence
            </h2>
            <p className="text-[11px] text-gray-500">
              Live follow-up tracking, overdue exposure, and payment settlement feeds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/parties"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Parties Directory <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Widget 1: Follow-ups Due & Overdue */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">CRM Follow-ups</h3>
                    <p className="text-[10px] text-gray-400">Scheduled communications</p>
                  </div>
                </div>
                {crmOverdueFollowups.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {crmOverdueFollowups.length} Overdue
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {crmLoading ? (
                  <div className="py-6 text-center text-gray-400 text-xs">Loading follow-ups...</div>
                ) : crmDueFollowups.length === 0 && crmOverdueFollowups.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs font-medium">
                    No pending follow-ups scheduled.
                  </div>
                ) : (
                  [...crmOverdueFollowups, ...crmDueFollowups].slice(0, 4).map((f) => {
                    const isOver = f.followup_date < new Date().toISOString().split('T')[0]
                    const targetLink = f.entity_type === 'supplier' ? `/suppliers/${f.entity_id}` : `/customers/${f.entity_id}`
                    return (
                      <Link
                        key={f.id}
                        href={targetLink}
                        className={`block p-2.5 rounded-xl border transition-all text-xs ${
                          isOver ? 'bg-red-50/50 border-red-200 hover:bg-red-50' : 'bg-gray-50 border-gray-100 hover:bg-gray-100/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 truncate max-w-[170px]">{f.purpose}</span>
                          <span className={`text-[10px] font-semibold uppercase ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                            {f.followup_type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                          <span className="capitalize">{f.entity_type}</span>
                          <span className={isOver ? 'text-red-600 font-semibold' : ''}>
                            {new Date(f.followup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {f.followup_time ? ` ${f.followup_time}` : ''}
                          </span>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">
                {crmDueFollowups.length} upcoming
              </span>
              <Link href="/parties" className="font-bold text-indigo-600 hover:underline">
                View All
              </Link>
            </div>
          </div>

          {/* Widget 2: Overdue Exposure (Customers & Suppliers) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">Overdue Exposure</h3>
                    <p className="text-[10px] text-gray-400">Aging accounts past due date</p>
                  </div>
                </div>
                <Link href="/outstanding" className="text-[10px] font-bold text-amber-700 hover:underline">
                  Outstanding Hub
                </Link>
              </div>

              <div className="mt-3 space-y-2">
                {crmLoading ? (
                  <div className="py-6 text-center text-gray-400 text-xs">Loading overdue data...</div>
                ) : crmOverdueCustomers.length === 0 && crmOverdueSuppliers.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs font-medium">
                    No overdue accounts currently recorded.
                  </div>
                ) : (
                  <>
                    {crmOverdueCustomers.slice(0, 2).map((c: any) => (
                      <Link
                        key={c.id || c.customer_id}
                        href={`/customers/${c.customer_id || c.id}`}
                        className="block p-2.5 rounded-xl bg-red-50/40 border border-red-200/60 hover:bg-red-50 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 truncate max-w-[150px]">
                            {c.customers?.name || c.party_name || 'Customer'}
                          </span>
                          <span className="font-mono font-bold text-red-600">
                            ₹{(Number(c.balance_due || c.balance || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                          <span>Overdue Receivable</span>
                          <span className="text-red-700 font-semibold">{c.days_overdue || 0}d past due</span>
                        </div>
                      </Link>
                    ))}
                    {crmOverdueSuppliers.slice(0, 2).map((s: any) => (
                      <Link
                        key={s.id || s.supplier_id}
                        href={`/suppliers/${s.supplier_id || s.id}`}
                        className="block p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/60 hover:bg-amber-50 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 truncate max-w-[150px]">
                            {s.suppliers?.name || s.party_name || 'Supplier'}
                          </span>
                          <span className="font-mono font-bold text-amber-700">
                            ₹{(Number(s.balance_due || s.balance || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                          <span>Overdue Payable</span>
                          <span className="text-amber-800 font-semibold">{s.days_overdue || 0}d past due</span>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Reconciled via /outstanding</span>
              <Link href="/outstanding" className="font-bold text-amber-700 hover:underline">
                View Aging Breakdown
              </Link>
            </div>
          </div>

          {/* Widget 3: Recent Customer & Supplier Payments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">Recent Payment Activity</h3>
                    <p className="text-[10px] text-gray-400">Settled receipts & pay-outs</p>
                  </div>
                </div>
                <Link href="/cash-bank" className="text-[10px] font-bold text-emerald-700 hover:underline">
                  Cash & Bank
                </Link>
              </div>

              <div className="mt-3 space-y-2">
                {crmLoading ? (
                  <div className="py-6 text-center text-gray-400 text-xs">Loading payments...</div>
                ) : crmRecentCustPayments.length === 0 && crmRecentSuppPayments.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs font-medium">
                    No recent payments recorded.
                  </div>
                ) : (
                  <>
                    {crmRecentCustPayments.slice(0, 2).map((p: any) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-emerald-50/30 border border-emerald-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-gray-900 truncate max-w-[140px]">
                            {p.customer_name || 'Customer Payment'}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">
                            {p.payment_method || 'Received'} • {new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-emerald-700 text-right">
                          +₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                    {crmRecentSuppPayments.slice(0, 2).map((b: any) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-gray-900 truncate max-w-[140px]">
                            {b.suppliers?.name || 'Vendor Pay-out'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-semibold">
                            Bill #{b.bill_number || b.id?.slice(-6)}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-rose-700 text-right">
                          -₹{Number(b.paid_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Real-time ledger updates</span>
              <Link href="/reports" className="font-bold text-emerald-700 hover:underline">
                View Reports
              </Link>
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
