import { z } from 'zod';

// ============================================================
// Financial Period Schemas
// ============================================================
export const financialPeriodSchema = z.object({
  fiscal_year: z.string().min(4, 'Fiscal year is required (e.g. 2025-2026)'),
  period_name: z.string().min(2, 'Period name is required (e.g. April 2026)'),
  period_key: z.string().regex(/^\d{4}-\d{2}$/, 'Period key must be YYYY-MM format (e.g. 2026-04)'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  status: z.enum(['open', 'closed', 'locked']).default('open'),
});

export const closePeriodSchema = z.object({
  period_id: z.string().min(1, 'Period ID is required'),
});

export const reopenPeriodSchema = z.object({
  period_id: z.string().min(1, 'Period ID is required'),
  reason: z.string().min(5, 'A justifiable reason with at least 5 characters is required to reopen a closed financial period'),
});

export type FinancialPeriodInput = z.input<typeof financialPeriodSchema>;
export type ClosePeriodInput = z.input<typeof closePeriodSchema>;
export type ReopenPeriodInput = z.input<typeof reopenPeriodSchema>;

// ============================================================
// Cost Center Schemas
// ============================================================
export const costCenterSchema = z.object({
  code: z.string().min(1, 'Code is required').max(30),
  name: z.string().min(2, 'Name is required').max(100),
  type: z.enum(['cost_center', 'business_unit', 'branch', 'department', 'project']).default('cost_center'),
  is_active: z.boolean().default(true),
  description: z.string().optional().nullable(),
});

export type CostCenterInput = z.input<typeof costCenterSchema>;

// ============================================================
// Bank Reconciliation Schemas
// ============================================================
export const bankReconciliationSchema = z.object({
  account_id: z.string().min(1, 'Bank account ID is required'),
  statement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Statement date must be YYYY-MM-DD'),
  statement_balance: z.number(),
  notes: z.string().optional().nullable(),
});

export const matchTransactionSchema = z.object({
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  transaction_type: z.enum(['cash_bank_txn', 'journal_entry']).default('cash_bank_txn'),
  amount: z.number(),
  matched: z.boolean(),
});

export type BankReconciliationInput = z.input<typeof bankReconciliationSchema>;
export type MatchTransactionInput = z.input<typeof matchTransactionSchema>;

// ============================================================
// Tax Period Schemas
// ============================================================
export const taxPeriodSchema = z.object({
  period_key: z.string().min(4, 'Period key is required (e.g. 2026-09 or Q2-2026)'),
  period_type: z.enum(['monthly', 'quarterly']).default('monthly'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
});

export const finalizeTaxPeriodSchema = z.object({
  period_key: z.string().min(4, 'Period key is required'),
  notes: z.string().optional().nullable(),
});

export type TaxPeriodInput = z.input<typeof taxPeriodSchema>;
export type FinalizeTaxPeriodInput = z.input<typeof finalizeTaxPeriodSchema>;

// ============================================================
// Advanced Multi-Line Journal Schema
// ============================================================
export const journalLineSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
  cost_center_id: z.string().optional().nullable(),
}).refine(
  (data) => (data.debit > 0 && data.credit === 0) || (data.credit > 0 && data.debit === 0),
  { message: 'A line must have either debit > 0 OR credit > 0, not both' }
);

export const advancedJournalEntrySchema = z.object({
  entry_number: z.string().optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date must be YYYY-MM-DD'),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().optional().nullable(),
  description: z.string().min(3, 'Narration/description is required'),
  cost_center_id: z.string().optional().nullable(),
  status: z.enum(['draft', 'posted']).default('posted'),
  source: z.string().default('manual'),
  lines: z.array(journalLineSchema).min(2, 'A journal entry requires at least 2 lines (1 debit and 1 credit)'),
}).refine(
  (data) => {
    const totalDebit = Math.round(data.lines.reduce((s, l) => s + (l.debit || 0), 0) * 100);
    const totalCredit = Math.round(data.lines.reduce((s, l) => s + (l.credit || 0), 0) * 100);
    return totalDebit === totalCredit;
  },
  { message: 'Total Debit must exactly equal Total Credit for double-entry balance' }
);

export type AdvancedJournalEntryInput = z.infer<typeof advancedJournalEntrySchema>;
