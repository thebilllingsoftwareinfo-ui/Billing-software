// ============================================================
// lib/validators/invoice.schema.ts
// Zod schemas for Sales Invoices validation
// ============================================================

import { z } from 'zod'

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().nullable().optional(),
  description: z.string().min(1, 'Item description is required').max(500),
  hsn_sac_code: z.string().max(20).optional().or(z.literal('')),
  quantity: z.number().min(0.0001, 'Quantity must be greater than 0'),
  unit: z.string().max(20).optional().or(z.literal('')),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  discount_percent: z.number().min(0).max(100).default(0),
  gst_rate: z.number().min(0, 'GST rate cannot be negative').max(100, 'GST rate cannot exceed 100%'),
  cess_rate: z.number().min(0).max(100).optional(),
  cess_amount: z.number().min(0).optional(),
  tax_treatment: z.string().optional(),
  is_gst_inclusive: z.boolean().default(false),
})

export const createInvoiceSchema = z.object({
  customer_id: z.string().min(1, 'Please select or enter customer name'),
  invoice_number: z.string().max(50).optional().or(z.literal('')),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid invoice date YYYY-MM-DD required'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid due date YYYY-MM-DD required').optional().or(z.literal('')),
  invoice_type: z.enum(['standard', 'proforma', 'export', 'bill_of_supply']).default('standard'),
  place_of_supply: z.string().max(100).optional().or(z.literal('')),
  reverse_charge: z.boolean().default(false),
  reference_number: z.string().max(100).optional().or(z.literal('')),
  discount_type: z.enum(['fixed', 'percent']).default('fixed'),
  discount_value: z.number().min(0, 'Discount cannot be negative').default(0),
  payment_status: z.enum(['unpaid', 'paid', 'partial']).default('unpaid'),
  payment_mode: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'credit', 'other']).optional().or(z.literal('')),
  payment_reference: z.string().max(100).optional().or(z.literal('')),
  amount_paid: z.number().min(0).default(0),
  notes: z.string().max(2000).optional().or(z.literal('')),
  terms_and_conditions: z.string().max(2000).optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
})

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500),
})

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>
