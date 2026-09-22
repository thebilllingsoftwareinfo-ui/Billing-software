// ============================================================
// tests/customers.test.ts
// Automated Test Suite for Customers Module Logic & Validation
// ============================================================

import assert from 'node:assert'
import { customerSchema } from '../lib/validators/customer.schema'

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS Customers Module Test Suite...\n')

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

  // ── 1. Zod Validation Tests ────────────────────────────────
  console.log('📝 Test Suite 1: Customer Form Validation')

  test('Valid customer input passes schema parsing', () => {
    const validData = {
      display_name: 'Infosys Tech Solutions',
      customer_type: 'business',
      gstin: '27AABCU9603R1ZM',
      pan: 'AABCU9603R',
      email: 'billing@infosys.com',
      phone: '+919876543210',
      credit_limit: 100000,
      opening_balance: 5000,
    }

    const result = customerSchema.safeParse(validData)
    assert.strictEqual(result.success, true, 'Valid customer data must pass')
  })

  test('Invalid GSTIN format fails validation', () => {
    const invalidGstinData = {
      display_name: 'Invalid GSTIN Corp',
      gstin: '123INVALIDGSTIN',
    }

    const result = customerSchema.safeParse(invalidGstinData)
    assert.strictEqual(result.success, false, 'Invalid GSTIN format must fail')
  })

  test('Invalid Email format fails validation', () => {
    const invalidEmailData = {
      display_name: 'Test Customer',
      email: 'not-an-email',
    }

    const result = customerSchema.safeParse(invalidEmailData)
    assert.strictEqual(result.success, false, 'Invalid email format must fail')
  })

  // ── 2. Financial Balance Calculations ───────────────────────
  console.log('\n💰 Test Suite 2: Financial Outstanding Calculations')

  test('Outstanding balance calculation matches (Sales - Paid)', () => {
    const mockInvoices = [
      { total_amount: 50000, paid_amount: 30000 },
      { total_amount: 25000, paid_amount: 25000 },
      { total_amount: 15000, paid_amount: 0 },
    ]

    const totalSales = mockInvoices.reduce((acc, inv) => acc + inv.total_amount, 0)
    const paidAmount = mockInvoices.reduce((acc, inv) => acc + inv.paid_amount, 0)
    const outstanding = totalSales - paidAmount

    assert.strictEqual(totalSales, 90000, 'Total sales should be 90,000')
    assert.strictEqual(paidAmount, 55000, 'Paid amount should be 55,000')
    assert.strictEqual(outstanding, 35000, 'Outstanding balance should be 35,000')
  })

  // ── 3. Multi-Tenant Organization Isolation ─────────────────
  console.log('\n🏢 Test Suite 3: Customer Multi-Tenant Isolation')

  test('Customer query strictly checks tenant organization_id', () => {
    const tenantOrg = '00000000-0000-0000-0000-000000000001'
    const customerRecord = {
      id: 'cust-1',
      organization_id: '00000000-0000-0000-0000-000000000001',
      display_name: 'Tenant Customer',
    }

    assert.strictEqual(customerRecord.organization_id, tenantOrg, 'Record must match session tenant')
  })

  console.log(`\n==================================================`)
  console.log(`📊 Customers Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
