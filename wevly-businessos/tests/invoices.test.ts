// ============================================================
// tests/invoices.test.ts
// Automated Test Suite for Wevly BusinessOS Sales Invoice Engine
// ============================================================

import assert from 'node:assert'
import {
  calculateInvoiceServerSide,
  InvoiceCalculatedTotals,
} from '../lib/services/invoice.service'
import { createInvoiceSchema } from '../lib/validators/invoice.schema'

// Mock In-Memory Sales Invoice Engine Simulator
class InvoiceEngineSimulator {
  public invoices: Map<string, any> = new Map()
  public customerBalances: Map<string, number> = new Map()
  public customerLedger: any[] = []
  public inventoryMovements: any[] = []
  public productStocks: Map<string, { name: string; current_stock: number; is_goods: boolean; track_inventory: boolean }> = new Map()

  constructor() {
    // Seed initial mock product and customer
    this.customerBalances.set('cust-101', 0)
    this.productStocks.set('prod-201', {
      name: 'Samsung Galaxy S24 Ultra',
      current_stock: 50,
      is_goods: true,
      track_inventory: true,
    })
  }

  public createDraftInvoice(params: {
    id: string
    invoice_number: string
    customer_id: string
    items: any[]
    is_inter_state?: boolean
    discount_value?: number
  }) {
    // Check duplicate invoice number
    for (const inv of this.invoices.values()) {
      if (inv.invoice_number === params.invoice_number) {
        throw new Error(`Duplicate invoice number '${params.invoice_number}' detected`)
      }
    }

    const calc = calculateInvoiceServerSide(
      params.items,
      'fixed',
      params.discount_value || 0,
      params.is_inter_state || false
    )

    const invoiceRecord = {
      id: params.id,
      invoice_number: params.invoice_number,
      customer_id: params.customer_id,
      status: 'draft',
      is_inter_state: params.is_inter_state || false,
      subtotal: calc.subtotal,
      discount_amount: calc.discount_amount,
      taxable_amount: calc.taxable_amount,
      cgst_amount: calc.cgst_amount,
      sgst_amount: calc.sgst_amount,
      igst_amount: calc.igst_amount,
      total_tax_amount: calc.total_tax_amount,
      round_off_amount: calc.round_off_amount,
      total_amount: calc.total_amount,
      amount_paid: 0,
      balance_due: calc.total_amount,
      finalized_at: null,
      items: calc.lines,
    }

    this.invoices.set(params.id, invoiceRecord)
    return invoiceRecord
  }

  public updateDraftInvoice(invoiceId: string, items: any[]) {
    const inv = this.invoices.get(invoiceId)
    if (!inv) throw new Error('Invoice not found')

    if (inv.status !== 'draft') {
      throw new Error(`INVALID_STATUS_TRANSITION: Cannot modify invoice in '${inv.status}' status`)
    }

    const calc = calculateInvoiceServerSide(items, 'fixed', 0, inv.is_inter_state)
    inv.subtotal = calc.subtotal
    inv.taxable_amount = calc.taxable_amount
    inv.total_amount = calc.total_amount
    inv.balance_due = calc.total_amount
    inv.items = calc.lines
    return inv
  }

  public finalizeInvoice(invoiceId: string) {
    const inv = this.invoices.get(invoiceId)
    if (!inv) throw new Error('Invoice not found')

    if (inv.status !== 'draft') {
      throw new Error(`INVALID_STATUS_TRANSITION: Cannot finalize invoice in '${inv.status}' status`)
    }

    inv.status = 'issued'
    inv.finalized_at = new Date().toISOString()

    // 1. Update customer balance & ledger
    const custBal = this.customerBalances.get(inv.customer_id) || 0
    const newCustBal = custBal + inv.total_amount
    this.customerBalances.set(inv.customer_id, newCustBal)

    this.customerLedger.push({
      customer_id: inv.customer_id,
      transaction_type: 'invoice',
      reference_number: inv.invoice_number,
      amount: inv.total_amount,
      running_balance: newCustBal,
    })

    // 2. Post inventory movements for tracked goods
    for (const item of inv.items) {
      if (item.product_id) {
        const prod = this.productStocks.get(item.product_id)
        if (prod && prod.is_goods && prod.track_inventory) {
          prod.current_stock -= item.quantity
          this.inventoryMovements.push({
            product_id: item.product_id,
            movement_type: 'sale',
            quantity: -item.quantity,
            running_balance: prod.current_stock,
            reference_number: inv.invoice_number,
          })
        }
      }
    }

    return inv
  }

  public cancelInvoice(invoiceId: string, reason: string) {
    const inv = this.invoices.get(invoiceId)
    if (!inv) throw new Error('Invoice not found')

    if (inv.status === 'cancelled') {
      throw new Error('INVALID_STATUS_TRANSITION: Invoice is already CANCELLED')
    }

    if (inv.status === 'paid') {
      throw new Error('INVALID_STATUS_TRANSITION: Cannot cancel a fully PAID invoice directly')
    }

    const wasFinalized = inv.status !== 'draft'
    inv.status = 'cancelled'

    if (wasFinalized) {
      // Reverse customer balance
      const custBal = this.customerBalances.get(inv.customer_id) || 0
      const newCustBal = custBal - inv.total_amount
      this.customerBalances.set(inv.customer_id, newCustBal)

      this.customerLedger.push({
        customer_id: inv.customer_id,
        transaction_type: 'cancellation',
        reference_number: inv.invoice_number,
        amount: -inv.total_amount,
        running_balance: newCustBal,
      })

      // Reverse inventory movements
      for (const item of inv.items) {
        if (item.product_id) {
          const prod = this.productStocks.get(item.product_id)
          if (prod && prod.is_goods && prod.track_inventory) {
            prod.current_stock += item.quantity
            this.inventoryMovements.push({
              product_id: item.product_id,
              movement_type: 'return_in',
              quantity: item.quantity,
              running_balance: prod.current_stock,
              reference_number: inv.invoice_number,
            })
          }
        }
      }
    }

    return inv
  }
}

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS Sales Invoice Engine Test Suite...\n')

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

  // ── 1. Server-Side Tax & Totals Calculation Engine ─────────
  console.log('🧮 Test Suite 1: Server-Side Financial & GST Tax Calculation')

  await test('Intra-State GST calculation correctly splits tax between CGST (9%) and SGST (9%)', () => {
    const items = [
      {
        description: 'Laptop Computer',
        quantity: 2,
        unit_price: 50000,
        discount_percent: 10, // Gross 100000 - 10000 = 90000
        gst_rate: 18,
        is_gst_inclusive: false,
      },
    ]

    const calc = calculateInvoiceServerSide(items, 'fixed', 0, false) // Intra-state

    assert.strictEqual(calc.subtotal, 100000, 'Subtotal before discount must be 100000')
    assert.strictEqual(calc.discount_amount, 10000, 'Line discount must equal 10000')
    assert.strictEqual(calc.taxable_amount, 90000, 'Taxable value must equal 90000')
    assert.strictEqual(calc.cgst_amount, 8100, 'CGST 9% must equal 8100')
    assert.strictEqual(calc.sgst_amount, 8100, 'SGST 9% must equal 8100')
    assert.strictEqual(calc.igst_amount, 0, 'IGST must be 0 for intra-state')
    assert.strictEqual(calc.total_amount, 106200, 'Grand total must equal 90000 + 16200 = 106200')
  })

  await test('Inter-State GST calculation applies IGST (18%) without CGST/SGST', () => {
    const items = [
      {
        description: 'Office Chair',
        quantity: 5,
        unit_price: 4000,
        discount_percent: 0,
        gst_rate: 18,
        is_gst_inclusive: false,
      },
    ]

    const calc = calculateInvoiceServerSide(items, 'fixed', 0, true) // Inter-state

    assert.strictEqual(calc.taxable_amount, 20000, 'Taxable value must be 20000')
    assert.strictEqual(calc.cgst_amount, 0, 'CGST must be 0 for inter-state')
    assert.strictEqual(calc.sgst_amount, 0, 'SGST must be 0 for inter-state')
    assert.strictEqual(calc.igst_amount, 3600, 'IGST 18% must equal 3600')
    assert.strictEqual(calc.total_amount, 23600, 'Grand total must equal 23600')
  })

  await test('GST Inclusive back-calculates taxable base and tax amount accurately', () => {
    const items = [
      {
        description: 'Consumer Electronics (Inclusive)',
        quantity: 1,
        unit_price: 1180, // 1000 base + 180 GST (18%)
        discount_percent: 0,
        gst_rate: 18,
        is_gst_inclusive: true,
      },
    ]

    const calc = calculateInvoiceServerSide(items, 'fixed', 0, false)

    assert.strictEqual(calc.taxable_amount, 1000, 'Taxable base back-calculated from 1180 inclusive must equal 1000')
    assert.strictEqual(calc.cgst_amount + calc.sgst_amount, 180, 'Total GST must equal 180')
    assert.strictEqual(calc.total_amount, 1180, 'Grand total must equal inclusive gross price 1180')
  })

  // ── 2. Draft Invoice Creation ──────────────────────────────
  console.log('\n📄 Test Suite 2: Draft Invoice Creation')

  await test('Creating a draft invoice initializes DRAFT status and unfinalized state', () => {
    const engine = new InvoiceEngineSimulator()
    const inv = engine.createDraftInvoice({
      id: 'inv-001',
      invoice_number: 'INV-0001',
      customer_id: 'cust-101',
      items: [
        {
          product_id: 'prod-201',
          description: 'Samsung Galaxy S24 Ultra',
          quantity: 2,
          unit_price: 100000,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    assert.strictEqual(inv.status, 'draft', 'Initial status must be draft')
    assert.strictEqual(inv.finalized_at, null, 'finalized_at must be null')
    assert.strictEqual(inv.total_amount, 236000, 'Total amount must equal 236000')
    assert.strictEqual(engine.customerBalances.get('cust-101'), 0, 'Customer balance must not change on draft creation')
  })

  await test('Duplicate invoice number detection prevents duplicate entries', () => {
    const engine = new InvoiceEngineSimulator()
    engine.createDraftInvoice({
      id: 'inv-001',
      invoice_number: 'INV-0001',
      customer_id: 'cust-101',
      items: [{ description: 'Test Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
    })

    assert.throws(
      () => {
        engine.createDraftInvoice({
          id: 'inv-002',
          invoice_number: 'INV-0001', // Duplicate!
          customer_id: 'cust-101',
          items: [{ description: 'Test Item', quantity: 1, unit_price: 100, gst_rate: 18 }],
        })
      },
      (err: any) => err.message.includes('Duplicate invoice number'),
      'Must reject duplicate invoice number'
    )
  })

  // ── 3. Finalize Invoice Lifecycle ──────────────────────────
  console.log('\n🚀 Test Suite 3: Finalize Invoice Execution')

  await test('Finalizing invoice transitions status to ISSUED, updates customer balance, and posts SALE inventory movement', () => {
    const engine = new InvoiceEngineSimulator()
    engine.createDraftInvoice({
      id: 'inv-001',
      invoice_number: 'INV-0001',
      customer_id: 'cust-101',
      items: [
        {
          product_id: 'prod-201',
          description: 'Samsung Galaxy S24 Ultra',
          quantity: 5,
          unit_price: 100000,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    const finalized = engine.finalizeInvoice('inv-001')

    assert.strictEqual(finalized.status, 'issued', 'Finalized invoice status must be issued')
    assert.notStrictEqual(finalized.finalized_at, null, 'finalized_at must be populated timestamp')

    // Customer balance verification
    assert.strictEqual(engine.customerBalances.get('cust-101'), 590000, 'Customer balance must increase by 590000')
    assert.strictEqual(engine.customerLedger.length, 1, 'Must record 1 customer transaction ledger entry')
    assert.strictEqual(engine.customerLedger[0].transaction_type, 'invoice')

    // Inventory movement verification
    const prod = engine.productStocks.get('prod-201')
    assert.strictEqual(prod?.current_stock, 45, 'Product current stock must decrease from 50 to 45')
    assert.strictEqual(engine.inventoryMovements.length, 1, 'Must post 1 inventory movement')
    assert.strictEqual(engine.inventoryMovements[0].movement_type, 'sale')
    assert.strictEqual(engine.inventoryMovements[0].quantity, -5, 'Inventory movement quantity must be -5')
  })

  // ── 4. Cancel Invoice & Reversal ───────────────────────────
  console.log('\n🚫 Test Suite 4: Cancel Invoice & Ledger Reversal')

  await test('Cancelling a finalized invoice reverses customer balance and restocks inventory via return_in movement', () => {
    const engine = new InvoiceEngineSimulator()
    engine.createDraftInvoice({
      id: 'inv-001',
      invoice_number: 'INV-0001',
      customer_id: 'cust-101',
      items: [
        {
          product_id: 'prod-201',
          description: 'Samsung Galaxy S24 Ultra',
          quantity: 3,
          unit_price: 100000,
          discount_percent: 0,
          gst_rate: 18,
          is_gst_inclusive: false,
        },
      ],
    })

    engine.finalizeInvoice('inv-001')
    assert.strictEqual(engine.customerBalances.get('cust-101'), 354000)

    const cancelled = engine.cancelInvoice('inv-001', 'Customer cancelled order')

    assert.strictEqual(cancelled.status, 'cancelled', 'Invoice status must be cancelled')

    // Customer balance reversal verification
    assert.strictEqual(engine.customerBalances.get('cust-101'), 0, 'Customer balance must revert to 0')
    assert.strictEqual(engine.customerLedger.length, 2, 'Must record cancellation ledger entry')

    // Inventory restocking verification
    const prod = engine.productStocks.get('prod-201')
    assert.strictEqual(prod?.current_stock, 50, 'Product stock must revert to 50')
    assert.strictEqual(engine.inventoryMovements[1].movement_type, 'return_in')
    assert.strictEqual(engine.inventoryMovements[1].quantity, 3, 'Restock movement must be +3')
  })

  // ── 5. Invalid Status Transitions Prevention ───────────────
  console.log('\n🔒 Test Suite 5: Invalid Status Transition Guards')

  await test('Modifying line items of a finalized invoice throws INVALID_STATUS_TRANSITION error', () => {
    const engine = new InvoiceEngineSimulator()
    engine.createDraftInvoice({
      id: 'inv-001',
      invoice_number: 'INV-0001',
      customer_id: 'cust-101',
      items: [{ description: 'Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
    })

    engine.finalizeInvoice('inv-001')

    assert.throws(
      () => {
        engine.updateDraftInvoice('inv-001', [{ description: 'Tampered Item', quantity: 10, unit_price: 500, gst_rate: 18 }])
      },
      (err: any) => err.message.includes('INVALID_STATUS_TRANSITION'),
      'Must reject editing line items of a non-draft invoice'
    )
  })

  await test('Finalizing an already issued invoice throws INVALID_STATUS_TRANSITION error', () => {
    const engine = new InvoiceEngineSimulator()
    engine.createDraftInvoice({
      id: 'inv-001',
      invoice_number: 'INV-0001',
      customer_id: 'cust-101',
      items: [{ description: 'Item 1', quantity: 1, unit_price: 100, gst_rate: 18 }],
    })

    engine.finalizeInvoice('inv-001')

    assert.throws(
      () => {
        engine.finalizeInvoice('inv-001')
      },
      (err: any) => err.message.includes('INVALID_STATUS_TRANSITION'),
      'Must reject re-finalizing an already issued invoice'
    )
  })

  // ── 6. Zod Validation Rules ────────────────────────────────
  console.log('\n📝 Test Suite 6: Invoice Zod Schema Validation')

  await test('Valid invoice creation payload passes Zod schema validation', () => {
    const payload = {
      customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      invoice_date: '2026-09-13',
      items: [
        {
          description: 'Consulting Services',
          quantity: 5,
          unit_price: 2000,
          gst_rate: 18,
        },
      ],
    }

    const result = createInvoiceSchema.safeParse(payload)
    assert.strictEqual(result.success, true, 'Valid payload must pass Zod schema')
  })

  await test('Invoice payload with empty items array fails Zod validation', () => {
    const payload = {
      customer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      invoice_date: '2026-09-13',
      items: [], // Invalid empty items
    }

    const result = createInvoiceSchema.safeParse(payload)
    assert.strictEqual(result.success, false, 'Empty items array must fail validation')
  })

  console.log(`\n==================================================`)
  console.log(`📊 Sales Invoice Engine Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
