// ============================================================
// lib/validators/organization.schema.ts
// ============================================================

import { z } from 'zod'

export const BUSINESS_STRUCTURE: Record<string, string[]> = {
  'Retail': [
    'Grocery/Kirana', 'Supermarket', 'Departmental Store', 'Clothing', 'Footwear', 
    'Mobile', 'Electronics', 'Electrical', 'Hardware', 'Furniture', 'Bookstore', 
    'Stationery', 'Optical', 'Jewellery', 'Pharmacy', 'Bakery', 'Sweet Shop', 'Ice Cream'
  ],
  'Food & Hospitality': [
    'Restaurant', 'Café', 'Hotel', 'Bar', 'Bakery', 'Catering', 'Cloud Kitchen'
  ],
  'Manufacturing': [
    'General Manufacturing', 'Food Manufacturing', 'Textile', 'Furniture', 'Pharmaceutical', 'Cosmetics'
  ],
  'Wholesale & Distribution': [
    'General Wholesale', 'FMCG Distributor', 'Pharmaceutical Distributor', 'Electrical Distributor', 'Hardware Distributor', 'Textile Distributor'
  ],
  'Services': [
    'Salon & Spa', 'Gym/Fitness', 'Photography', 'Repair Service', 'Consultancy', 'IT Services', 'Advertising', 'Architecture', 'Interior Design', 'Legal', 'Accounting/CA'
  ],
  'Healthcare': [
    'Pharmacy', 'Clinic', 'Hospital', 'Medical Distributor', 'Diagnostic Centre'
  ],
  'Automobile': [
    'Automobile Dealer', 'Auto Parts', 'Garage/Workshop', 'Car Wash'
  ],
  'Construction': [
    'Construction Contractor', 'Building Materials', 'Hardware', 'Electrical & Plumbing', 'Interior Works'
  ],
  'Transport & Logistics': [
    'Transport', 'Logistics', 'Courier', 'Fleet/Vehicle'
  ],
  'Other': [
    'Education', 'Printing', 'Agriculture', 'Dairy', 'Timber', 'Event Management', 'Other'
  ]
};

export const BUSINESS_CATEGORIES = []

export type BusinessCategoryValue = typeof BUSINESS_CATEGORIES[number]['value']

export function normalizeBusinessClassification(rawType?: string | null, rawCategory?: string | null): {
  business_type: string
  business_category: string
} {
  const cleanType = (rawType || '').trim()
  const cleanCat = (rawCategory || '').trim()

  // 1. Try matching category against BUSINESS_STRUCTURE
  if (cleanCat) {
    for (const [typeKey, cats] of Object.entries(BUSINESS_STRUCTURE)) {
      const matchedCat = cats.find(c => c.toLowerCase() === cleanCat.toLowerCase())
      if (matchedCat) {
        // If cleanType is also valid and is this type, or even if cleanType was empty/mismatched
        return {
          business_type: typeKey,
          business_category: matchedCat,
        }
      }
    }
  }

  // 2. Try matching type directly against BUSINESS_STRUCTURE keys
  if (cleanType) {
    const matchedTypeKey = Object.keys(BUSINESS_STRUCTURE).find(
      k => k.toLowerCase() === cleanType.toLowerCase()
    )
    if (matchedTypeKey) {
      const cats = BUSINESS_STRUCTURE[matchedTypeKey]
      const matchedCat = cleanCat ? cats.find(c => c.toLowerCase() === cleanCat.toLowerCase()) : undefined
      return {
        business_type: matchedTypeKey,
        business_category: matchedCat || cats[0] || '',
      }
    }

    // 3. Maybe cleanType is actually a category name (e.g. "Restaurant" passed as business_type)
    for (const [typeKey, cats] of Object.entries(BUSINESS_STRUCTURE)) {
      const matchedCat = cats.find(c => c.toLowerCase() === cleanType.toLowerCase())
      if (matchedCat) {
        return {
          business_type: typeKey,
          business_category: matchedCat,
        }
      }
    }
  }

  // 4. Default fallback
  return {
    business_type: 'Retail',
    business_category: 'Grocery/Kirana',
  }
}

export const organizationSetupSchema = z.object({
  business_category: z.string().min(1, 'Please select a business category'),
  business_type: z.string().optional(),
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
