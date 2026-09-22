'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, FileCheck, Users, Package, ShoppingCart, Receipt, ChevronDown } from 'lucide-react'

export function QuickCreateModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const createActions = [
    { label: 'Create Invoice', href: '/sales/invoices/new', icon: FileText, desc: 'Sales bill for customer' },
    { label: 'Create Quotation', href: '/sales/quotations/new', icon: FileCheck, desc: 'Estimate or quotation' },
    { label: 'Add Customer', href: '/customers?action=new', icon: Users, desc: 'New client / party' },
    { label: 'Add Product', href: '/products?action=new', icon: Package, desc: 'Item in inventory catalog' },
    { label: 'Purchase Bill', href: '/purchases/bills/new', icon: ShoppingCart, desc: 'Vendor purchase bill' },
    { label: 'Record Expense', href: '/expenses?action=new', icon: Receipt, desc: 'Business outflow / cost' },
  ]

  const handleSelect = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create</span>
        <ChevronDown className="h-3.5 w-3.5 text-indigo-200" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-200 shadow-xl z-40 py-2">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Quick Actions
            </p>
            <div className="space-y-0.5 px-1">
              {createActions.map((act, i) => {
                const Icon = act.icon
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(act.href)}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl hover:bg-indigo-50/70 text-left transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-indigo-100 text-gray-600 group-hover:text-indigo-600 transition-colors mt-0.5">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-950">
                        {act.label}
                      </p>
                      <p className="text-[11px] text-gray-400">{act.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
