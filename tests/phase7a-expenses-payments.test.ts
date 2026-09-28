// ============================================================
// tests/phase7a-expenses-payments.test.ts
// Phase 7A: Expense Management, Customer Payments, Supplier Payments & Outstanding Tracking
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExpenseService } from '../lib/services/expense.service'
import { PaymentService } from '../lib/services/payment.service'
import { PurchaseTransactionService } from '../lib/services/purchase-transaction.service'
import { AccountingService } from '../lib/services/accounting.service'
import { CashBankService } from '../lib/services/cash-bank.service'
import { requirePermission } from '../lib/auth/permissions'
import { AppSession } from '../lib/auth/session'

// ── In-Memory Database Simulator for Supabase ───────────────────
let mockDb: {
  expense_categories: any[]
  expenses: any[]
  customers: any[]
  customer_transactions: any[]
  invoices: any[]
  invoice_items: any[]
  payments: any[]
  payment_allocations: any[]
  suppliers: any[]
  supplier_transactions: any[]
  purchase_bills: any[]
  purchase_bill_items: any[]
  cash_bank_accounts: any[]
  cash_bank_transactions: any[]
  journal_entries: any[]
  journal_entry_lines: any[]
  accounts: any[]
  audit_logs: any[]
}

const ORG_A = '11111111-1111-4000-a000-000000000001'
const ORG_B = '22222222-2222-4000-a000-000000000002'

const sessionOrgA: AppSession = {
  user_id: 'user-a-01',
  role: 'owner',
  organization_id: ORG_A,
  user: { id: 'user-a-01', email: 'owner@org-a.com', full_name: 'Owner A', avatar_url: null },
  organization: { id: ORG_A, name: 'Org A Corp', gstin: null, logo_url: null, business_category: 'retail' },
  member: { id: 'mem-a-01', role: 'owner', status: 'active' },
}

const sessionOrgB: AppSession = {
  user_id: 'user-b-01',
  role: 'owner',
  organization_id: ORG_B,
  user: { id: 'user-b-01', email: 'owner@org-b.com', full_name: 'Owner B', avatar_url: null },
  organization: { id: ORG_B, name: 'Org B Corp', gstin: null, logo_url: null, business_category: 'retail' },
  member: { id: 'mem-b-01', role: 'owner', status: 'active' },
}

function resetMockDb() {
  mockDb = {
    expense_categories: [
      { id: 'cat-01', organization_id: ORG_A, name: 'Rent', category_type: 'operating' },
      { id: 'cat-02', organization_id: ORG_A, name: 'Electricity', category_type: 'operating' },
      { id: 'cat-03', organization_id: ORG_A, name: 'Bank Charges', category_type: 'other' },
      { id: 'cat-b-01', organization_id: ORG_B, name: 'Office Supplies', category_type: 'operating' },
    ],
    expenses: [],
    customers: [
      {
        id: 'cust-01',
        organization_id: ORG_A,
        name: 'Alpha Customer',
        phone: '9876543210',
        outstanding_balance: 10000,
        outstanding_paise: 1000000,
      },
      {
        id: 'cust-b-01',
        organization_id: ORG_B,
        name: 'Beta Customer',
        phone: '9876543211',
        outstanding_balance: 5000,
        outstanding_paise: 500000,
      },
    ],
    customer_transactions: [],
    invoices: [
      {
        id: 'inv-01',
        organization_id: ORG_A,
        invoice_number: 'INV-2026-001',
        customer_id: 'cust-01',
        invoice_date: '2026-09-01',
        due_date: '2026-09-15',
        total_amount: 10000,
        total: 10000,
        amount_paid: 0,
        paid: 0,
        balance_due: 10000,
        total_paise: 1000000,
        paid_paise: 0,
        balance_paise: 1000000,
        status: 'issued',
      },
    ],
    invoice_items: [],
    payments: [],
    payment_allocations: [],
    suppliers: [
      {
        id: 'supp-01',
        organization_id: ORG_A,
        name: 'Prime Supplier Ltd',
        phone: '9123456780',
        outstanding_balance: 20000,
        outstanding_paise: 2000000,
      },
      {
        id: 'supp-b-01',
        organization_id: ORG_B,
        name: 'Delta Supplier',
        phone: '9123456781',
        outstanding_balance: 15000,
        outstanding_paise: 1500000,
      },
    ],
    supplier_transactions: [],
    purchase_bills: [
      {
        id: 'bill-01',
        organization_id: ORG_A,
        bill_number: 'PB-2026-001',
        supplier_id: 'supp-01',
        bill_date: '2026-09-01',
        due_date: '2026-09-10',
        total_amount: 20000,
        amount_paid: 0,
        balance_due: 20000,
        paid_paise: 0,
        status: 'approved',
      },
    ],
    purchase_bill_items: [],
    cash_bank_accounts: [
      { id: 'cba-01', organization_id: ORG_A, account_type: 'cash', account_name: 'Main Cash Drawer', balance: 50000 },
      { id: 'cba-02', organization_id: ORG_A, account_type: 'bank', account_name: 'HDFC Current A/C', balance: 100000 },
    ],
    cash_bank_transactions: [],
    journal_entries: [],
    journal_entry_lines: [],
    accounts: [
      { id: 'acc-1010', organization_id: ORG_A, code: '1010', name: 'Cash on Hand', type: 'asset' },
      { id: 'acc-1020', organization_id: ORG_A, code: '1020', name: 'Bank Accounts', type: 'asset' },
      { id: 'acc-1040', organization_id: ORG_A, code: '1040', name: 'Accounts Receivable', type: 'asset' },
      { id: 'acc-2010', organization_id: ORG_A, code: '2010', name: 'Accounts Payable', type: 'liability' },
      { id: 'acc-5070', organization_id: ORG_A, code: '5070', name: 'Operating Expenses', type: 'expense' },
    ],
    audit_logs: [],
  }
}

// ── Supabase Admin Mock Engine ──────────────────────────────────
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    return {
      from: (table: string) => {
        let currentTable = (mockDb as any)[table] || []
        let filters: Array<(row: any) => boolean> = []
        let pendingUpdate: any = null
        let isSingle = false
        let pendingInserted: any = null

        const queryObj: any = {
          select: (fields = '*') => queryObj,
          eq: (column: string, value: any) => {
            filters.push((row) => row[column] === value)
            return queryObj
          },
          neq: (column: string, value: any) => {
            filters.push((row) => row[column] !== value)
            return queryObj
          },
          gte: (column: string, value: any) => {
            filters.push((row) => row[column] >= value)
            return queryObj
          },
          lte: (column: string, value: any) => {
            filters.push((row) => row[column] <= value)
            return queryObj
          },
          in: (column: string, values: any[]) => {
            filters.push((row) => values.includes(row[column]))
            return queryObj
          },
          not: (column: string, operator: string, value: any) => {
            return queryObj
          },
          order: (column: string, opts?: any) => queryObj,
          limit: (n: number) => queryObj,
          range: (from: number, to: number) => queryObj,
          single: () => {
            isSingle = true
            return queryObj
          },
          insert: (data: any | any[]) => {
            const rows = Array.isArray(data) ? data : [data]
            const inserted = rows.map((r) => {
              const row = {
                id: r.id || `${table}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                created_at: new Date().toISOString(),
                ...r,
              }
              currentTable.push(row)
              return row
            })
            pendingInserted = isSingle ? inserted[0] : (rows.length === 1 ? inserted[0] : inserted)
            return queryObj
          },
          update: (data: any) => {
            pendingUpdate = data
            return queryObj
          },
          delete: () => {
            return {
              eq: (col: string, val: any) => {
                const idx = currentTable.findIndex((r: any) => r[col] === val)
                if (idx !== -1) currentTable.splice(idx, 1)
                return Promise.resolve({ data: null, error: null })
              },
            }
          },
          then: (resolve: any) => {
            if (pendingInserted !== null) {
              const result = pendingInserted
              pendingInserted = null
              resolve({ data: result, error: null })
              return
            }

            let result = currentTable.filter((row: any) =>
              filters.every((f) => f(row))
            )

            // If an update was queued, apply it
            if (pendingUpdate) {
              result.forEach((row: any) => {
                Object.assign(row, pendingUpdate)
              })
              resolve({ data: isSingle ? result[0] : result, error: null })
              return
            }

            // Hydrate joins for customers / suppliers
            if (table === 'invoices') {
              result = result.map((inv: any) => ({
                ...inv,
                customers: mockDb.customers.find((c) => c.id === inv.customer_id),
              }))
            } else if (table === 'purchase_bills') {
              result = result.map((b: any) => ({
                ...b,
                suppliers: mockDb.suppliers.find((s) => s.id === b.supplier_id),
                purchase_bill_items: mockDb.purchase_bill_items.filter((it) => it.purchase_bill_id === b.id),
              }))
            } else if (table === 'expenses') {
              result = result.map((exp: any) => ({
                ...exp,
                expense_categories: mockDb.expense_categories.find((c) => c.id === exp.category_id),
              }))
            }

            if (isSingle) {
              resolve({ data: result[0] || null, error: result[0] ? null : { message: 'Not found' } })
            } else {
              resolve({ data: result, count: result.length, error: null })
            }
          },
        }

        return queryObj
      },
    }
  },
}))

describe('Phase 7A: Expense Management & Payments Test Suite', () => {
  beforeEach(() => {
    resetMockDb()
    vi.restoreAllMocks()
  })

  // ==============================================================
  // 1. EXPENSE MANAGEMENT
  // ==============================================================
  describe('PART A: Expense Management', () => {
    it('creates an operating expense with valid fields and defaults', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postExpenseAccounting').mockResolvedValue({} as any)

      const input = {
        category_id: 'cat-01',
        expense_date: '2026-09-25',
        amount: 25000,
        payment_method: 'bank',
        vendor_name: 'Property Landlord',
        reference_number: 'NEFT-RENT-001',
        description: 'September warehouse rent',
      }

      const res = await ExpenseService.createExpense(sessionOrgA, input)

      expect(res.id).toBeDefined()
      expect(res.amount_paise).toBe(2500000)
      expect(res.is_archived).toBe(false)
      expect(res.organization_id).toBe(ORG_A)

      // Verify persistence
      const saved = mockDb.expenses.find((e) => e.id === res.id)
      expect(saved).toBeDefined()
      expect(saved.amount_paise).toBe(2500000)
      expect(saved.category_id).toBe('cat-01')
    })

    it('rejects invalid or negative expense amount', async () => {
      const invalidInput = {
        category_id: 'cat-01',
        expense_date: '2026-09-25',
        amount: -500, // Invalid negative amount
        payment_method: 'cash',
      }

      await expect(
        ExpenseService.createExpense(sessionOrgA, invalidInput as any)
      ).rejects.toThrow()
    })

    it('records Cash/Bank OUT movement on expense creation', async () => {
      const cashBankSpy = vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({
        id: 'cb-txn-01',
        account_id: 'acc-1010',
        type: 'expense_out',
        amount: 1500,
        direction: 'out',
        description: 'Office Snacks',
      } as any)
      vi.spyOn(AccountingService, 'postExpenseAccounting').mockResolvedValue({} as any)

      await ExpenseService.createExpense(sessionOrgA, {
        category_id: 'cat-02',
        expense_date: '2026-09-25',
        amount: 1500,
        payment_method: 'cash',
        description: 'Office pantry',
      })

      expect(cashBankSpy).toHaveBeenCalled()
      const callArgs = cashBankSpy.mock.calls[0][1]
      expect(callArgs.transaction_type).toBe('expense_out')
      expect(callArgs.amount).toBe(1500)
      expect(callArgs.direction).toBe('out')
    })

    it('posts double-entry accounting (DR Expense 5070, CR Cash/Bank)', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      const accSpy = vi.spyOn(AccountingService, 'postExpenseAccounting').mockResolvedValue({
        entry_id: 'je-exp-01',
        posted: true,
      } as any)

      await ExpenseService.createExpense(sessionOrgA, {
        category_id: 'cat-02',
        expense_date: '2026-09-25',
        amount: 4200,
        payment_method: 'upi',
        vendor_name: 'State Power Board',
      })

      expect(accSpy).toHaveBeenCalled()
      const accArgs = accSpy.mock.calls[0][1]
      expect(accArgs.amount).toBe(4200)
    })

    it('cancels and reverses an expense with compensating Cash/Bank refund and journal reversal', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postExpenseAccounting').mockResolvedValue({} as any)

      // Create expense first
      const expense = await ExpenseService.createExpense(sessionOrgA, {
        category_id: 'cat-01',
        expense_date: '2026-09-25',
        amount: 3000,
        payment_method: 'cash',
        vendor_name: 'Cab Service',
      })

      const reverseEntrySpy = vi.spyOn(AccountingService, 'reverseJournalEntry').mockResolvedValue({} as any)

      // Add matching journal entry
      mockDb.journal_entries.push({
        id: 'je-travel-01',
        organization_id: ORG_A,
        reference_type: 'expense',
        reference_id: expense.id,
        status: 'POSTED',
      })

      const cancelRes = await ExpenseService.cancelExpense(
        sessionOrgA,
        expense.id,
        'Duplicate receipt uploaded in error'
      )

      expect(cancelRes.status).toBe('cancelled')
      expect(cancelRes.is_cancelled).toBe(true)

      // Status updated in DB
      const updated = mockDb.expenses.find((e) => e.id === expense.id)
      expect(updated.status).toBe('cancelled')

      // Accounting journal entry reversed
      expect(reverseEntrySpy).toHaveBeenCalledWith(
        sessionOrgA,
        'je-travel-01',
        expect.stringContaining('Duplicate receipt')
      )
    })

    it('enforces idempotency and prevents duplicate cancellation', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postExpenseAccounting').mockResolvedValue({} as any)

      const expense = await ExpenseService.createExpense(sessionOrgA, {
        category_id: 'cat-01',
        expense_date: '2026-09-25',
        amount: 1200,
        payment_method: 'cash',
      })

      await ExpenseService.cancelExpense(sessionOrgA, expense.id, 'First cancel')

      // Second attempt to cancel must throw
      await expect(
        ExpenseService.cancelExpense(sessionOrgA, expense.id, 'Second cancel attempt')
      ).rejects.toThrow(/already cancelled/i)
    })

    it('enforces strict tenant isolation on expense cancellation and view', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postExpenseAccounting').mockResolvedValue({} as any)

      // Create expense in Org A
      const expenseA = await ExpenseService.createExpense(sessionOrgA, {
        category_id: 'cat-01',
        expense_date: '2026-09-25',
        amount: 15000,
        payment_method: 'bank',
      })

      // Org B user attempts to cancel Org A expense
      await expect(
        ExpenseService.cancelExpense(sessionOrgB, expenseA.id, 'Malicious cancel')
      ).rejects.toThrow(/not found or unauthorized/i)

      // Org B user attempts to fetch Org A expense
      await expect(
        ExpenseService.getExpenseById(sessionOrgB, expenseA.id)
      ).rejects.toThrow(/not found/i)
    })

    it('enforces RBAC permissions on expense operations', () => {
      // sales role cannot create or cancel expenses
      expect(() => requirePermission('sales', 'expenses.create')).toThrow()
      expect(() => requirePermission('sales', 'expenses.cancel')).toThrow()

      // accountant and manager can create
      expect(() => requirePermission('accountant', 'expenses.create')).not.toThrow()
      expect(() => requirePermission('manager', 'expenses.create')).not.toThrow()

      // only owner/admin/manager can cancel
      expect(() => requirePermission('owner', 'expenses.cancel')).not.toThrow()
      expect(() => requirePermission('admin', 'expenses.cancel')).not.toThrow()
    })
  })

  // ==============================================================
  // 2. CUSTOMER PAYMENT / COLLECTION MANAGEMENT
  // ==============================================================
  describe('PART B: Customer Payments & Collections', () => {
    it('records a full customer payment and marks invoice as paid', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postCustomerPaymentAccounting').mockResolvedValue({} as any)

      const paymentInput = {
        customer_id: 'cust-01',
        payment_date: '2026-09-10',
        amount: 10000,
        payment_method: 'upi' as const,
        reference_number: 'UPI-CUST-FULL-01',
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 10000 }],
      }

      const res = await PaymentService.recordPayment(sessionOrgA, paymentInput)

      expect(res.payment_id).toBeDefined()
      expect(res.amount).toBe(10000)

      // Customer outstanding balance reduced to 0
      const customer = mockDb.customers.find((c) => c.id === 'cust-01')
      expect(customer.outstanding_balance).toBe(0)

      // Invoice status becomes paid
      const invoice = mockDb.invoices.find((i) => i.id === 'inv-01')
      expect(invoice.balance_due).toBe(0)
      expect(invoice.amount_paid).toBe(10000)
      expect(invoice.status).toBe('paid')

      // Customer transaction ledger entry posted with negative amount
      const ledgerEntry = mockDb.customer_transactions.find((tx) => tx.customer_id === 'cust-01')
      expect(ledgerEntry).toBeDefined()
      expect(ledgerEntry.amount).toBe(-10000)
    })

    it('records a partial payment and updates invoice status to partial', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postCustomerPaymentAccounting').mockResolvedValue({} as any)

      const paymentInput = {
        customer_id: 'cust-01',
        payment_date: '2026-09-05',
        amount: 4000,
        payment_method: 'cash' as const,
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 4000 }],
      }

      await PaymentService.recordPayment(sessionOrgA, paymentInput)

      const invoice = mockDb.invoices.find((i) => i.id === 'inv-01')
      expect(invoice.amount_paid).toBe(4000)
      expect(invoice.balance_due).toBe(6000)
      expect(invoice.status).toBe('partial')

      const customer = mockDb.customers.find((c) => c.id === 'cust-01')
      expect(customer.outstanding_balance).toBe(6000)
    })

    it('supports multiple sequential payments until full settlement', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postCustomerPaymentAccounting').mockResolvedValue({} as any)

      // Payment 1: 4,000
      await PaymentService.recordPayment(sessionOrgA, {
        customer_id: 'cust-01',
        payment_date: '2026-09-05',
        amount: 4000,
        payment_method: 'cash',
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 4000 }],
      })

      // Payment 2: 6,000
      await PaymentService.recordPayment(sessionOrgA, {
        customer_id: 'cust-01',
        payment_date: '2026-09-12',
        amount: 6000,
        payment_method: 'neft',
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 6000 }],
      })

      const invoice = mockDb.invoices.find((i) => i.id === 'inv-01')
      expect(invoice.amount_paid).toBe(10000)
      expect(invoice.balance_due).toBe(0)
      expect(invoice.status).toBe('paid')

      const customer = mockDb.customers.find((c) => c.id === 'cust-01')
      expect(customer.outstanding_balance).toBe(0)
    })

    it('rejects invoice over-allocation when payment exceeds balance due', async () => {
      const overPaymentInput = {
        customer_id: 'cust-01',
        payment_date: '2026-09-05',
        amount: 15000,
        payment_method: 'cash' as const,
        allow_overpayment: false,
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 15000 }], // 15,000 against 10,000 balance
      }

      await expect(
        PaymentService.recordPayment(sessionOrgA, overPaymentInput)
      ).rejects.toThrow(/exceeds invoice .* outstanding balance/i)
    })

    it('records CashBank IN transaction on customer payment', async () => {
      const cbSpy = vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postCustomerPaymentAccounting').mockResolvedValue({} as any)

      await PaymentService.recordPayment(sessionOrgA, {
        customer_id: 'cust-01',
        payment_date: '2026-09-10',
        amount: 5000,
        payment_method: 'neft',
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 5000 }],
      })

      expect(cbSpy).toHaveBeenCalled()
      const args = cbSpy.mock.calls[0][1]
      expect(args.direction).toBe('in')
      expect(args.amount).toBe(5000)
      expect(args.transaction_type).toBe('payment_in')
    })

    it('posts double-entry accounting (DR Cash/Bank, CR Accounts Receivable 1040)', async () => {
      vi.spyOn(CashBankService, 'recordTransaction').mockResolvedValue({} as any)
      const accSpy = vi.spyOn(AccountingService, 'postCustomerPaymentAccounting').mockResolvedValue({} as any)

      await PaymentService.recordPayment(sessionOrgA, {
        customer_id: 'cust-01',
        payment_date: '2026-09-10',
        amount: 5000,
        payment_method: 'upi',
        allocations: [{ invoice_id: 'inv-01', allocated_amount: 5000 }],
      })

      expect(accSpy).toHaveBeenCalled()
      const args = accSpy.mock.calls[0][1]
      expect(args.amount).toBe(5000)
      expect(args.payment_method).toBe('upi')
    })

    it('enforces tenant isolation on customer payments', async () => {
      // Org B user attempts to record payment on Org A customer & invoice
      await expect(
        PaymentService.recordPayment(sessionOrgB, {
          customer_id: 'cust-01', // Org A customer
          payment_date: '2026-09-10',
          amount: 5000,
          payment_method: 'cash',
          allocations: [{ invoice_id: 'inv-01', allocated_amount: 5000 }],
        })
      ).rejects.toThrow(/not found or unauthorized/i)
    })

    it('enforces RBAC permissions for customer payments', () => {
      expect(() => requirePermission('sales', 'customer_payments.view')).not.toThrow()
      expect(() => requirePermission('accountant', 'customer_payments.create')).not.toThrow()
      expect(() => requirePermission('owner', 'customer_payments.create')).not.toThrow()
    })
  })

  // ==============================================================
  // 3. SUPPLIER PAYMENT MANAGEMENT
  // ==============================================================
  describe('PART C: Supplier Payment Management', () => {
    it('records a full supplier payment against a purchase bill', async () => {
      vi.spyOn(CashBankService, 'recordMovement').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postSupplierPaymentAccounting').mockResolvedValue({} as any)

      const paymentInput = {
        supplier_id: 'supp-01',
        purchase_bill_id: 'bill-01',
        payment_date: '2026-09-10',
        amount: 20000,
        payment_method: 'bank' as const,
        reference_number: 'NEFT-SUPP-001',
        notes: 'Full payment for raw materials',
      }

      const res = await PurchaseTransactionService.recordSupplierPayment(sessionOrgA, paymentInput)

      expect(res.payment_id).toBeDefined()
      expect(res.amount).toBe(20000)

      // Bill status becomes paid
      const bill = mockDb.purchase_bills.find((b) => b.id === 'bill-01')
      expect(bill.status).toBe('paid')
      expect(bill.amount_paid).toBe(20000)
      expect(bill.balance_due).toBe(0)

      // Supplier outstanding reduced to 0
      const supplier = mockDb.suppliers.find((s) => s.id === 'supp-01')
      expect(supplier.outstanding_balance).toBe(0)

      // Supplier ledger posted with negative amount
      const tx = mockDb.supplier_transactions.find((t) => t.supplier_id === 'supp-01')
      expect(tx).toBeDefined()
      expect(tx.amount).toBe(-20000)
    })

    it('records a partial supplier payment and updates bill status to partial', async () => {
      vi.spyOn(CashBankService, 'recordMovement').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postSupplierPaymentAccounting').mockResolvedValue({} as any)

      const paymentInput = {
        supplier_id: 'supp-01',
        purchase_bill_id: 'bill-01',
        payment_date: '2026-09-05',
        amount: 8000,
        payment_method: 'bank' as const,
      }

      await PurchaseTransactionService.recordSupplierPayment(sessionOrgA, paymentInput)

      const bill = mockDb.purchase_bills.find((b) => b.id === 'bill-01')
      expect(bill.amount_paid).toBe(8000)
      expect(bill.balance_due).toBe(12000)
      expect(bill.status).toBe('partial')

      const supplier = mockDb.suppliers.find((s) => s.id === 'supp-01')
      expect(supplier.outstanding_balance).toBe(12000)
    })

    it('rejects overpayment exceeding purchase bill balance due', async () => {
      const overPaymentInput = {
        supplier_id: 'supp-01',
        purchase_bill_id: 'bill-01',
        payment_date: '2026-09-05',
        amount: 25000, // 25,000 exceeds 20,000 balance
        payment_method: 'bank' as const,
      }

      await expect(
        PurchaseTransactionService.recordSupplierPayment(sessionOrgA, overPaymentInput)
      ).rejects.toThrow(/OVERPAYMENT_NOT_ALLOWED/i)
    })

    it('records CashBank OUT transaction on supplier payment', async () => {
      const cbSpy = vi.spyOn(CashBankService, 'recordMovement').mockResolvedValue({} as any)
      vi.spyOn(AccountingService, 'postSupplierPaymentAccounting').mockResolvedValue({} as any)

      await PurchaseTransactionService.recordSupplierPayment(sessionOrgA, {
        supplier_id: 'supp-01',
        purchase_bill_id: 'bill-01',
        payment_date: '2026-09-08',
        amount: 10000,
        payment_method: 'bank',
      })

      expect(cbSpy).toHaveBeenCalled()
      const args = cbSpy.mock.calls[0][1]
      expect(args.direction).toBe('out')
      expect(args.amount).toBe(10000)
      expect(args.transaction_type).toBe('payment_out')
    })

    it('posts double-entry accounting (DR Accounts Payable 2010, CR Cash/Bank)', async () => {
      vi.spyOn(CashBankService, 'recordMovement').mockResolvedValue({} as any)
      const accSpy = vi.spyOn(AccountingService, 'postSupplierPaymentAccounting').mockResolvedValue({} as any)

      await PurchaseTransactionService.recordSupplierPayment(sessionOrgA, {
        supplier_id: 'supp-01',
        purchase_bill_id: 'bill-01',
        payment_date: '2026-09-08',
        amount: 10000,
        payment_method: 'cheque',
      })

      expect(accSpy).toHaveBeenCalled()
      const args = accSpy.mock.calls[0][1]
      expect(args.amount).toBe(10000)
      expect(args.payment_method).toBe('cheque')
    })

    it('enforces tenant isolation on supplier payments', async () => {
      // Org B user attempts to pay Org A's supplier bill
      await expect(
        PurchaseTransactionService.recordSupplierPayment(sessionOrgB, {
          supplier_id: 'supp-01',
          purchase_bill_id: 'bill-01',
          payment_date: '2026-09-08',
          amount: 5000,
          payment_method: 'bank',
        })
      ).rejects.toThrow(/not found or unauthorized/i)
    })

    it('enforces RBAC permissions on supplier payments', () => {
      expect(() => requirePermission('accountant', 'supplier_payments.create')).not.toThrow()
      expect(() => requirePermission('owner', 'supplier_payments.create')).not.toThrow()
      expect(() => requirePermission('sales', 'supplier_payments.create')).toThrow()
    })
  })

  // ==============================================================
  // 4. OUTSTANDING / DUE TRACKING & AGING
  // ==============================================================
  describe('PART D: Outstanding & Aging Analysis', () => {
    function computeAging(dueDateStr: string, balanceDue: number, asOfDateStr = '2026-09-25') {
      const today = new Date(asOfDateStr).getTime()
      const dueTime = new Date(dueDateStr).getTime()
      const diffDays = Math.floor((today - dueTime) / (1000 * 60 * 60 * 24))
      const isOverdue = diffDays > 0 && balanceDue > 0

      let agingCategory = 'current'
      if (isOverdue) {
        if (diffDays <= 30) agingCategory = '1_30'
        else if (diffDays <= 60) agingCategory = '31_60'
        else if (diffDays <= 90) agingCategory = '61_90'
        else agingCategory = '90_plus'
      }

      return { diffDays: Math.max(0, diffDays), isOverdue, agingCategory }
    }

    it('categorizes invoices not yet due as current', () => {
      const res = computeAging('2026-09-30', 5000, '2026-09-25')
      expect(res.isOverdue).toBe(false)
      expect(res.agingCategory).toBe('current')
      expect(res.diffDays).toBe(0)
    })

    it('categorizes invoices overdue by 10 days into 1-30 days bucket', () => {
      const res = computeAging('2026-09-15', 10000, '2026-09-25')
      expect(res.isOverdue).toBe(true)
      expect(res.diffDays).toBe(10)
      expect(res.agingCategory).toBe('1_30')
    })

    it('categorizes invoices overdue by 45 days into 31-60 days bucket', () => {
      const res = computeAging('2026-08-11', 8000, '2026-09-25')
      expect(res.isOverdue).toBe(true)
      expect(res.diffDays).toBe(45)
      expect(res.agingCategory).toBe('31_60')
    })

    it('categorizes invoices overdue by 75 days into 61-90 days bucket', () => {
      const res = computeAging('2026-07-12', 4000, '2026-09-25')
      expect(res.isOverdue).toBe(true)
      expect(res.diffDays).toBe(75)
      expect(res.agingCategory).toBe('61_90')
    })

    it('categorizes invoices overdue by 120 days into 90+ days bucket', () => {
      const res = computeAging('2026-05-28', 12000, '2026-09-25')
      expect(res.isOverdue).toBe(true)
      expect(res.diffDays).toBe(120)
      expect(res.agingCategory).toBe('90_plus')
    })

    it('marks fully settled invoices (balance = 0) as not overdue even if past due date', () => {
      const res = computeAging('2026-09-01', 0, '2026-09-25')
      expect(res.isOverdue).toBe(false)
      expect(res.agingCategory).toBe('current')
    })
  })
})
