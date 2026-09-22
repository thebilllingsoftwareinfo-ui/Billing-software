'use client'

import { useState } from 'react'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { ArrowLeft, Maximize2, Minimize2, X, Monitor } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MultiTabContainer } from '@/components/common/multi-tab-container'

export default function CreateInvoicePage() {
  const router = useRouter()
  const [isFullDesktop, setIsFullDesktop] = useState(true)

  if (isFullDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f4f6fa] flex flex-col overflow-hidden font-sans">
        {/* Desktop Window Titlebar */}
        <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between select-none shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[11px] rounded tracking-wider uppercase">
              Sale
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900 tracking-tight">Create Sales Invoice</h1>
              <span className="hidden sm:inline-block text-[11px] text-gray-400 font-medium">
                • Desktop Fullscreen View
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullDesktop(false)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
              title="Switch to Standard Dashboard Layout"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-[11px]">Normal View</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/sales/invoices')}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
              title="Close (Back to Invoices)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop Workspace Canvas with Tabs */}
        <div className="flex-1 overflow-hidden bg-[#f4f6fa] flex flex-col min-h-0">
          <MultiTabContainer 
            baseTitle="Sale" 
            renderContent={(tabId) => (
              <div className="h-full overflow-y-auto p-4 md:p-6">
                <div className="max-w-[1750px] mx-auto pb-20">
                  {/* The key={tabId} ensures each tab has a unique instance of the form, but because they are conditionally rendered with CSS display:none in the wrapper, they maintain state */}
                  <InvoiceForm isFullDesktop={true} key={`desktop-invoice-${tabId}`} />
                </div>
              </div>
            )} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
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

        <button
          type="button"
          onClick={() => setIsFullDesktop(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-xl border border-blue-200 transition-colors shadow-2xs"
          title="Switch to Full Desktop View"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Full Desktop View
        </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden flex flex-col min-h-0">
        <MultiTabContainer 
          baseTitle="Sale" 
          renderContent={(tabId) => (
            <div className="h-full overflow-y-auto p-4 md:p-6 pb-20">
              <InvoiceForm isFullDesktop={false} key={`standard-invoice-${tabId}`} />
            </div>
          )} 
        />
      </div>
    </div>
  )
}
