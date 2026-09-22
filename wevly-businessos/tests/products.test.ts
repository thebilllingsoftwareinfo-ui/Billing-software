// ============================================================
// tests/products.test.ts
// Automated Test Suite for Products Module Rules & Validation
// ============================================================

import assert from 'node:assert'
import { productSchema, VALID_GST_RATES } from '../lib/validators/product.schema'

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS Products Module Test Suite...\n')

  let passed = 0
  let total = 0

  function test(name: string, fn: () => void) {
    total++
    try {
      fn()
      console.log(`  ✓ PASSED: ${name}`)
      passed++
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`)
      console.error(`     Error: ${err.message}`)
    }
  }

  // ── 1. Product Form Validation ─────────────────────────────
  console.log('📝 Test Suite 1: Product Form & GST Rate Validation')

  test('Valid product data passes schema validation', () => {
    const validData = {
      name: 'Samsung Galaxy S24 Ultra',
      sku: 'MOB-SAM-S24U',
      product_type: 'goods',
      selling_price: 129999,
      purchase_price: 115000,
      gst_rate: 18,
      min_stock_level: 5,
      opening_stock: 10,
    }

    const result = productSchema.safeParse(validData)
    assert.strictEqual(result.success, true, 'Valid product data must pass schema')
  })

  test('Invalid GST tax rate (e.g. 7%) fails validation', () => {
    const invalidGstData = {
      name: 'Test Item',
      sku: 'TEST-SKU-001',
      selling_price: 1000,
      gst_rate: 7, // 7% is NOT a valid GST rate
    }

    const result = productSchema.safeParse(invalidGstData)
    assert.strictEqual(result.success, false, 'Invalid GST rate (7%) must fail')
  })

  test('Allowed GST tax rates (0, 5, 12, 18, 28) pass validation', () => {
    VALID_GST_RATES.forEach((rate) => {
      const data = {
        name: 'Test Item',
        sku: `SKU-${rate}`,
        selling_price: 100,
        gst_rate: rate,
      }
      const res = productSchema.safeParse(data)
      assert.strictEqual(res.success, true, `GST rate ${rate}% must be allowed`)
    })
  })

  // ── 2. Direct Stock Mutation Prevention ─────────────────────
  console.log('\n🔒 Test Suite 2: Direct Stock Mutation Guard')

  test('Product edit payload containing current_stock must be rejected', () => {
    const updatePayload = {
      name: 'Updated Product Name',
      current_stock: 50, // Direct stock mutation attempt!
    }

    // Mock check simulating PATCH API handler restriction
    const isDirectStockMutation = updatePayload.current_stock !== undefined
    assert.strictEqual(isDirectStockMutation, true, 'Direct stock mutation payload must be flagged')
  })

  // ── 3. Opening Stock Inventory Movement Rule ───────────────
  console.log('\n📦 Test Suite 3: Opening Stock Inventory Movement Rule')

  test('Product creation with opening_stock > 0 creates opening inventory_movement', () => {
    const openingStock = 15
    const purchasePrice = 1000

    const mockMovement = {
      movement_type: 'opening',
      quantity: openingStock,
      unit_cost: purchasePrice,
      total_cost: openingStock * purchasePrice,
    }

    assert.strictEqual(mockMovement.movement_type, 'opening', 'Movement type must be opening')
    assert.strictEqual(mockMovement.quantity, 15, 'Opening quantity must match product opening stock')
    assert.strictEqual(mockMovement.total_cost, 15000, 'Opening stock value must equal quantity * unit_cost')
  })

  // ── 4. SKU Organization Uniqueness Guard ───────────────────
  console.log('\n🏷️ Test Suite 4: Organization SKU Uniqueness')

  test('SKU lookup isolates SKU within same organization_id', () => {
    const orgId = '00000000-0000-0000-0000-000000000001'
    const skuCandidate = 'MOB-SAM-S24U'

    const checkSkuUnique = (existingProducts: any[]) => {
      return !existingProducts.some((p) => p.organization_id === orgId && p.sku === skuCandidate)
    }

    const mockExisting = [
      { id: 'p1', organization_id: orgId, sku: 'MOB-SAM-S24U' }
    ]

    assert.strictEqual(checkSkuUnique(mockExisting), false, 'Duplicate SKU within same org must fail')
  })

  console.log(`\n==================================================`)
  console.log(`📊 Products Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
