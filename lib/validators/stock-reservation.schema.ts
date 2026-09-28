// ============================================================
// lib/validators/stock-reservation.schema.ts — Phase 8 Stock Reservation Schema
// ============================================================

import { z } from 'zod';

export const reservationReferenceTypeSchema = z.enum([
  'sales_order',
  'quotation',
  'manual',
]);

export type ReservationReferenceType = z.infer<typeof reservationReferenceTypeSchema>;

export const reservationStatusSchema = z.enum([
  'active',
  'fulfilled',
  'cancelled',
]);

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const createReservationSchema = z.object({
  product_id: z.string().min(1, 'Product selection is required'),
  warehouse_id: z.string().min(1, 'Warehouse selection is required'),
  quantity: z.number().positive('Reserved quantity must be greater than zero'),
  reference_type: reservationReferenceTypeSchema.default('sales_order'),
  reference_id: z.string().min(1, 'Reference ID is required'),
  notes: z.string().optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
