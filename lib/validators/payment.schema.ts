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
  invoice_id: z.string().uuid('Invalid invoice ID'),
  allocated_paise: z.number().int('Allocated amount must be an integer in paise').positive('Allocated amount must be positive'),
});

export type PaymentAllocationInput = z.infer<typeof paymentAllocationSchema>;

export const createPaymentSchema = z.object({
  customer_id: z.string().uuid('Customer is required'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
  amount_paise: z.number().int('Payment amount must be an integer in paise').positive('Payment amount must be greater than zero'),
  payment_method: paymentMethodSchema,
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  allow_overpayment: z.boolean().default(false),
  allocations: z.array(paymentAllocationSchema).min(1, 'At least one invoice allocation is required'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
