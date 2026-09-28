import { z } from 'zod';

// ============================================================
// Price Lists & Items
// ============================================================
export const priceListItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, 'Product ID is required'),
  unit: z.string().min(1).default('PCS'),
  min_quantity: z.number().min(0.0001, 'Min quantity must be greater than 0').default(1),
  max_quantity: z.number().min(0.0001).optional().nullable(),
  fixed_price: z.number().min(0).optional().nullable(),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  discount_amount: z.number().min(0).optional().default(0),
  is_active: z.boolean().default(true),
}).refine((data) => {
  if (data.max_quantity !== undefined && data.max_quantity !== null) {
    return data.max_quantity >= data.min_quantity;
  }
  return true;
}, {
  message: 'Max quantity must be greater than or equal to min quantity',
  path: ['max_quantity'],
});

export const priceListSchema = z.object({
  name: z.string().min(1, 'Price list name is required').max(100),
  code: z.string().min(1, 'Price list code is required').max(30).transform((v) => v.toUpperCase().trim()),
  description: z.string().max(255).optional().nullable(),
  currency: z.string().default('INR'),
  is_active: z.boolean().default(true),
  customer_group: z.string().max(50).optional().nullable(),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
  items: z.array(priceListItemSchema).optional().default([]),
});

export type PriceListInput = z.input<typeof priceListSchema>;
export type PriceListItemInput = z.input<typeof priceListItemSchema>;

// ============================================================
// Customer Special Price
// ============================================================
export const customerSpecialPriceSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
  product_id: z.string().min(1, 'Product ID is required'),
  custom_rate: z.number().min(0, 'Custom rate must be non-negative'),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  min_quantity: z.number().min(0.0001).default(1),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
});

export type CustomerSpecialPriceInput = z.input<typeof customerSpecialPriceSchema>;

// ============================================================
// Promotional Rules
// ============================================================
export const promotionalRuleSchema = z.object({
  name: z.string().min(1, 'Promotion name is required').max(100),
  code: z.string().min(1, 'Promotion code is required').max(30).transform((v) => v.toUpperCase().trim()),
  promo_type: z.enum(['buy_x_get_y', 'percentage_discount', 'fixed_discount', 'bundle_rate']),
  buy_product_id: z.string().optional().nullable(),
  buy_quantity: z.number().min(1).default(1),
  get_product_id: z.string().optional().nullable(),
  get_quantity: z.number().min(0).default(0),
  discount_value: z.number().min(0).default(0),
  min_order_amount: z.number().min(0).default(0),
  start_date: z.string({ message: 'Start date is required' }),
  end_date: z.string({ message: 'End date is required' }),
  max_usage_count: z.number().int().min(1).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type PromotionalRuleInput = z.input<typeof promotionalRuleSchema>;

// ============================================================
// Supplier Pricing
// ============================================================
export const supplierPricingSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier ID is required'),
  product_id: z.string().min(1, 'Product ID is required'),
  unit: z.string().min(1).default('PCS'),
  purchase_rate: z.number().min(0, 'Purchase rate must be non-negative'),
  min_quantity: z.number().min(0.0001).default(1),
  effective_from: z.string().optional().nullable(),
  effective_to: z.string().optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export type SupplierPricingInput = z.input<typeof supplierPricingSchema>;

// ============================================================
// Salespersons & Commissions
// ============================================================
export const salespersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(30).transform((v) => v.toUpperCase().trim()),
  staff_id: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  commission_rate: z.number().min(0).max(100).default(0),
  is_active: z.boolean().default(true),
});

export type SalespersonInput = z.input<typeof salespersonSchema>;

export const commissionStatusSchema = z.enum(['pending', 'approved', 'paid', 'reversed']);

// ============================================================
// Recurring Invoices
// ============================================================
export const recurringInvoiceItemSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(0.0001, 'Quantity must be positive'),
  unit_price: z.number().min(0),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  tax_rate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional().nullable(),
});

export const recurringInvoiceSchema = z.object({
  template_name: z.string().min(1, 'Template name is required').max(100),
  customer_id: z.string().min(1, 'Customer ID is required'),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  start_date: z.string({ message: 'Start date is required' }),
  end_date: z.string().optional().nullable(),
  payment_terms_days: z.number().int().min(0).default(0),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).default('active'),
  items: z.array(recurringInvoiceItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().max(500).optional().nullable(),
});

export type RecurringInvoiceInput = z.input<typeof recurringInvoiceSchema>;

// ============================================================
// Price Override & Resolution
// ============================================================
export const priceResolutionQuerySchema = z.object({
  customer_id: z.string().optional().nullable(),
  product_id: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(0.0001).default(1),
  unit: z.string().optional(),
  date: z.string().optional(),
});

export type PriceResolutionQuery = z.infer<typeof priceResolutionQuerySchema>;

export const priceOverrideSchema = z.object({
  product_id: z.string().min(1),
  original_rate: z.number().min(0),
  override_rate: z.number().min(0),
  reason: z.string().min(1, 'Override reason is required').max(255),
});

export type PriceOverrideInput = z.infer<typeof priceOverrideSchema>;
