// ============================================================
// lib/auth/permissions.ts — Role-based permission matrix
// ============================================================

import { OrgRole } from '@/types/app.types';

// ---- Granular Permission Definitions -----------------------
export const PERMISSIONS = {
  // Invoices (singular & plural forms)
  'invoice.create': ['owner', 'admin', 'manager', 'sales'],
  'invoice.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'invoice.edit': ['owner', 'admin', 'manager'],
  'invoice.cancel': ['owner', 'admin', 'manager'],

  'invoices.create': ['owner', 'admin', 'manager', 'sales'],
  'invoices.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'invoices.edit': ['owner', 'admin', 'manager'],
  'invoices.finalize': ['owner', 'admin', 'manager'],
  'invoices.cancel': ['owner', 'admin', 'manager'],
  'invoices.void': ['owner', 'admin'],
  'invoices.delete': ['owner', 'admin'],

  // Payments (singular & plural forms)
  'payment.create': ['owner', 'admin', 'manager', 'accountant'],
  'payment.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],

  'payments.create': ['owner', 'admin', 'manager', 'accountant'],
  'payments.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'payments.edit': ['owner', 'admin'],
  'payments.delete': ['owner', 'admin'],

  // Customers (singular & plural forms)
  'customer.create': ['owner', 'admin', 'manager', 'sales'],
  'customer.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customer.edit': ['owner', 'admin', 'manager'],

  'customers.create': ['owner', 'admin', 'manager', 'sales'],
  'customers.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customers.edit': ['owner', 'admin', 'manager'],
  'customers.delete': ['owner', 'admin'],

  // Products (singular & plural forms)
  'product.create': ['owner', 'admin', 'manager', 'inventory'],
  'product.view': ['owner', 'admin', 'manager', 'sales', 'inventory', 'accountant'],
  'product.edit': ['owner', 'admin', 'manager', 'inventory'],

  'products.create': ['owner', 'admin', 'manager', 'inventory'],
  'products.view': ['owner', 'admin', 'manager', 'sales', 'inventory', 'accountant'],
  'products.edit': ['owner', 'admin', 'manager', 'inventory'],
  'products.delete': ['owner', 'admin'],

  // Inventory
  'inventory.view': ['owner', 'admin', 'manager', 'sales', 'inventory', 'accountant'],
  'inventory.adjust': ['owner', 'admin', 'manager', 'inventory'],

  // Purchases (singular & plural forms)
  'purchase.create': ['owner', 'admin', 'manager', 'inventory'],
  'purchase.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],

  'purchases.create': ['owner', 'admin', 'manager', 'inventory'],
  'purchases.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'purchases.edit': ['owner', 'admin', 'manager'],
  'purchases.delete': ['owner', 'admin'],

  // Suppliers
  'suppliers.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'suppliers.create': ['owner', 'admin', 'manager', 'inventory'],
  'suppliers.edit': ['owner', 'admin', 'manager', 'inventory'],

  // Expenses (singular & plural forms)
  'expense.create': ['owner', 'admin', 'manager', 'accountant'],
  'expense.view': ['owner', 'admin', 'manager', 'accountant'],

  'expenses.create': ['owner', 'admin', 'manager', 'accountant'],
  'expenses.view': ['owner', 'admin', 'manager', 'accountant'],
  'expenses.edit': ['owner', 'admin', 'manager'],
  'expenses.delete': ['owner', 'admin'],

  // Quotations
  'quotations.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'quotations.create': ['owner', 'admin', 'manager', 'sales'],
  'quotations.edit': ['owner', 'admin', 'manager', 'sales'],
  'quotations.delete': ['owner', 'admin'],
  'quotations.convert': ['owner', 'admin', 'manager'],

  // Reports
  'reports.view': ['owner', 'admin', 'manager', 'accountant'],
  'reports.export': ['owner', 'admin', 'accountant'],

  // Settings
  'settings.manage': ['owner', 'admin'],
  'settings.view': ['owner', 'admin'],
  'settings.edit': ['owner', 'admin'],
  'settings.billing': ['owner'],

  // Staff Management
  'staff.manage': ['owner', 'admin'],
  'staff.view': ['owner', 'admin'],
  'staff.invite': ['owner', 'admin'],
  'staff.edit': ['owner', 'admin'],
  'staff.remove': ['owner'],

  // Audit logs
  'audit_logs.view': ['owner', 'admin'],
} as const satisfies Record<string, OrgRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Returns true if the given role has the specified permission.
 */
export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[permission] as readonly string[] | undefined;
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Throws a 403 error if the role does NOT have the specified permission.
 * Server-side authorization check.
 */
export function requirePermission(role: OrgRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`FORBIDDEN: Role '${role}' cannot perform '${permission}'`);
  }
}

/**
 * Returns all permissions a role has.
 */
export function getPermissionsForRole(role: OrgRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((perm) => can(role, perm));
}
