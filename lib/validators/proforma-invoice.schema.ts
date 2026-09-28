// ============================================================
// lib/validators/proforma-invoice.schema.ts — Phase 7C Proforma Invoice Schema
// ============================================================

import { z } from 'zod';

export const proformaInvoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'converted',
  'cancelled',
]);

export type ProformaInvoiceStatus = z.infer<typeof proformaInvoiceStatusSchema>;

export const proformaInvoiceItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional().nullable().default('PCS'),
  unit_price: z.number().nonnegative('Price cannot be negative').default(0),
  discount_percent: z.number().min(0).max(100).default(0),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  is_gst_inclusive: z.boolean().default(false),
});

export type ProformaInvoiceItemInput = z.input<typeof proformaInvoiceItemSchema>;

export const createProformaInvoiceSchema = z.object({
  customer_id: z.string().min(1, 'Customer selection is required'),
  proforma_number: z.string().optional(),
  proforma_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Proforma date must be YYYY-MM-DD'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD').optional().nullable(),
  quotation_id: z.string().optional().nullable(),
  sales_order_id: z.string().optional().nullable(),
  place_of_supply: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(proformaInvoiceItemSchema).min(1, 'At least one item line is required'),
});

export type CreateProformaInvoiceInput = z.input<typeof createProformaInvoiceSchema>;

export const updateProformaInvoiceSchema = createProformaInvoiceSchema.partial();
