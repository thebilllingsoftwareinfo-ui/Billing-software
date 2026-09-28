'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  FileText,
  User,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { RecordPaymentModal } from '@/components/payments/record-payment-modal'
import { PaymentOutModal } from '@/components/payments/payment-out-modal'

export default function OutstandingDashboardPage() {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalOverdue: 0,
    aging: {
      current: 0,
      '1_30': 0,
      '31_60': 0,
      '61_90': 0,
      '90_plus': 0,
    },
    count: 0,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [agingFilter, setAgingFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)

  useEffect(() => {
    fetchOutstanding()
  }, [activeTab, search, status, agingFilter, startDate, endDate])

  async function fetchOutstanding() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: activeTab,
        status,
        aging: agingFilter,
      })
      if (search) params.append('search', search)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/outstanding?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setSummary(
          data.summary || {
            totalOutstanding: 0,
            totalOverdue: 0,
            aging: { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 },
            count: 0,
          }
        )
      } else {
        toast.error('Failed to load outstanding data')
      }
    } catch {
      toast.error('Error fetching dues')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      type: activeTab,
      status,
      aging: agingFilter,
      export: 'csv',
    })
    if (search) params.append('search', search)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    window.open(`/api/outstanding?${params.toString()}`, '_blank')
  }

  const getStatusBadge = (st: string, isOverdue: boolean) => {
    if (st === 'paid') {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
        </Badge>
      )
    }
    if (isOverdue || st === 'overdue') {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
          <AlertCircle className="w-3 h-3 mr-1" /> Overdue
        </Badge>
      )
    }
    if (st === 'partial') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="w-3 h-3 mr-1" /> Partial
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
        Unpaid
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Outstanding & Due Tracking
            </h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Aging & Cash-Flow
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tracking of unpaid customer receivables and supplier payables with aging analysis and quick settlement actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="text-xs">
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>

          {activeTab === 'receivables' ? (
            <Button
              onClick={() => setIsCollectModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArrowDownLeft className="w-4 h-4 mr-1.5" /> Collect Payment
            </Button>
          ) : (
            <Button
              onClick={() => setIsPayModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> Pay Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('receivables')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'receivables'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Customer Receivables (Money to Receive)
        </button>
        <button
          onClick={() => setActiveTab('payables')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'payables'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Supplier Payables (Money to Pay)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total {activeTab === 'receivables' ? 'Receivable' : 'Payable'}
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.totalOutstanding * 100)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Amount
            </p>
            <p className="text-2xl font-bold text-rose-600">
              {formatCurrency(summary.totalOverdue * 100)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Not Due / Current
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary.aging.current * 100)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Invoices / Bills
            </p>
            <p className="text-2xl font-bold text-slate-900">{summary.count}</p>
          </div>
        </div>
      </div>

      {/* Aging Analysis Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Aging Breakdown (Based on Due Date)
          </h3>
          <span className="text-xs text-slate-400">Click a bucket to filter</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <button
            onClick={() => setAgingFilter(agingFilter === 'current' ? 'all' : 'current')}
            className={`p-3 rounded-lg border text-left transition-all ${
              agingFilter === 'current'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500">Not Due Yet</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              {formatCurrency(summary.aging.current * 100)}
            </p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '1_30' ? 'all' : '1_30')}
            className={`p-3 rounded-lg border text-left transition-all ${
              agingFilter === '1_30'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500">1 – 30 Days</p>
            <p className="text-base font-bold text-amber-700 mt-0.5">
              {formatCurrency(summary.aging['1_30'] * 100)}
            </p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '31_60' ? 'all' : '31_60')}
            className={`p-3 rounded-lg border text-left transition-all ${
              agingFilter === '31_60'
                ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500">31 – 60 Days</p>
            <p className="text-base font-bold text-orange-700 mt-0.5">
              {formatCurrency(summary.aging['31_60'] * 100)}
            </p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '61_90' ? 'all' : '61_90')}
            className={`p-3 rounded-lg border text-left transition-all ${
              agingFilter === '61_90'
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500">61 – 90 Days</p>
            <p className="text-base font-bold text-rose-700 mt-0.5">
              {formatCurrency(summary.aging['61_90'] * 100)}
            </p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '90_plus' ? 'all' : '90_plus')}
            className={`p-3 rounded-lg border text-left transition-all ${
              agingFilter === '90_plus'
                ? 'bg-red-100 border-red-600 ring-2 ring-red-200'
                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500">90+ Days</p>
            <p className="text-base font-bold text-red-800 mt-0.5">
              {formatCurrency(summary.aging['90_plus'] * 100)}
            </p>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder={`Search ${activeTab === 'receivables' ? 'customer' : 'supplier'} or document #...`}
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={status} onValueChange={(val) => setStatus(val || 'all')}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agingFilter} onValueChange={(val) => setAgingFilter(val || 'all')}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Aging Bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Aging</SelectItem>
              <SelectItem value="current">Current (Not Due)</SelectItem>
              <SelectItem value="1_30">1 - 30 Days</SelectItem>
              <SelectItem value="31_60">31 - 60 Days</SelectItem>
              <SelectItem value="61_90">61 - 90 Days</SelectItem>
              <SelectItem value="90_plus">90+ Days</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Date:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-32 h-9 text-xs"
            />
            <span>to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-32 h-9 text-xs"
            />
          </div>
        </div>

        {(search || status !== 'all' || agingFilter !== 'all' || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setStatus('all')
              setAgingFilter('all')
              setStartDate('')
              setEndDate('')
            }}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="w-[120px]">Doc #</TableHead>
              <TableHead>{activeTab === 'receivables' ? 'Customer' : 'Supplier'}</TableHead>
              <TableHead className="w-[110px]">Doc Date</TableHead>
              <TableHead className="w-[110px]">Due Date</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Paid Amount</TableHead>
              <TableHead className="text-right">Outstanding Due</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading outstanding dues...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    <p className="font-semibold text-slate-700">No outstanding dues found</p>
                    <p className="text-xs text-slate-400">
                      All accounts in this filter range are settled or no records exist.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">
                    {item.document_number}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{item.party_name}</div>
                    {item.days_overdue > 0 && (
                      <span className="text-[10px] text-rose-500 font-medium">
                        {item.days_overdue} days overdue
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {new Date(item.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Immediate'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-700">
                    {formatCurrency(item.total_amount * 100)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {formatCurrency(item.paid_amount * 100)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-rose-600">
                    {formatCurrency(item.balance_due * 100)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.status, item.is_overdue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {activeTab === 'receivables' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCollectModalOpen(true)}
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        Collect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPayModalOpen(true)}
                        className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Pay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Customer Payment Modal */}
      <RecordPaymentModal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        onSuccess={() => {
          setIsCollectModalOpen(false)
          fetchOutstanding()
          toast.success('Payment recorded successfully')
        }}
      />

      {/* Record Supplier Payment Out Modal */}
      <PaymentOutModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={() => {
          setIsPayModalOpen(false)
          fetchOutstanding()
          toast.success('Supplier payment recorded successfully')
        }}
      />
    </div>
  )
}
