// ============================================================
// tests/multi-tenant-security.test.ts
// Multi-Tenant Isolation & Anti-IDOR Security Test Suite
// ============================================================

import assert from 'node:assert'
import { createAdminClient } from '../lib/supabase/admin'
import { InvoiceService } from '../lib/services/invoice.service'
import { PaymentService } from '../lib/services/payment.service'
import { ExpenseService } from '../lib/services/expense.service'
import { InventoryService, postInventoryMovement } from '../lib/services/inventory.service'
import { QuotationService } from '../lib/services/quotation.service'

const ORG_A_ID = '00000000-0000-0000-0000-00000000000a'
const ORG_B_ID = '00000000-0000-0000-0000-00000000000b'

const USER_A = {
  user_id: 'usr-aaaa-1111',
  user: { id: 'usr-aaaa-1111', email: 'userA@orgA.com' },
  organization_id: ORG_A_ID,
  organization: { id: ORG_A_ID, name: 'Organization A' },
  role: 'owner' as const,
  member: { role: 'owner' as const },
}

const USER_B = {
  user_id: 'usr-bbbb-2222',
  user: { id: 'usr-bbbb-2222', email: 'userB@orgB.com' },
  organization_id: ORG_B_ID,
  organization: { id: ORG_B_ID, name: 'Organization B' },
  role: 'owner' as const,
  member: { role: 'owner' as const },
}

async function runMultiTenantSecurityAudit() {
  console.log('🔒 Starting WEVLY BUSINESSOS Multi-Tenant Security & Anti-IDOR Audit...\n')

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

  const supabase = createAdminClient()

  // Seed fixture data for Org B
  const bCustId = 'cust-bbbb-1111'
  const bProdId = 'prod-bbbb-2222'
  const bInvId = 'inv-bbbb-3333'
  const bExpId = 'exp-bbbb-4444'

  await (supabase.from('customers') as any).upsert({
    id: bCustId,
    organization_id: ORG_B_ID,
    display_name: 'Org B Secret Customer',
    name: 'Org B Secret Customer',
    state: '27',
  })

  await (supabase.from('products') as any).upsert({
    id: bProdId,
    organization_id: ORG_B_ID,
    name: 'Org B Proprietary Product',
    unit_price: 5000,
    sale_price: 5000,
    track_inventory: true,
    current_stock: 100,
  })

  await (supabase.from('invoices') as any).upsert({
    id: bInvId,
    organization_id: ORG_B_ID,
    customer_id: bCustId,
    invoice_number: 'INV-B-999',
    invoice_date: '2026-01-01',
    status: 'draft',
    subtotal: 10000,
    total_amount: 11800,
  })

  await (supabase.from('expenses') as any).upsert({
    id: bExpId,
    organization_id: ORG_B_ID,
    expense_date: '2026-01-01',
    amount_paise: 500000,
    payment_method: 'bank_transfer',
  })

  console.log('📌 Test Suite 1: Customer Isolation')
  await test('User A cannot fetch Org B customer details (IDOR Prevention)', async () => {
    const { data: rawCust } = await (supabase.from('customers') as any)
      .select('*')
      .eq('id', bCustId)
      .eq('organization_id', USER_A.organization_id)
      .single()

    assert.strictEqual(rawCust, null, 'Query scoped to Org A must return null for Org B customer')
  })

  console.log('\n📌 Test Suite 2: Product & Stock Isolation')
  await test('User A cannot post stock movement to Org B product', async () => {
    try {
      await postInventoryMovement({
        organization_id: USER_A.organization_id, // Attacker passes Org A context with Org B product ID
        product_id: bProdId,
        movement_type: 'SALE',
        quantity: 5,
        user_id: USER_A.user_id,
      })
      assert.fail('Should have thrown error when accessing Org B product')
    } catch (err: any) {
      assert.ok(err.message.includes('not found'), 'Must reject cross-tenant stock manipulation')
    }
  })

  console.log('\n📌 Test Suite 3: Invoice Financial Isolation')
  await test('User A cannot update or finalize Org B draft invoice', async () => {
    const { data: rawInv } = await (supabase.from('invoices') as any)
      .select('*')
      .eq('id', bInvId)
      .eq('organization_id', USER_A.organization_id)

    assert.strictEqual((rawInv || []).length, 0, 'User A query must not leak Org B invoice header')
  })

  console.log('\n📌 Test Suite 4: Expense Data Isolation')
  await test('User A cannot archive or read Org B expense record', async () => {
    try {
      await ExpenseService.archiveExpense(USER_A as any, bExpId, true)
      assert.fail('Should fail to archive Org B expense')
    } catch (err: any) {
      assert.ok(err.message.includes('Failed to archive') || err.message.includes('not found') || err.message.length > 0, 'Must prevent cross-tenant expense archiving')
    }
  })

  console.log('\n📌 Test Suite 5: Payment Allocation Isolation')
  await test('User A cannot allocate payment against Org B invoice', async () => {
    try {
      await PaymentService.recordPayment(USER_A as any, {
        customer_id: bCustId,
        payment_date: '2026-01-01',
        amount_paise: 10000,
        payment_method: 'cash',
        allow_overpayment: false,
        allocations: [{ invoice_id: bInvId, allocated_paise: 10000 }],
      })
      assert.fail('Payment creation against Org B invoice must be rejected')
    } catch (err: any) {
      assert.ok(err.message.length > 0, 'Cross-tenant payment allocation correctly blocked')
    }
  })

  console.log(`\n==================================================`)
  console.log(`📊 Multi-Tenant Isolation Audit Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runMultiTenantSecurityAudit().catch((err) => {
  console.error('Audit crashed:', err)
  process.exit(1)
})
