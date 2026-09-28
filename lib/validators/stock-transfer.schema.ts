// ============================================================
// lib/validators/stock-transfer.schema.ts — Phase 8 Stock Transfer Schema
// ============================================================

import { z } from 'zod';

export const stockTransferStatusSchema = z.enum([
  'draft',
  'initiated',
  'in_transit',
  'received',
  'transferred',
  'cancelled',
]);

export type StockTransferStatus = z.infer<typeof stockTransferStatusSchema>;

export const stockTransferItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, 'Product selection is required'),
  quantity: z.number().positive('Transfer quantity must be greater than zero'),
  unit: z.string().optional().nullable().default('PCS'),
  batch_id: z.string().optional().nullable(),
  batch_number: z.string().optional().nullable(),
  serial_numbers: z.array(z.string()).default([]).optional(),
  notes: z.string().optional().nullable(),
});

export type StockTransferItemInput = z.infer<typeof stockTransferItemSchema>;

export const baseStockTransferSchema = z.object({
  transfer_number: z.string().optional(),
  source_warehouse_id: z.string().min(1, 'Source warehouse is required'),
  destination_warehouse_id: z.string().min(1, 'Destination warehouse is required'),
  transfer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Transfer date must be YYYY-MM-DD'),
  status: stockTransferStatusSchema.default('draft').optional(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(stockTransferItemSchema).min(1, 'At least one item is required for transfer'),
});

export const createStockTransferSchema = baseStockTransferSchema.refine(
  (data) => data.source_warehouse_id !== data.destination_warehouse_id,
  {
    message: 'Source and destination warehouses cannot be the same',
    path: ['destination_warehouse_id'],
  }
);

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;

export const updateStockTransferSchema = baseStockTransferSchema.partial();
export type UpdateStockTransferInput = z.infer<typeof updateStockTransferSchema>;
