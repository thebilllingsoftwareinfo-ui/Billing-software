// ============================================================
// lib/validators/inventory.schema.ts
// ============================================================

import { z } from 'zod'

export const stockAdjustmentItemSchema = z.object({
  product_id: z.string().uuid('Valid product ID is required'),
  new_quantity: z.number().min(0, 'New quantity must be >= 0'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export const stockAdjustmentSchema = z.object({
  adjustment_date: z.string().default(() => new Date().toISOString().split('T')[0]),
  reason: z.enum(['stocktake', 'damage', 'expiry', 'theft', 'production', 'opening', 'correction', 'other']),
  notes: z.string().max(1000).optional().or(z.literal('')),
  items: z.array(stockAdjustmentItemSchema).min(1, 'At least one item is required for stock adjustment'),
})

export const inventoryMovementRequestSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum([
    'opening',
    'purchase',
    'sale',
    'return_in',
    'return_out',
    'adjustment_in',
    'adjustment_out',
    'transfer_in',
    'transfer_out',
    'damage',
  ]),
  quantity: z.number().refine((val) => val !== 0, 'Movement quantity cannot be 0'),
  unit_cost: z.number().min(0).optional(),
  reference_type: z.enum(['invoice', 'purchase_bill', 'stock_adjustment', 'credit_note', 'debit_note', 'manual']).optional(),
  reference_id: z.string().uuid().optional(),
  reference_number: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export type StockAdjustmentFormInput = z.input<typeof stockAdjustmentSchema>
export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>
export type InventoryMovementRequest = z.infer<typeof inventoryMovementRequestSchema>
