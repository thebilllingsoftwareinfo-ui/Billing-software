// ============================================================
// lib/constants/invoice-statuses.ts
// ============================================================

import { InvoiceStatus, QuotationStatus } from '@/types/app.types'

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; bg: string; description: string }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    description: 'Not yet finalized',
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    description: 'Sent to customer',
  },
  partial: {
    label: 'Partial',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    description: 'Partially paid',
  },
  paid: {
    label: 'Paid',
    color: 'text-green-700',
    bg: 'bg-green-50',
    description: 'Fully paid',
  },
  overdue: {
    label: 'Overdue',
    color: 'text-red-700',
    bg: 'bg-red-50',
    description: 'Past due date',
  },
  void: {
    label: 'Void',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    description: 'Voided — no longer valid',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    description: 'Cancelled before sending',
  },
}

export const QUOTATION_STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; color: string; bg: string }
> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-50' },
  accepted: { label: 'Accepted', color: 'text-green-700', bg: 'bg-green-50' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' },
  expired: { label: 'Expired', color: 'text-gray-500', bg: 'bg-gray-100' },
  converted: {
    label: 'Converted',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
  },
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const

export const PRODUCT_UNITS = [
  'pcs', 'kg', 'g', 'mg', 'l', 'ml', 'box', 'pack',
  'set', 'pair', 'dozen', 'sq ft', 'sq m', 'cu m',
  'hr', 'day', 'month', 'year', 'km', 'm', 'ft',
] as const
