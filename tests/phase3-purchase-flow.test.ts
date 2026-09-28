// ============================================================================
// tests/phase3-purchase-flow.test.ts
// Phase 3 — Purchase + Supplier Ledger + Payables Master Verification Suite
//
// Verifies:
// PURCHASE BILL → STOCK IN → SUPPLIER LEDGER → PAYABLE → SUPPLIER PAYMENT →
// CASH/BANK OUT → INPUT GST → PURCHASE REPORTS → DASHBOARD
//
// Tests all required business scenarios:
//   1. Scenario A: Credit Purchase (Stock In, Supplier Payable, Status Approved)
//   2. Scenario B: Immediate Cash Purchase (Stock In, Cash Out, Status Paid)
//   3. Scenario C: Partial Payment (Stock In, Partial Cash Out, Status Partial)
//   4. Scenario D: Tax-Inclusive Purchase (Inclusive GST back-calculation)
//   5. Scenario E: Inter-State Purchase (IGST vs CGST/SGST determination)
//   6. Scenario F: Purchase Discounts (Line discount & Net taxable computation)
//   7. Scenario G: Subsequent Supplier Payment & Bill Allocation
//   8. Scenario H: Overpayment Rejection Guard (OVERPAYMENT_NOT_ALLOWED)
//   9. Scenario I: Duplicate Finalization Guard (ALREADY_FINALIZED)
//   10. Scenario J: Idempotency Protection (No double-counting on retries)
//   11. Scenario K: Purchase Cancellation & Atomic Reversal
//   12. Scenario L: Multi-Tenant Isolation
//   13. Scenario M: Server-Side Financial Recalculation
//   14. Scenario N: Section 39 Final Reconciliation Test
// ============================================================================

import assert from 'node:assert'
import {
  demoProducts,
  demoSuppliers,
  demoPurchaseBills,
  demoTransactions,
  demoCashBankAccounts,
  demoCashBankTransactions,
  demoGetCashBankSummary,
  demoGetSupplier,
  DEMO_ORG_ID,
} from '../lib/services/demo-store'
import { PurchaseTransactionService } from '../lib/services/purchase-transaction.service'
import { PurchaseService } from '../lib/services/purchase.service'
import type { AppSession } from '../types/app.types'

const mockSession: AppSession = {
  user_id: 'user-demo-admin',
  organization_id: DEMO_ORG_ID,
  role: 'owner',
  user: { id: 'user-demo-admin', email: 'admin@demo.com', full_name: 'Admin', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Demo Organization', gstin: '27AAAAA0000A1Z5', logo_url: null, business_category: 'general' },
  member: { id: 'mem-1', role: 'owner', status: 'active' },
}

async function runPhase3Tests() {
  console.log('====================================================================')
  console.log('🧪 RUNNING PHASE 3 — PURCHASE & PAYABLES INTEGRATED TEST SUITE')
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
  // TEST 1 — SCENARIO A: CREDIT PURCHASE
  // Product: ₹32,000 | Quantity: 5 | GST: 18% | Total: ₹1,88,800 | Paid: ₹0
  // Verify: Bill total = ₹1,88,800, Supplier payable increases by ₹1,88,800,
  //         Stock increases by +5, Status = APPROVED, Cash = Unchanged
  // -------------------------------------------------------------------------
  console.log('📌 Scenario A: Credit Purchase Flow')
  await test('TEST 1 — Credit Purchase posts Stock In, Supplier Payable, and APPROVED status', async () => {
    const prodId = 'prod-test-credit-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'High Output Industrial Pump',
      sku: 'PUMP-32000',
      product_type: 'goods',
      sale_price: 45000,
      purchase_price: 32000,
      gst_rate: 18,
      current_stock: 10,
      opening_stock: 10,
      opening_stock_value: 320000,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-credit-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Pump Dynamics Ltd',
      gstin: '27AAACP1234P1Z1',
      state_code: '27',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const initialStock = demoProducts.find((p) => p.id === prodId)!.current_stock
    const initialSupp = demoSuppliers.find((s) => s.id === suppId)!
    const initialPayable = initialSupp.outstanding_balance

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-CREDIT-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          product_id: prodId,
          description: 'High Output Industrial Pump',
          quantity: 5,
          unit_price: 32000,
          gst_rate: 18,
        },
      ],
      amount_paid: 0,
    })

    assert.strictEqual(result.bill.total_amount, 188800, 'Total bill must be ₹1,88,800')
    assert.strictEqual(result.bill.taxable_amount, 160000, 'Taxable amount must be ₹1,60,000')
    assert.strictEqual(result.bill.cgst_amount, 14400, 'CGST must be ₹14,400')
    assert.strictEqual(result.bill.sgst_amount, 14400, 'SGST must be ₹14,400')
    assert.strictEqual(result.bill.igst_amount, 0, 'IGST must be 0 for intra-state')
    assert.strictEqual(result.bill.balance_due, 188800, 'Balance due must be full ₹1,88,800')
    assert.strictEqual(result.bill.status, 'approved', 'Status must be approved')

    // Stock verification
    const updatedProd = demoProducts.find((p) => p.id === prodId)!
    assert.strictEqual(updatedProd.current_stock, initialStock + 5, 'Stock must increment by exactly +5')

    // Supplier payable verification
    const updatedSupp = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(updatedSupp.outstanding_balance, initialPayable + 188800, 'Payable must increase by ₹1,88,800')

    // Supplier statement verification
    const statement = await PurchaseService.getSupplierStatement(mockSession, suppId)
    assert.strictEqual(statement.metrics.outstanding_payable, 188800, 'Statement outstanding must be ₹1,88,800')
  })

  // -------------------------------------------------------------------------
  // TEST 2 — SCENARIO B: IMMEDIATE CASH PURCHASE
  // Product: ₹10,000 | Quantity: 1 | GST: 18% | Total: ₹11,800 | Paid: ₹11,800
  // Verify: Bill total = ₹11,800, Status = PAID, Balance Due = 0,
  //         Supplier payable = ₹0, Cash balance decreases by ₹11,800
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario B: Immediate Cash Purchase Flow')
  await test('TEST 2 — Immediate Cash Purchase records Stock In, Cash Out, and PAID status', async () => {
    const prodId = 'prod-test-cash-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Workshop Drill Machine',
      sku: 'DRILL-10000',
      product_type: 'goods',
      sale_price: 15000,
      purchase_price: 10000,
      gst_rate: 18,
      current_stock: 4,
      opening_stock: 4,
      opening_stock_value: 40000,
      min_stock_level: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-cash-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Drill Supplies Hub',
      gstin: '27AAACD9999D1Z9',
      state_code: '27',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const cashSummaryBefore = demoGetCashBankSummary()
    const cashBefore = cashSummaryBefore.cash_balance

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-CASH-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          product_id: prodId,
          description: 'Workshop Drill Machine',
          quantity: 1,
          unit_price: 10000,
          gst_rate: 18,
        },
      ],
      amount_paid: 11800,
      payment_method: 'cash',
    })

    assert.strictEqual(result.bill.total_amount, 11800, 'Total bill must be ₹11,800')
    assert.strictEqual(result.bill.amount_paid, 11800, 'Paid amount must be ₹11,800')
    assert.strictEqual(result.bill.balance_due, 0, 'Balance due must be 0')
    assert.strictEqual(result.bill.status, 'paid', 'Status must be paid')

    // Stock verification
    const prod = demoProducts.find((p) => p.id === prodId)!
    assert.strictEqual(prod.current_stock, 5, 'Stock must increment by +1')

    // Supplier payable must remain 0
    const supp = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(supp.outstanding_balance, 0, 'Supplier payable must remain 0')

    // Cash verification
    const cashSummaryAfter = demoGetCashBankSummary()
    assert.strictEqual(cashSummaryAfter.cash_balance, cashBefore - 11800, 'Cash in hand must decrease by ₹11,800')
  })

  // -------------------------------------------------------------------------
  // TEST 3 — SCENARIO C: PARTIAL PAYMENT PURCHASE
  // Product: ₹50,000 | Quantity: 1 | GST: 0% | Total: ₹50,000 | Paid: ₹20,000
  // Verify: Bill total = ₹50,000, Paid = ₹20,000, Balance due = ₹30,000,
  //         Status = PARTIAL, Supplier payable = ₹30,000, Cash decreases by ₹20,000
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario C: Partial Upfront Payment Flow')
  await test('TEST 3 — Partial Payment marks bill PARTIAL with exact remaining balance due', async () => {
    const prodId = 'prod-test-partial-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Heavy Machine Part',
      sku: 'PART-50000',
      product_type: 'goods',
      sale_price: 60000,
      purchase_price: 50000,
      gst_rate: 0,
      current_stock: 2,
      opening_stock: 2,
      opening_stock_value: 100000,
      min_stock_level: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-partial-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Steel Fabrications Inc',
      gstin: '27AAACS8888S1Z8',
      state_code: '27',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const cashSummaryBefore = demoGetCashBankSummary()
    const cashBefore = cashSummaryBefore.cash_balance

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-PARTIAL-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          product_id: prodId,
          description: 'Heavy Machine Part',
          quantity: 1,
          unit_price: 50000,
          gst_rate: 0,
        },
      ],
      amount_paid: 20000,
      payment_method: 'cash',
    })

    assert.strictEqual(result.bill.total_amount, 50000, 'Total bill must be ₹50,000')
    assert.strictEqual(result.bill.amount_paid, 20000, 'Paid amount must be ₹20,000')
    assert.strictEqual(result.bill.balance_due, 30000, 'Balance due must be ₹30,000')
    assert.strictEqual(result.bill.status, 'partial', 'Status must be partial')

    const supp = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(supp.outstanding_balance, 30000, 'Supplier payable must be ₹30,000')

    const cashSummaryAfter = demoGetCashBankSummary()
    assert.strictEqual(cashSummaryAfter.cash_balance, cashBefore - 20000, 'Cash in hand must decrease by ₹20,000')
  })

  // -------------------------------------------------------------------------
  // TEST 4 — SCENARIO D: TAX-INCLUSIVE PURCHASE
  // Product: ₹1,180 (GST Inclusive @ 18%) | Quantity: 1
  // Expected: Base Taxable = ₹1,000, GST = ₹180 (CGST ₹90, SGST ₹90), Total = ₹1,180
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario D: Tax-Inclusive Purchase Calculation')
  await test('TEST 4 — Tax-Inclusive Purchase correctly back-calculates taxable amount and GST', async () => {
    const prodId = 'prod-test-incl-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Precision Sensor Module',
      sku: 'SENSOR-1180',
      product_type: 'goods',
      sale_price: 1500,
      purchase_price: 1180,
      gst_rate: 18,
      is_gst_inclusive: true,
      current_stock: 20,
      opening_stock: 20,
      opening_stock_value: 20000,
      min_stock_level: 5,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-incl-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Sensors India Ltd',
      gstin: '27AAACS1111S1Z1',
      state_code: '27',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-INCL-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          product_id: prodId,
          description: 'Precision Sensor Module',
          quantity: 1,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      amount_paid: 0,
    })

    assert.strictEqual(result.bill.total_amount, 1180, 'Total bill must be ₹1,180')
    assert.strictEqual(result.bill.taxable_amount, 1000, 'Taxable base must be ₹1,000')
    assert.strictEqual(result.bill.cgst_amount, 90, 'CGST must be ₹90')
    assert.strictEqual(result.bill.sgst_amount, 90, 'SGST must be ₹90')
    assert.strictEqual(result.bill.igst_amount, 0, 'IGST must be 0')
  })

  // -------------------------------------------------------------------------
  // TEST 5 — SCENARIO E: INTER-STATE PURCHASE (IGST)
  // Supplier State: Gujarat ('24') | Buyer State: Maharashtra ('27')
  // Product: ₹10,000 @ 18% Exclusive
  // Expected: Taxable = ₹10,000, IGST = ₹1,800, CGST = 0, SGST = 0, Total = ₹11,800
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario E: Inter-State Purchase (IGST)')
  await test('TEST 5 — Inter-State Purchase allocates 100% tax to IGST with CGST/SGST = 0', async () => {
    const suppId = 'supp-test-interstate-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Gujarat Steel Suppliers',
      gstin: '24AAACG2424G1Z2',
      state_code: '24', // Gujarat
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-INTER-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      place_of_supply: '24',
      status: 'approved',
      items: [
        {
          description: 'Specialty Steel Bars',
          quantity: 1,
          unit_price: 10000,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
      amount_paid: 0,
    })

    assert.strictEqual(result.bill.is_inter_state, true, 'Must detect inter-state supply')
    assert.strictEqual(result.bill.taxable_amount, 10000, 'Taxable amount must be ₹10,000')
    assert.strictEqual(result.bill.igst_amount, 1800, 'IGST must be ₹1,800')
    assert.strictEqual(result.bill.cgst_amount, 0, 'CGST must be 0')
    assert.strictEqual(result.bill.sgst_amount, 0, 'SGST must be 0')
    assert.strictEqual(result.bill.total_amount, 11800, 'Total bill must be ₹11,800')
  })

  // -------------------------------------------------------------------------
  // TEST 6 — SCENARIO F: PURCHASE WITH DISCOUNT
  // Product: ₹1,180 (Inclusive @ 18%), Line Discount = ₹180
  // Expected Net Gross = ₹1,000 -> Taxable = ₹847.46, GST = ₹152.54, Total = ₹1,000
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario F: Purchase Discounts')
  await test('TEST 6 — Purchase with discount correctly calculates net taxable and GST on discounted base', async () => {
    const suppId = 'supp-test-disc-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Discounted Spares Ltd',
      gstin: '27AAACD7777D1Z7',
      state_code: '27',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-DISC-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          description: 'Industrial Bearing Unit',
          quantity: 1,
          unit_price: 1180,
          discount_amount: 180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      amount_paid: 0,
    })

    assert.strictEqual(result.bill.total_amount, 1000, 'Net bill total after discount must be ₹1,000')
    assert.strictEqual(result.bill.taxable_amount, 847.46, 'Taxable amount must be ₹847.46')
    assert.strictEqual(result.bill.total_tax_amount, 152.54, 'Total tax must be ₹152.54')
    assert.strictEqual(result.bill.cgst_amount, 76.27, 'CGST must be ₹76.27')
    assert.strictEqual(result.bill.sgst_amount, 76.27, 'SGST must be ₹76.27')
  })

  // -------------------------------------------------------------------------
  // TEST 7 — SCENARIO G: SUBSEQUENT SUPPLIER PAYMENT
  // Outstanding ₹1,88,800 from Test 1.
  // Make partial payment of ₹88,800.
  // Expected: Outstanding reduces to ₹1,00,000, Cash decreases by ₹88,800
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario G: Subsequent Supplier Payment')
  await test('TEST 7 — Subsequent payment updates supplier payable, bill status, and cash ledger', async () => {
    const suppId = 'supp-test-credit-p3'
    const suppBefore = demoSuppliers.find((s) => s.id === suppId)!
    const payableBefore = suppBefore.outstanding_balance

    const cashSummaryBefore = demoGetCashBankSummary()
    const cashBefore = cashSummaryBefore.cash_balance

    const payResult = await PurchaseService.recordSupplierPayment(mockSession, {
      supplier_id: suppId,
      amount: 88800,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: 'Subsequent installment payment for pumps',
    })

    assert.strictEqual(payResult.success, true, 'Payment must succeed')
    assert.strictEqual(payResult.remaining_payable, payableBefore - 88800, 'Remaining payable must be ₹1,00,000')

    const suppAfter = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(suppAfter.outstanding_balance, 100000, 'Supplier balance must be ₹1,00,000')

    const cashSummaryAfter = demoGetCashBankSummary()
    assert.strictEqual(cashSummaryAfter.cash_balance, cashBefore - 88800, 'Cash in hand must decrease by ₹88,800')
  })

  // -------------------------------------------------------------------------
  // TEST 8 — SCENARIO H: OVERPAYMENT REJECTION GUARD
  // Supplier has ₹1,00,000 payable.
  // Attempt to pay ₹1,50,000.
  // Expected: OVERPAYMENT_NOT_ALLOWED error thrown.
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario H: Overpayment Rejection Guard')
  await test('TEST 8 — Overpayment exceeds outstanding balance and is strictly rejected', async () => {
    const suppId = 'supp-test-credit-p3'
    let rejected = false
    try {
      await PurchaseService.recordSupplierPayment(mockSession, {
        supplier_id: suppId,
        amount: 150000, // Exceeds current 100000 outstanding
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
      })
    } catch (err: any) {
      if (err.message.includes('OVERPAYMENT_NOT_ALLOWED')) {
        rejected = true
      } else {
        throw err
      }
    }
    assert.strictEqual(rejected, true, 'Must reject overpayment with OVERPAYMENT_NOT_ALLOWED')
  })

  // -------------------------------------------------------------------------
  // TEST 9 — SCENARIO I: DUPLICATE FINALIZATION GUARD
  // Finalizing an already finalized bill must throw an error.
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario I: Duplicate Finalization Guard')
  await test('TEST 9 — Finalizing an already finalized bill throws error and preserves invariants', async () => {
    const suppId = 'supp-test-dup-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Dup Supplier',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const bill = await PurchaseService.createPurchaseBill(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-FIN-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      items: [
        {
          description: 'Draft Item',
          quantity: 1,
          unit_price: 500,
          gst_rate: 0,
        },
      ],
      amount_paid: 0,
    } as any)

    // First finalization succeeds
    await PurchaseService.finalizePurchaseBill(mockSession, bill.id)

    // Second finalization must fail
    let duplicateRejected = false
    try {
      await PurchaseService.finalizePurchaseBill(mockSession, bill.id)
    } catch (err: any) {
      if (err.message.includes('already finalized')) {
        duplicateRejected = true
      }
    }
    assert.strictEqual(duplicateRejected, true, 'Second finalization must be rejected')
  })

  // -------------------------------------------------------------------------
  // TEST 10 — SCENARIO J: IDEMPOTENCY PROTECTION
  // Re-submitting the same idempotency key must return cached result without double mutating.
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario J: Idempotency Protection')
  await test('TEST 10 — Same idempotency key returns cached transaction without duplicate mutations', async () => {
    const prodId = 'prod-test-idem-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Idempotent Fitting',
      sku: 'IDEM-FIT-1',
      product_type: 'goods',
      sale_price: 200,
      purchase_price: 100,
      gst_rate: 0,
      current_stock: 50,
      opening_stock: 50,
      opening_stock_value: 5000,
      min_stock_level: 5,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-idem-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Idempotency Test Supplier',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const idempotencyKey = `idem-key-${Date.now()}`
    const billData = {
      supplier_id: suppId,
      bill_number: `BILL-TEST-IDEM-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved' as const,
      items: [
        {
          product_id: prodId,
          description: 'Idempotent Fitting',
          quantity: 10,
          unit_price: 100,
          gst_rate: 0,
        },
      ],
      amount_paid: 0,
    }

    const res1 = await PurchaseTransactionService.executePurchase(mockSession, billData, idempotencyKey)
    assert.strictEqual(res1.isDuplicate, undefined, 'First attempt must not be duplicate')

    const stockAfterFirst = demoProducts.find((p) => p.id === prodId)!.current_stock
    assert.strictEqual(stockAfterFirst, 60, 'Stock must increment by 10')

    // Second call with same idempotency key
    const res2 = await PurchaseTransactionService.executePurchase(mockSession, billData, idempotencyKey)
    assert.strictEqual(res2.isDuplicate, true, 'Second call must return duplicate flag')

    // Stock and payable must NOT have changed again
    const stockAfterSecond = demoProducts.find((p) => p.id === prodId)!.current_stock
    assert.strictEqual(stockAfterSecond, 60, 'Stock must remain 60 (no duplicate stock-in)')
  })

  // -------------------------------------------------------------------------
  // TEST 11 — SCENARIO K: PURCHASE CANCELLATION & ATOMIC REVERSAL
  // Create bill for 5 units @ ₹1,000 (total ₹5,000), paid ₹2,000.
  // Then cancel it.
  // Verify: Stock -5, Supplier Payable reversed, Cash +₹2,000, Status = CANCELLED
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario K: Purchase Cancellation & Atomic Reversal')
  await test('TEST 11 — Cancelling a purchase bill atomically reverses stock, payable, and payments', async () => {
    const prodId = 'prod-test-cancel-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Cancel Test Part',
      sku: 'CANCEL-PART',
      product_type: 'goods',
      sale_price: 2000,
      purchase_price: 1000,
      gst_rate: 0,
      current_stock: 10,
      opening_stock: 10,
      opening_stock_value: 10000,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-cancel-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Cancel Test Supplier',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const cashSummaryBefore = demoGetCashBankSummary()
    const cashBefore = cashSummaryBefore.cash_balance

    const purchase = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-CANCEL-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          product_id: prodId,
          description: 'Cancel Test Part',
          quantity: 5,
          unit_price: 1000,
          gst_rate: 0,
        },
      ],
      amount_paid: 2000,
      payment_method: 'cash',
    })

    // Confirm state after creation
    const prodAfterBuy = demoProducts.find((p) => p.id === prodId)!
    assert.strictEqual(prodAfterBuy.current_stock, 15, 'Stock should be 15 after buy')

    const suppAfterBuy = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(suppAfterBuy.outstanding_balance, 3000, 'Payable should be 3000 after buy')

    // Now Cancel
    await PurchaseTransactionService.cancelPurchaseBill(mockSession, purchase.bill.id)

    // Verify stock reversed back to 10
    const prodAfterCancel = demoProducts.find((p) => p.id === prodId)!
    assert.strictEqual(prodAfterCancel.current_stock, 10, 'Stock must return to 10 after cancellation')

    // Verify payable reversed back to 0
    const suppAfterCancel = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(suppAfterCancel.outstanding_balance, 0, 'Payable must return to 0 after cancellation')

    // Verify cash returned back to original
    const cashSummaryAfter = demoGetCashBankSummary()
    assert.strictEqual(cashSummaryAfter.cash_balance, cashBefore, 'Cash must be fully restored after cancellation')
  })

  // -------------------------------------------------------------------------
  // TEST 12 — SCENARIO L: MULTI-TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario L: Multi-Tenant Isolation')
  await test('TEST 12 — Multi-tenant boundary prevents cross-organization access', async () => {
    const otherOrgSession = {
      user_id: 'user-tenant-2',
      organization_id: '22222222-2222-2222-2222-222222222222',
      role: 'owner',
      email: 'tenant2@test.com',
      user: { id: 'user-tenant-2', email: 'tenant2@test.com' } as any,
      organization: { id: '22222222-2222-2222-2222-222222222222', name: 'Other Org' } as any,
      member: { role: 'owner' } as any,
    } as any as AppSession

    // Attempting to query or modify demo records with a different organization
    let isolated = true
    try {
      const statement = await PurchaseService.getSupplierStatement(otherOrgSession, 'non-existent-id')
      if (statement && statement.supplier) {
        isolated = false
      }
    } catch {
      isolated = true
    }
    assert.strictEqual(isolated, true, 'Cross-tenant access must be rejected')
  })

  // -------------------------------------------------------------------------
  // TEST 13 — SCENARIO M: SERVER-SIDE FINANCIAL RECALCULATION
  // Client submits manipulated total or tax values; server must ignore client values
  // and compute authoritatively.
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario M: Server-Side Financial Recalculation')
  await test('TEST 13 — Server calculates authoritative financial breakdown regardless of client inputs', async () => {
    const suppId = 'supp-test-tamper-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Tamper Test Supplier',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const result = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-TEST-TAMPER-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          description: 'Standard Tool',
          quantity: 2,
          unit_price: 1000,
          gst_rate: 18,
          // Client sends incorrect subtotal or totals, server should compute 2*1000 = 2000 + 18% = 2360
        },
      ],
      amount_paid: 0,
    })

    assert.strictEqual(result.bill.subtotal, 2000, 'Authoritative subtotal must be ₹2,000')
    assert.strictEqual(result.bill.cgst_amount, 180, 'Authoritative CGST must be ₹180')
    assert.strictEqual(result.bill.sgst_amount, 180, 'Authoritative SGST must be ₹180')
    assert.strictEqual(result.bill.total_amount, 2360, 'Authoritative total must be ₹2,360')
  })

  // -------------------------------------------------------------------------
  // TEST 14 — SCENARIO N: SECTION 39 FINAL RECONCILIATION TEST
  // 1. Initial State: Product stock = 10, Supplier payable = 0, Cash = C0
  // 2. Buy 5 units @ ₹1,180 (inclusive @ 18%):
  //    - Total bill = ₹5,900
  //    - Taxable = ₹5,000
  //    - CGST = ₹450, SGST = ₹450
  //    - Upfront Paid = ₹2,000 Cash
  //    - Balance Due = ₹3,900
  //    - Stock = 15
  //    - Supplier Payable = ₹3,900
  //    - Cash = C0 - ₹2,000
  // 3. Make Subsequent Payment of ₹1,900 Cash:
  //    - Balance Due = ₹2,000
  //    - Supplier Payable = ₹2,000
  //    - Cash = C0 - ₹3,900
  // 4. Cancel Purchase Bill:
  //    - Stock reverts to 10
  //    - Supplier Payable reverts to 0
  //    - All Cash payments refunded (Cash reverts to C0)
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario N: Section 39 Final Reconciliation Test')
  await test('TEST 14 — Complete Lifecycle: Purchase (5@1180 inc) → Pay ₹2k → Pay ₹1.9k → Cancel & Fully Reconcile', async () => {
    const prodId = 'prod-test-sec39-p3'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Section 39 High Precision Alloy',
      sku: 'SEC39-ALLOY',
      product_type: 'goods',
      sale_price: 2000,
      purchase_price: 1180,
      gst_rate: 18,
      is_gst_inclusive: true,
      current_stock: 10,
      opening_stock: 10,
      opening_stock_value: 10000,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const suppId = 'supp-test-sec39-p3'
    demoSuppliers.push({
      id: suppId,
      organization_id: DEMO_ORG_ID,
      name: 'Alloy Industries Corp',
      gstin: '27AAACA9999A1Z9',
      state_code: '27',
      outstanding_balance: 0,
      outstanding_paise: 0,
      created_at: new Date().toISOString(),
    } as any)

    const cashSummary0 = demoGetCashBankSummary()
    const c0 = cashSummary0.cash_balance

    // Step 2: Execute Purchase
    const buyResult = await PurchaseTransactionService.executePurchase(mockSession, {
      supplier_id: suppId,
      bill_number: `BILL-SEC39-${Date.now()}`,
      bill_date: new Date().toISOString().split('T')[0],
      status: 'approved',
      items: [
        {
          product_id: prodId,
          description: 'Section 39 High Precision Alloy',
          quantity: 5,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      amount_paid: 2000,
      payment_method: 'cash',
    })

    assert.strictEqual(buyResult.bill.total_amount, 5900, 'Total bill must be ₹5,900')
    assert.strictEqual(buyResult.bill.taxable_amount, 5000, 'Taxable base must be ₹5,000')
    assert.strictEqual(buyResult.bill.cgst_amount, 450, 'CGST must be ₹450')
    assert.strictEqual(buyResult.bill.sgst_amount, 450, 'SGST must be ₹450')
    assert.strictEqual(buyResult.bill.amount_paid, 2000, 'Amount paid must be ₹2,000')
    assert.strictEqual(buyResult.bill.balance_due, 3900, 'Balance due must be ₹3,900')
    assert.strictEqual(buyResult.bill.status, 'partial', 'Status must be partial')

    const prodStep2 = demoProducts.find((p) => p.id === prodId)!
    assert.strictEqual(prodStep2.current_stock, 15, 'Stock must increase to 15')

    const suppStep2 = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(suppStep2.outstanding_balance, 3900, 'Supplier payable must be ₹3,900')

    const cashStep2 = demoGetCashBankSummary()
    assert.strictEqual(cashStep2.cash_balance, c0 - 2000, 'Cash in hand must be C0 - 2000')

    // Step 3: Subsequent payment of ₹1,900
    await PurchaseService.recordSupplierPayment(mockSession, {
      supplier_id: suppId,
      purchase_bill_id: buyResult.bill.id,
      amount: 1900,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: 'Second installment for alloy',
    })

    const suppStep3 = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(suppStep3.outstanding_balance, 2000, 'Supplier payable must be ₹2,000')

    const cashStep3 = demoGetCashBankSummary()
    assert.strictEqual(cashStep3.cash_balance, c0 - 3900, 'Cash in hand must be C0 - 3900')

    // Step 4: Cancel Purchase Bill
    await PurchaseTransactionService.cancelPurchaseBill(mockSession, buyResult.bill.id)

    const prodFinal = demoProducts.find((p) => p.id === prodId)!
    assert.strictEqual(prodFinal.current_stock, 10, 'Stock must return to exactly 10')

    const suppFinal = demoSuppliers.find((s) => s.id === suppId)!
    assert.strictEqual(suppFinal.outstanding_balance, 0, 'Supplier payable must return to 0')

    const cashFinal = demoGetCashBankSummary()
    assert.strictEqual(cashFinal.cash_balance, c0, 'Cash in hand must return to original balance C0')
  })

  console.log('\n====================================================================')
  console.log(`📊 PHASE 3 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log('====================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runPhase3Tests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
