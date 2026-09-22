'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  History,
  Eye,
  Edit3,
  Calendar,
  AlertCircle,
  Truck,
  CreditCard,
  Building,
} from 'lucide-react'
import { type PartyTransaction } from '@/components/parties/party-transaction-menu'
import { formatRupees } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { PaymentOutModal } from '@/components/payments/payment-out-modal'

export interface TransactionActionModalsProps {
  type: 'view_edit' | 'preview' | 'preview_challan' | 'receive_payment' | 'view_history' | 'payment_out' | null
  transaction: PartyTransaction | null
  partyName: string
  onClose: () => void
  onSave?: (updatedTx: PartyTransaction) => void
  onPaymentReceived?: (amount: number, mode: string) => void
}

export function TransactionActionModals({
  type,
  transaction,
  partyName,
  onClose,
  onSave,
  onPaymentReceived,
}: TransactionActionModalsProps) {
  if (!type || !transaction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      {type === 'view_edit' && (
        <ViewEditModal
          transaction={transaction}
          partyName={partyName}
          onClose={onClose}
          onSave={onSave}
        />
      )}

      {(type === 'preview' || type === 'preview_challan') && (
        <PreviewDocumentModal
          transaction={transaction}
          partyName={partyName}
          isChallan={type === 'preview_challan'}
          onClose={onClose}
        />
      )}

      {type === 'receive_payment' && (
        <ReceivePaymentModal
          transaction={transaction}
          partyName={partyName}
          onClose={onClose}
          onPaymentReceived={onPaymentReceived}
        />
      )}

      {type === 'view_history' && (
        <ViewHistoryModal
          transaction={transaction}
          partyName={partyName}
          onClose={onClose}
        />
      )}

      {type === 'payment_out' && (
        <PaymentOutModal
          isOpen={true}
          initialPartyName={partyName}
          onClose={onClose}
          onSuccess={() => {
            if (onPaymentReceived) onPaymentReceived(transaction.balance || 0, 'Cash')
          }}
        />
      )}
    </div>
  )
}

// ── 1. VIEW / EDIT MODAL ──────────────────────────────────────
function ViewEditModal({
  transaction,
  partyName,
  onClose,
  onSave,
}: {
  transaction: PartyTransaction
  partyName: string
  onClose: () => void
  onSave?: (updatedTx: PartyTransaction) => void
}) {
  const [formData, setFormData] = useState({
    number: transaction.number,
    date: transaction.date,
    total: transaction.total,
    balance: transaction.balance,
    status: transaction.status,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSave) {
      onSave({
        ...transaction,
        ...formData,
      })
    }
    onClose()
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Edit3 className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-bold text-sm">Edit {transaction.type} #{transaction.number}</h3>
            <p className="text-xs text-slate-400">Party: {partyName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice / Ref #</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
            <input
              type="text"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Total Amount (₹)</label>
            <input
              type="number"
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remaining Balance (₹)</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
          >
            <option value="active">Active (Unpaid)</option>
            <option value="paid">Paid (Cleared)</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

// ── 2. PREVIEW / DELIVERY CHALLAN MODAL ────────────────────────
function PreviewDocumentModal({
  transaction,
  partyName,
  isChallan,
  onClose,
}: {
  transaction: PartyTransaction
  partyName: string
  isChallan?: boolean
  onClose: () => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isChallan ? (
            <Truck className="h-5 w-5 text-emerald-400" />
          ) : (
            <FileText className="h-5 w-5 text-indigo-400" />
          )}
          <div>
            <h3 className="font-bold text-sm">
              {isChallan ? 'Delivery Challan Preview' : 'Tax Invoice Document'} — #{transaction.number}
            </h3>
            <p className="text-xs text-slate-400">Recipient: {partyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            onClick={() => {
              toast.success(`PDF downloaded for #${transaction.number}`)
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold px-3"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-8 overflow-y-auto space-y-6 text-gray-800 text-xs bg-slate-50/50">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {isChallan ? 'DELIVERY CHALLAN' : 'TAX INVOICE'}
              </span>
              <h2 className="text-base font-extrabold text-gray-900 mt-1.5">Acme Industrial Systems Pvt Ltd</h2>
              <p className="text-[11px] text-gray-500">GSTIN: 27AABCS1429B1Z8 | Mumbai, Maharashtra</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-bold text-gray-900">Doc No: {transaction.number}</p>
              <p className="text-[11px] text-gray-500">Date: {transaction.date}</p>
            </div>
          </div>

          {/* Billed To */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Customer / Consignee</p>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{partyName}</p>
              <p className="text-gray-500 text-[11px]">State: Maharashtra (Code: 27)</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-gray-400">Payment Status</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                transaction.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {(transaction.status || 'active').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Table Items */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-500 bg-gray-50">
                <th className="py-2 px-3">Item Description</th>
                <th className="py-2 px-3 text-center">Qty</th>
                <th className="py-2 px-3 text-right">Rate (₹)</th>
                <th className="py-2 px-3 text-right">Tax</th>
                <th className="py-2 px-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="py-2.5 px-3 font-medium">Standard Industrial Valve & Fitting Supplies</td>
                <td className="py-2.5 px-3 text-center">1</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatRupees(transaction.total * 0.82)}</td>
                <td className="py-2.5 px-3 text-right text-gray-500">18% GST</td>
                <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-mono">
                  {formatRupees(transaction.total)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatRupees(transaction.total * 0.82)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (18% GST):</span>
                <span className="font-mono">{formatRupees(transaction.total * 0.18)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-600">{formatRupees(transaction.total)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-700 pt-1">
                <span>Balance Due:</span>
                <span className="font-mono text-red-600">{formatRupees(transaction.balance)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 3. RECEIVE PAYMENT MODAL ──────────────────────────────────
function ReceivePaymentModal({
  transaction,
  partyName,
  onClose,
  onPaymentReceived,
}: {
  transaction: PartyTransaction
  partyName: string
  onClose: () => void
  onPaymentReceived?: (amount: number, mode: string) => void
}) {
  const [amount, setAmount] = useState<number>(transaction.balance > 0 ? transaction.balance : transaction.total)
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer / UPI')
  const [reference, setReference] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onPaymentReceived) {
      onPaymentReceived(amount, paymentMode)
    }
    toast.success(`Payment of ${formatRupees(amount)} recorded for #${transaction.number}`)
    onClose()
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
      <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DollarSign className="h-5 w-5 text-emerald-200" />
          <div>
            <h3 className="font-bold text-sm">Receive Payment</h3>
            <p className="text-xs text-emerald-100">Against Invoice #{transaction.number}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center text-xs">
          <div>
            <p className="text-emerald-800 font-semibold">{partyName}</p>
            <p className="text-emerald-600">Pending: {formatRupees(transaction.balance)}</p>
          </div>
          <span className="font-extrabold text-emerald-900 font-mono text-sm">
            {formatRupees(transaction.total)} Total
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Amount (₹)</label>
          <input
            type="number"
            value={amount}
            max={transaction.balance > 0 ? transaction.balance : transaction.total}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Bank Transfer / UPI">Bank Transfer / UPI (GPay / PhonePe / Paytm)</option>
            <option value="Cash">Cash Counter</option>
            <option value="Cheque">Cheque Deposit</option>
            <option value="Net Banking / NEFT">Net Banking / NEFT / RTGS</option>
            <option value="POS Card Swipe">POS Card Swipe</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / UTR Number (Optional)</label>
          <input
            type="text"
            placeholder="e.g. UPI Ref: 328491823901"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Confirm Receipt
          </button>
        </div>
      </form>
    </div>
  )
}

// ── 4. VIEW HISTORY MODAL ─────────────────────────────────────
function ViewHistoryModal({
  transaction,
  partyName,
  onClose,
}: {
  transaction: PartyTransaction
  partyName: string
  onClose: () => void
}) {
  const events = [
    {
      id: 1,
      title: `${transaction.type} Created`,
      time: `${transaction.date} at 11:30 AM`,
      desc: `Created by Admin for ₹${transaction.total.toLocaleString('en-IN')}`,
      icon: FileText,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      id: 2,
      title: 'WhatsApp Invoice Sent',
      time: `${transaction.date} at 11:32 AM`,
      desc: `Shared PDF via WhatsApp to registered mobile`,
      icon: Share2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      id: 3,
      title: transaction.status === 'paid' ? 'Full Payment Received' : 'Awaiting Payment',
      time: `${transaction.date} at 02:15 PM`,
      desc: transaction.status === 'paid' ? 'Payment settled in full' : `Balance of ₹${transaction.balance.toLocaleString('en-IN')} pending`,
      icon: transaction.status === 'paid' ? CheckCircle2 : Clock,
      color: transaction.status === 'paid' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50',
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150">
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <History className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-bold text-sm">Audit Trail & History</h3>
            <p className="text-xs text-slate-400">Doc #{transaction.number} • {partyName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200">
          {events.map((evt) => {
            const Icon = evt.icon
            return (
              <div key={evt.id} className="relative flex items-start gap-3 pl-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${evt.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 w-full text-xs">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-bold text-gray-900">{evt.title}</p>
                    <span className="text-[10px] text-gray-400 font-mono">{evt.time}</span>
                  </div>
                  <p className="text-gray-600 text-[11px]">{evt.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
