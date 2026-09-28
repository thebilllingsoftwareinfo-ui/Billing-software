// ============================================================
// lib/validators/purchase-order.schema.ts — Phase 7C Purchase Order Schema
// ============================================================

import { z } from 'zod';

export const purchaseOrderStatusSchema = z.enum([
  'draft',
  'issued',
  'partially_received',
  'received',
  'cancelled',
]);

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;

export const purchaseOrderItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  received_quantity: z.number().nonnegative().default(0),
  unit: z.string().optional().nullable().default('PCS'),
  unit_price: z.number().nonnegative('Price cannot be negative').default(0),
  discount_percent: z.number().min(0).max(100).default(0),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  is_gst_inclusive: z.boolean().default(false),
});

export type PurchaseOrderItemInput = z.input<typeof purchaseOrderItemSchema>;

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier selection is required'),
  po_number: z.string().optional(),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Order date must be YYYY-MM-DD'),
  expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected delivery date must be YYYY-MM-DD').optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item line is required'),
});

export type CreatePurchaseOrderInput = z.input<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

export const convertPurchaseOrderSchema = z.object({
  items: z.array(
    z.object({
      po_item_id: z.string().optional(),
      product_id: z.string().optional().nullable(),
      description: z.string(),
      receive_quantity: z.number().positive('Received quantity must be greater than 0'),
    })
  ).optional(),
});

export type ConvertPurchaseOrderInput = z.infer<typeof convertPurchaseOrderSchema>;
