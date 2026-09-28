'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Phone, Mail, MapPin, CreditCard, FileText,
  History, Edit2, Loader2, Plus, StickyNote, Bell, Calendar,
  CheckCircle2, XCircle, AlertTriangle, Download, TrendingDown,
  FileBarChart, Trash2, RefreshCw, Truck, Package,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { PaymentOutModal } from '@/components/payments/payment-out-modal'
import { AddPartyModal, PartyData } from '@/components/parties/add-party-modal'

type Tab = 'overview' | 'purchases' | 'payments' | 'ledger' | 'statement' | 'notes' | 'followups'

const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
  payment: 'Payment',
  sales: 'Sales',
  quotation: 'Quotation',
  general: 'General',
  support: 'Support',
}

const FOLLOWUP_TYPE_COLORS: Record<string, string> = {
  payment: 'bg-amber-100 text-amber-700',
  sales: 'bg-emerald-100 text-emerald-700',
  quotation: 'bg-blue-100 text-blue-700',
  general: 'bg-gray-100 text-gray-700',
  support: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const BILL_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-700',
  approved: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  draft: 'bg-gray-100 text-gray-500',
  void: 'bg-gray-100 text-gray-500',
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Filtering
  const [billSearch, setBillSearch] = useState('')
  const [billStatusFilter, setBillStatusFilter] = useState('all')
  const [fupStatusFilter, setFupStatusFilter] = useState('all')

  // Statement
  const [stmtStart, setStmtStart] = useState('')
  const [stmtEnd, setStmtEnd] = useState('')
  const [statement, setStatement] = useState<any>(null)
  const [isStmtLoading, setIsStmtLoading] = useState(false)

  // Notes
  const [noteText, setNoteText] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)

  // Follow-up form
  const [showFupForm, setShowFupForm] = useState(false)
  const [fupForm, setFupForm] = useState({
    followup_date: '',
    followup_time: '',
    followup_type: 'payment' as const,
    purpose: '',
    notes: '',
  })
  const [isAddingFup, setIsAddingFup] = useState(false)

  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/suppliers/${id}/profile`)
      const data = await res.json()
      if (res.ok && data.success) {
        setProfile(data.data)
      } else {
        toast.error(data.error || 'Failed to load supplier profile.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const fetchStatement = async () => {
    setIsStmtLoading(true)
    try {
      const params = new URLSearchParams()
      if (stmtStart) params.set('start_date', stmtStart)
      if (stmtEnd) params.set('end_date', stmtEnd)
      const res = await fetch(`/api/suppliers/${id}/statement?${params}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setStatement(data.data)
      } else {
        toast.error(data.error || 'Failed to load statement.')
      }
    } catch {
      toast.error('Error loading statement.')
    } finally {
      setIsStmtLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'statement') {
      fetchStatement()
    }
  }, [activeTab])

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setIsAddingNote(true)
    try {
      const res = await fetch('/api/crm/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'supplier', entity_id: id, note_text: noteText.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Note added.')
        setNoteText('')
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to add note.')
      }
    } catch {
      toast.error('Error adding note.')
    } finally {
      setIsAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/crm/notes?id=${noteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Note deleted.')
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to delete note.')
      }
    } catch {
      toast.error('Error deleting note.')
    }
  }

  const handleSaveEditedNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return
    setIsEditingNote(true)
    try {
      const res = await fetch('/api/crm/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, note_text: editingNoteText.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Note updated.')
        setEditingNoteId(null)
        setEditingNoteText('')
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to update note.')
      }
    } catch {
      toast.error('Error updating note.')
    } finally {
      setIsEditingNote(false)
    }
  }

  const handleDeleteFollowUp = async (fupId: string) => {
    try {
      const res = await fetch(`/api/crm/followups?id=${fupId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Follow-up deleted.')
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to delete follow-up.')
      }
    } catch {
      toast.error('Error deleting follow-up.')
    }
  }

  const handleSaveSupplier = async (party: PartyData) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: party.name,
          display_name: party.name,
          phone: party.phone,
          email: party.email,
          gstin: party.gstin,
          state: party.state,
          billing_address: party.billingAddress,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Supplier details updated.')
        setIsEditModalOpen(false)
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to update supplier.')
      }
    } catch {
      toast.error('Error updating supplier.')
    }
  }

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fupForm.purpose.trim() || !fupForm.followup_date) return
    setIsAddingFup(true)
    try {
      const res = await fetch('/api/crm/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'supplier', entity_id: id, ...fupForm }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Follow-up scheduled.')
        setShowFupForm(false)
        setFupForm({ followup_date: '', followup_time: '', followup_type: 'payment', purpose: '', notes: '' })
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to schedule follow-up.')
      }
    } catch {
      toast.error('Error scheduling follow-up.')
    } finally {
      setIsAddingFup(false)
    }
  }

  const handleUpdateFollowUpStatus = async (fupId: string, status: 'completed' | 'cancelled') => {
    try {
      const res = await fetch('/api/crm/followups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fupId, status }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Follow-up marked ${status}.`)
        fetchProfile()
      } else {
        toast.error(data.error || 'Failed to update follow-up.')
      }
    } catch {
      toast.error('Error updating follow-up.')
    }
  }

  const handleExportCSV = () => {
    const params = new URLSearchParams()
    if (stmtStart) params.set('start_date', stmtStart)
    if (stmtEnd) params.set('end_date', stmtEnd)
    params.set('format', 'csv')
    window.open(`/api/suppliers/${id}/statement?${params}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-medium">Loading 360° supplier profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <p className="text-sm font-semibold text-gray-800">Supplier profile not found</p>
        <Link href="/parties?tab=suppliers" className="mt-4 inline-block text-xs text-indigo-600 font-bold hover:underline">
          ← Back to Suppliers
        </Link>
      </div>
    )
  }

  const { supplier, summary, purchases, payments, transactions, notes, followups, timeline } = profile
  const todayStr = new Date().toISOString().split('T')[0]
  const overdueFollowups = (followups || []).filter((f: any) => f.status === 'pending' && f.followup_date < todayStr)

  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingDown },
    { id: 'purchases', label: 'Purchase Bills', icon: Package, count: purchases?.length },
    { id: 'payments', label: 'Payments Made', icon: CreditCard, count: payments?.length },
    { id: 'ledger', label: 'Ledger', icon: History, count: transactions?.length },
    { id: 'statement', label: 'Statement', icon: FileBarChart },
    { id: 'notes', label: 'Notes', icon: StickyNote, count: notes?.length },
    { id: 'followups', label: 'Follow-ups', icon: Bell, count: followups?.length },
  ]

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/parties?tab=suppliers" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Suppliers
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('followups'); setShowFupForm(true) }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Bell className="h-3.5 w-3.5" /> Follow-up
          </button>
          <Link
            href={`/purchases/bills/new?supplier_id=${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> New Purchase Bill
          </Link>
        </div>
      </div>

      {/* Supplier Header Banner */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-violet-600/20">
              {(supplier.display_name || supplier.name)?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-gray-900">{supplier.display_name || supplier.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${supplier.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </span>
                {overdueFollowups.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {overdueFollowups.length} Overdue
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                {supplier.gstin && (
                  <span className="font-mono bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded border border-violet-100">
                    GSTIN: {supplier.gstin}
                  </span>
                )}
                {supplier.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-gray-400" /> {supplier.phone}</span>}
                {supplier.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-gray-400" /> {supplier.email}</span>}
                {(supplier.state || supplier.billing_address) && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {supplier.state || supplier.billing_address}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/purchases/bills/new?supplier_id=${id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs">
              <Package className="h-3.5 w-3.5" /> Create Purchase Bill
            </Link>
            <button onClick={() => setIsPaymentModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-gray-700 hover:text-emerald-700 text-xs font-semibold rounded-xl transition-colors">
              <CreditCard className="h-3.5 w-3.5" /> Record Payment
            </button>
            <button onClick={() => setActiveTab('ledger')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-200 text-gray-700 hover:text-purple-700 text-xs font-semibold rounded-xl transition-colors">
              <History className="h-3.5 w-3.5" /> View Ledger
            </button>
            <button onClick={() => setActiveTab('statement')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-green-50 hover:border-green-200 text-gray-700 hover:text-green-700 text-xs font-semibold rounded-xl transition-colors">
              <FileBarChart className="h-3.5 w-3.5" /> View Statement
            </button>
            <button onClick={() => setActiveTab('notes')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-gray-700 hover:text-amber-700 text-xs font-semibold rounded-xl transition-colors">
              <StickyNote className="h-3.5 w-3.5" /> Add Note
            </button>
            <button onClick={() => { setActiveTab('followups'); setShowFupForm(true) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-gray-700 hover:text-amber-700 text-xs font-semibold rounded-xl transition-colors">
              <Bell className="h-3.5 w-3.5" /> Add Follow-up
            </button>
            <button onClick={() => setIsEditModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors">
              <Edit2 className="h-3.5 w-3.5" /> Edit Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Purchases', value: formatCurrency(summary.totalPurchases), color: 'text-gray-900' },
          { label: 'Total Paid', value: formatCurrency(summary.totalPaid), color: 'text-emerald-600' },
          { label: 'Payable', value: formatCurrency(summary.totalPayable), color: 'text-amber-600' },
          { label: 'Overdue Payable', value: formatCurrency(summary.overduePayable), color: summary.overduePayable > 0 ? 'text-red-600' : 'text-gray-400' },
          { label: 'Open Bills', value: summary.openBillsCount, color: 'text-violet-600' },
          { label: 'Total Bills', value: summary.totalPurchaseBills, color: 'text-gray-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{kpi.label}</p>
            <p className={`text-lg font-extrabold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Content */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex border-b border-gray-200 px-4 gap-1 overflow-x-auto text-xs font-bold text-gray-500 bg-gray-50/50">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 py-3.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id ? 'border-violet-600 text-violet-600' : 'border-transparent hover:text-gray-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px]">{tab.count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bill Status Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-blue-700">{summary.openBillsCount}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-1">Open Bills</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-700">{summary.partialBillsCount}</p>
                  <p className="text-xs font-semibold text-amber-600 mt-1">Partial Paid</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-emerald-700">{summary.paidBillsCount}</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1">Fully Settled</p>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Activity Timeline</h3>
                {!timeline || timeline.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs font-medium">No activity recorded yet.</div>
                ) : (
                  <div className="space-y-0">
                    {(timeline || []).slice(0, 15).map((item: any, idx: number) => (
                      <div key={item.id} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                            <Truck className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                          {idx < timeline.length - 1 && <div className="w-px h-full bg-gray-100 mt-1" />}
                        </div>
                        <div className="pb-2 min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                          {item.description && <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>}
                          <p className="text-[11px] text-gray-400 mt-0.5">{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        {item.amount != null && (
                          <div className="ml-auto text-right flex-shrink-0">
                            <p className="text-xs font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PURCHASE BILLS TAB */}
          {activeTab === 'purchases' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <p className="text-sm font-bold text-gray-900">Purchase Bills ({purchases?.length || 0})</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search bill #..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                    <option value="approved">Approved</option>
                  </select>
                  <Link href={`/purchases/bills/new?supplier_id=${id}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-500">
                    <Plus className="h-3.5 w-3.5" /> New Bill
                  </Link>
                </div>
              </div>
              {!purchases || purchases.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs font-medium">No purchase bills recorded.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Bill #</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Due Date</th>
                      <th className="py-2.5 text-right">Total</th>
                      <th className="py-2.5 text-right">Paid</th>
                      <th className="py-2.5 text-right">Balance</th>
                      <th className="py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(purchases || [])
                      .filter((b: any) => {
                        const billNum = b.bill_number || b.id || ''
                        if (billSearch && !billNum.toLowerCase().includes(billSearch.toLowerCase())) return false
                        if (billStatusFilter !== 'all' && b.status !== billStatusFilter) return false
                        return true
                      })
                      .map((b: any) => {
                        const total = Number(b.total_amount || 0)
                        const paid = Number(b.paid_amount ?? b.amount_paid ?? 0)
                        const balance = Number(b.balance_due ?? Math.max(0, total - paid))
                        return (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="py-3 font-mono font-bold text-violet-600">
                              <Link href={`/purchases/bills/${b.id}`} className="hover:underline">
                                {b.bill_number || b.id?.slice(-8)}
                              </Link>
                            </td>
                            <td className="py-3 text-gray-600">{b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : '—'}</td>
                            <td className="py-3 text-gray-600">{b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN') : '—'}</td>
                            <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(total)}</td>
                            <td className="py-3 text-right font-semibold text-emerald-600">{formatCurrency(paid)}</td>
                            <td className={`py-3 text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(balance)}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${BILL_STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* PAYMENTS MADE TAB */}
          {activeTab === 'payments' && (
            <div>
              <p className="text-sm font-bold text-gray-900 mb-4">Payments Made to Supplier</p>
              {!payments || payments.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs font-medium">No payments recorded.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">Reference</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 text-gray-600">{new Date(p.transaction_date || p.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 font-semibold text-gray-700 uppercase text-[11px]">{p.transaction_type || 'Payment'}</td>
                        <td className="py-3 font-mono text-gray-500 text-[11px]">{p.reference_number || '—'}</td>
                        <td className="py-3 text-gray-500">{p.description || '—'}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* LEDGER TAB */}
          {activeTab === 'ledger' && (
            <div>
              <p className="text-sm font-bold text-gray-900 mb-4">Supplier Ledger Transactions</p>
              {!transactions || transactions.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs font-medium">No ledger transactions recorded.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-right">Amount</th>
                      <th className="py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="py-3 text-gray-600">{new Date(tx.transaction_date || tx.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">{tx.transaction_type}</span>
                        </td>
                        <td className="py-3 text-gray-600">{tx.description || '—'}</td>
                        <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 text-right font-bold text-violet-600">{formatCurrency(tx.balance_after || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* STATEMENT TAB */}
          {activeTab === 'statement' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-900">Supplier Account Statement</p>
                <button onClick={handleExportCSV} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                  <input type="date" value={stmtStart} onChange={(e) => setStmtStart(e.target.value)}
                    className="h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                  <input type="date" value={stmtEnd} onChange={(e) => setStmtEnd(e.target.value)}
                    className="h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={fetchStatement} disabled={isStmtLoading}
                    className="h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50">
                    {isStmtLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Generate
                  </button>
                </div>
              </div>

              {isStmtLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
              ) : statement ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Opening Balance', value: formatCurrency(statement.opening_balance), color: 'text-gray-900' },
                      { label: 'Total Purchases', value: formatCurrency(statement.total_credits), color: 'text-red-600' },
                      { label: 'Total Paid', value: formatCurrency(statement.total_debits), color: 'text-emerald-600' },
                      { label: 'Closing Balance', value: formatCurrency(statement.closing_balance), color: 'text-violet-700' },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">{s.label}</p>
                        <p className={`text-base font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                        <th className="py-2.5">Date</th><th className="py-2.5">Type</th><th className="py-2.5">Reference</th>
                        <th className="py-2.5">Description</th><th className="py-2.5 text-right">Debit</th>
                        <th className="py-2.5 text-right">Credit</th><th className="py-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {statement.lines.length === 0 ? (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No transactions in this period.</td></tr>
                      ) : statement.lines.map((line: any) => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="py-3 text-gray-600">{new Date(line.date).toLocaleDateString('en-IN')}</td>
                          <td className="py-3 text-gray-700 font-semibold">{line.type}</td>
                          <td className="py-3 font-mono text-gray-600 text-[11px]">{line.reference}</td>
                          <td className="py-3 text-gray-500">{line.description || '—'}</td>
                          <td className="py-3 text-right font-bold text-emerald-600">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                          <td className="py-3 text-right font-bold text-red-600">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                          <td className="py-3 text-right font-bold text-violet-600">{formatCurrency(line.running_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400 text-xs font-medium">Click Generate to view the statement.</div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900">Supplier CRM Notes</p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add an internal note about this supplier…" rows={3}
                  className="w-full text-xs bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                <div className="flex justify-end mt-2">
                  <button onClick={handleAddNote} disabled={!noteText.trim() || isAddingNote}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5">
                    {isAddingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add Note
                  </button>
                </div>
              </div>
              {!notes || notes.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">No notes yet. Add the first note above.</div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4 group">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            className="w-full text-xs bg-white border border-violet-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingNoteId(null); setEditingNoteText('') }}
                              className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditedNote(note.id)}
                              disabled={isEditingNote || !editingNoteText.trim()}
                              className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1"
                            >
                              {isEditingNote && <Loader2 className="h-3 w-3 animate-spin" />}
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs text-gray-800 leading-relaxed flex-1 whitespace-pre-wrap">{note.note_text}</p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.note_text) }}
                                className="p-1 text-gray-400 hover:text-violet-600 transition-colors"
                                title="Edit note"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-500 transition-all" title="Delete note">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-600">{note.created_by_name || 'Staff'}</span>
                            <span>•</span>
                            <span>{new Date(note.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FOLLOW-UPS TAB */}
          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-900">Supplier Follow-ups ({followups?.length || 0})</p>
                <div className="flex items-center gap-2">
                  <select
                    value={fupStatusFilter}
                    onChange={(e) => setFupStatusFilter(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="all">All Follow-ups</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button onClick={() => setShowFupForm(!showFupForm)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-500">
                    <Plus className="h-3.5 w-3.5" /> Schedule Follow-up
                  </button>
                </div>
              </div>

              {showFupForm && (
                <form onSubmit={handleAddFollowUp} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date *</label>
                      <input type="date" required value={fupForm.followup_date} onChange={(e) => setFupForm((p) => ({ ...p, followup_date: e.target.value }))}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Time</label>
                      <input type="time" value={fupForm.followup_time} onChange={(e) => setFupForm((p) => ({ ...p, followup_time: e.target.value }))}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Type *</label>
                      <select value={fupForm.followup_type} onChange={(e) => setFupForm((p) => ({ ...p, followup_type: e.target.value as any }))}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500">
                        {Object.entries(FOLLOWUP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Purpose *</label>
                      <input type="text" required value={fupForm.purpose} onChange={(e) => setFupForm((p) => ({ ...p, purpose: e.target.value }))}
                        placeholder="e.g. Confirm delivery schedule"
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes</label>
                    <textarea value={fupForm.notes} onChange={(e) => setFupForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional additional notes…" rows={2}
                      className="w-full text-xs bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowFupForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={isAddingFup}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5">
                      {isAddingFup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                      Schedule
                    </button>
                  </div>
                </form>
              )}

              {!followups || followups.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">No follow-ups scheduled.</div>
              ) : (
                <div className="space-y-2">
                  {(followups || [])
                    .filter((f: any) => {
                      if (fupStatusFilter !== 'all' && f.status !== fupStatusFilter) return false
                      return true
                    })
                    .map((f: any) => {
                      const isOverdue = f.status === 'pending' && f.followup_date < todayStr
                      return (
                        <div key={f.id} className={`bg-white border rounded-xl p-4 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${FOLLOWUP_TYPE_COLORS[f.followup_type] || 'bg-gray-100 text-gray-600'}`}>
                                {FOLLOWUP_TYPE_LABELS[f.followup_type] || f.followup_type}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{f.purpose}</p>
                                {f.notes && <p className="text-[11px] text-gray-500 mt-0.5">{f.notes}</p>}
                                <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(f.followup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {f.followup_time && ` at ${f.followup_time}`}
                                  </span>
                                  {isOverdue && <span className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-600'}`}>{f.status}</span>
                              {f.status === 'pending' && (
                                <div className="flex gap-1">
                                  <button onClick={() => handleUpdateFollowUpStatus(f.id, 'completed')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Mark completed"><CheckCircle2 className="h-4 w-4" /></button>
                                  <button onClick={() => handleUpdateFollowUpStatus(f.id, 'cancelled')} className="p-1 text-gray-400 hover:bg-gray-50 rounded-lg" title="Cancel"><XCircle className="h-4 w-4" /></button>
                                </div>
                              )}
                              <button onClick={() => handleDeleteFollowUp(f.id)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg" title="Delete follow-up">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Supplier Modal */}
      <AddPartyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveSupplier}
        initialData={{
          name: supplier.display_name || supplier.name,
          partyType: 'supplier',
          phone: supplier.phone || '',
          email: supplier.email || '',
          gstin: supplier.gstin || '',
          state: supplier.state || '',
          billingAddress: supplier.billing_address || '',
        }}
      />

      {/* Record Payment Out Modal */}
      <PaymentOutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setIsPaymentModalOpen(false)
          fetchProfile()
        }}
        initialPartyName={supplier.display_name || supplier.name}
      />
    </div>
  )
}
