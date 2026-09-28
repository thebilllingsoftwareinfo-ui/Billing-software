// ============================================================
// tests/phase5-category-ugb.test.ts
// Phase 5 Test Suite: Business Category Engine + UGB + Complete Integration
// ============================================================

import assert from 'node:assert'
import {
  CATEGORY_CONFIGS,
  resolveBaseCategory,
  getCategoryConfig,
} from '../lib/config/business-categories.config'
import {
  BusinessCategoryService,
} from '../lib/services/business-category.service'
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
import {
  demoProducts,
  demoAddProduct,
  demoAddInvoice,
  demoGetProduct,
} from '../lib/services/demo-store'

async function runPhase5Tests() {
  console.log('🚀 Starting Phase 5: Business Category Engine + UGB Test Suite...\n')

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
  // SECTION 1: BUSINESS CATEGORY ENGINE (26 CATEGORIES)
  // ============================================================
  console.log('🏛️ SECTION 1: BUSINESS CATEGORY ENGINE (26 CATEGORIES)')

  await test('1.1 Exactly 26 canonical business categories are configured', () => {
    const categories = BusinessCategoryService.getAllCategories()
    assert.strictEqual(
      categories.length,
      26,
      `Expected exactly 26 canonical categories, got ${categories.length}`
    )

    const expectedIds = [
      'retail',
      'grocery',
      'supermarket',
      'electronics',
      'mobile_accessories',
      'clothing_garments',
      'footwear',
      'jewellery',
      'hardware',
      'pharmacy',
      'restaurant',
      'cafe',
      'bakery',
      'hotel_hospitality',
      'wholesale',
      'distributor',
      'manufacturing',
      'services',
      'salon_spa',
      'automobile',
      'furniture',
      'stationery_books',
      'construction_materials',
      'electrical',
      'cosmetics',
      'agriculture',
    ]

    for (const id of expectedIds) {
      const found = categories.find((c) => c.id === id)
      assert(found, `Category '${id}' must be present in official categories`)
      assert(found?.name, `Category '${id}' must have a valid display name`)
      assert(
        found?.features?.measurements && found.features.measurements.length > 0,
        `Category '${id}' must define measurement units`
      )
      assert(
        found?.features?.gstBehavior?.defaultGstRate !== undefined,
        `Category '${id}' must define default GST rate`
      )
      assert(
        found?.features?.barcodeSupport?.defaultFormat,
        `Category '${id}' must define default barcode format`
      )
    }
  })

  await test('1.2 Category keyword resolution correctly maps diverse terminology', () => {
    assert.strictEqual(resolveBaseCategory('Retail Gold Store', 'Gold'), 'jewellery')
    assert.strictEqual(resolveBaseCategory('Chemist & Druggist', 'Medicines'), 'pharmacy')
    assert.strictEqual(resolveBaseCategory('Boutique', 'Apparel & Garments'), 'clothing_garments')
    assert.strictEqual(resolveBaseCategory('Departmental Store', 'Hypermarket'), 'supermarket')
    assert.strictEqual(resolveBaseCategory('Kirana', 'Daily Grocery'), 'grocery')
    assert.strictEqual(resolveBaseCategory('Coffee Lounge', 'Cafe'), 'cafe')
    assert.strictEqual(resolveBaseCategory('Auto Repair & Spares', 'Garage'), 'automobile')
    assert.strictEqual(resolveBaseCategory('Building Supplies', 'Cement & Brick'), 'construction_materials')
    assert.strictEqual(resolveBaseCategory('Pesticides & Fertilizer', 'Agri'), 'agriculture')
    assert.strictEqual(resolveBaseCategory('IT Consulting', 'Software Services'), 'services')
    assert.strictEqual(resolveBaseCategory('Unknown Generic Business', ''), 'retail')
  })

  await test('1.3 Backward-compatible aliases resolve to canonical configs', () => {
    assert.strictEqual(CATEGORY_CONFIGS['jewelry'].id, 'jewellery')
    assert.strictEqual(CATEGORY_CONFIGS['medical'].id, 'pharmacy')
    assert.strictEqual(CATEGORY_CONFIGS['clothing'].id, 'clothing_garments')
    assert.strictEqual(CATEGORY_CONFIGS['freelancer'].id, 'services')
  })

  // ============================================================
  // SECTION 2: DEDICATED JEWELLERY ENGINE
  // ============================================================
  console.log('\n💎 SECTION 2: DEDICATED JEWELLERY ENGINE')

  await test('2.1 Net weight calculation: Net = Gross - Stone weight', () => {
    const calc = BusinessCategoryService.calculateJewelleryItem({
      grossWeight: 14.5,
      stoneWeight: 2.1,
      metalRatePerGram: 6500,
    })

    assert.strictEqual(calc.grossWeight, 14.5)
    assert.strictEqual(calc.stoneWeight, 2.1)
    assert.strictEqual(calc.netWeight, 12.4, 'Net weight must equal gross - stone')
  })

  await test('2.2 Jewellery price calculation with wastage, making charges, and statutory 3% GST', () => {
    // 10 grams net gold at ₹6,000/g = ₹60,000 metal value
    // Wastage: 5% of metal = 0.5g * 6,000 = ₹3,000
    // Making charges: ₹400/g on gross (10g) = ₹4,000
    // Stone value: ₹2,500
    // Other charges: ₹500
    // Taxable subtotal = 60,000 + 3,000 + 4,000 + 2,500 + 500 = ₹70,000
    // GST @ 3% = ₹2,100
    // Final Amount = ₹72,100
    const calc = BusinessCategoryService.calculateJewelleryItem({
      grossWeight: 10,
      stoneWeight: 0,
      metalRatePerGram: 6000,
      wastage: 5,
      wastageType: 'percentage',
      makingCharge: 400,
      makingChargeType: 'per_gram',
      stoneValue: 2500,
      otherCharges: 500,
      gstRate: 3,
    })

    assert.strictEqual(calc.netWeight, 10)
    assert.strictEqual(calc.metalValue, 60000)
    assert.strictEqual(calc.wastageAmount, 3000)
    assert.strictEqual(calc.makingChargesAmount, 4000)
    assert.strictEqual(calc.stoneValue, 2500)
    assert.strictEqual(calc.otherCharges, 500)
    assert.strictEqual(calc.taxableAmount, 70000)
    assert.strictEqual(calc.gstRate, 3)
    assert.strictEqual(calc.gstAmount, 2100)
    assert.strictEqual(calc.finalAmount, 72100)
  })

  await test('2.3 Purity factor adjustment (e.g. 22K 91.6% purity vs 24K pure bullion rate)', () => {
    // Pure 24K bullion rate is ₹7,000/g. 22K gold has purity factor 0.916.
    // Effective rate is 7000 * 0.916 = ₹6,412/g.
    const calc = BusinessCategoryService.calculateJewelleryItem({
      grossWeight: 5,
      stoneWeight: 0,
      metalRatePerGram: 7000,
      purityFactor: 0.916,
      makingCharge: 0,
      gstRate: 0,
    })

    assert.strictEqual(calc.netWeight, 5)
    assert.strictEqual(calc.metalValue, 32060, '5g * 7000 * 0.916 = 32060')
    assert.strictEqual(calc.finalAmount, 32060)
  })

  // ============================================================
  // SECTION 3: UGB MASTER — UNIT ENGINE
  // ============================================================
  console.log('\n📦 SECTION 3: UGB MASTER — UNIT MANAGEMENT')

  await test('3.1 Standard GST units contains 21+ units with decimal rules', () => {
    assert(STANDARD_UNITS.length >= 21)
    const kgs = STANDARD_UNITS.find((u) => u.short_name === 'KGS' || u.short_name === 'Kg')
    assert(kgs?.decimals_allowed === true, 'KGS must allow decimals')

    const pcs = STANDARD_UNITS.find((u) => u.short_name === 'PCS' || u.short_name === 'Pcs')
    assert(pcs?.decimals_allowed === false, 'PCS must disallow decimals')
  })

  await test('3.2 Unit conversion: 1 Box = 12 Pcs, selling 4 Boxes = 48 Pcs', () => {
    const baseQty = toBaseQuantity(4, 12)
    assert.strictEqual(baseQty, 48)

    const secQty = fromBaseQuantity(48, 12)
    assert.strictEqual(secQty, 4)
  })

  await test('3.3 Unit conversion with product config object', () => {
    const res = toBaseQuantity(5, 'Box', {
      primary_unit: 'Pcs',
      secondary_unit: 'Box',
      conversion_rate: 10,
    })

    assert.strictEqual(res.baseQuantity, 50)
    assert.strictEqual(res.converted, true)
    assert.strictEqual(res.multiplier, 10)
  })

  // ============================================================
  // SECTION 4: UGB MASTER — GST / TAX ENGINE
  // ============================================================
  console.log('\n🏛️ SECTION 4: UGB MASTER — GST MANAGEMENT')

  await test('4.1 Intra-state GST splits equally into CGST + SGST', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true },
      buyer: { state_code: '27', is_gst_registered: true },
      items: [
        {
          description: 'Widget A',
          quantity: 2,
          unit_price: 1000,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, false)
    assert.strictEqual(res.taxable_amount, 2000)
    assert.strictEqual(res.cgst_amount, 180)
    assert.strictEqual(res.sgst_amount, 180)
    assert.strictEqual(res.igst_amount, 0)
    assert.strictEqual(res.grand_total, 2360)
  })

  await test('4.2 Inter-state GST charges IGST only', () => {
    const res = calculateCentralGst({
      seller: { state_code: '27', is_gst_registered: true }, // Maharashtra
      buyer: { state_code: '29', is_gst_registered: true },  // Karnataka
      items: [
        {
          description: 'Widget B',
          quantity: 1,
          unit_price: 10000,
          gst_rate: 12,
          is_gst_inclusive: false,
        },
      ],
    })

    assert.strictEqual(res.is_inter_state, true)
    assert.strictEqual(res.cgst_amount, 0)
    assert.strictEqual(res.sgst_amount, 0)
    assert.strictEqual(res.igst_amount, 1200)
    assert.strictEqual(res.grand_total, 11200)
  })

  await test('4.3 UTGST detection for Union Territories without legislature', () => {
    assert.strictEqual(isUtgstTerritory('04'), true, 'Chandigarh is UTGST')
    assert.strictEqual(isUtgstTerritory('31'), true, 'Lakshadweep is UTGST')
    assert.strictEqual(isUtgstTerritory('35'), true, 'Andaman & Nicobar is UTGST')
    assert.strictEqual(isUtgstTerritory('38'), true, 'Ladakh is UTGST')
    assert.strictEqual(isUtgstTerritory('27'), false, 'Maharashtra is normal state')
    assert.strictEqual(isUtgstTerritory('07'), false, 'Delhi has legislature (SGST)')
  })

  // ============================================================
  // SECTION 5: UGB MASTER — BARCODE ENGINE
  // ============================================================
  console.log('\n🏷️ SECTION 5: UGB MASTER — BARCODE MANAGEMENT')

  await test('5.1 EAN-13 check digit modulo-10 algorithm', () => {
    // Standard test: '890123456789'
    const checkDigit = calculateEan13CheckDigit('890123456789')
    assert.strictEqual(typeof checkDigit, 'number')
    assert(checkDigit >= 0 && checkDigit <= 9)

    // Complete barcode
    const fullBarcode = `890123456789${checkDigit}`
    const result = validateBarcode(fullBarcode)
    assert.strictEqual(result.valid, true, 'Full 13-digit EAN with calculated check digit must validate')
  })

  await test('5.2 EAN-13 barcode generator formats GS1 India prefix 890', () => {
    const ean = generateEan13Barcode()
    assert.strictEqual(ean.length, 13, 'EAN-13 must be 13 digits')
    assert(ean.startsWith('890'), 'Generated EAN-13 must begin with 890 (India)')
    assert(validateBarcode(ean).valid, 'Generated EAN-13 must pass validation')
  })

  await test('5.3 Code-128 generator produces alphanumeric format', () => {
    const c128 = generateCode128Barcode('JWL')
    assert(c128.startsWith('JWL-'), 'Code-128 must have requested prefix')
    assert(validateBarcode(c128).valid, 'Code-128 must validate')
  })

  await test('5.4 Barcode SVG label generation produces valid vector markup', () => {
    const svg = generateBarcodeSvg('8901234567897', { showText: true })
    assert(svg.includes('<svg'), 'Barcode SVG output must contain <svg tag')
    assert(svg.includes('</svg>'), 'Barcode SVG output must contain </svg> tag')
    assert(svg.includes('<rect'), 'Barcode SVG must contain bar rects')
  })

  // ============================================================
  // SECTION 6: INVENTORY & TRANSACTION SECONDARY UNIT INTEGRATION
  // ============================================================
  console.log('\n🔄 SECTION 6: SECONDARY UNIT INVENTORY TRANSACTIONS')

  await test('6.1 In-memory store: Creating a product with jewellery metadata and secondary unit', () => {
    const newProd = demoAddProduct({
      name: '22K Gold Traditional Kada',
      category: 'jewellery',
      sku: `JWL-KADA-${Date.now()}`,
      barcode: '8909876543212',
      sale_price: 75000,
      purchase_price: 68000,
      opening_stock: 100, // 100 Pcs in stock
      primary_unit: 'Pcs',
      secondary_unit: 'Box',
      conversion_rate: 10, // 1 Box = 10 Pcs
      metal_type: 'Gold',
      purity: '22K',
      carat: 22,
      gross_weight: 25.5,
      net_weight: 23.5,
      stone_weight: 2.0,
      stone_value: 5000,
      hallmark_huid: 'HUID99281',
      making_charge: 500,
      making_charge_type: 'per_gram',
    })

    assert(newProd.id, 'Product must be created with ID')
    assert.strictEqual(newProd.current_stock, 100)
    assert.strictEqual(newProd.hallmark_huid, 'HUID99281')
    assert.strictEqual(newProd.net_weight, 23.5)
  })

  await test('6.2 Selling in secondary unit (Box) deducts base stock accurately (Pcs)', () => {
    // Create product with 50 Pcs
    const testProd = demoAddProduct({
      name: 'Steel Screws Box Pack',
      category: 'hardware',
      sku: `SCRW-${Date.now()}`,
      sale_price: 250,
      opening_stock: 50, // 50 Pcs in base stock
      primary_unit: 'Pcs',
      secondary_unit: 'Box',
      conversion_rate: 10, // 1 Box = 10 Pcs
    })

    const initialStock = testProd.current_stock

    // Sell 2 Boxes = 20 Pcs
    demoAddInvoice({
      customer_id: 'cust-demo-1',
      invoice_number: `INV-UGB-${Date.now()}`,
      invoice_date: '2026-09-25',
      items: [
        {
          product_id: testProd.id,
          description: testProd.name,
          quantity: 2, // 2 Boxes
          unit: 'Box',
          conversion_rate: 10,
          unit_price: 250,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    const prodRecord = demoGetProduct(testProd.id)
    assert(prodRecord?.product, 'Product must be retrievable')
    // 50 - (2 * 10) = 30 Pcs
    assert.strictEqual(
      prodRecord.product.current_stock,
      initialStock - 20,
      `Selling 2 Boxes (1 Box = 10 Pcs) should deduct 20 base units. Expected ${initialStock - 20}, got ${prodRecord.product.current_stock}`
    )
  })

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n==================================================`)
  console.log(`✨ Phase 5 Test Suite Complete: ${passed}/${total} PASSED`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runPhase5Tests().catch((err) => {
  console.error('Fatal error running Phase 5 tests:', err)
  process.exit(1)
})
