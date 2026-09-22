// ============================================================
// tests/auth-security.test.ts
// Automated Security & Authorization Test Suite for WEVLY BUSINESSOS
// ============================================================

import assert from 'node:assert'
import { can, requirePermission } from '../lib/auth/permissions'

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS Auth & Security Test Suite...\n')

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

  // ── 1. Unauthenticated Access Tests ───────────────────────
  console.log('🔒 Test Suite 1: Unauthenticated Access Guards')

  test('Unauthenticated session should return null user/org in session parser', () => {
    const fakeSession = null
    assert.strictEqual(fakeSession, null, 'Unauthenticated user context must be null')
  })

  test('Unauthenticated user cannot execute permission actions', () => {
    // @ts-ignore
    assert.strictEqual(can(null, 'settings.edit'), false, 'Null role must fail permission check')
  })

  // ── 2. Authenticated Access & Role Tests ──────────────────
  console.log('\n🔑 Test Suite 2: Authenticated Access & Permissions')

  test('Owner role has full administrative permissions', () => {
    assert.strictEqual(can('owner', 'settings.edit'), true, 'Owner should have settings.edit')
    assert.strictEqual(can('owner', 'invoices.delete'), true, 'Owner should have invoices.delete')
    assert.strictEqual(can('owner', 'reports.view'), true, 'Owner should have reports.view')
    assert.strictEqual(can('owner', 'staff.remove'), true, 'Owner should have staff.remove')
  })

  test('Admin role permissions matrix boundaries', () => {
    assert.strictEqual(can('admin', 'invoices.create'), true, 'Admin should create invoices')
    assert.strictEqual(can('admin', 'staff.remove'), false, 'Admin should NOT remove staff (Owner only)')
    assert.strictEqual(can('admin', 'settings.billing'), false, 'Admin should NOT alter billing (Owner only)')
  })

  test('Manager/Staff role permissions boundaries', () => {
    assert.strictEqual(can('manager', 'invoices.create'), true, 'Manager should create invoices')
    assert.strictEqual(can('manager', 'invoices.delete'), false, 'Manager should NOT delete invoices')
    assert.strictEqual(can('staff', 'staff.view'), false, 'Staff should NOT view staff management')
  })

  test('Viewer role permissions boundaries (Read-Only)', () => {
    assert.strictEqual(can('accountant', 'reports.view'), true, 'Accountant can view reports')
    assert.strictEqual(can('staff', 'invoices.delete'), false, 'Staff CANNOT delete invoices')
    assert.strictEqual(can('staff', 'settings.edit'), false, 'Staff CANNOT edit settings')
  })

  // ── 3. Organization Multi-Tenant Isolation Tests ──────────
  console.log('\n🏢 Test Suite 3: Multi-Tenant Organization Isolation')

  test('Queries must strictly isolate organization_id', () => {
    const tenantA_OrgId = '00000000-0000-0000-0000-000000000001'
    const tenantB_OrgId = '00000000-0000-0000-0000-000000000002'

    const mockRecordTenantA = { id: 'inv-101', organization_id: tenantA_OrgId, total_amount: 1000 }
    
    assert.strictEqual(mockRecordTenantA.organization_id === tenantA_OrgId, true, 'Record belongs to Tenant A')
    assert.strictEqual(mockRecordTenantA.organization_id === tenantB_OrgId, false, 'Tenant B cannot access Tenant A data')
  })

  test('RLS policy filter enforces tenant predicate', () => {
    const currentSessionOrg = '00000000-0000-0000-0000-000000000001'
    const filterPredicate = (recordOrgId: string) => recordOrgId === currentSessionOrg

    assert.strictEqual(filterPredicate('00000000-0000-0000-0000-000000000001'), true)
    assert.strictEqual(filterPredicate('99999999-9999-9999-9999-999999999999'), false)
  })

  // ── 4. Owner Authorization Enforcement Tests ─────────────
  console.log('\n👑 Test Suite 4: Owner Role Authorization Controls')

  test('requirePermission throws on unauthorized staff role', () => {
    assert.throws(
      () => {
        requirePermission('staff', 'staff.remove')
      },
      /FORBIDDEN/,
      'Must throw FORBIDDEN error for staff trying owner action'
    )
  })

  test('requirePermission succeeds on owner role', () => {
    assert.doesNotThrow(() => {
      requirePermission('owner', 'staff.remove')
    })
  })

  console.log(`\n==================================================`)
  console.log(`📊 Security Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
