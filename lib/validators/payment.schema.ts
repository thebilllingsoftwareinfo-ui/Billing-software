import { z } from 'zod';

export const paymentMethodSchema = z.enum([
  'cash',
  'upi',
  'neft',
  'rtgs',
  'cheque',
  'card',
  'other',
]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentAllocationSchema = z.object({
  invoice_id: z.string().min(1, 'Invalid invoice ID'),
  allocated_amount: z.number().positive('Allocated amount must be positive').optional(),
  allocated_paise: z.number().positive('Allocated amount must be positive').optional(),
}).transform((val) => {
  const amt = val.allocated_amount ?? (val.allocated_paise !== undefined ? val.allocated_paise / 100 : 0);
  return {
    invoice_id: val.invoice_id,
    allocated_amount: amt,
    allocated_paise: Math.round(amt * 100),
  };
}).refine((val) => val.allocated_amount > 0, {
  message: 'Allocated amount must be positive',
});

export type PaymentAllocationInput = z.input<typeof paymentAllocationSchema>;
export type PaymentAllocationOutput = z.output<typeof paymentAllocationSchema>;

export const createPaymentSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD').optional().default(() => new Date().toISOString().split('T')[0]),
  amount: z.number().positive('Payment amount must be greater than zero').optional(),
  amount_paise: z.number().positive('Payment amount must be greater than zero').optional(),
  payment_method: paymentMethodSchema,
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  allow_overpayment: z.boolean().default(false),
  allocations: z.array(paymentAllocationSchema).min(1, 'At least one invoice allocation is required'),
}).transform((val) => {
  const amt = val.amount ?? (val.amount_paise !== undefined ? val.amount_paise / 100 : 0);
  return {
    ...val,
    amount: amt,
    amount_paise: Math.round(amt * 100),
  };
}).refine((val) => val.amount > 0, {
  message: 'Payment amount must be greater than zero',
});

export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type CreatePaymentOutput = z.output<typeof createPaymentSchema>;
