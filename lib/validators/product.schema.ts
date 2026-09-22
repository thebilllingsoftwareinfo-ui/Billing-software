// ============================================================
// lib/validators/product.schema.ts
// ============================================================

import { z } from 'zod'

export const VALID_GST_RATES = [0, 0.1, 0.25, 0.5, 1, 1.5, 3, 5, 7.5, 12, 18, 28] as const

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU too long')
    .regex(/^[A-Za-z0-9\-\_\/]+$/, 'SKU can only contain letters, numbers, -, _ and /'),
  barcode: z.string().max(100).optional().nullable().or(z.literal('')),
  barcodes: z.array(z.string()).optional().default([]),
  category_id: z.string().optional().nullable().or(z.literal('')),
  unit_id: z.string().optional().nullable().or(z.literal('')),
  unit: z.string().optional().nullable().or(z.literal('')),
  primary_unit: z.string().optional().nullable(),
  secondary_unit: z.string().optional().nullable(),
  conversion_rate: z.number().positive().optional().nullable(),
  purchase_unit: z.string().optional().nullable(),
  sales_unit: z.string().optional().nullable(),
  decimals_allowed: z.boolean().optional().default(false),
  hsn_sac_code: z.string().max(20).optional().nullable().or(z.literal('')),
  product_type: z.enum(['goods', 'service']).default('goods'),
  selling_price: z.number().min(0, 'Selling price must be >= 0'),
  purchase_price: z.number().min(0, 'Purchase price must be >= 0').default(0),
  gst_rate: z.number().min(0).max(100).default(18),
  cess_rate: z.number().min(0).max(100).optional().default(0),
  cess_amount: z.number().min(0).optional().default(0),
  tax_treatment: z.enum(['taxable', 'exempt', 'nil_rated', 'zero_rated_export', 'non_gst', 'reverse_charge', 'composition']).optional().default('taxable'),
  min_stock_level: z.number().min(0, 'Minimum stock level must be >= 0').default(0),
  reorder_level: z.number().min(0).optional().nullable(),
  opening_stock: z.number().min(0, 'Opening stock must be >= 0').default(0),
  description: z.string().max(1000).optional().nullable().or(z.literal('')),
  metal_type: z.enum(['gold_24k', 'gold_22k', 'gold_18k', 'silver', 'diamond']).optional().nullable(),
  metal_weight: z.number().min(0).optional().nullable(),
  is_live_price: z.boolean().optional().default(false),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional().nullable().or(z.literal('')),
  parent_id: z.string().optional().nullable().or(z.literal('')),
})

export type ProductFormInput = z.input<typeof productSchema>
export type ProductFormValues = z.infer<typeof productSchema>
export type CategoryFormValues = z.infer<typeof categorySchema>
