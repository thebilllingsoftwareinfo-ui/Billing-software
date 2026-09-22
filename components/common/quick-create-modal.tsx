'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

interface QuickActionItem {
  label: string
  sublabel?: string
  shortcut: string
  altKey: string // The key for Alt + [key]
  href: string
}

export function QuickCreateModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const saleActions: QuickActionItem[] = [
    { label: 'Sale Invoice', shortcut: 'ALT + S', altKey: 's', href: '/sales/invoices/new' },
    { label: 'Payment-In', shortcut: 'ALT + I', altKey: 'i', href: '/sales/invoices?action=payment_in' },
    { label: 'Sale Return', sublabel: 'Cr Note', shortcut: 'ALT + R', altKey: 'r', href: '/sales/invoices/new?type=credit_note' },
    { label: 'Sale Order', shortcut: 'ALT + F', altKey: 'f', href: '/sales/invoices/new?type=sale_order' },
    { label: 'Estimate/Quotation', shortcut: 'ALT + M', altKey: 'm', href: '/sales/quotations/new' },
    { label: 'Proforma Invoice', shortcut: 'ALT + K', altKey: 'k', href: '/sales/quotations/new?type=proforma' },
    { label: 'Delivery Challan', shortcut: 'ALT + D', altKey: 'd', href: '/sales/invoices/new?type=delivery_challan' },
  ]

  const purchaseActions: QuickActionItem[] = [
    { label: 'Purchase Bill', shortcut: 'ALT + P', altKey: 'p', href: '/purchases/bills/new' },
    { label: 'Payment-Out', shortcut: 'ALT + O', altKey: 'o', href: '/expenses?action=payment_out' },
    { label: 'Purchase Return', sublabel: 'Dr Note', shortcut: 'ALT + L', altKey: 'l', href: '/purchases/bills/new?type=debit_note' },
    { label: 'Purchase Order', shortcut: 'ALT + G', altKey: 'g', href: '/purchases/bills/new?type=purchase_order' },
  ]

  const otherActions: QuickActionItem[] = [
    { label: 'Expenses', shortcut: 'ALT + E', altKey: 'e', href: '/expenses?action=new' },
    { label: 'Party To Party Transfer', shortcut: 'ALT + J', altKey: 'j', href: '/parties?action=transfer' },
  ]

  const handleSelect = useCallback(
    (href: string) => {
      setIsOpen(false)
      router.push(href)
    },
    [router]
  )

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter toggles menu
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }

      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        return
      }

      // If Alt + key is pressed while open
      if (e.altKey) {
        const key = e.key.toLowerCase()
        const allItems = [...saleActions, ...purchaseActions, ...otherActions]
        const matched = allItems.find((item) => item.altKey === key)
        if (matched) {
          e.preventDefault()
          handleSelect(matched.href)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleSelect, saleActions, purchaseActions, otherActions])

  return (
    <div className="relative">
      {/* Trigger button: ONLY the '+' icon as requested */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-7 w-7 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg shadow-2xs flex items-center justify-center cursor-pointer transition-all"
        title="Quick Create Menu (Ctrl + Enter)"
        aria-label="Quick Create Menu"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover matching Image 2 */}
          <div className="absolute right-0 top-full mt-2 w-[680px] max-w-[95vw] bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none">
            {/* Pointer arrow caret */}
            <div className="absolute -top-1.5 right-2 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45" />

            {/* Main 3-Column Content */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
              {/* Column 1: SALE */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 mb-3.5 pb-1 border-b border-gray-100">
                  Sale
                </h3>
                <div className="space-y-2.5">
                  {saleActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer py-0.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 text-[10px] mt-0.5 leading-none group-hover:translate-x-0.5 transition-transform">
                          ▶
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 group-hover:border-b-2 group-hover:border-blue-500 pb-0.5 transition-all">
                            {item.label}
                          </span>
                          {item.sublabel && (
                            <span className="text-[10px] text-gray-400 block leading-tight">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-medium text-gray-400 group-hover:text-gray-600 ml-2">
                        {item.shortcut}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: PURCHASE */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 mb-3.5 pb-1 border-b border-gray-100">
                  Purchase
                </h3>
                <div className="space-y-2.5">
                  {purchaseActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer py-0.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 text-[10px] mt-0.5 leading-none group-hover:translate-x-0.5 transition-transform">
                          ▶
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 group-hover:border-b-2 group-hover:border-blue-500 pb-0.5 transition-all">
                            {item.label}
                          </span>
                          {item.sublabel && (
                            <span className="text-[10px] text-gray-400 block leading-tight">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-medium text-gray-400 group-hover:text-gray-600 ml-2">
                        {item.shortcut}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 3: OTHERS */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 mb-3.5 pb-1 border-b border-gray-100">
                  Others
                </h3>
                <div className="space-y-2.5">
                  {otherActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer py-0.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-500 text-[10px] mt-0.5 leading-none group-hover:translate-x-0.5 transition-transform">
                          ▶
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 group-hover:border-b-2 group-hover:border-blue-500 pb-0.5 transition-all">
                            {item.label}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-medium text-gray-400 group-hover:text-gray-600 ml-2">
                        {item.shortcut}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Yellow Banner matching Image 2 */}
            <div className="bg-[#FFF4B8] border-t border-amber-200/70 px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 font-medium">
              <div className="flex items-center gap-2">
                <span>Shortcut to open this menu :</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border border-amber-300/80 rounded-md font-mono text-[11px] font-bold text-gray-800 shadow-2xs">
                    Ctrl
                  </kbd>
                  <span className="text-amber-800 font-bold">+</span>
                  <kbd className="px-2 py-0.5 bg-white border border-amber-300/80 rounded-md font-mono text-[11px] font-bold text-gray-800 shadow-2xs">
                    Enter
                  </kbd>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-amber-800 hover:text-amber-950 hover:bg-amber-200/50 p-1 rounded-md transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

