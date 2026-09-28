// ============================================================================
// lib/services/cash-bank.service.ts — Phase 2 Cash & Bank Financial Ledger Engine
//
// Manages:
//   - Cash & Bank Accounts (Cash in Hand, Bank Accounts, UPI/Wallets)
//   - Directional Financial Transactions (in: receipts, out: disbursements)
//   - Balance Integrity: current_balance = opening_balance + total_in - total_out
//   - Tenant isolation & Audit Logging
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/services/audit.service'
import {
  demoGetCashBankAccounts,
  demoCreateCashBankAccount,
  demoRecordCashBankTransaction,
  demoGetCashBankTransactions,
  demoGetCashBankSummary,
} from '@/lib/services/demo-store'

export interface CashBankAccount {
  id: string
  organization_id: string
  account_name: string
  account_type: 'cash' | 'bank' | 'upi' | 'wallet'
  bank_name?: string | null
  account_number?: string | null
  ifsc_code?: string | null
  upi_id?: string | null
  opening_balance: number
  current_balance: number
  is_default: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CashBankTransaction {
  id: string
  organization_id: string
  account_id: string
  transaction_type: 'payment_in' | 'payment_out' | 'expense_out' | 'transfer' | 'opening_balance' | 'adjustment'
  direction: 'in' | 'out'
  amount: number
  running_balance: number
  transaction_date: string
  reference_type?: string | null
  reference_id?: string | null
  reference_number?: string | null
  payment_mode: string
  narration?: string | null
  created_by?: string | null
  created_at?: string
  account?: CashBankAccount | null
}

export interface RecordCashBankTxnInput {
  account_id?: string
  direction: 'in' | 'out'
  amount: number
  transaction_type: 'payment_in' | 'payment_out' | 'expense_out' | 'transfer' | 'opening_balance' | 'adjustment'
  transaction_date?: string
  reference_type?: string
  reference_id?: string
  reference_number?: string
  payment_mode?: string
  narration?: string
}

export class CashBankService {
  /**
   * Retrieves all cash and bank accounts for the organization.
   * Auto-provisions default Cash in Hand and Primary Bank Account if none exist.
   */
  static async getAccounts(session: any): Promise<CashBankAccount[]> {
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    const role = session.role || (session as any).member?.role || 'sales'
    requirePermission(role, 'reports.view')

    if (userId.includes('demo')) {
      return demoGetCashBankAccounts()
    }

    const supabase = createAdminClient()
    const { data: accounts, error } = await (supabase.from('cash_bank_accounts') as any)
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error || !accounts || accounts.length === 0) {
      // Provision defaults if not present
      await this.ensureDefaultAccounts(orgId)
      const { data: refreshed } = await (supabase.from('cash_bank_accounts') as any)
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
      return (refreshed || []) as CashBankAccount[]
    }

    return accounts as CashBankAccount[]
  }

  /**
   * Creates a new Cash, Bank, or UPI account.
   */
  static async createAccount(
    session: any,
    data: {
      account_name: string
      account_type: 'cash' | 'bank' | 'upi' | 'wallet'
      bank_name?: string
      account_number?: string
      ifsc_code?: string
      upi_id?: string
      opening_balance?: number
      is_default?: boolean
    }
  ): Promise<CashBankAccount> {
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    const role = session.role || (session as any).member?.role || 'owner'
    requirePermission(role, 'settings.edit')

    const openingBal = Number(data.opening_balance) || 0

    if (userId.includes('demo')) {
      return demoCreateCashBankAccount({
        ...data,
        organization_id: orgId,
        opening_balance: openingBal,
      })
    }

    const supabase = createAdminClient()

    if (data.is_default) {
      // Unmark any existing default of this type
      await (supabase.from('cash_bank_accounts') as any)
        .update({ is_default: false })
        .eq('organization_id', orgId)
        .eq('account_type', data.account_type)
    }

    const { data: created, error } = await (supabase.from('cash_bank_accounts') as any)
      .insert({
        organization_id: orgId,
        account_name: data.account_name,
        account_type: data.account_type,
        bank_name: data.bank_name || null,
        account_number: data.account_number || null,
        ifsc_code: data.ifsc_code || null,
        upi_id: data.upi_id || null,
        opening_balance: openingBal,
        current_balance: openingBal,
        is_default: Boolean(data.is_default),
        is_active: true,
      })
      .select()
      .single()

    if (error || !created) {
      throw new Error(`Failed to create cash/bank account: ${error?.message}`)
    }

    // If opening balance > 0, post an opening transaction
    if (openingBal > 0) {
      await (supabase.from('cash_bank_transactions') as any).insert({
        organization_id: orgId,
        account_id: created.id,
        transaction_type: 'opening_balance',
        direction: 'in',
        amount: openingBal,
        running_balance: openingBal,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_mode: data.account_type === 'cash' ? 'cash' : 'bank_transfer',
        narration: 'Opening balance record',
        created_by: userId,
      })
    }

    await logAudit({
      organization_id: orgId,
      user_id: userId,
      action: 'created',
      resource_type: 'settings',
      resource_id: created.id,
      new_values: { account_name: data.account_name, opening_balance: openingBal },
    })

    return created as CashBankAccount
  }

  /**
   * Resolves the appropriate default account based on payment mode.
   * - 'cash' -> Default Cash in Hand account
   * - 'bank_transfer', 'upi', 'card', 'cheque', 'neft', 'rtgs' -> Default Bank account
   */
  static async resolveAccountForMode(
    session: any,
    paymentMode: string = 'cash',
    explicitAccountId?: string
  ): Promise<CashBankAccount> {
    const accounts = await this.getAccounts(session)

    if (explicitAccountId) {
      const found = accounts.find((a) => a.id === explicitAccountId)
      if (found) return found
    }

    const normalizedMode = (paymentMode || 'cash').toLowerCase().trim()
    const targetType = normalizedMode === 'cash' ? 'cash' : 'bank'

    // Look for default account of target type
    const defaultAcc = accounts.find((a) => a.account_type === targetType && a.is_default)
    if (defaultAcc) return defaultAcc

    // Fallback: any account of target type
    const anyOfType = accounts.find((a) => a.account_type === targetType)
    if (anyOfType) return anyOfType

    // Ultimate fallback: first available account
    if (accounts.length > 0) return accounts[0]

    throw new Error('No cash or bank accounts available for transaction')
  }

  /**
   * Records an append-only cash/bank financial transaction and updates the account balance atomically.
   */
  static async recordTransaction(
    session: any,
    input: RecordCashBankTxnInput
  ): Promise<CashBankTransaction> {
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    const amount = Number(input.amount) || 0

    if (amount <= 0) {
      throw new Error('Transaction amount must be strictly greater than zero')
    }

    if (userId.includes('demo')) {
      return demoRecordCashBankTransaction({
        ...input,
        organization_id: orgId,
        user_id: userId,
      })
    }

    const targetAccount = await this.resolveAccountForMode(session, input.payment_mode, input.account_id)
    const supabase = createAdminClient()

    // Fetch latest balance
    const { data: latestAcc, error: accErr } = await (supabase.from('cash_bank_accounts') as any)
      .select('current_balance')
      .eq('id', targetAccount.id)
      .eq('organization_id', orgId)
      .single()

    if (accErr || !latestAcc) {
      throw new Error(`Account ${targetAccount.id} not found in organization`)
    }

    const currentBalance = Number(latestAcc.current_balance) || 0
    const newBalance =
      input.direction === 'in'
        ? currentBalance + amount
        : currentBalance - amount

    const txnDate = input.transaction_date || new Date().toISOString().split('T')[0]

    // 1. Insert Transaction Record
    const { data: rawTxn, error: txnErr } = await (supabase.from('cash_bank_transactions') as any)
      .insert({
        organization_id: orgId,
        account_id: targetAccount.id,
        transaction_type: input.transaction_type,
        direction: input.direction,
        amount,
        running_balance: newBalance,
        transaction_date: txnDate,
        reference_type: input.reference_type || null,
        reference_id: input.reference_id || null,
        reference_number: input.reference_number || null,
        payment_mode: input.payment_mode || 'cash',
        narration: input.narration || null,
        created_by: userId,
      })
      .select()
      .single()

    if (txnErr || !rawTxn) {
      throw new Error(`Failed to record cash/bank transaction: ${txnErr?.message}`)
    }

    // 2. Update Account Current Balance
    await (supabase.from('cash_bank_accounts') as any)
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetAccount.id)

    return {
      ...rawTxn,
      account: targetAccount,
    } as CashBankTransaction
  }

  /**
   * Fetches paginated transaction ledger for account.
   */
  static async getTransactions(
    session: any,
    options?: {
      account_id?: string
      direction?: 'in' | 'out'
      startDate?: string
      endDate?: string
      page?: number
      limit?: number
    }
  ): Promise<{ transactions: CashBankTransaction[]; total: number }> {
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    const { account_id, direction, startDate, endDate, page = 1, limit = 20 } = options || {}

    if (userId.includes('demo')) {
      return demoGetCashBankTransactions(options)
    }

    const supabase = createAdminClient()
    let query = (supabase.from('cash_bank_transactions') as any)
      .select('*, cash_bank_accounts(*)', { count: 'exact' })
      .eq('organization_id', orgId)

    if (account_id) {
      query = query.eq('account_id', account_id)
    }

    if (direction) {
      query = query.eq('direction', direction)
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate)
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate)
    }

    const offset = (page - 1) * limit
    query = query.order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      throw new Error(`Failed to fetch cash/bank transactions: ${error.message}`)
    }

    return {
      transactions: (data || []) as CashBankTransaction[],
      total: count || 0,
    }
  }

  /**
   * Calculates overall cash balance, bank balance, and total liquid funds.
   */
  static async getCashBankSummary(session: any): Promise<{
    cash_balance: number
    bank_balance: number
    total_balance: number
    accounts_count: number
  }> {
    const userId = session.user_id || (session as any).user?.id || ''
    if (userId.includes('demo')) {
      return demoGetCashBankSummary()
    }

    const accounts = await this.getAccounts(session)
    let cashBalance = 0
    let bankBalance = 0

    accounts.forEach((acc) => {
      const bal = Number(acc.current_balance) || 0
      if (acc.account_type === 'cash') {
        cashBalance += bal
      } else {
        bankBalance += bal
      }
    })

    return {
      cash_balance: cashBalance,
      bank_balance: bankBalance,
      total_balance: cashBalance + bankBalance,
      accounts_count: accounts.length,
    }
  }

  private static async ensureDefaultAccounts(orgId: string): Promise<void> {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    const { data: cashExists } = await (supabase.from('cash_bank_accounts') as any)
      .select('id')
      .eq('organization_id', orgId)
      .eq('account_type', 'cash')
      .limit(1)

    if (!cashExists || cashExists.length === 0) {
      await (supabase.from('cash_bank_accounts') as any).insert({
        organization_id: orgId,
        account_name: 'Cash in Hand',
        account_type: 'cash',
        opening_balance: 0,
        current_balance: 0,
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    }

    const { data: bankExists } = await (supabase.from('cash_bank_accounts') as any)
      .select('id')
      .eq('organization_id', orgId)
      .eq('account_type', 'bank')
      .limit(1)

    if (!bankExists || bankExists.length === 0) {
      await (supabase.from('cash_bank_accounts') as any).insert({
        organization_id: orgId,
        account_name: 'Primary Bank Account',
        account_type: 'bank',
        bank_name: 'General Bank',
        opening_balance: 0,
        current_balance: 0,
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    }
  }

  static async recordMovement(
    session: any,
    input: RecordCashBankTxnInput
  ): Promise<CashBankTransaction> {
    return this.recordTransaction(session, input)
  }
}
