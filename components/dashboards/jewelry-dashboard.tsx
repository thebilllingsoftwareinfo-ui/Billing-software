'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import {
  TrendingUp, FileText, CreditCard, AlertTriangle, ShoppingCart,
  DollarSign, ArrowUpRight, Loader2, Calendar, Plus, Package,
} from 'lucide-react'
import { toast } from 'sonner'

export default function JewelryDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [rangePreset, setRangePreset] = useState('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => { fetchMetrics() }, [rangePreset, customStart, customEnd])

  async function fetchMetrics() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ range: rangePreset })
      if (rangePreset === 'custom' && customStart && customEnd) {
        params.append('startDate', customStart)
        params.append('endDate', customEnd)
      }
      const res = await fetch(`/api/dashboard/metrics?${params}`)
      if (res.ok) setData(await res.json())
      else toast.error('Failed to load dashboard metrics')
    } catch { toast.error('Error fetching metrics') }
    finally { setLoading(false) }
  }

  const m = data?.metrics || {}
  const dateRange = data?.dateRange || {}
  const salesTrend = data?.salesTrend || []
  const recentInvoices = data?.recentInvoices || []
  const recentPayments = data?.recentPayments || []
  const attention = data?.attentionItems || {}
  const overdueInvoices = attention.overdueInvoices || []
  const lowStockProducts = attention.lowStockProducts || []

  // Making charges estimation (approx 15% of sales for jewellery context)
  const makingChargesEstimate = Math.round((m.monthlySalesPaise || 0) * 0.15)
  const goldItemsSold = recentInvoices.length

  const kpis = [
    { label: "Today's Sales", value: formatCurrency(m.todaySalesPaise || 0), sub: 'Jewellery billed today', icon: TrendingUp, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Period Sales', value: formatCurrency(m.monthlySalesPaise || 0), sub: `${dateRange.startDate} – ${dateRange.endDate}`, icon: FileText, color: 'bg-amber-50 text-amber-600' },
    { label: 'Making Charges (Est.)', value: formatCurrency(makingChargesEstimate), sub: '~15% of period sales', icon: DollarSign, color: 'bg-orange-50 text-orange-600' },
    { label: 'Receivables', value: formatCurrency(m.receivablesPaise || 0), sub: 'Uncollected EMI / credit', icon: CreditCard, color: 'bg-red-50 text-red-600', bold: (m.receivablesPaise || 0) > 0 ? 'text-red-700' : 'text-slate-900' },
    { label: 'Raw Material Purchase', value: formatCurrency(m.purchasesPaise || 0), sub: 'Gold / Silver / Diamonds', icon: ShoppingCart, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Net Profit', value: formatCurrency(m.estimatedGrossProfitPaise || 0), sub: 'Sales − Raw material − Exp', icon: ArrowUpRight, highlight: true },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💍</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jewellery Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500">Gold / silver sales, making charges, receivables & raw material costs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rangePreset} onValueChange={(v) => setRangePreset(v || 'this_month')}>
            <SelectTrigger className="w-40 bg-white"><Calendar className="w-4 h-4 mr-2 text-yellow-600" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-md border text-xs">
              <Input type="date" className="h-8 text-xs w-32" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span className="text-slate-400">to</span>
              <Input type="date" className="h-8 text-xs w-32" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
          <Link href="/sales/invoices/new" className="h-9 px-4 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <Plus className="h-4 w-4" /> New Sale Bill
          </Link>
          <Link href="/purchases/bills/new" className="h-9 px-4 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <Plus className="h-4 w-4" /> Raw Material
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
          <p className="text-sm font-medium text-slate-500">Loading jewellery metrics…</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className={`rounded-xl border p-4 space-y-2 shadow-sm ${kpi.highlight ? 'bg-yellow-50/30 border-yellow-300' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${kpi.highlight ? 'text-yellow-900' : 'text-slate-500'}`}>{kpi.label}</p>
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${kpi.highlight ? 'bg-yellow-600 text-white' : kpi.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${kpi.bold || (kpi.highlight ? 'text-yellow-800' : 'text-slate-900')}`}>{kpi.value}</p>
                  <p className="text-[10px] text-slate-400">{kpi.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Hallmarking Compliance Notice */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">🏅</span>
            <div>
              <p className="text-sm font-bold text-amber-900">Hallmarking Compliance Reminder</p>
              <p className="text-xs text-amber-700 mt-0.5">
                As per BIS mandate, all gold jewellery above 14K must carry a HUID hallmark. Ensure all sold items include
                the 6-digit HUID in your invoice line items for compliance. Maintain stock records with purity (22K / 18K / 14K).
              </p>
            </div>
          </div>

          {/* Sales Trend */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daily Jewellery Sales</h3>
                <p className="text-xs text-slate-500">{dateRange.startDate} to {dateRange.endDate}</p>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Gold / Silver Sales</Badge>
            </div>
            {salesTrend.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg">No sales recorded in this period.</div>
            ) : (
              <div className="pt-4 flex items-end gap-2 h-40 overflow-x-auto">
                {salesTrend.map((st: any) => {
                  const maxPaise = Math.max(...salesTrend.map((s: any) => s.totalPaise), 1)
                  const heightPct = Math.max(12, Math.round((st.totalPaise / maxPaise) * 100))
                  return (
                    <div key={st.date} className="flex-1 flex flex-col items-center gap-1 group min-w-12">
                      <div className="text-[9px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">{formatCurrency(st.totalPaise)}</div>
                      <div className="w-full bg-yellow-500 hover:bg-yellow-600 rounded-t transition-all" style={{ height: `${heightPct}%` }} />
                      <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">{st.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* High-value invoices */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-base">💍</span> High-Value Sale Invoices
                </h3>
                <Link href="/sales/invoices" className="text-xs font-semibold text-indigo-600 hover:underline">View All →</Link>
              </div>
              {recentInvoices.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">No recent invoices.</p> : (
                <div className="space-y-2">
                  {recentInvoices
                    .sort((a: any, b: any) => (b.total_paise || 0) - (a.total_paise || 0))
                    .map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-slate-50 text-xs">
                        <div>
                          <Link href={`/sales/invoices/${inv.id}`} className="font-bold text-yellow-700 hover:underline">{inv.invoice_number}</Link>
                          <p className="text-slate-500">{inv.customers?.name} · {inv.invoice_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(inv.total_paise)}</p>
                          <Badge variant="outline" className="text-[9px] uppercase">{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Receivables / EMI overdue */}
              <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between border-b border-red-100 pb-2">
                  <div className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-4 h-4" /><h3 className="text-sm font-bold">Overdue / EMI Collections</h3></div>
                  <Badge variant="destructive">{overdueInvoices.length} Due</Badge>
                </div>
                {overdueInvoices.length === 0 ? <p className="text-xs text-emerald-700 py-2 text-center">✓ All customer balances cleared!</p> : (
                  <div className="space-y-1.5">
                    {overdueInvoices.map((inv: any) => (
                      <div key={inv.id} className="p-2 bg-red-50/50 border border-red-100 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <Link href={`/sales/invoices/${inv.id}`} className="font-bold text-red-900 hover:underline">{inv.invoice_number}</Link>
                          <p className="text-red-700 text-[10px]">{inv.customers?.name} · Due: {inv.due_date}</p>
                        </div>
                        <p className="font-bold text-red-800">{formatCurrency((inv.total_paise || 0) - (inv.paid_paise || 0))}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock value by metal — placeholder widget */}
              <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-yellow-800 border-b border-yellow-100 pb-2">
                  <Package className="w-4 h-4" />
                  <h3 className="text-sm font-bold">Low-Stock Jewellery Items</h3>
                  <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300">{lowStockProducts.length}</Badge>
                </div>
                {lowStockProducts.length === 0 ? <p className="text-xs text-emerald-700 py-2 text-center">✓ All stock levels healthy!</p> : (
                  <div className="space-y-1.5">
                    {lowStockProducts.slice(0, 4).map((p: any) => (
                      <div key={p.id} className="p-2 bg-yellow-50/50 border border-yellow-100 rounded-lg text-xs flex justify-between items-center">
                        <div><p className="font-bold text-yellow-950">{p.name}</p><p className="text-yellow-700 text-[10px]">SKU: {p.sku || 'N/A'}</p></div>
                        <p className="font-bold text-amber-900">{p.current_stock} {p.unit || 'PCS'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
