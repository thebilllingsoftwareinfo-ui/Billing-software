// ============================================================
// lib/validators/sales-order.schema.ts — Phase 7C Sales Order Schema
// ============================================================

import { z } from 'zod';

export const salesOrderStatusSchema = z.enum([
  'draft',
  'confirmed',
  'partially_fulfilled',
  'fulfilled',
  'cancelled',
]);

export type SalesOrderStatus = z.infer<typeof salesOrderStatusSchema>;

export const salesOrderItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  fulfilled_quantity: z.number().nonnegative().default(0),
  unit: z.string().optional().nullable().default('PCS'),
  unit_price: z.number().nonnegative('Price cannot be negative').default(0),
  discount_percent: z.number().min(0).max(100).default(0),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  is_gst_inclusive: z.boolean().default(false),
});

export type SalesOrderItemInput = z.input<typeof salesOrderItemSchema>;

export const createSalesOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer selection is required'),
  order_number: z.string().optional(),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Order date must be YYYY-MM-DD'),
  expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected delivery date must be YYYY-MM-DD').optional().nullable(),
  quotation_id: z.string().optional().nullable(),
  place_of_supply: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item line is required'),
});

export type CreateSalesOrderInput = z.input<typeof createSalesOrderSchema>;

export const updateSalesOrderSchema = createSalesOrderSchema.partial();

export const convertSalesOrderSchema = z.object({
  target_type: z.enum(['invoice', 'delivery_challan']),
  // Optional partial items with fulfillment quantities
  items: z.array(
    z.object({
      order_item_id: z.string().optional(),
      product_id: z.string().optional().nullable(),
      description: z.string(),
      convert_quantity: z.number().positive('Fulfillment quantity must be greater than 0'),
    })
  ).optional(),
});

export type ConvertSalesOrderInput = z.infer<typeof convertSalesOrderSchema>;
