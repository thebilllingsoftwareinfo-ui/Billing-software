'use client'

import { InvoiceForm } from '@/components/invoices/invoice-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateInvoicePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/sales/invoices"
          className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Create Sales Invoice</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Issue a tax invoice for goods sold or services rendered to a customer.
          </p>
        </div>
      </div>

      <InvoiceForm />
    </div>
  )
}
