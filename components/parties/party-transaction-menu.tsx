'use client'

import React, { useEffect, useRef } from 'react'
import {
  Edit,
  Ban,
  Trash2,
  Copy,
  FileDown,
  Eye,
  Printer,
  Truck,
  RotateCcw,
  CreditCard,
  History,
} from 'lucide-react'

export type TransactionActionType =
  | 'view_edit'
  | 'cancel_invoice'
  | 'delete'
  | 'duplicate'
  | 'open_pdf'
  | 'preview'
  | 'print'
  | 'preview_delivery_challan'
  | 'convert_to_return'
  | 'receive_payment'
  | 'view_history'

export interface PartyTransaction {
  id: string
  type: string
  number: string
  date: string
  total: number
  balance: number
  status?: 'active' | 'cancelled' | 'paid'
  itemsCount?: number
  itemsDescription?: string
}

interface PartyTransactionMenuProps {
  isOpen: boolean
  onClose: () => void
  transaction: PartyTransaction
  onAction: (action: TransactionActionType, transaction: PartyTransaction) => void
  triggerPosition?: { top: number; right: number }
}

const MENU_OPTIONS: {
  action: TransactionActionType
  label: string
  icon: React.ElementType
  isDestructive?: boolean
}[] = [
  { action: 'view_edit', label: 'View/Edit', icon: Edit },
  { action: 'cancel_invoice', label: 'Cancel Invoice', icon: Ban },
  { action: 'delete', label: 'Delete', icon: Trash2, isDestructive: true },
  { action: 'duplicate', label: 'Duplicate', icon: Copy },
  { action: 'open_pdf', label: 'Open PDF', icon: FileDown },
  { action: 'preview', label: 'Preview', icon: Eye },
  { action: 'print', label: 'Print', icon: Printer },
  { action: 'preview_delivery_challan', label: 'Preview As Delivery Challan', icon: Truck },
  { action: 'convert_to_return', label: 'Convert To Return', icon: RotateCcw },
  { action: 'receive_payment', label: 'Receive Payment', icon: CreditCard },
  { action: 'view_history', label: 'View History', icon: History },
]

export function PartyTransactionMenu({
  isOpen,
  onClose,
  transaction,
  onAction,
  triggerPosition,
}: PartyTransactionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none text-left"
      style={triggerPosition ? { top: triggerPosition.top, right: triggerPosition.right } : undefined}
    >
      {MENU_OPTIONS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.action}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAction(item.action, transaction)
              onClose()
            }}
            className={`w-full px-4 py-1.5 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
              item.isDestructive
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>{item.label}</span>
            <Icon className={`h-3.5 w-3.5 ${item.isDestructive ? 'text-red-500' : 'text-gray-400'}`} />
          </button>
        )
      })}
    </div>
  )
}
