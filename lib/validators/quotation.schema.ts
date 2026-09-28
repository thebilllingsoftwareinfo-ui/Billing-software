import { z } from 'zod';

export const quotationStatusSchema = z.enum([
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'converted',
]);

export type QuotationStatus = z.infer<typeof quotationStatusSchema>;

export const quotationItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional().nullable(),
  unit_price: z.number().nonnegative('Price cannot be negative').optional(),
  unit_price_paise: z.number().nonnegative('Price cannot be negative').optional(),
  discount_pct: z.number().min(0).max(100).default(0),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  gst_type: z.enum(['exclusive', 'inclusive']).default('exclusive'),
}).transform((val) => {
  const unitPrice = val.unit_price ?? (val.unit_price_paise !== undefined ? val.unit_price_paise / 100 : 0);
  return {
    ...val,
    unit_price: unitPrice,
    unit_price_paise: Math.round(unitPrice * 100),
  };
});

export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

export const createQuotationSchema = z.object({
  customer_id: z.string().uuid('Customer selection is required'),
  quotation_number: z.string().optional(),
  quotation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Quotation date must be YYYY-MM-DD'),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid until date must be YYYY-MM-DD').optional().nullable(),
  place_of_supply: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, 'At least one item line is required'),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const updateQuotationSchema = createQuotationSchema.partial();
