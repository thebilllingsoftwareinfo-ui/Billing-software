// ============================================================
// tests/ugb-master.test.ts
// Comprehensive Test Suite for UGB Master Modules
// 1. Unit Management Engine (21+ standard units, conversion math, decimals)
// 2. GST / Tax Management Engine (All rates, UTGST, Cess, treatments)
// 3. Barcode Management Engine (EAN-13, Code-128, lookup, SVG)
// ============================================================

import assert from 'node:assert'
import {
  STANDARD_UNITS,
  toBaseQuantity,
  fromBaseQuantity,
  validateConversionRatio,
  isDecimalQuantityAllowed,
} from '../lib/services/unit.service'
import {
  calculateCentralGst,
  STANDARD_GST_RATES,
  UTGST_STATE_CODES,
  isUtgstTerritory,
  isInterState,
} from '../lib/services/tax.service'
import {
  generateEan13Barcode,
  generateCode128Barcode,
  calculateEan13CheckDigit,
  validateBarcode,
  lookupProductByBarcode,
  generateBarcodeSvg,
} from '../lib/services/barcode.service'

async function runUgbMasterTests() {
  console.log('🚀 Starting UGB Master Engine (Unit + GST + Barcode) Test Suite...\n')

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

  // ============================================================
  // MODULE 1: UNIT MANAGEMENT ENGINE
  // ============================================================
  console.log('📦 MODULE 1: UNIT MANAGEMENT ENGINE')

  await test('1.1 Standard GST Units contains 21+ predefined units', () => {
    assert(STANDARD_UNITS.length >= 21, `Expected at least 21 standard units, got ${STANDARD_UNITS.length}`)
    const pcs = STANDARD_UNITS.find((u) => u.short_name === 'PCS' || u.short_name === 'Pcs')
    assert(pcs, 'PCS unit must exist in standard units')
    assert.strictEqual(pcs?.decimals_allowed, false, 'PCS must not allow decimals')

    const kgs = STANDARD_UNITS.find((u) => u.short_name === 'KGS' || u.short_name === 'Kg')
    assert(kgs, 'KGS unit must exist in standard units')
    assert.strictEqual(kgs?.decimals_allowed, true, 'KGS must allow decimals')
  })

  await test('1.2 Conversion math: Secondary unit to Base unit (toBaseQuantity)', () => {
    // 1 Box = 10 Pcs. Selling 5 Boxes => 50 Pcs in base stock.
    const baseQty = toBaseQuantity(5, 10)
    assert.strictEqual(baseQty, 50, '5 Boxes at 10 Pcs/Box must equal 50 Pcs')
  })

  await test('1.3 Conversion math: Base unit to Secondary unit (fromBaseQuantity)', () => {
    // 50 Pcs in base stock => 5 Boxes
    const secondaryQty = fromBaseQuantity(50, 10)
    assert.strictEqual(secondaryQty, 5, '50 Pcs with ratio 10 must equal 5 Boxes')
  })

  await test('1.4 Conversion ratio validation enforces strictly positive numbers', () => {
    assert.strictEqual(validateConversionRatio(10), true)
    assert.strictEqual(validateConversionRatio(0.5), true)
    assert.strictEqual(validateConversionRatio(0), false)
    assert.strictEqual(validateConversionRatio(-5), false)
  })

  await test('1.5 Decimal allowance helper honors integer vs fractional unit categories', () => {
    assert.strictEqual(isDecimalQuantityAllowed('PCS'), false)
    assert.strictEqual(isDecimalQuantityAllowed('NOS'), false)
    assert.strictEqual(isDecimalQuantityAllowed('BOX'), false)
    assert.strictEqual(isDecimalQuantityAllowed('KGS'), true)
    assert.strictEqual(isDecimalQuantityAllowed('GMS'), true)
    assert.strictEqual(isDecimalQuantityAllowed('LTR'), true)
    assert.strictEqual(isDecimalQuantityAllowed('MTR'), true)
  })

  // ============================================================
  // MODULE 2: GST / TAX MANAGEMENT ENGINE
  // ============================================================
  console.log('\n🏛️ MODULE 2: GST / TAX MANAGEMENT ENGINE')

  await test('2.1 STANDARD_GST_RATES includes all official GST rates', () => {
    const expected = [0, 0.1, 0.25, 0.5, 1, 1.5, 3, 5, 7.5, 12, 18, 28]
    expected.forEach((r) => {
      assert(STANDARD_GST_RATES.includes(r as any), `Missing rate ${r}% in STANDARD_GST_RATES`)
    })
  })

  await test('2.2 Intra-State supply calculates 50% CGST + 50% SGST', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Office Chair',
          quantity: 2,
          unit_price: 5000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, false)
    assert.strictEqual(res.taxable_amount, 10000)
    assert.strictEqual(res.cgst_amount, 900)
    assert.strictEqual(res.sgst_amount, 900)
    assert.strictEqual(res.utgst_amount, 0)
    assert.strictEqual(res.igst_amount, 0)
    assert.strictEqual(res.total_tax_amount, 1800)
    assert.strictEqual(res.grand_total, 11800)
  })

  await test('2.3 Inter-State supply calculates 100% IGST without CGST/SGST', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '29', is_gst_registered: true }, // Karnataka
      items: [
        {
          description: 'Office Server',
          quantity: 1,
          unit_price: 50000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, true)
    assert.strictEqual(res.taxable_amount, 50000)
    assert.strictEqual(res.igst_amount, 9000)
    assert.strictEqual(res.cgst_amount, 0)
    assert.strictEqual(res.sgst_amount, 0)
    assert.strictEqual(res.utgst_amount, 0)
    assert.strictEqual(res.grand_total, 59000)
  })

  await test('2.4 Union Territory supply calculates CGST + UTGST (50/50 split) without SGST', () => {
    // Seller in Daman & Diu (code 26), Buyer in Daman & Diu (code 26)
    const isUt = isUtgstTerritory('26')
    assert.strictEqual(isUt, true, 'State code 26 must be recognized as a UTGST territory')

    const res = calculateCentralGst({
      seller: { state_code: '26', is_gst_registered: true },
      buyer: { state_code: '26', is_gst_registered: true },
      items: [
        {
          description: 'Local Hardware Goods',
          quantity: 1,
          unit_price: 20000,
          gst_rate: 18,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, false)
    assert.strictEqual(res.taxable_amount, 20000)
    assert.strictEqual(res.cgst_amount, 1800, 'CGST must be 9% (1800)')
    assert.strictEqual(res.utgst_amount, 1800, 'UTGST must be 9% (1800)')
    assert.strictEqual(res.sgst_amount, 0, 'SGST must be 0 for Union Territory supply')
    assert.strictEqual(res.total_tax_amount, 3600)
  })

  await test('2.5 Delhi (07) and Puducherry (34) have their own legislature and use SGST, NOT UTGST', () => {
    assert.strictEqual(isUtgstTerritory('07'), false, 'Delhi has legislature, must not use UTGST')
    assert.strictEqual(isUtgstTerritory('34'), false, 'Puducherry has legislature, must not use UTGST')

    const res = calculateCentralGst({
      seller: { state_code: '07', is_gst_registered: true },
      buyer: { state_code: '07', is_gst_registered: true },
      items: [{ description: 'Delhi Local Item', quantity: 1, unit_price: 10000, gst_rate: 18 }],
    })
    assert.strictEqual(res.sgst_amount, 900, 'Delhi supply must calculate SGST')
    assert.strictEqual(res.utgst_amount, 0, 'Delhi supply must have 0 UTGST')
  })

  await test('2.6 Custom arbitrary GST rate (e.g. 6%) calculates correctly', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Custom Rate Supply',
          quantity: 1,
          unit_price: 10000,
          gst_rate: 6, // 6% custom rate => 3% CGST + 3% SGST
        },
      ],
    })

    assert.strictEqual(res.taxable_amount, 10000)
    assert.strictEqual(res.cgst_amount, 300)
    assert.strictEqual(res.sgst_amount, 300)
    assert.strictEqual(res.total_tax_amount, 600)
    assert.strictEqual(res.grand_total, 10600)
  })

  await test('2.7 Compensation Cess: Percentage (ad-valorem) + Fixed (₹/unit) Cess calculation', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Aerated Drink with Cess',
          quantity: 10,
          unit_price: 100, // Total = 1000
          gst_rate: 28, // 280 GST
          cess_rate: 12, // 12% ad-valorem cess = 120
          cess_amount: 5, // 5 Rs/unit specific cess = 50
        },
      ],
    })

    assert.strictEqual(res.taxable_amount, 1000)
    assert.strictEqual(res.cgst_amount, 140)
    assert.strictEqual(res.sgst_amount, 140)
    assert.strictEqual(res.cess_amount, 170, '12% of 1000 (120) + 10 units * 5 Rs (50) = 170')
    assert.strictEqual(res.total_tax_amount, 450, '280 GST + 170 Cess = 450')
    assert.strictEqual(res.grand_total, 1450)
  })

  await test('2.8 Tax treatments: Exempt, Nil Rated, and Export under LUT zero out GST', () => {
    const exemptRes = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [{ description: 'Exempt Goods', quantity: 1, unit_price: 5000, gst_rate: 18, tax_treatment: 'exempt' }],
    })
    assert.strictEqual(exemptRes.total_tax_amount, 0)
    assert.strictEqual(exemptRes.grand_total, 5000)

    const lutRes = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '99', is_gst_registered: false },
      items: [{ description: 'Export Services', quantity: 1, unit_price: 100000, gst_rate: 18, tax_treatment: 'zero_rated_export' }],
    })
    assert.strictEqual(lutRes.total_tax_amount, 0)
    assert.strictEqual(lutRes.grand_total, 100000)
  })

  // ============================================================
  // MODULE 3: BARCODE MANAGEMENT ENGINE
  // ============================================================
  console.log('\n🏷️ MODULE 3: BARCODE MANAGEMENT ENGINE')

  await test('3.1 EAN-13 Check Digit calculation follows standard Modulo-10 formula', () => {
    // Standard barcode: 890103038345 + check digit 8
    const checkDigit1 = calculateEan13CheckDigit('890103038345')
    assert.strictEqual(checkDigit1, 8, 'Check digit for 890103038345 must be 8')

    // Standard barcode: 400638133393 + check digit 1
    const checkDigit2 = calculateEan13CheckDigit('400638133393')
    assert.strictEqual(checkDigit2, 1, 'Check digit for 400638133393 must be 1')
  })

  await test('3.2 generateEan13Barcode produces valid 13-digit EAN-13 barcodes with correct checksum', () => {
    const barcode = generateEan13Barcode('890')
    assert.strictEqual(barcode.length, 13, 'EAN-13 must be 13 digits')
    assert(barcode.startsWith('890'), 'Should start with Indian prefix 890')

    const validation = validateBarcode(barcode)
    assert.strictEqual(validation.valid, true, `Generated EAN-13 ${barcode} must be valid`)
    assert.strictEqual(validation.symbology, 'EAN13')
  })

  await test('3.3 generateCode128Barcode generates valid alphanumeric Code-128 barcode', () => {
    const code = generateCode128Barcode('BC')
    assert(code.startsWith('BC-'), 'Should start with prefix BC-')
    const validation = validateBarcode(code)
    assert.strictEqual(validation.valid, true, `Code 128 ${code} must be valid`)
    assert.strictEqual(validation.symbology, 'CODE128')
  })

  await test('3.4 lookupProductByBarcode resolves via primary barcode, secondary aliases, or SKU', () => {
    const catalog = [
      {
        id: 'p-1',
        name: 'Wireless Mouse',
        sku: 'SKU-WM-01',
        barcode: '8901234567890',
        barcodes: ['ALIAS-WM-A', 'ALIAS-WM-B'],
      },
      {
        id: 'p-2',
        name: 'Mechanical Keyboard',
        sku: 'SKU-KB-02',
        barcode: '8909876543210',
        barcodes: [],
      },
    ]

    // 1. Primary barcode match
    const match1 = lookupProductByBarcode('8901234567890', catalog)
    assert.strictEqual(match1?.id, 'p-1', 'Should match primary barcode')

    // 2. Secondary barcode alias match
    const match2 = lookupProductByBarcode('ALIAS-WM-A', catalog)
    assert.strictEqual(match2?.id, 'p-1', 'Should match secondary barcode alias')

    // 3. Case-insensitive alias match
    const match3 = lookupProductByBarcode('alias-wm-b', catalog)
    assert.strictEqual(match3?.id, 'p-1', 'Should match secondary alias case-insensitively')

    // 4. SKU fallback match
    const match4 = lookupProductByBarcode('SKU-KB-02', catalog)
    assert.strictEqual(match4?.id, 'p-2', 'Should match SKU')

    // 5. Unknown barcode returns null
    const match5 = lookupProductByBarcode('UNKNOWN-CODE-999', catalog)
    assert.strictEqual(match5, null, 'Unknown barcode must return null')
  })

  await test('3.5 generateBarcodeSvg renders valid vector SVG pattern without external dependencies', () => {
    const svg = generateBarcodeSvg('8901234567890', { width: 200, height: 60, showText: true })
    assert(svg.includes('<svg'), 'Output must contain <svg> tag')
    assert(svg.includes('</svg>'), 'Output must close with </svg>')
    assert(svg.includes('<rect'), 'Output must render bars using <rect>')
    assert(svg.includes('8901234567890'), 'Output must include text label')
  })

  // Summary
  console.log(`\n==================================================`)
  console.log(`🏁 Test Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runUgbMasterTests().catch((err) => {
  console.error('Test Suite execution failed:', err)
  process.exit(1)
})
