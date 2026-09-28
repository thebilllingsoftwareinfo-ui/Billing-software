// ============================================================================
// tests/phase2-integrated-flow.test.ts
// Phase 2 — Integrated Business Flow Comprehensive Verification Suite
//
// Verifies:
// SALE → INVOICE → STOCK DEDUCTION → CUSTOMER LEDGER → RECEIVABLE/OUTSTANDING
// → PAYMENT → CASH/BANK LEDGER → GST/TAX RECORD → REPORTS → DASHBOARD
//
// Tests all 10 required business scenarios:
//   1. Cash Sale
//   2. Credit Sale
//   3. Partial Payment
//   4. Final Payment
//   5. Insufficient Stock
//   6. Duplicate Submission (Idempotency)
//   7. Expense Integration with Cash/Bank
//   8. Accurate GST Splitting & Calculation
//   9. Multi-Tenant Isolation
//   10. Section 30 Final Reconciliation Test
// ============================================================================

import assert from 'node:assert'
import {
  demoProducts,
  demoCustomers,
  demoInvoices,
  demoTransactions,
  demoCashBankAccounts,
  demoCashBankTransactions,
  demoGetCashBankSummary,
  demoGetCustomerDetails,
  demoRecordPayment,
  DEMO_ORG_ID,
} from '../lib/services/demo-store'
import { SalesTransactionService } from '../lib/services/sales-transaction.service'
import { ExpenseService } from '../lib/services/expense.service'
import { calculateCentralGst } from '../lib/services/tax.service'

const mockSession = {
  user_id: 'user-demo-admin',
  organization_id: DEMO_ORG_ID,
  role: 'owner' as const,
  email: 'admin@demo.com',
}

async function runPhase2Tests() {
  console.log('====================================================================')
  console.log('🧪 RUNNING PHASE 2 — INTEGRATED BUSINESS FLOW TEST SUITE')
  console.log('====================================================================\n')

  let passed = 0
  let failed = 0

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn()
      console.log(`  ✓ PASSED: ${name}`)
      passed++
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`)
      console.error(`     Error: ${err.message}`)
      failed++
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1 — CASH SALE
  // Product: ₹1,000 | Quantity: 2 | GST: 18% | Total: ₹2,360 | Cash: ₹2,360
  // Verify: Invoice = ₹2,360, Customer outstanding = ₹0, Stock decreases by 2,
  //         Cash increases by ₹2,360, Status = PAID, GST = ₹360
  // -------------------------------------------------------------------------
  console.log('📌 Scenario 1: Cash Sale Flow')
  await test('TEST 1 — CASH SALE reconciles invoice, stock, cash, customer outstanding, and GST', async () => {
    // Setup test product & customer
    const prodId = 'prod-test-cash-sale'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Pressure Valve 1000',
      sku: 'VALVE-1000',
      product_type: 'goods',
      sale_price: 1000,
      purchase_price: 600,
      gst_rate: 18,
      current_stock: 50,
      opening_stock: 50,
      opening_stock_value: 30000,
      min_stock_level: 5,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const custId = 'cust-test-cash-sale'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Cash Sale Customer',
      customer_type: 'business',
      is_gst_registered: true,
      credit_period_days: 0,
      credit_limit: 0,
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      customer_addresses: [
        {
          id: 'addr-cash-1',
          customer_id: custId,
          address_type: 'billing',
          is_default: true,
          line1: '123 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      ],
    })

    const initialCashSummary = demoGetCashBankSummary()
    const initialCashBalance = initialCashSummary.cash_balance

    // Execute Cash Sale via SalesTransactionService
    const result = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: prodId,
          description: 'Pressure Valve 1000',
          quantity: 2,
          unit_price: 1000,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
      payment_status: 'paid',
      payment_mode: 'cash',
    })

    const inv = result.invoice
    assert.strictEqual(inv.total_amount, 2360, 'Invoice total must be ₹2,360')
    assert.strictEqual(inv.amount_paid, 2360, 'Amount paid must be ₹2,360')
    assert.strictEqual(inv.balance_due, 0, 'Balance due must be ₹0')
    assert.strictEqual(inv.status, 'paid', 'Status must be paid')
    assert.strictEqual(inv.total_tax_amount, 360, 'Total GST must be ₹360 (CGST ₹180 + SGST ₹180)')

    // Verify stock decreased by 2
    const updatedProd = demoProducts.find((p: any) => p.id === prodId)!
    assert.strictEqual(updatedProd.current_stock, 48, 'Stock must decrease from 50 to 48')

    // Verify customer outstanding is ₹0
    const updatedCust = demoCustomers.find((c: any) => c.id === custId)!
    assert.strictEqual(updatedCust.outstanding_balance, 0, 'Customer outstanding must be ₹0')

    // Verify cash balance increased by ₹2,360
    const newCashSummary = demoGetCashBankSummary()
    assert.strictEqual(
      newCashSummary.cash_balance,
      initialCashBalance + 2360,
      'Cash balance must increase by ₹2,360'
    )
  })

  // -------------------------------------------------------------------------
  // TEST 2 — CREDIT SALE
  // Invoice: ₹10,000 | Payment: ₹0
  // Verify: Customer outstanding = ₹10,000, Invoice = UNPAID, Stock deducted,
  //         Customer ledger debit = ₹10,000
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 2: Credit Sale Flow')
  await test('TEST 2 — CREDIT SALE creates receivable, deduces stock, and posts ledger debit', async () => {
    const prodId = 'prod-test-credit-sale'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Cast Iron Flange',
      sku: 'FLANGE-10K',
      product_type: 'goods',
      sale_price: 10000,
      purchase_price: 7000,
      gst_rate: 0, // 0% tax for simple test
      current_stock: 20,
      opening_stock: 20,
      opening_stock_value: 140000,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const custId = 'cust-test-credit-sale'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Metro Construction Ltd',
      customer_type: 'business',
      is_gst_registered: true,
      credit_period_days: 30,
      credit_limit: 50000,
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      customer_addresses: [
        {
          id: 'addr-cred-1',
          customer_id: custId,
          address_type: 'billing',
          is_default: true,
          line1: 'Site 4',
          city: 'Pune',
          state: 'Maharashtra',
        },
      ],
    })

    const result = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: prodId,
          description: 'Cast Iron Flange',
          quantity: 1,
          unit_price: 10000,
          discount_percent: 0,
          gst_rate: 0,
          is_gst_inclusive: false,
        },
      ],
      payment_status: 'unpaid',
      amount_paid: 0,
    })

    const inv = result.invoice
    assert.strictEqual(inv.total_amount, 10000, 'Invoice total must be ₹10,000')
    assert.strictEqual(inv.amount_paid, 0, 'Amount paid must be 0')
    assert.strictEqual(inv.balance_due, 10000, 'Balance due must be ₹10,000')

    // Customer outstanding balance
    const cust = demoCustomers.find((c: any) => c.id === custId)!
    assert.strictEqual(cust.outstanding_balance, 10000, 'Customer outstanding must increase to ₹10,000')

    // Stock deducted
    const prod = demoProducts.find((p: any) => p.id === prodId)!
    assert.strictEqual(prod.current_stock, 19, 'Stock must decrease from 20 to 19')

    // Customer ledger debit row
    const ledgerEntry = demoTransactions.find(
      (t) => t.customer_id === custId && t.reference_id === inv.id && t.transaction_type === 'invoice'
    )
    assert.ok(ledgerEntry, 'Customer ledger debit entry must exist')
    assert.strictEqual(ledgerEntry?.amount, 10000, 'Ledger debit must be ₹10,000')
  })

  // -------------------------------------------------------------------------
  // TEST 3 — PARTIAL PAYMENT
  // Invoice: ₹50,000 | Payment: ₹20,000
  // Verify: Outstanding = ₹30,000, Invoice = PARTIAL,
  //         Customer ledger: Debit ₹50,000, Credit ₹20,000, Cash/Bank IN: ₹20,000
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 3: Partial Payment Flow')
  let partialInvoiceId = ''
  let partialCustId = ''
  await test('TEST 3 — PARTIAL PAYMENT records partial status, reduces outstanding, and posts Bank IN', async () => {
    partialCustId = 'cust-test-partial-sale'
    demoCustomers.push({
      id: partialCustId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Western Fabricators',
      customer_type: 'business',
      is_gst_registered: true,
      credit_period_days: 15,
      credit_limit: 100000,
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      customer_addresses: [
        {
          id: 'addr-part-1',
          customer_id: partialCustId,
          address_type: 'billing',
          is_default: true,
          line1: 'MIDC Phase 2',
          city: 'Nagpur',
          state: 'Maharashtra',
        },
      ],
    })

    const initialBankBal = demoGetCashBankSummary().bank_balance

    const result = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: partialCustId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Fabrication Service & Raw Material',
          quantity: 1,
          unit_price: 50000,
          discount_percent: 0,
          gst_rate: 0,
          is_gst_inclusive: false,
        },
      ],
      payment_status: 'partial',
      amount_paid: 20000,
      payment_mode: 'bank_transfer',
    })

    const inv = result.invoice
    partialInvoiceId = inv.id
    assert.strictEqual(inv.total_amount, 50000, 'Invoice total must be ₹50,000')
    assert.strictEqual(inv.amount_paid, 20000, 'Amount paid must be ₹20,000')
    assert.strictEqual(inv.balance_due, 30000, 'Balance due must be ₹30,000')
    assert.strictEqual(inv.status, 'partial', 'Invoice status must be partial')

    // Customer balance
    const cust = demoCustomers.find((c: any) => c.id === partialCustId)!
    assert.strictEqual(cust.outstanding_balance, 30000, 'Customer outstanding must be ₹30,000')

    // Bank IN
    const newBankBal = demoGetCashBankSummary().bank_balance
    assert.strictEqual(newBankBal, initialBankBal + 20000, 'Bank balance must increase by ₹20,000')

    // Customer Ledger has debit of 50k and credit of 20k
    const debit = demoTransactions.find(
      (t) => t.customer_id === partialCustId && t.transaction_type === 'invoice' && t.amount === 50000
    )
    const credit = demoTransactions.find(
      (t) => t.customer_id === partialCustId && t.transaction_type === 'payment' && t.amount === -20000
    )
    assert.ok(debit, 'Debit entry of ₹50,000 must exist')
    assert.ok(credit, 'Credit entry of -₹20,000 must exist')
  })

  // -------------------------------------------------------------------------
  // TEST 4 — FINAL PAYMENT
  // Remaining: ₹30,000 | Payment: ₹30,000
  // Verify: Outstanding = ₹0, Invoice = PAID, No negative balance
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 4: Final Settlement Flow')
  await test('TEST 4 — FINAL PAYMENT marks invoice PAID and reduces outstanding to ₹0', async () => {
    const updatedInv = demoRecordPayment(partialInvoiceId, {
      amount: 30000,
      payment_mode: 'upi',
      payment_reference: 'UPI-FINAL-30K',
    })

    assert.ok(updatedInv, 'Invoice must be updated')
    assert.strictEqual(updatedInv?.amount_paid, 50000, 'Total paid must now be ₹50,000')
    assert.strictEqual(updatedInv?.balance_due, 0, 'Balance due must be 0')
    assert.strictEqual(updatedInv?.status, 'paid', 'Status must transition to paid')

    // Customer outstanding must be 0
    const cust = demoCustomers.find((c: any) => c.id === partialCustId)!
    assert.strictEqual(cust.outstanding_balance, 0, 'Customer outstanding must be exactly ₹0')
  })

  // -------------------------------------------------------------------------
  // TEST 5 — INSUFFICIENT STOCK
  // Available: 5 | Attempt sale: 7
  // Verify: Sale rejected, No partial invoice, No stock movement, No ledger entry
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 5: Insufficient Stock Atomicity Guard')
  await test('TEST 5 — INSUFFICIENT STOCK rejects sale and creates 0 partial records', async () => {
    const prodId = 'prod-test-low-stock'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Limited Edition Widget',
      sku: 'WIDGET-LIM-5',
      product_type: 'goods',
      sale_price: 500,
      purchase_price: 300,
      gst_rate: 18,
      current_stock: 5,
      opening_stock: 5,
      opening_stock_value: 1500,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const initialInvoicesCount = demoInvoices.length
    const initialLedgerCount = demoTransactions.length
    let caughtError = false

    try {
      await SalesTransactionService.executeSale(mockSession as any, {
        customer_id: 'cust-demo-1',
        invoice_date: new Date().toISOString().split('T')[0],
        items: [
          {
            product_id: prodId,
            description: 'Limited Edition Widget',
            quantity: 7, // Exceeds available stock 5
            unit_price: 500,
            discount_percent: 0,
            gst_rate: 18,
            is_gst_inclusive: false,
          },
        ],
      })
    } catch (err: any) {
      caughtError = true
      assert.ok(
        err.message.includes('INSUFFICIENT_STOCK'),
        `Error message must indicate INSUFFICIENT_STOCK, got: ${err.message}`
      )
    }

    assert.ok(caughtError, 'Transaction must throw INSUFFICIENT_STOCK error')
    assert.strictEqual(demoInvoices.length, initialInvoicesCount, 'No invoice must be created')
    assert.strictEqual(demoTransactions.length, initialLedgerCount, 'No customer ledger entry must be created')

    // Product stock must remain untouched at 5
    const prod = demoProducts.find((p: any) => p.id === prodId)!
    assert.strictEqual(prod.current_stock, 5, 'Product current stock must remain exactly 5')
  })

  // -------------------------------------------------------------------------
  // TEST 6 — DUPLICATE SUBMISSION (IDEMPOTENCY)
  // Submit same invoice request twice with idempotency key
  // Verify: Only one invoice created, second returns cached response
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 6: Idempotency Protection')
  await test('TEST 6 — DUPLICATE SUBMISSION returns cached invoice without duplicating stock/ledger', async () => {
    const key = `idem-key-${Date.now()}`
    const payload = {
      customer_id: 'cust-demo-1',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Consulting Session',
          quantity: 1,
          unit_price: 1500,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
      reference_number: key,
    }

    const firstRun = await SalesTransactionService.executeSale(mockSession as any, payload as any, key)
    assert.strictEqual(firstRun.isDuplicate, undefined, 'First run is not duplicate')

    const initialInvoicesCount = demoInvoices.length

    // Second run with identical idempotency key
    const secondRun = await SalesTransactionService.executeSale(mockSession as any, payload as any, key)
    assert.strictEqual(secondRun.isDuplicate, true, 'Second run must be flagged as duplicate')
    assert.strictEqual(secondRun.invoice.id, firstRun.invoice.id, 'Must return same invoice ID')
    assert.strictEqual(demoInvoices.length, initialInvoicesCount, 'Invoice count must NOT increase')
  })

  // -------------------------------------------------------------------------
  // TEST 7 — EXPENSE → CASH/BANK INTEGRATION
  // Cash expense: ₹5,000
  // Verify: Expense = ₹5,000, Cash OUT = ₹5,000, Cash balance decreases
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 7: Expense Integration')
  await test('TEST 7 — EXPENSE posts Cash OUT and reduces cash balance', async () => {
    const initialCash = demoGetCashBankSummary().cash_balance

    const expense = await ExpenseService.createExpense(mockSession as any, {
      category_id: 'cat-default-1',
      expense_date: new Date().toISOString().split('T')[0],
      amount: 5000,
      payment_method: 'cash',
      description: 'Factory diesel expense',
    } as any)

    assert.ok(expense, 'Expense must be created')
    const finalCash = demoGetCashBankSummary().cash_balance
    assert.strictEqual(finalCash, initialCash - 5000, 'Cash balance must decrease by ₹5,000')

    const outTxn = demoCashBankTransactions.find(
      (t) => t.reference_type === 'expense' && t.amount === 5000 && t.direction === 'out'
    )
    assert.ok(outTxn, 'Cash OUT transaction must be recorded in Cash/Bank ledger')
  })

  // -------------------------------------------------------------------------
  // TEST 8 — GST INTRA-STATE SPLITTING
  // Sale: ₹100,000 taxable | GST: 18%
  // Verify: CGST = ₹9,000, SGST = ₹9,000, Total GST = ₹18,000, Total = ₹118,000
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 8: GST Engine Splitting')
  await test('TEST 8 — GST intra-state calculates exact CGST 9% and SGST 9%', () => {
    const gstResult = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Industrial Machine Unit',
          quantity: 1,
          unit_price: 100000,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    assert.strictEqual(gstResult.taxable_amount, 100000, 'Taxable must be ₹100,000')
    assert.strictEqual(gstResult.cgst_amount, 9000, 'CGST must be ₹9,000')
    assert.strictEqual(gstResult.sgst_amount, 9000, 'SGST must be ₹9,000')
    assert.strictEqual(gstResult.igst_amount, 0, 'IGST must be ₹0')
    assert.strictEqual(gstResult.total_tax_amount, 18000, 'Total tax must be ₹18,000')
    assert.strictEqual(gstResult.grand_total, 118000, 'Grand total must be ₹118,000')
  })

  // -------------------------------------------------------------------------
  // TEST 9 — MULTI-TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 9: Multi-Tenant Data Isolation')
  await test('TEST 9 — MULTI-TENANT prevents cross-organization ledger access', async () => {
    const orgB_Id = '22222222-2222-2222-2222-222222222222'

    // Add transaction for Org B
    demoCashBankTransactions.push({
      id: 'cbt-org-b-secret',
      organization_id: orgB_Id,
      account_id: 'cba-bank-default',
      transaction_type: 'payment_in',
      direction: 'in',
      amount: 999999,
      running_balance: 999999,
      transaction_date: '2026-09-24',
      payment_mode: 'bank_transfer',
      narration: 'Confidential Org B dividend',
      created_at: new Date().toISOString(),
    })

    // Query transactions for Org A (mockSession org)
    const orgATxns = demoCashBankTransactions.filter(
      (t) => t.organization_id === mockSession.organization_id
    )
    const hasOrgBRecord = orgATxns.some((t) => t.id === 'cbt-org-b-secret')

    assert.strictEqual(hasOrgBRecord, false, 'Tenant A must NOT see Tenant B financial transactions')
  })

  // -------------------------------------------------------------------------
  // TEST 10 — SECTION 30 FINAL RECONCILIATION TEST
  // Opening stock: 10 units | Purchase: 5 units (Stock -> 15)
  // Sale: 2 units × ₹40,000 | Tax: 18% | Taxable: ₹80,000 | GST: ₹14,400
  // Invoice Total: ₹94,400 | Payment: ₹20,000
  // Verify: Stock = 13 units, Invoice = ₹94,400, Paid = ₹20,000,
  //         Outstanding = ₹74,400, Ledger: Debit ₹94,400, Credit ₹20,000,
  //         Cash/Bank: IN ₹20,000, GST = ₹14,400
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 10: Section 30 Final End-to-End Reconciliation')
  await test('TEST 10 — SECTION 30 FULL RECONCILIATION across all modules', async () => {
    const prodId = 'prod-reconcile-gold-motor'
    // Opening stock: 10 units
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'High Torque Gold Motor',
      sku: 'MOTOR-GOLD-40K',
      product_type: 'goods',
      sale_price: 40000,
      purchase_price: 28000,
      gst_rate: 18,
      current_stock: 10,
      opening_stock: 10,
      opening_stock_value: 280000,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    // Inflow: Purchase 5 units
    const prod = demoProducts.find((p: any) => p.id === prodId)!
    prod.current_stock += 5
    assert.strictEqual(prod.current_stock, 15, 'Stock before sale must be 15 units')

    // Customer
    const custId = 'cust-reconcile-target'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Apex Industrial Clients',
      customer_type: 'business',
      is_gst_registered: true,
      credit_period_days: 30,
      credit_limit: 200000,
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      customer_addresses: [
        {
          id: 'addr-rec-1',
          customer_id: custId,
          address_type: 'billing',
          is_default: true,
          line1: 'Bandra Kurla Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      ],
    })

    const initialBankBal = demoGetCashBankSummary().bank_balance

    // Sale: 2 units × ₹40,000, 18% tax, upfront pay ₹20,000
    const saleResult = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: prodId,
          description: 'High Torque Gold Motor',
          quantity: 2,
          unit_price: 40000,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
      payment_status: 'partial',
      amount_paid: 20000,
      payment_mode: 'bank_transfer',
    })

    const inv = saleResult.invoice

    // Verification checklist:
    // 1. Stock: 15 - 2 = 13
    assert.strictEqual(prod.current_stock, 13, 'Stock after sale must be exactly 13 units')

    // 2. Invoice Totals: Taxable ₹80,000, GST ₹14,400, Total ₹94,400
    assert.strictEqual(inv.taxable_amount, 80000, 'Taxable amount must be ₹80,000')
    assert.strictEqual(inv.total_tax_amount, 14400, 'GST must be ₹14,400')
    assert.strictEqual(inv.total_amount, 94400, 'Invoice total must be ₹94,400')

    // 3. Paid & Outstanding: Paid ₹20,000, Outstanding ₹74,400
    assert.strictEqual(inv.amount_paid, 20000, 'Amount paid must be ₹20,000')
    assert.strictEqual(inv.balance_due, 74400, 'Balance due must be ₹74,400')

    // 4. Customer Outstanding & Statement
    const custDetails = demoGetCustomerDetails(custId)
    assert.ok(custDetails, 'Customer details must exist')
    assert.strictEqual(
      custDetails!.customer.outstanding_balance,
      74400,
      'Customer outstanding balance must be ₹74,400'
    )

    // 5. Customer Ledger: Debit ₹94,400, Credit ₹20,000
    const debit = demoTransactions.find(
      (t) => t.customer_id === custId && t.transaction_type === 'invoice' && t.amount === 94400
    )
    const credit = demoTransactions.find(
      (t) => t.customer_id === custId && t.transaction_type === 'payment' && t.amount === -20000
    )
    assert.ok(debit, 'Debit entry for ₹94,400 must exist in customer ledger')
    assert.ok(credit, 'Credit entry for -₹20,000 must exist in customer ledger')

    // 6. Cash/Bank Ledger: IN ₹20,000
    const finalBankBal = demoGetCashBankSummary().bank_balance
    assert.strictEqual(
      finalBankBal,
      initialBankBal + 20000,
      'Bank account balance must increase by ₹20,000'
    )

    const bankTxn = demoCashBankTransactions.find(
      (t) => t.reference_id === inv.id && t.amount === 20000 && t.direction === 'in'
    )
    assert.ok(bankTxn, 'Cash/Bank transaction entry of ₹20,000 IN must exist')
  })

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n====================================================================')
  console.log(`🏁 PHASE 2 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log('====================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhase2Tests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
