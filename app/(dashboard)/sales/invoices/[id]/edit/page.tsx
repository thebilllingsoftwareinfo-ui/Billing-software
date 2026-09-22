'use client'

import { useState, useEffect, use } from 'react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      const json = await res.json()
      if (json.success) {
        if (json.data.status !== 'draft') {
          setError(`Cannot edit invoice in '${json.data.status.toUpperCase()}' status. Only DRAFT invoices can be edited.`)
        } else {
          setInvoice(json.data)
        }
      } else {
        setError(json.error || 'Failed to fetch invoice details')
      }
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError('Network error fetching invoice details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
        Loading draft invoice...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices"
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Sales Invoice</h1>
        </div>

        <div className="p-6 bg-red-50 text-red-700 text-xs font-medium rounded-2xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/sales/invoices/${id}`}
          className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Draft Invoice: {invoice?.invoice_number}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Modify line items or financial totals before finalization.</p>
        </div>
      </div>

      <InvoiceForm initialData={invoice} isEditing={true} />
    </div>
  )
}
