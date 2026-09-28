// ============================================================
// lib/validators/stock-count.schema.ts — Phase 8 Stock Count & Reconciliation
// ============================================================

import { z } from 'zod';

export const stockCountStatusSchema = z.enum([
  'draft',
  'counted',
  'review',
  'approved',
  'posted',
  'cancelled',
]);

export type StockCountStatus = z.infer<typeof stockCountStatusSchema>;

export const stockCountItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, 'Product selection is required'),
  system_quantity: z.number().nonnegative().optional(),
  physical_quantity: z.number().nonnegative('Physical count cannot be negative'),
  unit_cost: z.number().nonnegative().default(0).optional(),
  notes: z.string().optional().nullable(),
});

export type StockCountItemInput = z.infer<typeof stockCountItemSchema>;

export const createStockCountSchema = z.object({
  count_number: z.string().optional(),
  warehouse_id: z.string().min(1, 'Warehouse selection is required'),
  count_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Count date must be YYYY-MM-DD'),
  category_id: z.string().optional().nullable(),
  status: stockCountStatusSchema.default('draft').optional(),
  notes: z.string().optional().nullable(),
  items: z.array(stockCountItemSchema).min(1, 'At least one product item is required for stock count'),
});

export type CreateStockCountInput = z.infer<typeof createStockCountSchema>;

export const updateStockCountSchema = createStockCountSchema.partial();
export type UpdateStockCountInput = z.infer<typeof updateStockCountSchema>;
