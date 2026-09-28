// ============================================================
// lib/validators/warehouse.schema.ts — Phase 8 Warehouse Master Schema
// ============================================================

import { z } from 'zod';

export const warehouseTypeSchema = z.enum([
  'main',
  'store',
  'godown',
  'branch',
  'retail_outlet',
  'other',
]);

export type WarehouseType = z.infer<typeof warehouseTypeSchema>;

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').max(100),
  code: z.string().min(1, 'Warehouse code is required').max(30).transform((val) => val.trim().toUpperCase()),
  type: warehouseTypeSchema.default('main'),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state_code: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  is_default: z.boolean().default(false).optional(),
  is_active: z.boolean().default(true).optional(),
  notes: z.string().optional().nullable(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
