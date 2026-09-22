'use client'

import { useState } from 'react'
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Phone,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { WhatsAppTemplateType } from '@/types/app.types'
import { WHATSAPP_TEMPLATES } from '@/lib/whatsapp/meta-provider'
import { toast } from 'sonner'

interface WhatsAppShareModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: WhatsAppTemplateType
  entityData: {
    id: string
    title_number: string
    customer_name: string
    customer_phone: string
    customer_id?: string | null
    amount_paise: number
    due_date_or_validity?: string | null
    outstanding_amount_paise?: number
  }
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  actionType,
  entityData,
}: WhatsAppShareModalProps) {
  const [recipientPhone, setRecipientPhone] = useState(entityData.customer_phone || '')
  const [isSending, setIsSending] = useState(false)
  const [optInConsent, setOptInConsent] = useState(true)

  if (!isOpen) return null

  // Generate live template preview
  const templateMeta = WHATSAPP_TEMPLATES[actionType]
  let previewText = templateMeta?.text_template || ''

  const params: Record<string, string> = {
    customer_name: entityData.customer_name || 'Valued Customer',
    invoice_number: entityData.title_number,
    quotation_number: entityData.title_number,
    payment_number: entityData.title_number,
    total_amount: `₹${(entityData.amount_paise / 100).toLocaleString('en-IN')}`,
    amount_paid: `₹${(entityData.amount_paise / 100).toLocaleString('en-IN')}`,
    outstanding_amount: `₹${((entityData.outstanding_amount_paise || entityData.amount_paise) / 100).toLocaleString('en-IN')}`,
    remaining_balance: `₹${((entityData.outstanding_amount_paise || 0) / 100).toLocaleString('en-IN')}`,
    due_date: entityData.due_date_or_validity || 'On Receipt',
    valid_until: entityData.due_date_or_validity || '15 Days',
    pdf_link: `https://app.wevly.com/doc/${entityData.id}.pdf`,
    payment_link: `https://app.wevly.com/pay/${entityData.id}`,
    receipt_link: `https://app.wevly.com/rec/${entityData.id}`,
    quote_link: `https://app.wevly.com/quote/${entityData.id}`,
  }

  Object.entries(params).forEach(([key, val]) => {
    previewText = previewText.replace(new RegExp(`{{${key}}}`, 'g'), val)
  })

  const getActionTitle = () => {
    switch (actionType) {
      case 'invoice.created':
        return 'Send Invoice via WhatsApp'
      case 'invoice.overdue':
        return 'Send Payment Reminder via WhatsApp'
      case 'payment.received':
        return 'Send Payment Receipt via WhatsApp'
      case 'quotation.created':
        return 'Share Quotation via WhatsApp'
      default:
        return 'Send WhatsApp Message'
    }
  }

  const handleSend = async () => {
    if (!recipientPhone.trim()) {
      toast.error('Please provide a valid recipient phone number')
      return
    }

    if (!optInConsent) {
      toast.error('Cannot send message without customer WhatsApp opt-in consent')
      return
    }

    setIsSending(true)

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          entity_data: {
            id: entityData.id,
            invoice_number: entityData.title_number,
            quotation_number: entityData.title_number,
            payment_number: entityData.title_number,
            customer_name: entityData.customer_name,
            customer_phone: recipientPhone,
            customer_id: entityData.customer_id,
            total_amount_paise: entityData.amount_paise,
            amount_paise: entityData.amount_paise,
            outstanding_amount_paise: entityData.outstanding_amount_paise,
            remaining_balance_paise: entityData.outstanding_amount_paise || 0,
            due_date: entityData.due_date_or_validity,
            valid_until: entityData.due_date_or_validity,
          },
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        toast.error(json.error || 'Failed to send WhatsApp message')
        return
      }

      toast.success('WhatsApp message sent successfully via Official Business API!')
      onClose()
    } catch (err: any) {
      toast.error('Network error sending WhatsApp message')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">{getActionTitle()}</h3>
              <p className="text-xs text-emerald-100 font-medium">Meta WhatsApp Business API Compliant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Document Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Document Number</span>
              <span className="font-bold text-slate-900 text-sm">{entityData.title_number}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-medium block">Customer</span>
              <span className="font-bold text-slate-800">{entityData.customer_name || 'Customer'}</span>
            </div>
          </div>

          {/* Recipient Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Recipient WhatsApp Phone Number
            </label>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Customer Opt-In Consent Guard Checkbox */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
            <input
              type="checkbox"
              id="whatsapp-opt-in"
              checked={optInConsent}
              onChange={(e) => setOptInConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="whatsapp-opt-in" className="text-xs text-emerald-900 leading-relaxed cursor-pointer">
              <span className="font-bold flex items-center gap-1 text-emerald-950 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                Customer Opt-In Consent Verified
              </span>
              Customer has explicitly consented to receive transactional business updates via WhatsApp in compliance with Meta Messaging Policies.
            </label>
          </div>

          {/* Live Message Template Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Message Template Preview</span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Approved Template
              </span>
            </label>
            <div className="p-4 rounded-2xl bg-emerald-50/20 border border-emerald-200/60 text-xs text-slate-700 leading-relaxed font-sans relative">
              <p className="whitespace-pre-wrap">{previewText}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !optInConsent}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Sending...' : 'Send via Official WhatsApp API'}
          </button>
        </div>
      </div>
    </div>
  )
}
