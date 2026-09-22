import { z } from 'zod';

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

export const createExpenseSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expense date must be YYYY-MM-DD'),
  amount_paise: z.number().int('Amount must be in paise').positive('Amount must be greater than zero'),
  gst_paise: z.number().int().nonnegative().default(0),
  vendor_name: z.string().optional().nullable(),
  description: z.string().optional().nullable(), // Notes / description
  payment_method: z.string().default('cash'),
  reference_number: z.string().optional().nullable(),
  receipt_url: z.string().url('Invalid attachment URL').or(z.string().length(0)).optional().nullable(),
  items: z.array(z.any()).optional(),
  expense_number: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
