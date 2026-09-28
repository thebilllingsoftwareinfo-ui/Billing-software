import { z } from 'zod';

export const purchaseBillStatusSchema = z.enum([
  'draft',
  'approved',
  'paid',
  'partial',
  'overdue',
  'cancelled',
]);

export type PurchaseBillStatus = z.infer<typeof purchaseBillStatusSchema>;

export const purchaseBillItemSchema = z.object({
  product_id: z.string().optional().nullable(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional().nullable(),
  unit_price: z.number().nonnegative('Price cannot be negative').optional(),
  unit_price_paise: z.number().nonnegative('Price cannot be negative').optional(),
  discount_pct: z.number().min(0).max(100).default(0),
  discount_amount: z.number().min(0).default(0).optional(),
  hsn_sac: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  gst_type: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  is_gst_inclusive: z.boolean().optional().default(false),
}).transform((val) => {
  const unitPrice = val.unit_price ?? (val.unit_price_paise !== undefined ? val.unit_price_paise / 100 : 0);
  const isInclusive = val.gst_type === 'inclusive' || Boolean(val.is_gst_inclusive);
  return {
    ...val,
    unit_price: unitPrice,
    unit_price_paise: Math.round(unitPrice * 100),
    is_gst_inclusive: isInclusive,
    gst_type: isInclusive ? ('inclusive' as const) : ('exclusive' as const),
    discount_amount: val.discount_amount || 0,
  };
});

export type PurchaseBillItemInput = z.infer<typeof purchaseBillItemSchema>;

export const createPurchaseBillSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  bill_number: z.string().min(1, 'Bill number cannot be empty').optional(),
  bill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bill date must be YYYY-MM-DD'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').optional().nullable(),
  place_of_supply: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseBillItemSchema).min(1, 'At least one line item is required'),
  // Optional upfront payment
  amount_paid: z.number().min(0).default(0).optional(),
  payment_method: z.enum(['cash', 'bank', 'upi', 'card', 'cheque', 'other']).optional(),
  payment_account_id: z.string().optional().nullable(),
});

export type CreatePurchaseBillInput = z.infer<typeof createPurchaseBillSchema>;

export const updatePurchaseBillSchema = createPurchaseBillSchema.partial();

export const createSupplierPaymentSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier ID is required'),
  purchase_bill_id: z.string().optional().nullable(),
  amount: z.number().positive('Payment amount must be greater than zero'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
  payment_method: z.enum(['cash', 'bank', 'upi', 'card', 'cheque', 'other']).default('cash'),
  payment_account_id: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>;
