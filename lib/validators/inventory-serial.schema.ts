// ============================================================
// lib/validators/inventory-serial.schema.ts — Phase 8 Serial Number Schema
// ============================================================

import { z } from 'zod';

export const serialStatusSchema = z.enum([
  'available',
  'reserved',
  'sold',
  'transferred',
  'returned',
  'damaged',
]);

export type SerialStatus = z.infer<typeof serialStatusSchema>;

export const createSerialSchema = z.object({
  product_id: z.string().min(1, 'Product selection is required'),
  warehouse_id: z.string().min(1, 'Warehouse selection is required'),
  serial_number: z.string().min(1, 'Serial number is required').max(100).transform((val) => val.trim()),
  status: serialStatusSchema.default('available').optional(),
  batch_id: z.string().optional().nullable(),
  purchase_reference: z.string().optional().nullable(),
  sale_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSerialInput = z.infer<typeof createSerialSchema>;

export const bulkCreateSerialsSchema = z.object({
  product_id: z.string().min(1, 'Product selection is required'),
  warehouse_id: z.string().min(1, 'Warehouse selection is required'),
  serial_numbers: z.array(z.string().min(1)).min(1, 'At least one serial number is required'),
  batch_id: z.string().optional().nullable(),
  purchase_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type BulkCreateSerialsInput = z.infer<typeof bulkCreateSerialsSchema>;

export const updateSerialSchema = createSerialSchema.partial();
export type UpdateSerialInput = z.infer<typeof updateSerialSchema>;
