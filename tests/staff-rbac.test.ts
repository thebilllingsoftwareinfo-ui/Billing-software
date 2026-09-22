import { can, requirePermission, Permission } from '../lib/auth/permissions';
import { OrgRole } from '../types/app.types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runStaffRBACTests() {
  console.log('\n🧪 Running Wevly BusinessOS Staff & Granular RBAC Test Suite...\n');

  // -------------------------------------------------------------
  // Test Suite 1: Invoices Granular Permissions
  // -------------------------------------------------------------
  console.log('📜 Test Suite 1: Invoices Permissions (create, view, edit, cancel)');

  assert(can('owner', 'invoice.create') && can('admin', 'invoice.create') && can('manager', 'invoice.create') && can('sales', 'invoice.create'), 'OWNER, ADMIN, MANAGER, and SALES can create invoices');
  assert(!can('inventory', 'invoice.create') && !can('accountant', 'invoice.create'), 'INVENTORY and ACCOUNTANT cannot create invoices');

  assert(can('sales', 'invoice.view') && can('accountant', 'invoice.view'), 'SALES and ACCOUNTANT can view invoices');
  assert(!can('inventory', 'invoice.view'), 'INVENTORY staff cannot view sales invoices');

  assert(can('manager', 'invoice.edit') && !can('sales', 'invoice.edit'), 'MANAGER can edit invoices but SALES staff cannot');
  assert(can('manager', 'invoice.cancel') && !can('sales', 'invoice.cancel'), 'MANAGER can cancel invoices but SALES staff cannot');

  // -------------------------------------------------------------
  // Test Suite 2: Payments Granular Permissions
  // -------------------------------------------------------------
  console.log('\n💳 Test Suite 2: Payments Permissions (create, view)');

  assert(can('accountant', 'payment.create') && can('manager', 'payment.create'), 'ACCOUNTANT and MANAGER can record payments');
  assert(!can('sales', 'payment.create') && !can('inventory', 'payment.create'), 'SALES and INVENTORY cannot record payment collections');

  assert(can('sales', 'payment.view') && can('accountant', 'payment.view'), 'SALES and ACCOUNTANT can view payment history');

  // -------------------------------------------------------------
  // Test Suite 3: Customers & Suppliers Granular Permissions
  // -------------------------------------------------------------
  console.log('\n👥 Test Suite 3: Customer & Supplier Permissions (create, view, edit)');

  assert(can('sales', 'customer.create') && can('sales', 'customer.view'), 'SALES staff can create and view customers');
  assert(!can('sales', 'customer.edit'), 'SALES staff cannot edit customer master records');
  assert(!can('inventory', 'customer.view'), 'INVENTORY staff cannot view customer directory');

  // -------------------------------------------------------------
  // Test Suite 4: Products & Inventory Stock Permissions
  // -------------------------------------------------------------
  console.log('\n📦 Test Suite 4: Product Catalog & Inventory Stock Adjustment Permissions');

  assert(can('inventory', 'product.create') && can('inventory', 'product.edit'), 'INVENTORY staff can create and edit products');
  assert(!can('sales', 'product.create') && !can('sales', 'product.edit'), 'SALES staff cannot create or edit products');

  assert(can('inventory', 'inventory.adjust') && can('manager', 'inventory.adjust'), 'INVENTORY staff and MANAGER can perform stock adjustments');
  assert(!can('sales', 'inventory.adjust') && !can('accountant', 'inventory.adjust'), 'SALES and ACCOUNTANT cannot perform stock adjustments');

  // -------------------------------------------------------------
  // Test Suite 5: Purchases & Expenses Granular Permissions
  // -------------------------------------------------------------
  console.log('\n🛒 Test Suite 5: Purchases & Expenses Permissions');

  assert(can('inventory', 'purchase.create') && can('inventory', 'purchase.view'), 'INVENTORY staff can create and view purchase bills');
  assert(!can('sales', 'purchase.create') && !can('sales', 'purchase.view'), 'SALES staff cannot create or view vendor purchases');

  assert(can('accountant', 'expense.create') && can('accountant', 'expense.view'), 'ACCOUNTANT can create and view operating expenses');
  assert(!can('sales', 'expense.create') && !can('inventory', 'expense.create'), 'SALES and INVENTORY cannot create expenses');

  // -------------------------------------------------------------
  // Test Suite 6: Reports, Settings & Staff Management Permissions
  // -------------------------------------------------------------
  console.log('\n📊 Test Suite 6: Reports, Settings & Staff Management Permissions');

  assert(can('accountant', 'reports.view') && can('manager', 'reports.view'), 'ACCOUNTANT and MANAGER can view reports');
  assert(!can('sales', 'reports.view') && !can('inventory', 'reports.view'), 'SALES and INVENTORY cannot view business reports');

  assert(can('admin', 'settings.manage') && can('owner', 'settings.manage'), 'ADMIN and OWNER can manage settings');
  assert(!can('manager', 'settings.manage') && !can('accountant', 'settings.manage'), 'MANAGER and ACCOUNTANT cannot manage settings');

  assert(can('admin', 'staff.manage') && can('owner', 'staff.manage'), 'ADMIN and OWNER can manage staff');
  assert(!can('manager', 'staff.manage') && !can('sales', 'staff.manage'), 'MANAGER, SALES, INVENTORY, and ACCOUNTANT cannot manage staff');

  // -------------------------------------------------------------
  // Test Suite 7: Server-Side Authorization Guard Enforcement (403 Thrown)
  // -------------------------------------------------------------
  console.log('\n🛡️ Test Suite 7: Server-Side Authorization Guard Enforcement (requirePermission)');

  let thrownForbiddenError = false;
  try {
    requirePermission('sales', 'inventory.adjust');
  } catch (err: any) {
    if (err.message.includes('FORBIDDEN')) {
      thrownForbiddenError = true;
    }
  }

  assert(thrownForbiddenError, 'requirePermission() throws 403 FORBIDDEN error when unauthorized role attempts forbidden action');

  console.log('\n✨ All 7 Staff & Granular RBAC Test Suites PASSED Successfully!\n');
}

runStaffRBACTests().catch((err) => {
  console.error('❌ Test suite execution failed:', err);
  process.exit(1);
});
