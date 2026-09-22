// ============================================================
// lib/validators/customer.schema.ts
// ============================================================

import { z } from 'zod'

export const addressSchema = z.object({
  contact_name: z.string().optional(),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  state_code: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code').optional().or(z.literal('')),
  country: z.string().default('India'),
})

export const customerSchema = z.object({
  display_name: z.string().min(1, 'Customer name is required').max(200),
  legal_name: z.string().max(200).optional().or(z.literal('')),
  customer_type: z.enum(['business', 'individual']).default('business'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,15}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  mobile: z.string().optional().or(z.literal('')),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Enter a valid 15-character GSTIN (e.g. 27AAPFU0939F1ZV)'
    )
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid 10-character PAN')
    .optional()
    .or(z.literal('')),
  place_of_supply: z.string().optional().or(z.literal('')),
  credit_period_days: z.number().min(0).max(365).default(30),
  credit_limit: z.number().min(0).default(0),
  opening_balance: z.number().default(0),
  notes: z.string().max(1000).optional().or(z.literal('')),
  billing_address: addressSchema.optional(),
  shipping_address: addressSchema.optional(),
})

export type CustomerFormInput = z.input<typeof customerSchema>
export type CustomerFormValues = z.infer<typeof customerSchema>
