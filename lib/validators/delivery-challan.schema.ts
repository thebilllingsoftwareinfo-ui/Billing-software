// ============================================================
// lib/validators/delivery-challan.schema.ts — Phase 7C Delivery Challan Schema
// ============================================================

import { z } from 'zod';

export const deliveryChallanTypeSchema = z.enum([
  'supply_on_approval',
  'for_job_work',
  'removal_for_sale',
  'other',
]);

export type DeliveryChallanType = z.infer<typeof deliveryChallanTypeSchema>;

export const deliveryChallanStatusSchema = z.enum([
  'draft',
  'dispatched',
  'delivered',
  'invoiced',
  'cancelled',
]);

export type DeliveryChallanStatus = z.infer<typeof deliveryChallanStatusSchema>;

export const deliveryChallanItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  invoiced_quantity: z.number().nonnegative().default(0),
  unit: z.string().optional().nullable().default('PCS'),
  unit_price: z.number().nonnegative('Price cannot be negative').default(0),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
});

export type DeliveryChallanItemInput = z.input<typeof deliveryChallanItemSchema>;

export const createDeliveryChallanSchema = z.object({
  customer_id: z.string().min(1, 'Customer selection is required'),
  challan_number: z.string().optional(),
  challan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Challan date must be YYYY-MM-DD'),
  challan_type: deliveryChallanTypeSchema.default('removal_for_sale'),
  status: deliveryChallanStatusSchema.default('draft').optional(),
  sales_order_id: z.string().optional().nullable(),
  vehicle_number: z.string().optional().nullable(),
  transporter_name: z.string().optional().nullable(),
  delivery_address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(deliveryChallanItemSchema).min(1, 'At least one item line is required'),
});

export type CreateDeliveryChallanInput = z.input<typeof createDeliveryChallanSchema>;

export const updateDeliveryChallanSchema = createDeliveryChallanSchema.partial();
