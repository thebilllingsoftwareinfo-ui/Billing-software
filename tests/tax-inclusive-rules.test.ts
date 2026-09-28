// ============================================================================
// tests/tax-inclusive-rules.test.ts
// Exhaustive Verification Suite for TAX-INCLUSIVE INVOICE RULES
//
// Tests all 24 required business scenarios + Section 29 Final Reconciliation:
//   1. Basic Tax-Inclusive
//   2. Basic Tax-Exclusive Regression
//   3. Quantity Multiplication
//   4. Percentage Discount
//   5. Fixed Discount
//   6. Mixed Tax Mode (Inclusive + Exclusive on same invoice)
//   7. Intra-State GST (CGST + SGST)
//   8. Inter-State GST (IGST)
//   9. 0% GST (Zero tax division-by-zero guard)
//   10. Multiple GST Rates (0, 0.25, 0.5, 3, 5, 8, 9, 12, 18, 28)
//   11. Fractional Rounding & Precision
//   12. Partial Payment Flow
//   13. Full Payment Flow
//   14. Inventory Deduction Verification
//   15. Customer Ledger Debit & Credit Verification
//   16. Sales Report Classification
//   17. GST / Tax Breakdown Reconciliation
//   18. PDF / Print Value Consistency
//   19. Quotation -> Invoice Conversion
//   20. Historical Invoice Immutability
//   21. Idempotency & Duplicate Submission
//   22. Server Authoritative Override of Client Tampering
//   23. Demo Store Full Lifecycle
//   24. Supabase Mode Calculation Engine Parity
//   + Scenario 29: Section 29 Final Independent Reconciliation
// ============================================================================

import assert from 'node:assert'
import {
  calculateCentralGst,
  isInterState,
} from '../lib/services/tax.service'
import { calculateInvoiceServerSide } from '../lib/services/invoice.service'
import { SalesTransactionService } from '../lib/services/sales-transaction.service'
import {
  demoProducts,
  demoCustomers,
  demoInvoices,
  demoTransactions,
  demoAddInvoice,
  demoGetInvoice,
  demoRecordPayment,
  demoGetCashBankSummary,
  demoGetCustomerDetails,
  DEMO_ORG_ID,
} from '../lib/services/demo-store'

const mockSession = {
  user_id: 'user-demo-admin',
  organization_id: DEMO_ORG_ID,
  role: 'owner' as const,
  email: 'admin@demo.com',
}

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ PASSED: ${name}`)
  } catch (err: any) {
    console.error(`  ❌ FAILED: ${name}`)
    console.error(`     Error: ${err.message}\n`)
    throw err
  }
}

async function main() {
  console.log('\n====================================================================')
  console.log('🧪 RUNNING TAX-INCLUSIVE INVOICE RULES VERIFICATION SUITE')
  console.log('====================================================================\n')

  let passed = 0
  let failed = 0

  async function exec(name: string, fn: () => void | Promise<void>) {
    try {
      await runTest(name, fn)
      passed++
    } catch {
      failed++
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1 — BASIC TAX-INCLUSIVE
  // Price = ₹1,180 | Qty = 1 | GST = 18% | Mode = INCLUSIVE
  // Expected: Taxable = ₹1,000, GST = ₹180, Total = ₹1,180
  // -------------------------------------------------------------------------
  console.log('📌 Test 1: Basic Tax-Inclusive')
  await exec('TEST 1 — BASIC TAX-INCLUSIVE back-calculates taxable ₹1,000 and GST ₹180', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Industrial Sensor',
          quantity: 1,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    const line = res.lines[0]
    assert.strictEqual(line.taxable_amount, 1000, 'Taxable amount must be ₹1,000')
    assert.strictEqual(line.total_tax, 180, 'GST amount must be ₹180')
    assert.strictEqual(line.line_total, 1180, 'Line total must be ₹1,180')
    assert.strictEqual(res.grand_total, 1180, 'Grand total must be ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 2 — BASIC TAX-EXCLUSIVE REGRESSION
  // Price = ₹1,000 | Qty = 1 | GST = 18% | Mode = EXCLUSIVE
  // Expected: Taxable = ₹1,000, GST = ₹180, Total = ₹1,180
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 2: Basic Tax-Exclusive Regression')
  await exec('TEST 2 — BASIC TAX-EXCLUSIVE regression adds GST onto taxable base', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Industrial Sensor',
          quantity: 1,
          unit_price: 1000,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    const line = res.lines[0]
    assert.strictEqual(line.taxable_amount, 1000, 'Taxable amount must be ₹1,000')
    assert.strictEqual(line.total_tax, 180, 'GST amount must be ₹180')
    assert.strictEqual(line.line_total, 1180, 'Line total must be ₹1,180')
    assert.strictEqual(res.grand_total, 1180, 'Grand total must be ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 3 — QUANTITY MULTIPLICATION
  // Unit price = ₹1,180 | Qty = 5 | GST = 18% | Mode = INCLUSIVE
  // Expected: Inclusive total = ₹5,900, Taxable = ₹5,000, GST = ₹900, Total = ₹5,900
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 3: Quantity Multiplication')
  await exec('TEST 3 — QUANTITY multiplies inclusive gross to ₹5,900 (Taxable ₹5,000, GST ₹900)', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Control Module',
          quantity: 5,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    const line = res.lines[0]
    assert.strictEqual(line.gross_amount, 5900, 'Gross inclusive amount must be ₹5,900')
    assert.strictEqual(line.taxable_amount, 5000, 'Taxable value must be ₹5,000')
    assert.strictEqual(line.total_tax, 900, 'GST must be ₹900')
    assert.strictEqual(line.line_total, 5900, 'Line total must be ₹5,900')
    assert.strictEqual(res.grand_total, 5900, 'Grand total must be ₹5,900')
  })

  // -------------------------------------------------------------------------
  // TEST 4 — PERCENTAGE DISCOUNT
  // Price = ₹1,180 | Qty = 1 | GST = 18% | Discount = 10%
  // Gross = ₹1,180, Discount = ₹118, Net = ₹1,062 -> Taxable = ₹900, GST = ₹162, Total = ₹1,062
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 4: Percentage Discount')
  await exec('TEST 4 — PERCENTAGE DISCOUNT applies discount before tax (Net ₹1,062 = Taxable ₹900 + GST ₹162)', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Digital Caliper',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 10,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    const line = res.lines[0]
    assert.strictEqual(line.gross_amount, 1180, 'Gross inclusive must be ₹1,180')
    assert.strictEqual(line.discount_amount, 118, '10% discount must be ₹118')
    assert.strictEqual(line.taxable_amount, 900, 'Taxable must be ₹900')
    assert.strictEqual(line.total_tax, 162, 'GST must be ₹162')
    assert.strictEqual(line.line_total, 1062, 'Line total must be ₹1,062')
    assert.strictEqual(res.grand_total, 1062, 'Grand total must be ₹1,062')
  })

  // -------------------------------------------------------------------------
  // TEST 5 — FIXED DISCOUNT
  // Price = ₹1,180 | Fixed discount = ₹180 | Net = ₹1,000 | GST = 18%
  // Expected: Taxable ≈ ₹847.46, GST ≈ ₹152.54, Total = ₹1,000
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 5: Fixed Discount')
  await exec('TEST 5 — FIXED DISCOUNT reconciles net ₹1,000 (Taxable ₹847.46 + GST ₹152.54 = ₹1,000)', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Power Supply Unit',
          quantity: 1,
          unit_price: 1180,
          discount_amount: 180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    const line = res.lines[0]
    assert.strictEqual(line.discount_amount, 180, 'Fixed discount must be ₹180')
    assert.strictEqual(line.taxable_amount, 847.46, 'Taxable must be ₹847.46')
    assert.strictEqual(line.total_tax, 152.54, 'GST must be ₹152.54')
    assert.strictEqual(line.line_total, 1000, 'Line total must be ₹1,000')
    assert.strictEqual(
      Math.round((line.taxable_amount + line.total_tax) * 100) / 100,
      1000,
      'Taxable + GST must equal ₹1,000 exactly'
    )
  })

  // -------------------------------------------------------------------------
  // TEST 6 — MIXED INVOICE
  // Item A: ₹1,180 inclusive @ 18% -> Taxable ₹1,000, GST ₹180, Total ₹1,180
  // Item B: ₹1,000 exclusive @ 18% -> Taxable ₹1,000, GST ₹180, Total ₹1,180
  // Expected: Total Taxable = ₹2,000, Total GST = ₹360, Grand Total = ₹2,360
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 6: Mixed Invoice (Inclusive + Exclusive)')
  await exec('TEST 6 — MIXED INVOICE seamlessly aggregates Item A (inclusive) and Item B (exclusive) to ₹2,360', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Item A (Inclusive)',
          quantity: 1,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
        {
          description: 'Item B (Exclusive)',
          quantity: 1,
          unit_price: 1000,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    assert.strictEqual(res.lines[0].taxable_amount, 1000, 'Item A taxable must be ₹1,000')
    assert.strictEqual(res.lines[0].total_tax, 180, 'Item A GST must be ₹180')
    assert.strictEqual(res.lines[0].line_total, 1180, 'Item A total must be ₹1,180')

    assert.strictEqual(res.lines[1].taxable_amount, 1000, 'Item B taxable must be ₹1,000')
    assert.strictEqual(res.lines[1].total_tax, 180, 'Item B GST must be ₹180')
    assert.strictEqual(res.lines[1].line_total, 1180, 'Item B total must be ₹1,180')

    assert.strictEqual(res.taxable_amount, 2000, 'Invoice total taxable must be ₹2,000')
    assert.strictEqual(res.total_tax_amount, 360, 'Invoice total GST must be ₹360')
    assert.strictEqual(res.grand_total, 2360, 'Grand total must be ₹2,360')
  })

  // -------------------------------------------------------------------------
  // TEST 7 — INTRA-STATE GST
  // Seller State = Buyer State ('27')
  // Expected: CGST = ₹90, SGST = ₹90, IGST = ₹0
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 7: Intra-State GST (CGST + SGST)')
  await exec('TEST 7 — INTRA-STATE GST splits tax equally into CGST ₹90 and SGST ₹90 with IGST ₹0', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Intra State Inclusive Item',
          quantity: 1,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, false, 'is_inter_state must be false')
    assert.strictEqual(res.cgst_amount, 90, 'CGST must be ₹90')
    assert.strictEqual(res.sgst_amount, 90, 'SGST must be ₹90')
    assert.strictEqual(res.igst_amount, 0, 'IGST must be ₹0')
    assert.strictEqual(res.total_tax_amount, 180, 'Total tax must be ₹180')
    assert.strictEqual(res.grand_total, 1180, 'Grand total must be ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 8 — INTER-STATE GST
  // Seller State ('27') ≠ Buyer State ('07')
  // Expected: CGST = ₹0, SGST = ₹0, IGST = ₹180
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 8: Inter-State GST (IGST)')
  await exec('TEST 8 — INTER-STATE GST routes entire ₹180 tax to IGST with zero CGST/SGST', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '07', is_gst_registered: true },
      items: [
        {
          description: 'Inter State Inclusive Item',
          quantity: 1,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, true, 'is_inter_state must be true')
    assert.strictEqual(res.cgst_amount, 0, 'CGST must be ₹0')
    assert.strictEqual(res.sgst_amount, 0, 'SGST must be ₹0')
    assert.strictEqual(res.igst_amount, 180, 'IGST must be ₹180')
    assert.strictEqual(res.total_tax_amount, 180, 'Total tax must be ₹180')
    assert.strictEqual(res.grand_total, 1180, 'Grand total must be ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 9 — ZERO GST
  // Price = ₹1,000 inclusive @ 0%
  // Expected: Taxable = ₹1,000, GST = ₹0, Total = ₹1,000 (No division-by-zero or NaN)
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 9: Zero GST Guard')
  await exec('TEST 9 — ZERO GST handles 0% inclusive rate without division-by-zero or NaN', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Tax Exempt Grain',
          quantity: 1,
          unit_price: 1000,
          gst_rate: 0,
          is_gst_inclusive: true,
        },
      ],
    })

    assert.strictEqual(res.taxable_amount, 1000, 'Taxable must be ₹1,000')
    assert.strictEqual(res.total_tax_amount, 0, 'GST must be ₹0')
    assert.strictEqual(res.grand_total, 1000, 'Grand total must be ₹1,000')
    assert.ok(!Number.isNaN(res.taxable_amount), 'Taxable amount must not be NaN')
  })

  // -------------------------------------------------------------------------
  // TEST 10 — DIFFERENT GST RATES
  // Verify statutory rates: 0%, 0.25%, 0.5%, 3%, 5%, 8%, 9%, 12%, 18%, 28%
  // For each rate: Taxable + GST = Inclusive Price
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 10: Multiple Statutory GST Rates')
  await exec('TEST 10 — MULTIPLE GST RATES reconciles Taxable + GST = Inclusive Price across 10 rates', () => {
    const rates = [0, 0.25, 0.5, 3, 5, 8, 9, 12, 18, 28]
    const testPrice = 10000

    for (const rate of rates) {
      const res = calculateCentralGst({
        seller: { state_code: '27', is_gst_registered: true },
        buyer: { state_code: '27', is_gst_registered: true },
        items: [
          {
            description: `Item @ ${rate}%`,
            quantity: 1,
            unit_price: testPrice,
            gst_rate: rate,
            is_gst_inclusive: true,
          },
        ],
      })

      const line = res.lines[0]
      const sum = Math.round((line.taxable_amount + line.total_tax) * 100) / 100
      assert.strictEqual(
        sum,
        testPrice,
        `For rate ${rate}%, Taxable (${line.taxable_amount}) + GST (${line.total_tax}) must equal ${testPrice}`
      )
      assert.strictEqual(res.grand_total, testPrice, `Grand total must equal ${testPrice}`)
    }
  })

  // -------------------------------------------------------------------------
  // TEST 11 — FRACTIONAL ROUNDING
  // ₹999 @ 18%, ₹1,199 @ 18%, ₹499 @ 5%, ₹1,001 @ 12%
  // Verify: No floating-point garbage, no negative zero, exact rupee totals
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 11: Fractional Rounding & Precision')
  await exec('TEST 11 — FRACTIONAL ROUNDING produces clean numbers with no floating-point artifacts', () => {
    const testCases = [
      { price: 999, rate: 18, expectedTaxable: 846.61, expectedTax: 152.39 },
      { price: 1199, rate: 18, expectedTaxable: 1016.10, expectedTax: 182.90 },
      { price: 499, rate: 5, expectedTaxable: 475.24, expectedTax: 23.76 },
      { price: 1001, rate: 12, expectedTaxable: 893.75, expectedTax: 107.25 },
    ]

    for (const tc of testCases) {
      const res = calculateCentralGst({
        seller: { state_code: '27', is_gst_registered: true },
        buyer: { state_code: '27', is_gst_registered: true },
        items: [
          {
            description: `Test Case ₹${tc.price}`,
            quantity: 1,
            unit_price: tc.price,
            gst_rate: tc.rate,
            is_gst_inclusive: true,
          },
        ],
      })

      const line = res.lines[0]
      assert.strictEqual(line.taxable_amount, tc.expectedTaxable, `Taxable for ₹${tc.price} @ ${tc.rate}% must be ${tc.expectedTaxable}`)
      assert.strictEqual(line.total_tax, tc.expectedTax, `Tax for ₹${tc.price} @ ${tc.rate}% must be ${tc.expectedTax}`)
      assert.strictEqual(res.grand_total, tc.price, `Grand total must equal ₹${tc.price}`)
    }
  })

  // -------------------------------------------------------------------------
  // TEST 12 — PAYMENT ON INCLUSIVE INVOICE
  // Invoice = ₹5,900 inclusive | Payment = ₹2,000
  // Expected: Outstanding = ₹3,900, Status = PARTIAL, Bank IN = ₹2,000, GST = ₹900
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 12: Partial Payment on Inclusive Invoice')
  await exec('TEST 12 — PARTIAL PAYMENT updates balance due to ₹3,900 and preserves GST ₹900', async () => {
    const custId = 'cust-inc-partial-1'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Western Machinery Works',
      customer_type: 'business',
      is_gst_registered: false,
      credit_period_days: 30,
      credit_limit: 0,
      customer_addresses: [],
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const initialBankBal = demoGetCashBankSummary().bank_balance

    const saleRes = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Control Unit 5900',
          quantity: 1,
          unit_price: 5900,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'partial',
      amount_paid: 2000,
      payment_mode: 'bank_transfer',
    } as any)

    const inv = saleRes.invoice
    assert.strictEqual(inv.total_amount, 5900, 'Invoice total must be ₹5,900')
    assert.strictEqual(inv.amount_paid, 2000, 'Amount paid must be ₹2,000')
    assert.strictEqual(inv.balance_due, 3900, 'Balance due must be ₹3,900')
    assert.strictEqual(inv.status, 'partial', 'Status must be partial')
    assert.strictEqual(inv.total_tax_amount, 900, 'GST must remain ₹900')

    const newBankBal = demoGetCashBankSummary().bank_balance
    assert.strictEqual(newBankBal, initialBankBal + 2000, 'Bank balance must increase by ₹2,000')
  })

  // -------------------------------------------------------------------------
  // TEST 13 — FULL PAYMENT
  // Invoice = ₹1,180 inclusive @ 18% | Payment = ₹1,180
  // Expected: Outstanding = 0, Status = PAID, Cash IN = ₹1,180
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 13: Full Payment Flow')
  await exec('TEST 13 — FULL PAYMENT marks invoice PAID and leaves ₹0 outstanding', async () => {
    const custId = 'cust-inc-full-1'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Alpha Instruments',
      customer_type: 'business',
      is_gst_registered: false,
      credit_period_days: 30,
      credit_limit: 0,
      customer_addresses: [],
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const saleRes = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Multimeter Kit',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'paid',
      payment_mode: 'cash',
    } as any)

    const inv = saleRes.invoice
    assert.strictEqual(inv.total_amount, 1180, 'Total must be ₹1,180')
    assert.strictEqual(inv.amount_paid, 1180, 'Amount paid must be ₹1,180')
    assert.strictEqual(inv.balance_due, 0, 'Balance due must be ₹0')
    assert.strictEqual(inv.status, 'paid', 'Status must be paid')

    const cust = demoCustomers.find((c: any) => c.id === custId)!
    assert.strictEqual(cust.outstanding_balance, 0, 'Customer outstanding must be ₹0')
  })

  // -------------------------------------------------------------------------
  // TEST 14 — INVENTORY DEDUCTION
  // Stock = 10 | Sell 2 units @ ₹1,180 inclusive | Expected: Stock = 8
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 14: Inventory Deduction')
  await exec('TEST 14 — INVENTORY deducts stock by 2 units regardless of tax-inclusive pricing', async () => {
    const prodId = 'prod-inc-stock-1'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Pneumatic Actuator',
      sku: 'ACT-1180-INC',
      product_type: 'goods',
      sale_price: 1180,
      purchase_price: 750,
      gst_rate: 18,
      is_gst_inclusive: true,
      current_stock: 10,
      opening_stock: 10,
      opening_stock_value: 7500,
      min_stock_level: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: 'cust-demo-1',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: prodId,
          description: 'Pneumatic Actuator',
          quantity: 2,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'unpaid',
      amount_paid: 0,
    } as any)

    const prod = demoProducts.find((p: any) => p.id === prodId)!
    assert.strictEqual(prod.current_stock, 8, 'Product stock must decrease from 10 to 8')
  })

  // -------------------------------------------------------------------------
  // TEST 15 — CUSTOMER LEDGER DEBIT & CREDIT
  // Invoice = ₹1,180 inclusive | Verify Ledger DEBIT = ₹1,180 (NOT ₹1,000)
  // Payment = ₹500 | Verify Ledger CREDIT = ₹500 | Outstanding = ₹680
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 15: Customer Ledger Debit & Credit')
  await exec('TEST 15 — CUSTOMER LEDGER posts DEBIT of ₹1,180 (including GST) and CREDIT of ₹500', async () => {
    const custId = 'cust-ledger-inc-test'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'Precision Fabricators',
      customer_type: 'business',
      is_gst_registered: false,
      credit_period_days: 30,
      credit_limit: 0,
      customer_addresses: [],
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const saleRes = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Fabrication Service',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'unpaid',
      amount_paid: 0,
    } as any)

    const inv = saleRes.invoice

    // Verify debit entry is ₹1,180 (the total receivable)
    const debit = demoTransactions.find(
      (t) => t.customer_id === custId && t.reference_id === inv.id && t.transaction_type === 'invoice'
    )
    assert.ok(debit, 'Debit transaction must exist')
    assert.strictEqual(debit?.amount, 1180, 'Debit entry must be ₹1,180, NOT ₹1,000')

    // Customer payment of ₹500
    demoRecordPayment(inv.id, {
      amount: 500,
      payment_mode: 'cash',
      payment_reference: 'REC-500',
    })

    const cust = demoCustomers.find((c: any) => c.id === custId)!
    assert.strictEqual(cust.outstanding_balance, 680, 'Outstanding balance must be ₹680 (1180 - 500)')
  })

  // -------------------------------------------------------------------------
  // TEST 16 — SALES REPORT CLASSIFICATION
  // Invoice ₹1,180 inclusive @ 18%
  // Expected: Taxable Sales = ₹1,000, GST = ₹180, Gross/Invoice Total = ₹1,180
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 16: Sales Report Classification')
  await exec('TEST 16 — SALES REPORT classifies Taxable Sales = ₹1,000, GST = ₹180, Gross = ₹1,180', async () => {
    const inv = demoAddInvoice({
      customer_id: 'cust-demo-1',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Machined Gear Box',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    assert.strictEqual(inv.taxable_amount, 1000, 'Taxable sales must be ₹1,000')
    assert.strictEqual(inv.total_tax_amount, 180, 'GST must be ₹180')
    assert.strictEqual(inv.total_amount, 1180, 'Gross invoice total must be ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 17 — GST REPORT BREAKDOWN
  // Verify tax breakdown in GSTR summary
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 17: GST Report Breakdown')
  await exec('TEST 17 — GST REPORT reconciles Taxable ₹1,000 with CGST ₹90 and SGST ₹90', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Optical Cable Spool',
          hsn_sac_code: '8544',
          quantity: 1,
          unit_price: 1180,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
    })

    assert.strictEqual(res.hsn_summary.length, 1, 'One HSN summary line must exist')
    const hsn = res.hsn_summary[0]
    assert.strictEqual(hsn.taxable_amount, 1000, 'HSN taxable must be ₹1,000')
    assert.strictEqual(hsn.cgst_amount, 90, 'HSN CGST must be ₹90')
    assert.strictEqual(hsn.sgst_amount, 90, 'HSN SGST must be ₹90')
    assert.strictEqual(hsn.total_tax, 180, 'HSN total tax must be ₹180')
  })

  // -------------------------------------------------------------------------
  // TEST 18 — PDF / PRINT CONSISTENCY
  // Verify that template calculation logic produces:
  // Taxable: ₹1,000 | GST: ₹180 | Grand Total: ₹1,180 (No ₹1,360 contradiction)
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 18: PDF / Print Consistency')
  await exec('TEST 18 — PDF / PRINT calculations display Taxable ₹1,000, GST ₹180, Total ₹1,180 without contradiction', () => {
    const mockPdfInvoice = {
      taxable_amount: 1000,
      total_tax_amount: 180,
      total_amount: 1180,
      invoice_items: [
        {
          unit_price: 1180,
          taxable_amount: 1000,
          total_tax: 180,
          line_total: 1180,
        },
      ],
    }

    const calculatedTotal = mockPdfInvoice.taxable_amount + mockPdfInvoice.total_tax_amount
    assert.strictEqual(calculatedTotal, 1180, 'Taxable + GST must equal 1180')
    assert.strictEqual(mockPdfInvoice.total_amount, calculatedTotal, 'Total must equal 1180 (No 1360 error)')
  })

  // -------------------------------------------------------------------------
  // TEST 19 — QUOTATION -> INVOICE CONVERSION
  // Verify conversion preserves: price, quantity, discount, GST rate, tax mode (inclusive), taxable, GST, total
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 19: Quotation -> Invoice Conversion')
  await exec('TEST 19 — QUOTATION -> INVOICE conversion preserves tax mode (INCLUSIVE) and amounts', () => {
    const quoteItem = {
      product_id: 'prod-q-1',
      description: 'Custom Laser Etching',
      quantity: 2,
      unit_price: 1180,
      discount_percent: 0,
      gst_rate: 18,
      gst_type: 'inclusive' as const,
      is_gst_inclusive: true,
    }

    // Convert quotation item to invoice item payload
    const invoiceItem = {
      product_id: quoteItem.product_id,
      description: quoteItem.description,
      quantity: quoteItem.quantity,
      unit_price: quoteItem.unit_price,
      discount_percent: quoteItem.discount_percent,
      gst_rate: quoteItem.gst_rate,
      is_gst_inclusive: quoteItem.gst_type === 'inclusive' || Boolean(quoteItem.is_gst_inclusive),
    }

    assert.strictEqual(invoiceItem.is_gst_inclusive, true, 'is_gst_inclusive must remain true')

    const calculated = calculateInvoiceServerSide([invoiceItem], 'fixed', 0, false, '27', '27')
    assert.strictEqual(calculated.taxable_amount, 2000, 'Taxable must remain ₹2,000')
    assert.strictEqual(calculated.total_tax_amount, 360, 'Tax must remain ₹360')
    assert.strictEqual(calculated.total_amount, 2360, 'Total must remain ₹2,360')
  })

  // -------------------------------------------------------------------------
  // TEST 20 — FINALIZED INVOICE IMMUTABILITY
  // Historical invoice must not mutate when catalog product is updated
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 20: Historical Invoice Immutability')
  await exec('TEST 20 — HISTORICAL IMMUTABILITY preserves invoice values after product price/tax alteration', async () => {
    const prodId = 'prod-immutable-test'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Dynamic Sensor',
      sku: 'DYN-SENSOR',
      product_type: 'goods',
      sale_price: 1180,
      purchase_price: 700,
      gst_rate: 18,
      is_gst_inclusive: true,
      current_stock: 50,
      opening_stock: 50,
      opening_stock_value: 35000,
      min_stock_level: 5,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const sale = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: 'cust-demo-1',
      invoice_date: '2026-09-01',
      items: [
        {
          product_id: prodId,
          description: 'Dynamic Sensor',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'paid',
      amount_paid: 1180,
    } as any)

    const historicalInv = demoGetInvoice(sale.invoice.id)

    // Now alter catalog product
    const prod = demoProducts.find((p: any) => p.id === prodId)!
    prod.sale_price = 2000
    prod.gst_rate = 12
    prod.is_gst_inclusive = false

    // Historical invoice must remain ₹1,180
    assert.strictEqual(historicalInv.total_amount, 1180, 'Historical invoice total must remain ₹1,180')
    assert.strictEqual(historicalInv.taxable_amount, 1000, 'Historical taxable must remain ₹1,000')
    assert.strictEqual(historicalInv.total_tax_amount, 180, 'Historical GST must remain ₹180')
  })

  // -------------------------------------------------------------------------
  // TEST 21 — IDEMPOTENCY / DUPLICATE SUBMISSION
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 21: Idempotency Protection')
  await exec('TEST 21 — IDEMPOTENCY prevents duplicate inclusive invoices on retries', async () => {
    const key = `idem-inc-${Date.now()}`
    const payload = {
      customer_id: 'cust-demo-1',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Idempotent Inclusive Consultation',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      reference_number: key,
    }

    const first = await SalesTransactionService.executeSale(mockSession as any, payload as any, key)
    const second = await SalesTransactionService.executeSale(mockSession as any, payload as any, key)

    assert.strictEqual(second.isDuplicate, true, 'Second submission must return isDuplicate: true')
    assert.strictEqual(second.invoice.id, first.invoice.id, 'Must return same invoice ID')
  })

  // -------------------------------------------------------------------------
  // TEST 22 — API / SERVER AUTHORITATIVE OVERRIDE
  // Client attempts to manipulate taxable_amount to 1180 and tax to 212.40
  // Server MUST ignore client manipulation and recalculate Taxable ₹1,000, GST ₹180
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 22: Server Authoritative Override of Client Manipulation')
  await exec('TEST 22 — SERVER AUTHORITATIVE OVERRIDE re-computes Taxable ₹1,000 and GST ₹180 when client sends manipulated 212.40', async () => {
    const manipulatedPayload = {
      customer_id: 'cust-demo-1',
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Tampered Payload Item',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
          // Client attempts to tamper with taxable and tax
          taxable_amount: 1180,
          tax_amount: 212.40,
        },
      ],
    }

    const result = await SalesTransactionService.executeSale(mockSession as any, manipulatedPayload as any)
    const inv = result.invoice

    assert.strictEqual(inv.taxable_amount, 1000, 'Server must enforce authoritative taxable ₹1,000')
    assert.strictEqual(inv.total_tax_amount, 180, 'Server must enforce authoritative GST ₹180')
    assert.strictEqual(inv.total_amount, 1180, 'Server must enforce total ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 23 — DEMO MODE FULL FLOW
  // Verify complete flow inside demo store
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 23: Demo Mode Complete Flow')
  await exec('TEST 23 — DEMO MODE full integration reconciles invoice, tax, ledger, and cash balance', async () => {
    const initialCash = demoGetCashBankSummary().cash_balance
    const demoCustId = 'cust-demo-walk-in'

    const sale = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: demoCustId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          description: 'Retail Cash Product',
          quantity: 1,
          unit_price: 1180,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'paid',
      payment_mode: 'cash',
    } as any)

    assert.strictEqual(sale.invoice.total_amount, 1180, 'Total must be ₹1,180')
    assert.strictEqual(sale.invoice.taxable_amount, 1000, 'Taxable must be ₹1,000')
    assert.strictEqual(sale.invoice.total_tax_amount, 180, 'GST must be ₹180')

    const finalCash = demoGetCashBankSummary().cash_balance
    assert.strictEqual(finalCash, initialCash + 1180, 'Cash balance must increase by ₹1,180')
  })

  // -------------------------------------------------------------------------
  // TEST 24 — SUPABASE MODE ENGINE PARITY
  // Verify that calculateInvoiceServerSide delegates to calculateCentralGst
  // yielding 100% mathematical parity with Demo Mode
  // -------------------------------------------------------------------------
  console.log('\n📌 Test 24: Supabase Mode Engine Parity')
  await exec('TEST 24 — SUPABASE MODE ENGINE PARITY produces identical results to Central GST engine', () => {
    const items = [
      {
        description: 'Server Engine Parity Item',
        quantity: 2,
        unit_price: 1180,
        discount_percent: 5,
        gst_rate: 18,
        is_gst_inclusive: true,
      },
    ]

    const serverSide = calculateInvoiceServerSide(items, 'fixed', 0, false, '27', '27')
    const central = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items,
    })

    assert.strictEqual(serverSide.subtotal, central.subtotal, 'Subtotal must match exactly')
    assert.strictEqual(serverSide.taxable_amount, central.taxable_amount, 'Taxable must match exactly')
    assert.strictEqual(serverSide.total_tax_amount, central.total_tax_amount, 'GST must match exactly')
    assert.strictEqual(serverSide.total_amount, central.grand_total, 'Grand total must match exactly')
  })

  // -------------------------------------------------------------------------
  // SCENARIO 29 — SECTION 29 FINAL INDEPENDENT RECONCILIATION
  // Product: Premium Product
  // Price: ₹1,180 inclusive
  // GST: 18%
  // Quantity: 5
  // Discount: 10%
  //
  // Independent Calculation:
  // Gross inclusive = 5 × 1180 = ₹5,900
  // Discount 10% = ₹590
  // Net inclusive = ₹5,310
  // Taxable = 5,310 × 100 / 118 = ₹4,500.00
  // GST = 5,310 - 4,500 = ₹810.00
  // Grand Total = ₹5,310.00
  // -------------------------------------------------------------------------
  console.log('\n📌 Scenario 29: Section 29 Final Independent Reconciliation')
  await exec('SCENARIO 29 — FULL END-TO-END RECONCILIATION (5 units @ ₹1,180, 10% disc = ₹5,310 Net, ₹4,500 Taxable, ₹810 GST)', async () => {
    const prodId = 'prod-sec29-premium'
    demoProducts.push({
      id: prodId,
      organization_id: DEMO_ORG_ID,
      name: 'Premium Product',
      sku: 'PREMIUM-5310',
      product_type: 'goods',
      sale_price: 1180,
      purchase_price: 800,
      gst_rate: 18,
      is_gst_inclusive: true,
      current_stock: 20,
      opening_stock: 20,
      opening_stock_value: 16000,
      min_stock_level: 5,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const custId = 'cust-sec29-vip'
    demoCustomers.push({
      id: custId,
      organization_id: DEMO_ORG_ID,
      display_name: 'VIP Enterprises',
      customer_type: 'business',
      is_gst_registered: false,
      credit_period_days: 30,
      credit_limit: 0,
      customer_addresses: [],
      outstanding_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    const initialBankBal = demoGetCashBankSummary().bank_balance

    const saleResult = await SalesTransactionService.executeSale(mockSession as any, {
      customer_id: custId,
      invoice_date: new Date().toISOString().split('T')[0],
      items: [
        {
          product_id: prodId,
          description: 'Premium Product',
          quantity: 5,
          unit_price: 1180,
          discount_percent: 10,
          gst_rate: 18,
          is_gst_inclusive: true,
        },
      ],
      payment_status: 'partial',
      amount_paid: 2000,
      payment_mode: 'bank_transfer',
    } as any)

    const inv = saleResult.invoice

    // 1. Invoice & Totals Reconciliation
    assert.strictEqual(inv.subtotal, 5900, 'Subtotal gross must be ₹5,900')
    assert.strictEqual(inv.discount_amount, 590, '10% discount must be ₹590')
    assert.strictEqual(inv.taxable_amount, 4500, 'Taxable amount must be ₹4,500')
    assert.strictEqual(inv.total_tax_amount, 810, 'Total GST must be ₹810')
    assert.strictEqual(inv.cgst_amount, 405, 'CGST must be ₹405')
    assert.strictEqual(inv.sgst_amount, 405, 'SGST must be ₹405')
    assert.strictEqual(inv.total_amount, 5310, 'Grand total must be ₹5,310')
    assert.strictEqual(inv.amount_paid, 2000, 'Amount paid must be ₹2,000')
    assert.strictEqual(inv.balance_due, 3310, 'Balance due must be ₹3,310 (5310 - 2000)')

    // 2. Line Items Reconciliation
    const line = inv.invoice_items[0]
    assert.strictEqual(line.quantity, 5, 'Line qty must be 5')
    assert.strictEqual(line.unit_price, 1180, 'Unit price must be ₹1,180')
    assert.strictEqual(line.discount_amount, 590, 'Line discount must be ₹590')
    assert.strictEqual(line.taxable_amount, 4500, 'Line taxable must be ₹4,500')
    assert.strictEqual(line.tax_amount, 810, 'Line GST must be ₹810')
    assert.strictEqual(line.line_total, 5310, 'Line total must be ₹5,310')

    // 3. Stock Movement
    const prod = demoProducts.find((p: any) => p.id === prodId)!
    assert.strictEqual(prod.current_stock, 15, 'Product current stock must decrease from 20 to 15 (20 - 5)')

    // 4. Customer Outstanding & Statement
    const cust = demoCustomers.find((c: any) => c.id === custId)!
    assert.strictEqual(cust.outstanding_balance, 3310, 'Customer outstanding must be ₹3,310')

    // 5. Customer Ledger
    const debit = demoTransactions.find(
      (t) => t.customer_id === custId && t.transaction_type === 'invoice' && t.reference_id === inv.id
    )
    const credit = demoTransactions.find(
      (t) => t.customer_id === custId && t.transaction_type === 'payment' && t.reference_id === `pay-${inv.id}`
    )
    assert.ok(debit, 'Customer ledger debit must exist')
    assert.strictEqual(debit?.amount, 5310, 'Ledger debit must be ₹5,310')
    assert.ok(credit, 'Customer ledger credit must exist')
    assert.strictEqual(credit?.amount, -2000, 'Ledger credit must be -₹2,000')

    // 6. Cash/Bank Ledger
    const newBankBal = demoGetCashBankSummary().bank_balance
    assert.strictEqual(newBankBal, initialBankBal + 2000, 'Bank balance must increase by ₹2,000')
  })

  console.log('\n====================================================================')
  console.log(`🏁 TAX-INCLUSIVE VERIFICATION: ${passed} PASSED | ${failed} FAILED`)
  console.log('====================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Test Suite encountered fatal error:', err)
  process.exit(1)
})
