// ============================================================
// lib/validators/inventory-batch.schema.ts — Phase 8 Batch Tracking Schema
// ============================================================

import { z } from 'zod';

export const createBatchSchema = z.object({
  product_id: z.string().min(1, 'Product selection is required'),
  warehouse_id: z.string().optional().nullable(),
  batch_number: z.string().min(1, 'Batch number is required').max(50).transform((val) => val.trim().toUpperCase()),
  manufacturing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Mfg date must be YYYY-MM-DD').optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD'),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Purchase date must be YYYY-MM-DD').optional().nullable(),
  cost: z.number().nonnegative('Cost cannot be negative').default(0).optional(),
  initial_quantity: z.number().nonnegative('Quantity cannot be negative').default(0).optional(),
  supplier_id: z.string().optional().nullable(),
  reference_document: z.string().optional().nullable(),
  is_active: z.boolean().default(true).optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export const updateBatchSchema = createBatchSchema.partial();
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
