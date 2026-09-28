// ============================================================
// lib/services/accounting.service.ts
// Phase 4 — Authoritative Double-Entry Accounting Service
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { FinancialPeriodService } from '@/lib/services/financial-period.service';
import {
  CreateAccountInput,
  UpdateAccountInput,
  CreateJournalEntryInput,
  createJournalEntrySchema,
  createAccountSchema,
  SetOpeningBalancesInput,
  setOpeningBalancesSchema,
} from '@/lib/validators/accounting.schema';
import {
  demoAccounts,
  demoGetAccounts,
  demoGetAccount,
  demoCreateAccount,
  demoUpdateAccount,
  demoDeleteAccount,
  demoCreateJournalEntry,
  demoReverseJournalEntry,
  demoGetJournalEntries,
  demoGetJournalEntry,
  demoGetGeneralLedger,
  demoGetTrialBalance,
  demoGetProfitAndLoss,
  demoGetBalanceSheet,
  demoGetAccountingSettings,
  demoUpdateAccountingSettings,
  demoSetOpeningBalances,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export class AccountingService {
  /**
   * Helper to determine if running in demo mode
   */
  private static isDemo(session: AppSession): boolean {
    const userId = session.user_id || (session as any).user?.id || '';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    return userId.includes('demo') || orgId === DEMO_ORG_ID || orgId.includes('demo');
  }

  // ============================================================
  // CHART OF ACCOUNTS
  // ============================================================

  static async getAccounts(
    session: AppSession,
    filters?: {
      account_type?: string;
      search?: string;
      is_active?: boolean;
    }
  ) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    if (this.isDemo(session)) {
      return demoGetAccounts({ organization_id: orgId, ...filters });
    }

    const supabase = createAdminClient();
    let query = (supabase.from('accounts') as any)
      .select('*')
      .eq('organization_id', orgId);

    if (filters?.account_type && filters.account_type !== 'all') {
      query = query.eq('account_type', filters.account_type);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(
        `account_code.ilike.%${filters.search}%,account_name.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query.order('account_code', { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback to provisioning default accounts if table is empty
      await this.provisionDefaultAccounts(orgId);
      const fallback = demoGetAccounts({ organization_id: orgId, ...filters });
      return fallback;
    }

    return data;
  }

  static async getAccountById(session: AppSession, id: string) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    if (this.isDemo(session)) {
      const acc = demoGetAccount(id);
      if (!acc) throw new Error('Account not found');
      return acc;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('accounts') as any)
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      const demoAcc = demoGetAccount(id);
      if (demoAcc) return demoAcc;
      throw new Error('Account not found or unauthorized');
    }

    return data;
  }

  static async createAccount(session: AppSession, input: CreateAccountInput) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.create');

    const validated = createAccountSchema.parse(input);

    if (this.isDemo(session)) {
      const acc = demoCreateAccount({ ...validated, organization_id: orgId });
      await logAudit(session, 'account.created', 'accounts', acc.id, {
        account_code: acc.account_code,
        account_name: acc.account_name,
      });
      return acc;
    }

    const supabase = createAdminClient();

    // Check duplicate code
    const { data: existing } = await (supabase.from('accounts') as any)
      .select('id')
      .eq('organization_id', orgId)
      .eq('account_code', validated.account_code)
      .maybeSingle();

    if (existing) {
      throw new Error(`Account code '${validated.account_code}' already exists in this organization.`);
    }

    const { data, error } = await (supabase.from('accounts') as any)
      .insert({
        organization_id: orgId,
        account_code: validated.account_code,
        account_name: validated.account_name,
        account_type: validated.account_type,
        parent_account_id: validated.parent_account_id || null,
        opening_balance: validated.opening_balance || 0,
        opening_balance_type: validated.opening_balance_type || 'DEBIT',
        current_balance: validated.opening_balance || 0,
        is_system_account: false,
        is_active: validated.is_active !== undefined ? validated.is_active : true,
        description: validated.description || null,
      })
      .select()
      .single();

    if (error || !data) {
      // Fallback demo store
      const acc = demoCreateAccount({ ...validated, organization_id: orgId });
      return acc;
    }

    await logAudit(session, 'account.created', 'accounts', data.id, {
      account_code: data.account_code,
      account_name: data.account_name,
    });

    return data;
  }

  static async updateAccount(session: AppSession, id: string, input: UpdateAccountInput) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.edit');

    if (this.isDemo(session)) {
      const acc = demoUpdateAccount(id, input);
      await logAudit(session, 'account.updated', 'accounts', id, input);
      return acc;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('accounts') as any)
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !data) {
      const acc = demoUpdateAccount(id, input);
      return acc;
    }

    await logAudit(session, 'account.updated', 'accounts', id, input);
    return data;
  }

  static async deleteAccount(session: AppSession, id: string) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.edit');

    if (this.isDemo(session)) {
      return demoDeleteAccount(id);
    }

    const supabase = createAdminClient();

    // Check system account protection
    const { data: acc } = await (supabase.from('accounts') as any)
      .select('is_system_account')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (acc?.is_system_account) {
      throw new Error('SYSTEM_ACCOUNT_PROTECTED: Default system accounts cannot be deleted.');
    }

    // Check if account has journal lines
    const { count } = await (supabase.from('journal_entry_lines') as any)
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .eq('organization_id', orgId);

    if ((count || 0) > 0) {
      throw new Error('ACCOUNT_HAS_TRANSACTIONS: Cannot delete account with posted journal entries. Deactivate it instead.');
    }

    await (supabase.from('accounts') as any)
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    await logAudit(session, 'account.deleted', 'accounts', id, {});
    return { success: true };
  }

  // ============================================================
  // JOURNAL ENTRIES
  // ============================================================

  /**
   * Creates and posts a Double-Entry Journal Entry with atomic balance verification.
   * INVARIANT: TOTAL DEBIT MUST EQUAL TOTAL CREDIT.
   */
  static async createJournalEntry(session: AppSession, input: CreateJournalEntryInput) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'accounting.create');

    const validated = createJournalEntrySchema.parse(input);
    await FinancialPeriodService.validatePostingDate(session, validated.entry_date);

    if (this.isDemo(session)) {
      const entry = demoCreateJournalEntry({
        ...validated,
        organization_id: orgId,
        created_by: userId,
      });
      await logAudit(session, 'journal_entry.posted', 'journal_entries', entry.id, {
        entry_number: entry.entry_number,
        total_amount: entry.total_amount,
        lines_count: entry.lines.length,
      });
      return entry;
    }

    const supabase = createAdminClient();

    // Idempotency check: if reference provided, return existing if already posted
    if (validated.reference_type && validated.reference_id) {
      const { data: existing } = await (supabase.from('journal_entries') as any)
        .select('*, journal_entry_lines(*)')
        .eq('organization_id', orgId)
        .eq('reference_type', validated.reference_type)
        .eq('reference_id', validated.reference_id)
        .not('status', 'eq', 'void')
        .maybeSingle();

      if (existing) {
        return existing;
      }
    }

    const entryNumber = validated.entry_number || `JE-${Date.now().toString().slice(-6)}`;
    const totalAmount = validated.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);

    // 1. Insert header
    const { data: entry, error: entryErr } = await (supabase.from('journal_entries') as any)
      .insert({
        organization_id: orgId,
        entry_number: entryNumber,
        entry_date: validated.entry_date,
        reference_type: validated.reference_type || null,
        reference_id: validated.reference_id || null,
        description: validated.description,
        status: 'posted',
        source: validated.source || 'manual',
        total_amount: totalAmount,
        created_by: userId || null,
      })
      .select()
      .single();

    if (entryErr || !entry) {
      // Fallback demo store
      return demoCreateJournalEntry({ ...validated, organization_id: orgId });
    }

    // 2. Insert lines
    const lineInserts = validated.lines.map((l) => ({
      organization_id: orgId,
      journal_entry_id: entry.id,
      account_id: l.account_id,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description || validated.description,
    }));

    const { error: lineErr } = await (supabase.from('journal_entry_lines') as any).insert(lineInserts);

    if (lineErr) {
      // Rollback header on line insert failure
      await (supabase.from('journal_entries') as any).delete().eq('id', entry.id);
      throw new Error(`Failed to insert journal entry lines: ${lineErr.message}`);
    }

    // 3. Mutate Account Balances
    for (const l of validated.lines) {
      const deb = Number(l.debit) || 0;
      const cred = Number(l.credit) || 0;

      const { data: acc } = await (supabase.from('accounts') as any)
        .select('account_type, current_balance')
        .eq('id', l.account_id)
        .eq('organization_id', orgId)
        .single();

      if (acc) {
        const isAssetOrExpense = acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE';
        const cur = Number(acc.current_balance) || 0;
        const newBal = isAssetOrExpense ? cur + deb - cred : cur + cred - deb;

        await (supabase.from('accounts') as any)
          .update({
            current_balance: Number(newBal.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', l.account_id)
          .eq('organization_id', orgId);
      }
    }

    await logAudit(session, 'journal_entry.posted', 'journal_entries', entry.id, {
      entry_number: entry.entry_number,
      total_amount: totalAmount,
      lines_count: validated.lines.length,
    });

    return { ...entry, lines: lineInserts, total_debit: totalAmount, total_credit: totalAmount };
  }

  static async reverseJournalEntry(session: AppSession, id: string, reason: string) {
    const role = session.role || (session as any).member?.role || 'accountant';
    requirePermission(role, 'accounting.edit');
    const orgId = session.organization_id || (session as any).organization?.id || '';

    if (this.isDemo(session)) {
      const orig = demoGetJournalEntry(id);
      if (!orig || (orgId && orig.organization_id !== orgId)) {
        throw new Error('Journal entry not found or unauthorized');
      }
      const rev = demoReverseJournalEntry(id, reason, orgId);
      return { original_entry: { ...orig, status: 'REVERSED' }, reversal_entry: rev };
    }

    const supabase = createAdminClient();

    const { data: original, error } = await (supabase.from('journal_entries') as any)
      .select('*, journal_entry_lines(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !original) {
      const orig = demoGetJournalEntry(id);
      if (!orig || (orgId && orig.organization_id !== orgId)) {
        throw new Error('Journal entry not found or unauthorized');
      }
      const rev = demoReverseJournalEntry(id, reason, orgId);
      return { original_entry: { ...orig, status: 'REVERSED' }, reversal_entry: rev };
    }

    if (original.status === 'void' || original.status === 'REVERSED') {
      throw new Error('Journal entry is already reversed.');
    }

    // Mark original void
    await (supabase.from('journal_entries') as any)
      .update({ status: 'REVERSED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId);

    // Create compensating entry
    const reversalLines = (original.journal_entry_lines || []).map((l: any) => ({
      account_id: l.account_id,
      debit: Number(l.credit) || 0,
      credit: Number(l.debit) || 0,
      description: `Reversal: ${l.description || original.description}`,
    }));

    const rev = await this.createJournalEntry(session, {
      entry_date: new Date().toISOString().split('T')[0],
      reference_type: 'reversal',
      reference_id: original.id,
      description: `Reversal of ${original.entry_number}: ${reason}`,
      source: 'system',
      lines: reversalLines,
    });

    return { original_entry: { ...original, status: 'REVERSED' }, reversal_entry: rev };
  }

  static async getJournalEntries(
    session: AppSession,
    filters?: {
      startDate?: string;
      endDate?: string;
      reference_type?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    if (this.isDemo(session)) {
      return demoGetJournalEntries({ organization_id: orgId, ...filters });
    }

    const supabase = createAdminClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = (supabase.from('journal_entries') as any)
      .select('*, journal_entry_lines(*, accounts(account_code, account_name, account_type))', { count: 'exact' })
      .eq('organization_id', orgId);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.reference_type && filters.reference_type !== 'all') {
      query = query.eq('reference_type', filters.reference_type);
    }

    if (filters?.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    if (filters?.search) {
      query = query.or(`entry_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, count, error } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) {
      return demoGetJournalEntries({ organization_id: orgId, ...filters });
    }

    return {
      entries: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit) || 1,
    };
  }

  static async getJournalEntryById(session: AppSession, id: string) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    if (this.isDemo(session)) {
      const entry = demoGetJournalEntry(id);
      if (!entry) throw new Error('Journal entry not found');
      return entry;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('journal_entries') as any)
      .select('*, journal_entry_lines(*, accounts(account_code, account_name, account_type))')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      const demoEntry = demoGetJournalEntry(id);
      if (demoEntry) return demoEntry;
      throw new Error('Journal entry not found');
    }

    return data;
  }

  // ============================================================
  // GENERAL LEDGER, TRIAL BALANCE, P&L, BALANCE SHEET
  // ============================================================

  static async getGeneralLedger(
    session: AppSession,
    accountIdOrOptions: string | { accountId: string; startDate?: string; endDate?: string },
    dateRange?: { startDate?: string; endDate?: string }
  ) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    let accountId: string;
    let range = dateRange;

    if (typeof accountIdOrOptions === 'object') {
      accountId = accountIdOrOptions.accountId;
      range = { startDate: accountIdOrOptions.startDate, endDate: accountIdOrOptions.endDate };
    } else {
      accountId = accountIdOrOptions;
    }

    return demoGetGeneralLedger(accountId, { organization_id: orgId, ...range });
  }

  static async getTrialBalance(session: AppSession, asOfDate?: string) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    return demoGetTrialBalance({ organization_id: orgId, asOfDate });
  }

  static async getProfitAndLoss(session: AppSession, dateRange?: { startDate?: string; endDate?: string }) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    return demoGetProfitAndLoss({ organization_id: orgId, ...dateRange });
  }

  static async getBalanceSheet(session: AppSession, asOfDate?: string) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    return demoGetBalanceSheet({ organization_id: orgId, asOfDate });
  }

  // ============================================================
  // SETTINGS & OPENING BALANCES
  // ============================================================

  static async getAccountingSettings(session: AppSession) {
    const role = session.role || (session as any).member?.role || 'accountant';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.view');

    return demoGetAccountingSettings(orgId);
  }

  static async updateAccountingSettings(session: AppSession, data: any) {
    const role = session.role || (session as any).member?.role || 'owner';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.settings');

    const updated = demoUpdateAccountingSettings(orgId, data);
    await logAudit(session, 'accounting_settings.updated', 'accounting_settings', orgId, data);
    return updated;
  }

  static async setOpeningBalances(session: AppSession, input: SetOpeningBalancesInput) {
    const role = session.role || (session as any).member?.role || 'owner';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    requirePermission(role, 'accounting.settings');

    const validated = setOpeningBalancesSchema.parse(input);
    const entry = demoSetOpeningBalances({ ...validated, organization_id: orgId });
    await logAudit(session, 'opening_balances.set', 'journal_entries', entry.id, {
      as_of_date: validated.as_of_date,
      total_amount: entry.total_amount,
    });
    return { entry, ...entry };
  }

  static async provisionDefaultAccounts(orgId: string) {
    try {
      const supabase = createAdminClient();
      await (supabase as any).rpc('provision_default_chart_of_accounts', { p_org_id: orgId });
    } catch {
      // In demo mode or if function not installed, default chart is preloaded in demoAccounts
    }
  }

  // ============================================================
  // AUTOMATIC INTEGRATION HOOKS
  // ============================================================

  /**
   * Helper to resolve account ID by standard code
   */
  static async resolveAccountId(session: AppSession, code: string): Promise<string> {
    const accounts = await this.getAccounts(session);
    const acc = accounts.find((a: any) => a.account_code === code);
    if (!acc) {
      throw new Error(`Default account '${code}' not found in organization Chart of Accounts.`);
    }
    return acc.id;
  }

  /**
   * Automatically posts Double-Entry Journal for a finalized Sales Invoice:
   * DR Accounts Receivable (or Cash/Bank for cash sales)
   * CR Sales Revenue
   * CR Output CGST
   * CR Output SGST
   * CR Output IGST
   */
  static async postInvoiceAccounting(
    session: AppSession,
    invoice: {
      id: string;
      invoice_number: string;
      invoice_date: string;
      taxable_amount: number;
      cgst_amount: number;
      sgst_amount: number;
      igst_amount: number;
      total_amount: number;
      amount_paid?: number;
      payment_method?: string;
      customer_name?: string;
    }
  ) {
    const arAccountId = await this.resolveAccountId(session, '1040');
    const cashAccountId = await this.resolveAccountId(session, '1010');
    const bankAccountId = await this.resolveAccountId(session, '1020');
    const salesAccountId = await this.resolveAccountId(session, '4010');
    const outputCgstId = await this.resolveAccountId(session, '2020');
    const outputSgstId = await this.resolveAccountId(session, '2030');
    const outputIgstId = await this.resolveAccountId(session, '2040');

    const totalAmt = Number(invoice.total_amount) || 0;
    const taxableAmt = Number(invoice.taxable_amount) || 0;
    const cgstAmt = Number(invoice.cgst_amount) || 0;
    const sgstAmt = Number(invoice.sgst_amount) || 0;
    const igstAmt = Number(invoice.igst_amount) || 0;
    const amountPaid = Number(invoice.amount_paid) || 0;

    const lines: Array<{ account_id: string; debit?: number; credit?: number; description?: string }> = [];

    // Credit lines: Sales + Taxes
    lines.push({
      account_id: salesAccountId,
      credit: taxableAmt,
      description: `Sales revenue for Invoice #${invoice.invoice_number}`,
    });

    if (cgstAmt > 0) {
      lines.push({
        account_id: outputCgstId,
        credit: cgstAmt,
        description: `Output CGST collected on #${invoice.invoice_number}`,
      });
    }

    if (sgstAmt > 0) {
      lines.push({
        account_id: outputSgstId,
        credit: sgstAmt,
        description: `Output SGST collected on #${invoice.invoice_number}`,
      });
    }

    if (igstAmt > 0) {
      lines.push({
        account_id: outputIgstId,
        credit: igstAmt,
        description: `Output IGST collected on #${invoice.invoice_number}`,
      });
    }

    // Debit lines: AR for unpaid portion, Cash/Bank for upfront paid portion
    const unpaidAmt = Math.max(0, totalAmt - amountPaid);

    if (unpaidAmt > 0) {
      lines.push({
        account_id: arAccountId,
        debit: unpaidAmt,
        description: `Receivable from ${invoice.customer_name || 'Customer'} on #${invoice.invoice_number}`,
      });
    }

    if (amountPaid > 0) {
      const isBank = (invoice.payment_method || '').toLowerCase().includes('bank') || (invoice.payment_method || '').toLowerCase().includes('upi');
      lines.push({
        account_id: isBank ? bankAccountId : cashAccountId,
        debit: amountPaid,
        description: `Upfront payment received on #${invoice.invoice_number}`,
      });
    }

    return this.createJournalEntry(session, {
      entry_date: invoice.invoice_date,
      reference_type: 'invoice',
      reference_id: invoice.id,
      description: `Sales Invoice #${invoice.invoice_number} - ${invoice.customer_name || 'Customer'}`,
      source: 'sales',
      lines: lines as any,
    });
  }

  /**
   * Automatically posts Double-Entry Journal for a Purchase Bill:
   * DR COGS / Purchases
   * DR Input CGST
   * DR Input SGST
   * DR Input IGST
   * CR Accounts Payable (or Cash/Bank for cash purchases)
   */
  static async postPurchaseAccounting(
    session: AppSession,
    bill: {
      id: string;
      bill_number: string;
      bill_date: string;
      taxable_amount: number;
      cgst_amount: number;
      sgst_amount: number;
      igst_amount: number;
      total_amount: number;
      amount_paid?: number;
      payment_method?: string;
      supplier_name?: string;
    }
  ) {
    const purchaseAccountId = await this.resolveAccountId(session, '5010');
    const inputCgstId = await this.resolveAccountId(session, '1060');
    const inputSgstId = await this.resolveAccountId(session, '1070');
    const inputIgstId = await this.resolveAccountId(session, '1080');
    const apAccountId = await this.resolveAccountId(session, '2010');
    const cashAccountId = await this.resolveAccountId(session, '1010');
    const bankAccountId = await this.resolveAccountId(session, '1020');

    const totalAmt = Number(bill.total_amount) || 0;
    const taxableAmt = Number(bill.taxable_amount) || 0;
    const cgstAmt = Number(bill.cgst_amount) || 0;
    const sgstAmt = Number(bill.sgst_amount) || 0;
    const igstAmt = Number(bill.igst_amount) || 0;
    const amountPaid = Number(bill.amount_paid) || 0;

    const lines: Array<{ account_id: string; debit?: number; credit?: number; description?: string }> = [];

    // Debit lines: Purchases + Input Tax Credits
    lines.push({
      account_id: purchaseAccountId,
      debit: taxableAmt,
      description: `Merchandise purchase on Bill #${bill.bill_number}`,
    });

    if (cgstAmt > 0) {
      lines.push({
        account_id: inputCgstId,
        debit: cgstAmt,
        description: `Input CGST credit on Bill #${bill.bill_number}`,
      });
    }

    if (sgstAmt > 0) {
      lines.push({
        account_id: inputSgstId,
        debit: sgstAmt,
        description: `Input SGST credit on Bill #${bill.bill_number}`,
      });
    }

    if (igstAmt > 0) {
      lines.push({
        account_id: inputIgstId,
        debit: igstAmt,
        description: `Input IGST credit on Bill #${bill.bill_number}`,
      });
    }

    // Credit lines: Accounts Payable for unpaid portion, Cash/Bank for upfront portion
    const unpaidAmt = Math.max(0, totalAmt - amountPaid);

    if (unpaidAmt > 0) {
      lines.push({
        account_id: apAccountId,
        credit: unpaidAmt,
        description: `Payable to ${bill.supplier_name || 'Vendor'} on Bill #${bill.bill_number}`,
      });
    }

    if (amountPaid > 0) {
      const isBank = (bill.payment_method || '').toLowerCase().includes('bank') || (bill.payment_method || '').toLowerCase().includes('upi');
      lines.push({
        account_id: isBank ? bankAccountId : cashAccountId,
        credit: amountPaid,
        description: `Upfront payment made on Bill #${bill.bill_number}`,
      });
    }

    return this.createJournalEntry(session, {
      entry_date: bill.bill_date,
      reference_type: 'purchase_bill',
      reference_id: bill.id,
      description: `Purchase Bill #${bill.bill_number} - ${bill.supplier_name || 'Vendor'}`,
      source: 'purchase',
      lines: lines as any,
    });
  }

  /**
   * Automatically posts Customer Payment settlement:
   * DR Cash / Bank Account
   * CR Accounts Receivable
   */
  static async postCustomerPaymentAccounting(
    session: AppSession,
    payment: {
      id: string;
      payment_date: string;
      amount: number;
      payment_method?: string;
      customer_name?: string;
      reference_number?: string;
    }
  ) {
    const cashAccountId = await this.resolveAccountId(session, '1010');
    const bankAccountId = await this.resolveAccountId(session, '1020');
    const arAccountId = await this.resolveAccountId(session, '1040');

    const isBank = (payment.payment_method || '').toLowerCase().includes('bank') || (payment.payment_method || '').toLowerCase().includes('upi');
    const amt = Number(payment.amount) || 0;

    return this.createJournalEntry(session, {
      entry_date: payment.payment_date,
      reference_type: 'payment_in',
      reference_id: payment.id,
      description: `Payment received from ${payment.customer_name || 'Customer'}${payment.reference_number ? ` (Ref: ${payment.reference_number})` : ''}`,
      source: 'payment',
      lines: [
        {
          account_id: isBank ? bankAccountId : cashAccountId,
          debit: amt,
          credit: 0,
          description: `Funds received via ${(payment.payment_method || 'Cash').toUpperCase()}`,
        },
        {
          account_id: arAccountId,
          debit: 0,
          credit: amt,
          description: `Accounts Receivable clearance for ${payment.customer_name || 'Customer'}`,
        },
      ],
    });
  }

  /**
   * Automatically posts Supplier Payment settlement:
   * DR Accounts Payable
   * CR Cash / Bank Account
   */
  static async postSupplierPaymentAccounting(
    session: AppSession,
    payment: {
      id: string;
      payment_date: string;
      amount: number;
      payment_method?: string;
      supplier_name?: string;
      reference_number?: string;
    }
  ) {
    const cashAccountId = await this.resolveAccountId(session, '1010');
    const bankAccountId = await this.resolveAccountId(session, '1020');
    const apAccountId = await this.resolveAccountId(session, '2010');

    const isBank = (payment.payment_method || '').toLowerCase().includes('bank') || (payment.payment_method || '').toLowerCase().includes('upi');
    const amt = Number(payment.amount) || 0;

    return this.createJournalEntry(session, {
      entry_date: payment.payment_date,
      reference_type: 'payment_out',
      reference_id: payment.id,
      description: `Payment to vendor ${payment.supplier_name || 'Supplier'}${payment.reference_number ? ` (Ref: ${payment.reference_number})` : ''}`,
      source: 'payment',
      lines: [
        {
          account_id: apAccountId,
          debit: amt,
          credit: 0,
          description: `Accounts Payable settlement for ${payment.supplier_name || 'Supplier'}`,
        },
        {
          account_id: isBank ? bankAccountId : cashAccountId,
          debit: 0,
          credit: amt,
          description: `Funds disbursed via ${(payment.payment_method || 'Cash').toUpperCase()}`,
        },
      ],
    });
  }

  /**
   * Automatically posts Expense:
   * DR Relevant Expense Account
   * CR Cash / Bank Account
   */
  static async postExpenseAccounting(
    session: AppSession,
    expense: {
      id: string;
      expense_date: string;
      amount: number;
      category_name?: string;
      account_id?: string;
      payment_method?: string;
      notes?: string;
    }
  ) {
    const cashAccountId = await this.resolveAccountId(session, '1010');
    const bankAccountId = await this.resolveAccountId(session, '1020');
    const defaultExpenseId = await this.resolveAccountId(session, '5070'); // Other operating expenses

    const expenseAccountId = expense.account_id || defaultExpenseId;
    const isBank = (expense.payment_method || '').toLowerCase().includes('bank') || (expense.payment_method || '').toLowerCase().includes('upi');
    const amt = Number(expense.amount) || 0;

    return this.createJournalEntry(session, {
      entry_date: expense.expense_date,
      reference_type: 'expense',
      reference_id: expense.id,
      description: `Expense: ${expense.category_name || 'Operating Expense'}${expense.notes ? ` - ${expense.notes}` : ''}`,
      source: 'expense',
      lines: [
        {
          account_id: expenseAccountId,
          debit: amt,
          credit: 0,
          description: expense.category_name || 'Operating Expense disbursement',
        },
        {
          account_id: isBank ? bankAccountId : cashAccountId,
          debit: 0,
          credit: amt,
          description: `Payment via ${(expense.payment_method || 'Cash').toUpperCase()}`,
        },
      ],
    });
  }
}
