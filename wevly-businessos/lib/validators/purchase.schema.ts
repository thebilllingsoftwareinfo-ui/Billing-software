import { z } from 'zod';

export const purchaseBillStatusSchema = z.enum([
  'draft',
  'approved',
  'paid',
  'partial',
  'overdue',
]);

export type PurchaseBillStatus = z.infer<typeof purchaseBillStatusSchema>;

export const purchaseBillItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional().nullable(),
  unit_price_paise: z.number().int('Price must be in paise').nonnegative('Price cannot be negative'),
  discount_pct: z.number().min(0).max(100).default(0),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  gst_type: z.enum(['exclusive', 'inclusive']).default('exclusive'),
});

export type PurchaseBillItemInput = z.infer<typeof purchaseBillItemSchema>;

export const createPurchaseBillSchema = z.object({
  supplier_id: z.string().uuid('Supplier is required'),
  bill_number: z.string().min(1, 'Supplier invoice/bill number is required'),
  bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bill date must be YYYY-MM-DD'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseBillItemSchema).min(1, 'At least one line item is required'),
});

export type CreatePurchaseBillInput = z.infer<typeof createPurchaseBillSchema>;

export const updatePurchaseBillSchema = createPurchaseBillSchema.partial();
