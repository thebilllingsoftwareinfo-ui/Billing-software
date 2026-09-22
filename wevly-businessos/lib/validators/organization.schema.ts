// ============================================================
// lib/validators/organization.schema.ts
// ============================================================

import { z } from 'zod'

export const BUSINESS_CATEGORIES = [
  { value: 'retail', label: 'Retail / Shop', emoji: '🛒', description: 'General merchandise, clothing, electronics, FMCG' },
  { value: 'wholesale', label: 'Wholesale / Distribution', emoji: '🏭', description: 'Bulk supply, dealer network, B2B distribution' },
  { value: 'services', label: 'Services / Consulting', emoji: '💼', description: 'Professional services, agencies, advisory' },
  { value: 'manufacturing', label: 'Manufacturing', emoji: '⚙️', description: 'Production, assembly, raw material processing' },
  { value: 'restaurant', label: 'Restaurant / F&B', emoji: '🍽️', description: 'Restaurant, café, cloud kitchen, catering' },
  { value: 'freelancer', label: 'Freelancer / Solo', emoji: '🧑‍💻', description: 'Independent contractors, solo practitioners' },
  { value: 'jewelry', label: 'Jewellery Store', emoji: '💍', description: 'Gold, silver, diamond jewellery, hallmarking' },
  { value: 'medical', label: 'Medical / Pharmacy', emoji: '💊', description: 'Pharmacy, clinic, medical supply, diagnostics' },
] as const

export type BusinessCategoryValue = typeof BUSINESS_CATEGORIES[number]['value']

export const organizationSetupSchema = z.object({
  business_category: z.enum(
    ['retail', 'wholesale', 'services', 'manufacturing', 'restaurant', 'freelancer', 'jewelry', 'medical'],
    { message: 'Please select a business category' }
  ),
  name: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Name is too long'),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Enter a valid GSTIN (e.g. 27AAPFU0939F1ZV)',
    )
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid PAN')
    .optional()
    .or(z.literal('')),
  state_code: z.string().optional(),
  address: z
    .object({
      line1: z.string().min(1, 'Address is required'),
      line2: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      pincode: z.string().regex(/^\d{6}$/, 'Enter a valid pincode'),
    })
    .optional(),
  invoice_prefix: z
    .string()
    .max(10)
    .regex(/^[A-Z0-9\-\/]+$/, 'Only uppercase letters, numbers, - and /')
    .default('INV'),
  financial_year_start: z.string().default('04-01'),
})

export const organizationSettingsSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(200),
  gstin: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  invoice_prefix: z.string().max(10).default('INV'),
  quotation_prefix: z.string().max(10).default('QUO'),
  default_payment_terms: z.number().min(0).max(365).default(30),
  default_gst_rate: z.number().default(18),
  timezone: z.string().default('Asia/Kolkata'),
  auto_send_invoices: z.boolean().default(false),
  low_stock_threshold: z.number().min(0).default(5),
})

export type OrganizationSetupFormValues = z.infer<typeof organizationSetupSchema>
export type OrganizationSettingsFormValues = z.infer<typeof organizationSettingsSchema>
