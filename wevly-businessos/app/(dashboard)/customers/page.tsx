'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Users,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Archive,
  RotateCcw,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BadgeAlert,
} from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { CustomerFormModal } from '@/components/customers/customer-form-modal'
import { formatCurrency } from '@/lib/utils/currency'

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const actionParam = searchParams.get('action')

  const [customers, setCustomers] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalCustomers: 0, totalOutstanding: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)

  // Filters & Controls state
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [sortBy, setSortBy] = useState('name_asc')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (actionParam === 'new') {
      setSelectedCustomer(null)
      setIsModalOpen(true)
    }
  }, [actionParam])

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        status: statusFilter,
        sort: sortBy,
        page: pagination.page.toString(),
        limit: '15',
      })

      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setCustomers(data.data)
        setPagination(data.pagination)
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        toast.error(data.error || 'Failed to load customers.')
      }
    } catch {
      toast.error('Error connecting to server.')
    } finally {
      setIsLoading(false)
    }
  }, [query, statusFilter, sortBy, pagination.page])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleArchiveToggle = async (customer: any) => {
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(data.message)
        fetchCustomers()
      } else {
        toast.error(data.error || 'Failed to update customer status.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setActionMenuOpenId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage customer accounts, GSTIN details, credit limits, and outstanding balances.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedCustomer(null)
            setIsModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Customers</p>
            <p className="text-xl font-extrabold text-gray-900 mt-0.5">{summary.totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <BadgeAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Receivables</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
              {formatCurrency(summary.totalOutstanding)}
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, Sorting */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
            placeholder="Search by name, phone, GSTIN..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {(['active', 'archived', 'all'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st)
                  setPagination((p) => ({ ...p, page: 1 }))
                }}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  statusFilter === st ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-2 text-xs bg-white border border-gray-200 rounded-xl text-gray-800 focus:outline-none"
            >
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
              <option value="balance_desc">Highest Outstanding</option>
              <option value="created_desc">Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table / List */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs font-medium">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? 'No matching customers found' : 'No customers in directory'}
          description={
            query
              ? `No customer matches your search term "${query}".`
              : 'Add customer profiles to generate tax invoices and track outstanding receivables.'
          }
          actionLabel="+ Add Customer"
          onAction={() => {
            setSelectedCustomer(null)
            setIsModalOpen(true)
          }}
        />
      ) : (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">GSTIN / PAN</th>
                  <th className="py-3.5 px-4">State</th>
                  <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
                {customers.map((c) => {
                  const defaultAddress = c.customer_addresses?.find((a: any) => a.address_type === 'billing')
                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-3.5 px-4">
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-3 group-hover:text-indigo-600">
                          <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {c.display_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {c.display_name}
                            </p>
                            {c.legal_name && <p className="text-[11px] text-gray-400 font-normal">{c.legal_name}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <p>{c.phone || c.mobile || '—'}</p>
                        <p className="text-[11px] text-gray-400">{c.email || '—'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {c.gstin ? (
                          <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-100">
                            {c.gstin}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unregistered</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {defaultAddress?.state || c.place_of_supply || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                        <span className={Number(c.outstanding_balance) > 0 ? 'text-amber-600' : 'text-gray-900'}>
                          {formatCurrency(c.outstanding_balance || 0)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/customers/${c.id}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title="View Statement"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedCustomer(c)
                              setIsModalOpen(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                            title="Edit Customer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(c)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600"
                            title={c.is_active ? 'Archive' : 'Unarchive'}
                          >
                            {c.is_active ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 border-t border-gray-200 text-xs text-gray-500">
              <span>
                Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
                <strong className="text-gray-900">{pagination.totalPages}</strong> ({pagination.total} customers)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1 font-semibold"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCustomers}
        initialData={selectedCustomer}
      />
    </div>
  )
}
