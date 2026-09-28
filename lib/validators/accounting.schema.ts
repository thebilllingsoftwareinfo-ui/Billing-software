// ============================================================
// lib/validators/accounting.schema.ts
// Double-Entry Accounting Validation Schemas
// ============================================================

import { z } from 'zod';

export const accountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const balanceTypeSchema = z.enum(['DEBIT', 'CREDIT']);
export type BalanceType = z.infer<typeof balanceTypeSchema>;

export const createAccountSchema = z.object({
  account_code: z.string().min(1, 'Account code is required').max(20),
  account_name: z.string().min(1, 'Account name is required').max(100),
  account_type: accountTypeSchema,
  parent_account_id: z.string().uuid().optional().nullable(),
  opening_balance: z.number().min(0, 'Opening balance cannot be negative').default(0),
  opening_balance_type: balanceTypeSchema.default('DEBIT'),
  description: z.string().max(255).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type CreateAccountInput = z.input<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.input<typeof updateAccountSchema>;

export const journalLineSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  debit: z.number().min(0, 'Debit cannot be negative').default(0),
  credit: z.number().min(0, 'Credit cannot be negative').default(0),
  description: z.string().max(255).optional().nullable(),
}).refine(
  (data) => (data.debit > 0 && data.credit === 0) || (data.credit > 0 && data.debit === 0),
  { message: 'A journal line must have either debit or credit, but not both or neither' }
);

export type JournalLineInput = z.input<typeof journalLineSchema>;

export const createJournalEntrySchema = z.object({
  entry_number: z.string().optional().nullable(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required').max(500),
  source: z.string().default('manual'),
  lines: z.array(journalLineSchema).min(2, 'Journal entry must have at least 2 lines'),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + Math.round(l.debit * 100), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + Math.round(l.credit * 100), 0);
    return Math.abs(totalDebit - totalCredit) === 0;
  },
  { message: 'DOUBLE_ENTRY_UNBALANCED: Total debit must exactly equal total credit' }
);

export type CreateJournalEntryInput = z.input<typeof createJournalEntrySchema>;

export const reverseJournalEntrySchema = z.object({
  reversal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  reason: z.string().min(1, 'Reversal reason is required').max(500),
});

export type ReverseJournalEntryInput = z.infer<typeof reverseJournalEntrySchema>;

export const accountingSettingsSchema = z.object({
  financial_year_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  default_cash_account_id: z.string().uuid().optional().nullable(),
  default_bank_account_id: z.string().uuid().optional().nullable(),
  default_ar_account_id: z.string().uuid().optional().nullable(),
  default_ap_account_id: z.string().uuid().optional().nullable(),
  default_sales_account_id: z.string().uuid().optional().nullable(),
  default_purchase_account_id: z.string().uuid().optional().nullable(),
  auto_post_invoices: z.boolean().default(true),
  auto_post_purchases: z.boolean().default(true),
  auto_post_payments: z.boolean().default(true),
  auto_post_expenses: z.boolean().default(true),
});

export type AccountingSettingsInput = z.infer<typeof accountingSettingsSchema>;

export const openingBalanceLineSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  amount: z.number().min(0).optional(),
  type: z.enum(['DEBIT', 'CREDIT']).optional(),
}).transform((data) => {
  let debit = data.debit || 0;
  let credit = data.credit || 0;
  if (data.type === 'DEBIT' && data.amount !== undefined) {
    debit = data.amount;
  } else if (data.type === 'CREDIT' && data.amount !== undefined) {
    credit = data.amount;
  }
  return {
    account_id: data.account_id,
    debit,
    credit,
    amount: data.amount !== undefined ? data.amount : (debit || credit),
    type: (data.type || (debit >= credit ? 'DEBIT' : 'CREDIT')) as 'DEBIT' | 'CREDIT',
  };
});

export const setOpeningBalancesSchema = z.object({
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  balances: z.array(openingBalanceLineSchema).min(1, 'At least one account balance required'),
}).refine(
  (data) => {
    const totalDebit = data.balances.reduce((sum, b) => sum + Math.round(b.debit * 100), 0);
    const totalCredit = data.balances.reduce((sum, b) => sum + Math.round(b.credit * 100), 0);
    return totalDebit === totalCredit;
  },
  { message: 'UNBALANCED_OPENING_BALANCES: Total debit opening balances must equal total credit opening balances' }
);

export type SetOpeningBalancesInput = z.input<typeof setOpeningBalancesSchema>;
