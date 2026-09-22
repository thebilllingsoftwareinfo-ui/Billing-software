// ============================================================
// tests/tax-engine.test.ts
// Automated Unit Test Suite for Centralized GST Engine
// ============================================================

import assert from 'node:assert'
import {
  calculateCentralGst,
  isInterState,
} from '../lib/services/tax.service'

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS Centralized GST Engine Test Suite...\n')

  let passed = 0
  let total = 0

  async function test(name: string, fn: () => void | Promise<void>) {
    total++
    try {
      await fn()
      console.log(`  ✓ PASSED: ${name}`)
      passed++
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`)
      console.error(`     Error: ${err.message}`)
    }
  }

  // ── 1. Same-State Taxable Sale (Intra-State) ────────────────
  console.log('📌 Test Suite 1: Same-State (Intra-State) Taxable Supplies')

  await test('Same-state sale calculates CGST (50%) + SGST (50%) without IGST', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true, gst_scheme: 'regular' },
      buyer: { state_code: '27', is_gst_registered: true, gst_type: 'registered_regular' },
      items: [
        {
          description: 'Industrial Monitor',
          quantity: 2,
          unit_price: 10000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(result.is_inter_state, false, 'Is inter-state must be false for same state code')
    assert.strictEqual(result.subtotal, 20000, 'Subtotal must equal 20000')
    assert.strictEqual(result.taxable_amount, 20000, 'Taxable amount must equal 20000')
    assert.strictEqual(result.cgst_amount, 1800, 'CGST (9%) must equal 1800')
    assert.strictEqual(result.sgst_amount, 1800, 'SGST (9%) must equal 1800')
    assert.strictEqual(result.igst_amount, 0, 'IGST must equal 0')
    assert.strictEqual(result.total_tax_amount, 3600, 'Total tax must equal 3600')
    assert.strictEqual(result.grand_total, 23600, 'Grand total must equal 23600')
  })

  // ── 2. Interstate Taxable Sale ─────────────────────────────
  console.log('\n🌐 Test Suite 2: Inter-State Taxable Supplies')

  await test('Interstate sale calculates IGST (100%) without CGST/SGST', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true }, // Maharashtra
      buyer: { state_code: '07', is_gst_registered: true },  // Delhi
      items: [
        {
          description: 'Software License',
          quantity: 1,
          unit_price: 50000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(result.is_inter_state, true, 'Is inter-state must be true for different state codes')
    assert.strictEqual(result.cgst_amount, 0, 'CGST must be 0 for interstate supply')
    assert.strictEqual(result.sgst_amount, 0, 'SGST must be 0 for interstate supply')
    assert.strictEqual(result.igst_amount, 9000, 'IGST (18%) must equal 9000')
    assert.strictEqual(result.grand_total, 59000, 'Grand total must equal 59000')
  })

  // ── 3. Zero-Rated Scenarios (Exports / SEZ under LUT) ───────
  console.log('\n🚢 Test Suite 3: Zero-Rated Exports & SEZ Supplies')

  await test('Zero-rated export under LUT levies 0% GST (Section 16 IGST Act)', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '99', is_gst_registered: false, gst_type: 'sez_without_payment' },
      supply: { supply_type: 'zero_rated_export', lut_bond_provided: true },
      items: [
        {
          description: 'Software Consulting Export',
          quantity: 100,
          unit_price: 1000,
          gst_rate: 18, // Nominally 18%, but zero-rated
        },
      ],
    })

    assert.strictEqual(result.is_zero_rated, true, 'is_zero_rated must be true')
    assert.strictEqual(result.taxable_amount, 100000, 'Taxable amount must be 100000')
    assert.strictEqual(result.igst_amount, 0, 'IGST must be 0 for zero-rated LUT export')
    assert.strictEqual(result.total_tax_amount, 0, 'Total tax must be 0')
    assert.strictEqual(result.grand_total, 100000, 'Grand total must equal taxable value without tax')
  })

  // ── 4. Exempt Scenarios ────────────────────────────────────
  console.log('\n🌿 Test Suite 4: Exempt & Nil-Rated Supplies')

  await test('Exempt supply item levies 0% tax even if nominal GST rate is provided', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Unprocessed Agricultural Grain',
          quantity: 50,
          unit_price: 200,
          gst_rate: 5,
          tax_category: 'exempt',
        },
      ],
    })

    assert.strictEqual(result.lines[0].is_exempt, true, 'Line must be marked as exempt')
    assert.strictEqual(result.taxable_amount, 10000, 'Taxable value must equal 10000')
    assert.strictEqual(result.total_tax_amount, 0, 'Exempt item total tax must be 0')
    assert.strictEqual(result.grand_total, 10000, 'Grand total must equal 10000')
  })

  // ── 5. Discounts (Line Item & Invoice Level) ────────────────
  console.log('\n🏷️ Test Suite 5: Discounts Calculation')

  await test('Line item percentage discount and invoice-level fixed discount are computed prior to tax', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Product A',
          quantity: 10,
          unit_price: 1000, // Gross 10000
          discount_percent: 10, // Line discount 1000 -> 9000
          gst_rate: 18,
        },
      ],
      invoice_discount_type: 'fixed',
      invoice_discount_value: 500, // Invoice discount 500
    })

    assert.strictEqual(result.subtotal, 10000, 'Subtotal gross must equal 10000')
    assert.strictEqual(result.line_discounts_total, 1000, 'Line discount must equal 1000')
    assert.strictEqual(result.invoice_discount_amount, 500, 'Invoice discount must equal 500')
    assert.strictEqual(result.total_discount_amount, 1500, 'Total discount must equal 1500')
    assert.strictEqual(result.taxable_amount, 9000, 'Line taxable amount must equal 9000')
    assert.strictEqual(result.total_tax_amount, 1620, '18% tax on 9000 must equal 1620')
  })

  // ── 6. Multiple Line Items with Different GST Rates ────────
  console.log('\n📊 Test Suite 6: Multi-Item & Multi-Rate Invoice')

  await test('Invoice with items at different GST rates (0%, 5%, 12%, 18%, 28%) aggregates correct totals and HSN summary', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        { description: 'Item 0%', hsn_sac_code: '1001', quantity: 1, unit_price: 1000, gst_rate: 0 },
        { description: 'Item 5%', hsn_sac_code: '2002', quantity: 1, unit_price: 2000, gst_rate: 5 },
        { description: 'Item 12%', hsn_sac_code: '3003', quantity: 1, unit_price: 3000, gst_rate: 12 },
        { description: 'Item 18%', hsn_sac_code: '4004', quantity: 1, unit_price: 4000, gst_rate: 18 },
        { description: 'Item 28%', hsn_sac_code: '5005', quantity: 1, unit_price: 5000, gst_rate: 28 },
      ],
    })

    assert.strictEqual(result.subtotal, 15000, 'Subtotal must equal 15000')
    assert.strictEqual(result.taxable_amount, 15000, 'Total taxable value must equal 15000')
    // Taxes: 0 + 100 + 360 + 720 + 1400 = 2580
    assert.strictEqual(result.total_tax_amount, 2580, 'Total tax must equal 2580 (0 + 100 + 360 + 720 + 1400)')
    assert.strictEqual(result.cgst_amount, 1290, 'CGST must equal 1290')
    assert.strictEqual(result.sgst_amount, 1290, 'SGST must equal 1290')
    assert.strictEqual(result.grand_total, 17580, 'Grand total must equal 17580')
    assert.strictEqual(result.hsn_summary.length, 5, 'HSN summary must contain 5 grouped rate entries')
  })

  // ── 7. Statutory Rounding Rules ────────────────────────────
  console.log('\n🔢 Test Suite 7: Section 170 Statutory Rounding')

  await test('Fractional rupee tax amounts round half-up to 2 decimal places and grand total rounds off to nearest integer', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Odd Price Item',
          quantity: 3,
          unit_price: 333.33, // 999.99
          gst_rate: 18, // 179.9982 -> 180.00
        },
      ],
    })

    assert.strictEqual(result.taxable_amount, 999.99, 'Taxable value must equal 999.99')
    assert.strictEqual(result.total_tax_amount, 180, 'Total tax must round to 180.00')
    assert.strictEqual(result.unrounded_total, 1179.99, 'Unrounded total must equal 1179.99')
    assert.strictEqual(result.grand_total, 1180, 'Grand total must round off to 1180')
    assert.strictEqual(result.round_off_amount, 0.01, 'Round off amount must equal +0.01')
  })

  // ── 8. Composition Scheme Rules ───────────────────────────
  console.log('\n🏛️ Test Suite 8: Section 10 Composition Scheme')

  await test('Composition scheme dealer invoice levies 0% tax on buyer under Section 10 CGST Act', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true, gst_scheme: 'composition' },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Retail Sale by Composition Dealer',
          quantity: 1,
          unit_price: 5000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(result.is_composition_scheme, true, 'is_composition_scheme must be true')
    assert.strictEqual(result.total_tax_amount, 0, 'Composition dealer cannot collect tax from buyer')
    assert.strictEqual(result.grand_total, 5000, 'Grand total must equal 5000')
  })

  // ── 9. Reverse Charge Mechanism (RCM) ──────────────────────
  console.log('\n🔄 Test Suite 9: Section 9(3)/9(4) Reverse Charge Mechanism')

  await test('Reverse charge flag is captured on invoice breakdown', () => {
    const result = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      supply: { reverse_charge: true },
      items: [
        {
          description: 'Legal Services under RCM',
          quantity: 1,
          unit_price: 15000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(result.is_reverse_charge, true, 'is_reverse_charge must be true')
    assert.strictEqual(result.taxable_amount, 15000, 'Taxable value must equal 15000')
    assert.strictEqual(result.total_tax_amount, 2700, 'Tax amount must equal 2700')
  })

  console.log(`\n==================================================`)
  console.log(`📊 Centralized GST Engine Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
