import { z } from 'zod';

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

export const baseExpenseSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD'),
  amount: z.number().positive('Amount must be greater than zero').optional(),
  amount_paise: z.number().positive('Amount must be greater than zero').optional(),
  gst_amount: z.number().nonnegative().optional(),
  gst_paise: z.number().nonnegative().optional(),
  vendor_name: z.string().optional().nullable(),
  description: z.string().optional().nullable(), // Notes / description
  payment_method: z.string().default('cash'),
  reference_number: z.string().optional().nullable(),
  receipt_url: z.string().url('Invalid attachment URL').or(z.string().length(0)).optional().nullable(),
  items: z.array(z.any()).optional(),
  expense_number: z.string().optional(),
});

export const createExpenseSchema = baseExpenseSchema.transform((val) => {
  const amt = val.amount ?? (val.amount_paise !== undefined ? val.amount_paise / 100 : 0);
  const gst = val.gst_amount ?? (val.gst_paise !== undefined ? val.gst_paise / 100 : 0);
  return {
    ...val,
    amount: amt,
    amount_paise: Math.round(amt * 100),
    gst_amount: gst,
    gst_paise: Math.round(gst * 100),
  };
});

export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type CreateExpenseOutput = z.output<typeof createExpenseSchema>;

export const updateExpenseSchema = baseExpenseSchema.partial().transform((val) => {
  const amt = val.amount ?? (val.amount_paise !== undefined ? val.amount_paise / 100 : undefined);
  const gst = val.gst_amount ?? (val.gst_paise !== undefined ? val.gst_paise / 100 : undefined);
  return {
    ...val,
    ...(amt !== undefined && { amount: amt, amount_paise: Math.round(amt * 100) }),
    ...(gst !== undefined && { gst_amount: gst, gst_paise: Math.round(gst * 100) }),
  };
});
