// ============================================================
// lib/validators/return.schema.ts — Validation schemas for Sales & Purchase Returns
// ============================================================

import { z } from 'zod'

export const returnReasonEnum = z.enum([
  'damaged',
  'defective',
  'wrong_item',
  'customer_dissatisfied',
  'expired',
  'excess_stock',
  'quality_issue',
  'other',
])

export const salesReturnItemSchema = z.object({
  product_id: z.string().uuid('Valid product ID is required'),
  invoice_item_id: z.string().optional(),
  return_quantity: z.number().positive('Return quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  gst_rate: z.number().min(0).max(100).default(0),
  notes: z.string().max(500).optional(),
})

export const salesReturnSchema = z.object({
  invoice_id: z.string().uuid('Valid sales invoice ID is required'),
  return_date: z.string().default(() => new Date().toISOString().split('T')[0]),
  reason: returnReasonEnum,
  notes: z.string().max(1000).optional().or(z.literal('')),
  items: z.array(salesReturnItemSchema).min(1, 'At least one item must be returned'),
})

export const purchaseReturnItemSchema = z.object({
  product_id: z.string().uuid('Valid product ID is required'),
  bill_item_id: z.string().optional(),
  return_quantity: z.number().positive('Return quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  gst_rate: z.number().min(0).max(100).default(0),
  notes: z.string().max(500).optional(),
})

export const purchaseReturnSchema = z.object({
  bill_id: z.string().uuid('Valid purchase bill ID is required'),
  return_date: z.string().default(() => new Date().toISOString().split('T')[0]),
  reason: returnReasonEnum,
  notes: z.string().max(1000).optional().or(z.literal('')),
  items: z.array(purchaseReturnItemSchema).min(1, 'At least one item must be returned'),
})

export type SalesReturnInput = z.infer<typeof salesReturnSchema>
export type PurchaseReturnInput = z.infer<typeof purchaseReturnSchema>
