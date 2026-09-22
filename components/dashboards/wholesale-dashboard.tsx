'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import {
  TrendingUp, FileText, CreditCard, AlertTriangle, ShoppingCart,
  DollarSign, Package, ArrowUpRight, Loader2, Calendar, Plus, Truck,
} from 'lucide-react'
import { toast } from 'sonner'

export default function WholesaleDashboard() {
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
  const attention = data?.attentionItems || {}
  const overdueInvoices = attention.overdueInvoices || []
  const lowStockProducts = attention.lowStockProducts || []

  // Average order value
  const invoiceCount = recentInvoices.length || 1
  const avgOrderValue = Math.round((m.monthlySalesPaise || 0) / invoiceCount)

  const kpis = [
    { label: 'Period Sales', value: formatCurrency(m.monthlySalesPaise || 0), sub: `${dateRange.startDate} – ${dateRange.endDate}`, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Outstanding Receivables', value: formatCurrency(m.receivablesPaise || 0), sub: 'Uncollected from dealers', icon: CreditCard, color: 'bg-amber-50 text-amber-600', bold: 'text-amber-700' },
    { label: 'Purchase Bills', value: formatCurrency(m.purchasesPaise || 0), sub: 'Vendor supply cost', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Overdue Invoices', value: `${overdueInvoices.length}`, sub: 'Require follow-up', icon: AlertTriangle, color: 'bg-red-50 text-red-600', bold: 'text-red-700' },
    { label: 'Avg. Order Value', value: formatCurrency(avgOrderValue), sub: 'Per invoice this period', icon: Package, color: 'bg-purple-50 text-purple-600' },
    { label: 'Est. Gross Profit', value: formatCurrency(m.estimatedGrossProfitPaise || 0), sub: 'Sales − Purchases − Exp', icon: ArrowUpRight, highlight: true },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏭</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Wholesale Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500">Bulk orders, receivables, supplier payables & dealer pipeline.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rangePreset} onValueChange={(v) => setRangePreset(v || 'this_month')}>
            <SelectTrigger className="w-40 bg-white"><Calendar className="w-4 h-4 mr-2 text-indigo-600" /><SelectValue /></SelectTrigger>
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
          <Link href="/sales/invoices/new" className="h-9 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors">
            <Plus className="h-4 w-4" /> Bulk Invoice
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-24 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm font-medium text-slate-500">Loading wholesale metrics…</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className={`rounded-xl border p-4 space-y-2 shadow-sm ${kpi.highlight ? 'bg-purple-50/30 border-purple-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${kpi.highlight ? 'text-purple-900' : 'text-slate-500'}`}>{kpi.label}</p>
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${kpi.highlight ? 'bg-purple-600 text-white' : kpi.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${kpi.bold || (kpi.highlight ? 'text-purple-700' : 'text-slate-900')}`}>{kpi.value}</p>
                  <p className="text-[10px] text-slate-400">{kpi.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Sales Trend */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bulk Order Revenue Trend</h3>
                <p className="text-xs text-slate-500">{dateRange.startDate} to {dateRange.endDate}</p>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Wholesale Volume</Badge>
            </div>
            {salesTrend.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg">No orders recorded in this period.</div>
            ) : (
              <div className="pt-4 flex items-end gap-2 h-40 overflow-x-auto">
                {salesTrend.map((st: any) => {
                  const maxPaise = Math.max(...salesTrend.map((s: any) => s.totalPaise), 1)
                  const heightPct = Math.max(12, Math.round((st.totalPaise / maxPaise) * 100))
                  return (
                    <div key={st.date} className="flex-1 flex flex-col items-center gap-1 group min-w-12">
                      <div className="text-[9px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">{formatCurrency(st.totalPaise)}</div>
                      <div className="w-full bg-purple-500 hover:bg-purple-600 rounded-t transition-all" style={{ height: `${heightPct}%` }} />
                      <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">{st.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Invoices + Overdue Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Truck className="w-4 h-4 text-purple-600" /> Recent Bulk Orders</h3>
                <Link href="/sales/invoices" className="text-xs font-semibold text-indigo-600 hover:underline">View All →</Link>
              </div>
              {recentInvoices.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">No recent orders.</p> : (
                <div className="space-y-2">
                  {recentInvoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-slate-50 text-xs">
                      <div>
                        <Link href={`/sales/invoices/${inv.id}`} className="font-bold text-purple-600 hover:underline">{inv.invoice_number}</Link>
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

            <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-red-100 pb-3">
                <div className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-4 h-4" /><h3 className="text-sm font-bold">Dealer Overdue Collections</h3></div>
                <Badge variant="destructive">{overdueInvoices.length} Overdue</Badge>
              </div>
              {overdueInvoices.length === 0 ? <p className="text-xs text-emerald-700 font-medium py-4 text-center">✓ All dealer payments up to date!</p> : (
                <div className="space-y-2">
                  {overdueInvoices.map((inv: any) => (
                    <div key={inv.id} className="p-2.5 bg-red-50/50 border border-red-100 rounded-lg text-xs flex justify-between items-center">
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
          </div>
        </>
      )}
    </div>
  )
}
