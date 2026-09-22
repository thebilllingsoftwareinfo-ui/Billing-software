'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Send,
  Ban,
  Link2,
} from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { toast } from 'sonner'

interface InvoiceRow {
  id: string
  invoice_number: string
  reference_number?: string
  invoice_date: string
  due_date?: string
  status: 'draft' | 'issued' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'void'
  total_amount: number
  amount_paid: number
  balance_due: number
  customers?: { display_name: string; phone?: string } | null
}

interface SummaryMetrics {
  totalSales: number
  totalPaid: number
  totalOutstanding: number
  draftCount: number
  issuedCount: number
  paidCount: number
  overdueCount: number
}

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalSales: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    draftCount: 0,
    issuedCount: 0,
    paidCount: 0,
    overdueCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('limit', '100')

      const res = await fetch(`/api/invoices?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setInvoices(json.data || [])
        if (json.summary) setSummary(json.summary)
      } else {
        toast.error(json.error || 'Failed to fetch sales invoices')
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
      toast.error('Network error loading sales invoices')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleFinalize = async (invoiceId: string, invNum: string) => {
    if (!confirm(`Are you sure you want to finalize invoice '${invNum}'? Stock will be updated and customer balance posted.`)) {
      return
    }

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/finalize`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(`Invoice ${invNum} finalized and issued successfully!`)
        fetchInvoices()
      } else {
        toast.error(json.error || 'Failed to finalize invoice')
      }
    } catch (err) {
      toast.error('Error finalizing invoice')
    }
  }

  const handleCancel = async (invoiceId: string, invNum: string) => {
    const reason = prompt(`Enter reason for cancelling invoice '${invNum}':`)
    if (!reason) return

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Invoice ${invNum} cancelled successfully`)
        fetchInvoices()
      } else {
        toast.error(json.error || 'Failed to cancel invoice')
      }
    } catch (err) {
      toast.error('Error cancelling invoice')
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold text-[10px] uppercase rounded-md">Draft</span>
      case 'issued':
      case 'sent':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[10px] uppercase rounded-md">Issued</span>
      case 'partial':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold text-[10px] uppercase rounded-md">Partial</span>
      case 'paid':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[10px] uppercase rounded-md">Paid</span>
      case 'overdue':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold text-[10px] uppercase rounded-md">Overdue</span>
      case 'cancelled':
      case 'void':
        return <span className="px-2 py-0.5 bg-red-50 text-red-600 font-semibold text-[10px] uppercase rounded-md line-through">Cancelled</span>
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold text-[10px] uppercase rounded-md">{status}</span>
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sales Invoices</h1>
          <p className="text-xs text-gray-500 mt-1">
            Create, issue, track payment statuses, and manage sales billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInvoices()}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/sales/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </Link>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Sales Invoiced</span>
          <h3 className="text-lg font-bold text-gray-900 mt-1">
            ₹{Number(summary.totalSales || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Payments Received</span>
          <h3 className="text-lg font-bold text-emerald-600 mt-1">
            ₹{Number(summary.totalPaid || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Outstanding Balance</span>
          <h3 className="text-lg font-bold text-amber-600 mt-1">
            ₹{Number(summary.totalOutstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Active Statuses</span>
          <div className="flex items-center gap-2 mt-1 text-xs font-semibold">
            <span className="text-gray-600">{summary.draftCount} Draft</span> •
            <span className="text-blue-600">{summary.issuedCount} Issued</span> •
            <span className="text-emerald-600">{summary.paidCount} Paid</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice # or PO reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-gray-100 rounded-xl text-xs font-medium text-gray-600">
          {['all', 'draft', 'issued', 'paid', 'overdue', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg capitalize transition-all whitespace-nowrap ${
                statusFilter === st ? 'bg-white text-gray-900 shadow-2xs font-semibold' : 'hover:text-gray-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
            Loading sales invoices...
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? 'No matching sales invoices found' : 'No sales invoices created yet'}
            description="Create professional GST-compliant sales invoices and manage customer receivables."
            actionLabel="+ Create First Invoice"
            actionHref="/sales/invoices/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Total (₹)</th>
                  <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {invoices.map((inv) => {
                  const total = Number(inv.total_amount) || 0
                  const due = inv.balance_due !== undefined ? Number(inv.balance_due) : total - Number(inv.amount_paid || 0)

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <Link href={`/sales/invoices/${inv.id}`} className="font-bold text-indigo-600 hover:underline">
                          {inv.invoice_number}
                        </Link>
                        {inv.reference_number && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                            <Link2 className="h-2.5 w-2.5 text-indigo-500" />
                            <span className="truncate max-w-[120px]">{inv.reference_number}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900">
                        {inv.customers?.display_name || 'Walk-in Customer'}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {inv.due_date || '—'}
                      </td>
                      <td className="py-3.5 px-4">{renderStatusBadge(inv.status)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-900">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                        ₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/sales/invoices/${inv.id}`}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Invoice Document"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {inv.status === 'draft' && (
                            <>
                              <Link
                                href={`/sales/invoices/${inv.id}/edit`}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Draft"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleFinalize(inv.id, inv.invoice_number)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Finalize & Issue Invoice"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {inv.status !== 'cancelled' && inv.status !== 'void' && (
                            <button
                              onClick={() => handleCancel(inv.id, inv.invoice_number)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel Invoice"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
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
    </div>
  )
}
