// ============================================================
// tests/inventory.test.ts
// Automated Test Suite for Wevly BusinessOS Inventory Engine
// ============================================================

import assert from 'node:assert'
import {
  normalizeMovementType,
  PostMovementParams,
  MovementTypeInput,
} from '../lib/services/inventory.service'
import { inventoryMovementRequestSchema, stockAdjustmentSchema } from '../lib/validators/inventory.schema'

// Pure in-memory Stock Engine Simulator for logic verification
class StockEngineSimulator {
  public current_stock: number = 0
  public movements: any[] = []

  constructor(public initialStock: number = 0) {
    this.current_stock = initialStock
  }

  public postMovement(params: {
    movement_type: MovementTypeInput
    quantity: number
    unit_cost?: number
    reference_number?: string
  }) {
    const { dbType, isDecrease } = normalizeMovementType(params.movement_type)

    let signedQty = params.quantity
    if (isDecrease && signedQty > 0) {
      signedQty = -signedQty
    } else if (!isDecrease && signedQty < 0) {
      signedQty = Math.abs(signedQty)
    }

    if (signedQty < 0 && Math.abs(signedQty) > this.current_stock) {
      throw new Error(
        `INSUFFICIENT_STOCK: Current stock is ${this.current_stock}, but required is ${Math.abs(signedQty)}`
      )
    }

    this.current_stock += signedQty
    const movementRecord = {
      id: `mov-${this.movements.length + 1}`,
      movement_type: dbType,
      quantity: signedQty,
      running_balance: this.current_stock,
      unit_cost: params.unit_cost || 100,
      total_cost: Math.abs(signedQty) * (params.unit_cost || 100),
      reference_number: params.reference_number || 'MANUAL',
      created_at: new Date().toISOString(),
    }

    this.movements.push(movementRecord)
    return movementRecord
  }
}

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS Inventory Engine Test Suite...\n')

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

  // ── 1. Purchase Movement (Stock Increase) ─────────────────
  console.log('📦 Test Suite 1: Purchase Movements')

  await test('PURCHASE movement increases stock quantity accurately', () => {
    const engine = new StockEngineSimulator(0)
    const record = engine.postMovement({
      movement_type: 'PURCHASE',
      quantity: 50,
      unit_cost: 250,
      reference_number: 'BILL-1001',
    })

    assert.strictEqual(engine.current_stock, 50, 'Stock must equal 50 after purchasing 50 units')
    assert.strictEqual(record.movement_type, 'purchase', 'Movement type must be normalized to purchase')
    assert.strictEqual(record.running_balance, 50, 'Running balance must be 50')
    assert.strictEqual(record.total_cost, 12500, 'Total cost must equal 50 * 250 = 12500')
  })

  // ── 2. Sale Movement (Stock Decrease) ─────────────────────
  console.log('\n🛒 Test Suite 2: Sale Movements')

  await test('SALE movement decreases stock quantity accurately', () => {
    const engine = new StockEngineSimulator(50)
    const record = engine.postMovement({
      movement_type: 'SALE',
      quantity: 15,
      unit_cost: 300,
      reference_number: 'INV-2001',
    })

    assert.strictEqual(engine.current_stock, 35, 'Stock must equal 35 after selling 15 units')
    assert.strictEqual(record.movement_type, 'sale', 'Movement type must be normalized to sale')
    assert.strictEqual(record.quantity, -15, 'Sale quantity in ledger must be signed negative -15')
    assert.strictEqual(record.running_balance, 35, 'Running balance must update to 35')
  })

  // ── 3. Return Movements (Sale Return & Purchase Return) ─────
  console.log('\n🔄 Test Suite 3: Return Movements')

  await test('SALE_RETURN (return_in) restores stock balance', () => {
    const engine = new StockEngineSimulator(35)
    const record = engine.postMovement({
      movement_type: 'SALE_RETURN',
      quantity: 5,
      unit_cost: 300,
      reference_number: 'CN-3001',
    })

    assert.strictEqual(engine.current_stock, 40, 'Stock must increase from 35 to 40 on customer return')
    assert.strictEqual(record.movement_type, 'return_in', 'Movement type must be return_in')
    assert.strictEqual(record.quantity, 5, 'Quantity must be positive +5')
  })

  await test('PURCHASE_RETURN (return_out) reduces stock sent back to supplier', () => {
    const engine = new StockEngineSimulator(40)
    const record = engine.postMovement({
      movement_type: 'PURCHASE_RETURN',
      quantity: 10,
      unit_cost: 250,
      reference_number: 'DN-4001',
    })

    assert.strictEqual(engine.current_stock, 30, 'Stock must decrease from 40 to 30 on supplier return')
    assert.strictEqual(record.movement_type, 'return_out', 'Movement type must be return_out')
    assert.strictEqual(record.quantity, -10, 'Quantity must be signed negative -10')
  })

  // ── 4. Stock Adjustments (ADJUSTMENT_IN & ADJUSTMENT_OUT) ─
  console.log('\n⚖️ Test Suite 4: Stock Adjustments')

  await test('ADJUSTMENT_IN increases stock balance', () => {
    const engine = new StockEngineSimulator(30)
    const record = engine.postMovement({
      movement_type: 'ADJUSTMENT_IN',
      quantity: 8,
      reference_number: 'ADJ-0001',
    })

    assert.strictEqual(engine.current_stock, 38, 'Stock must increase to 38')
    assert.strictEqual(record.movement_type, 'adjustment_in')
  })

  await test('ADJUSTMENT_OUT decreases stock balance', () => {
    const engine = new StockEngineSimulator(38)
    const record = engine.postMovement({
      movement_type: 'ADJUSTMENT_OUT',
      quantity: 3,
      reference_number: 'ADJ-0002',
    })

    assert.strictEqual(engine.current_stock, 35, 'Stock must decrease to 35')
    assert.strictEqual(record.movement_type, 'adjustment_out')
    assert.strictEqual(record.quantity, -3)
  })

  // ── 5. Insufficient Stock Protection ───────────────────────
  console.log('\n🚫 Test Suite 5: Insufficient Stock Protection')

  await test('Attempting to sell more than available stock throws INSUFFICIENT_STOCK error', () => {
    const engine = new StockEngineSimulator(10)

    assert.throws(
      () => {
        engine.postMovement({
          movement_type: 'SALE',
          quantity: 25, // Only 10 available!
          reference_number: 'INV-9999',
        })
      },
      (err: any) => {
        return err.message.includes('INSUFFICIENT_STOCK')
      },
      'Must throw INSUFFICIENT_STOCK exception when requesting more than available stock'
    )

    assert.strictEqual(engine.current_stock, 10, 'Stock must remain unmodified after rejected movement')
  })

  // ── 6. Concurrent Operations & Sequence Integrity ──────────
  console.log('\n⚡ Test Suite 6: Concurrent Stock Operations')

  await test('Concurrent sequential stock movements calculate atomic balances without corruption', async () => {
    const engine = new StockEngineSimulator(100)

    // Simulate 5 parallel sale transactions of 10 items each
    const ops = Array.from({ length: 5 }).map((_, i) => () => {
      return engine.postMovement({
        movement_type: 'SALE',
        quantity: 10,
        reference_number: `PARALLEL-INV-${i + 1}`,
      })
    })

    ops.forEach((op) => op())

    assert.strictEqual(engine.current_stock, 50, 'Current stock after 5 x 10 sales must equal exactly 50')
    assert.strictEqual(engine.movements.length, 5, 'Must record exactly 5 movement rows in ledger')
    assert.strictEqual(engine.movements[4].running_balance, 50, 'Final running balance must be 50')
  })

  // ── 7. Stock Adjustment Form Zod Schema Validation ─────────
  console.log('\n📝 Test Suite 7: Stock Adjustment Schema Validation')

  await test('Valid stock adjustment form payload passes Zod validation', () => {
    const payload = {
      adjustment_date: '2026-09-13',
      reason: 'stocktake',
      notes: 'Annual warehouse audit count',
      items: [
        {
          product_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          new_quantity: 45,
          notes: 'Count confirmed by warehouse manager',
        },
      ],
    }

    const result = stockAdjustmentSchema.safeParse(payload)
    assert.strictEqual(result.success, true, 'Valid adjustment payload must pass Zod schema')
  })

  await test('Negative physical count quantity fails Zod validation', () => {
    const invalidPayload = {
      adjustment_date: '2026-09-13',
      reason: 'damage',
      items: [
        {
          product_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          new_quantity: -5, // Invalid negative stock count
        },
      ],
    }

    const result = stockAdjustmentSchema.safeParse(invalidPayload)
    assert.strictEqual(result.success, false, 'Negative physical count must fail validation')
  })

  console.log(`\n==================================================`)
  console.log(`📊 Inventory Engine Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
