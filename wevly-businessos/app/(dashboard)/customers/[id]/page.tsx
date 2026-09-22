'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  FileCheck,
  Receipt,
  History,
  Edit2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { CustomerFormModal } from '@/components/customers/customer-form-modal'

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [customerData, setCustomerData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'quotations' | 'ledger'>('invoices')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fetchCustomerDetails = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/customers/${id}`)
      const data = await res.json()

      if (res.ok && data.success) {
        setCustomerData(data.data)
      } else {
        toast.error(data.error || 'Failed to load customer details.')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomerDetails()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-medium">Loading customer statement & ledger...</p>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <p className="text-sm font-semibold text-gray-800">Customer profile not found</p>
        <Link href="/customers" className="mt-4 inline-block text-xs text-indigo-600 font-bold hover:underline">
          ← Back to Customers Directory
        </Link>
      </div>
    )
  }

  const { customer, summary, invoices, payments, quotations, transactions } = customerData
  const billingAddr = customer.customer_addresses?.find((a: any) => a.address_type === 'billing')
  const shippingAddr = customer.customer_addresses?.find((a: any) => a.address_type === 'shipping')

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit Profile
          </button>
          <Link
            href={`/sales/invoices/new?customer_id=${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </Link>
        </div>
      </div>

      {/* Customer Header Banner */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-indigo-600/20">
            {customer.display_name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-gray-900">{customer.display_name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${customer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {customer.is_active ? 'Active' : 'Archived'}
              </span>
            </div>
            {customer.legal_name && <p className="text-xs text-gray-400 mt-0.5">{customer.legal_name}</p>}

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-3">
              {customer.gstin && (
                <span className="font-mono bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-100">
                  GSTIN: {customer.gstin}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-gray-400" /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-gray-400" /> {customer.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Address Badge */}
        <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-xs text-gray-500 space-y-1 min-w-[200px]">
          <p className="font-bold text-gray-900 uppercase tracking-wider text-[10px]">Billing State</p>
          <p className="font-medium text-gray-800">{billingAddr?.state || customer.place_of_supply || 'Not specified'}</p>
          <p className="text-[11px] text-gray-400">{billingAddr ? `${billingAddr.city}, ${billingAddr.pincode}` : ''}</p>
        </div>
      </div>

      {/* Required Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Sales</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{formatCurrency(summary.totalSales)}</p>
          <p className="text-[11px] text-gray-400 mt-1">Cumulative sales billing</p>
        </div>

        {/* Paid Amount */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Paid Amount</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(summary.paidAmount)}</p>
          <p className="text-[11px] text-gray-400 mt-1">Total receipts collected</p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Outstanding Balance</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{formatCurrency(summary.outstanding)}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Credit Limit: <strong className="text-gray-700">{formatCurrency(summary.creditLimit)}</strong>
          </p>
        </div>
      </div>

      {/* Tabs Navigation for Activity & Ledger */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex border-b border-gray-200 px-6 gap-8 text-xs font-bold text-gray-500 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'invoices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4" /> Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-gray-900'
            }`}
          >
            <CreditCard className="h-4 w-4" /> Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('quotations')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'quotations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-gray-900'
            }`}
          >
            <FileCheck className="h-4 w-4" /> Quotations ({quotations.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ledger' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-gray-900'
            }`}
          >
            <History className="h-4 w-4" /> Ledger Statement ({transactions.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* 1. Invoices */}
          {activeTab === 'invoices' && (
            <div>
              {invoices.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">No sales invoices recorded for this customer.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Invoice #</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5 text-right">Total Amount</th>
                      <th className="py-2.5 text-right">Paid Amount</th>
                      <th className="py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                        <td className="py-3 text-gray-600">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(inv.total_amount)}</td>
                        <td className="py-3 text-right font-semibold text-emerald-600">{formatCurrency(inv.paid_amount)}</td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 capitalize">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 2. Payments */}
          {activeTab === 'payments' && (
            <div>
              {payments.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">No payment receipts recorded for this customer.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Receipt #</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Payment Mode</th>
                      <th className="py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono font-bold text-gray-900">{p.payment_number}</td>
                        <td className="py-3 text-gray-600">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 text-gray-600 uppercase font-semibold text-[11px]">{p.payment_mode}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 3. Quotations */}
          {activeTab === 'quotations' && (
            <div>
              {quotations.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">No price quotations generated for this customer.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Quotation #</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5 text-right">Estimated Amount</th>
                      <th className="py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotations.map((q: any) => (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono font-bold text-indigo-600">{q.quotation_number}</td>
                        <td className="py-3 text-gray-600">{new Date(q.quotation_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(q.total_amount)}</td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 capitalize">
                            {q.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 4. Ledger */}
          {activeTab === 'ledger' && (
            <div>
              {transactions.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs font-medium">No ledger transactions recorded.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-right">Amount</th>
                      <th className="py-2.5 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="py-3 text-gray-600">{new Date(tx.transaction_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{tx.description || '—'}</td>
                        <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(tx.amount)}</td>
                        <td className="py-3 text-right font-bold text-indigo-600">{formatCurrency(tx.balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchCustomerDetails}
        initialData={customer}
      />
    </div>
  )
}
