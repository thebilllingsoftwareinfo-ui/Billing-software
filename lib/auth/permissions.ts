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

  'customer_payments.create': ['owner', 'admin', 'manager', 'accountant'],
  'customer_payments.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],

  'supplier_payments.create': ['owner', 'admin', 'manager', 'accountant', 'inventory'],
  'supplier_payments.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],

  'receivables.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'payables.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],

  // Customers (singular & plural forms)
  'customer.create': ['owner', 'admin', 'manager', 'sales'],
  'customer.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customer.edit': ['owner', 'admin', 'manager'],

  'customers.create': ['owner', 'admin', 'manager', 'sales'],
  'customers.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customers.edit': ['owner', 'admin', 'manager'],
  'customers.delete': ['owner', 'admin'],

  // Customer CRM (Phase 7B)
  'customers.notes.create': ['owner', 'admin', 'manager', 'sales'],
  'customers.notes.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customers.notes.edit': ['owner', 'admin', 'manager'],
  'customers.notes.delete': ['owner', 'admin'],

  'customers.followups.create': ['owner', 'admin', 'manager', 'sales'],
  'customers.followups.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customers.followups.edit': ['owner', 'admin', 'manager', 'sales'],

  'customer_statements.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'customer_statements.export': ['owner', 'admin', 'accountant'],

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

  // Phase 8: Advanced Inventory & Warehouse Management
  'inventory.warehouse.view': ['owner', 'admin', 'manager', 'inventory', 'accountant', 'sales'],
  'inventory.warehouse.create': ['owner', 'admin', 'manager', 'inventory'],
  'inventory.warehouse.update': ['owner', 'admin', 'manager', 'inventory'],
  'inventory.warehouse.delete': ['owner', 'admin'],

  'inventory.transfer.view': ['owner', 'admin', 'manager', 'inventory', 'sales', 'accountant'],
  'inventory.transfer.create': ['owner', 'admin', 'manager', 'inventory'],
  'inventory.transfer.approve': ['owner', 'admin', 'manager'],
  'inventory.transfer.receive': ['owner', 'admin', 'manager', 'inventory'],
  'inventory.transfer.cancel': ['owner', 'admin', 'manager'],

  'inventory.batch.view': ['owner', 'admin', 'manager', 'inventory', 'sales', 'accountant'],
  'inventory.batch.manage': ['owner', 'admin', 'manager', 'inventory'],

  'inventory.serial.view': ['owner', 'admin', 'manager', 'inventory', 'sales', 'accountant'],
  'inventory.serial.manage': ['owner', 'admin', 'manager', 'inventory'],

  'inventory.reservation.view': ['owner', 'admin', 'manager', 'sales', 'inventory', 'accountant'],
  'inventory.reservation.manage': ['owner', 'admin', 'manager', 'sales', 'inventory'],

  'inventory.stock_count.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'inventory.stock_count.create': ['owner', 'admin', 'manager', 'inventory'],
  'inventory.stock_count.approve': ['owner', 'admin', 'manager'],
  'inventory.stock_count.post': ['owner', 'admin', 'manager'],

  'inventory.valuation.view': ['owner', 'admin', 'manager', 'accountant', 'inventory'],

  // Returns & Notes
  'sales_returns.create': ['owner', 'admin', 'manager', 'sales'],
  'sales_returns.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'credit_notes.create': ['owner', 'admin', 'manager', 'sales'],
  'credit_notes.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'purchase_returns.create': ['owner', 'admin', 'manager', 'inventory'],
  'purchase_returns.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'debit_notes.create': ['owner', 'admin', 'manager', 'inventory'],
  'debit_notes.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],

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
  'suppliers.delete': ['owner', 'admin'],

  // Supplier CRM (Phase 7B)
  'suppliers.notes.create': ['owner', 'admin', 'manager', 'inventory'],
  'suppliers.notes.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'suppliers.notes.edit': ['owner', 'admin', 'manager'],
  'suppliers.notes.delete': ['owner', 'admin'],

  'suppliers.followups.create': ['owner', 'admin', 'manager', 'inventory'],
  'suppliers.followups.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'suppliers.followups.edit': ['owner', 'admin', 'manager', 'inventory'],

  'supplier_statements.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'supplier_statements.export': ['owner', 'admin', 'accountant'],

  // Expenses (singular & plural forms)
  'expense.create': ['owner', 'admin', 'manager', 'accountant'],
  'expense.view': ['owner', 'admin', 'manager', 'accountant'],

  'expenses.create': ['owner', 'admin', 'manager', 'accountant'],
  'expenses.view': ['owner', 'admin', 'manager', 'accountant'],
  'expenses.edit': ['owner', 'admin', 'manager'],
  'expenses.cancel': ['owner', 'admin', 'manager'],
  'expenses.delete': ['owner', 'admin'],

  // Quotations
  'quotations.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'quotations.create': ['owner', 'admin', 'manager', 'sales'],
  'quotations.edit': ['owner', 'admin', 'manager', 'sales'],
  'quotations.delete': ['owner', 'admin'],
  'quotations.convert': ['owner', 'admin', 'manager'],

  // Phase 7C Operations
  // Sales Orders
  'sales_orders.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'sales_orders.create': ['owner', 'admin', 'manager', 'sales'],
  'sales_orders.edit': ['owner', 'admin', 'manager', 'sales'],
  'sales_orders.delete': ['owner', 'admin'],
  'sales_orders.convert': ['owner', 'admin', 'manager', 'sales'],

  // Proforma Invoices
  'proforma_invoices.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'proforma_invoices.create': ['owner', 'admin', 'manager', 'sales'],
  'proforma_invoices.edit': ['owner', 'admin', 'manager', 'sales'],
  'proforma_invoices.delete': ['owner', 'admin'],
  'proforma_invoices.convert': ['owner', 'admin', 'manager', 'sales'],

  // Delivery Challans
  'delivery_challans.view': ['owner', 'admin', 'manager', 'sales', 'inventory', 'accountant'],
  'delivery_challans.create': ['owner', 'admin', 'manager', 'inventory', 'sales'],
  'delivery_challans.edit': ['owner', 'admin', 'manager', 'inventory'],
  'delivery_challans.delete': ['owner', 'admin'],
  'delivery_challans.convert': ['owner', 'admin', 'manager'],

  // Purchase Orders
  'purchase_orders.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'purchase_orders.create': ['owner', 'admin', 'manager', 'inventory'],
  'purchase_orders.edit': ['owner', 'admin', 'manager', 'inventory'],
  'purchase_orders.delete': ['owner', 'admin'],
  'purchase_orders.convert': ['owner', 'admin', 'manager', 'inventory'],

  // Reports
  'reports.view': ['owner', 'admin', 'manager', 'accountant'],
  'reports.export': ['owner', 'admin', 'accountant'],
  'reports.expenses': ['owner', 'admin', 'manager', 'accountant'],
  'reports.receivables': ['owner', 'admin', 'manager', 'accountant'],
  'reports.payables': ['owner', 'admin', 'manager', 'accountant'],

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

  // Accounting (Double-Entry Ledger & Chart of Accounts)
  'accounting.view': ['owner', 'admin', 'manager', 'accountant'],
  'accounting.create': ['owner', 'admin', 'manager', 'accountant'],
  'accounting.edit': ['owner', 'admin', 'accountant'],
  'accounting.settings': ['owner', 'admin', 'accountant'],

  // Phase 9: Advanced Pricing, Credit, Commissions & Recurring Operations
  'pricing.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'pricing.manage': ['owner', 'admin', 'manager'],
  'pricing.override': ['owner', 'admin', 'manager'],
  'discounts.manage': ['owner', 'admin', 'manager'],
  'credit.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'credit.manage': ['owner', 'admin', 'manager'],
  'salesperson.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'salesperson.manage': ['owner', 'admin', 'manager'],
  'commission.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'commission.manage': ['owner', 'admin', 'manager'],
  'recurring.view': ['owner', 'admin', 'manager', 'sales', 'accountant'],
  'recurring.manage': ['owner', 'admin', 'manager', 'sales'],
  'profitability.view': ['owner', 'admin', 'manager', 'accountant'],
  'procurement.view': ['owner', 'admin', 'manager', 'inventory', 'accountant'],
  'procurement.manage': ['owner', 'admin', 'manager', 'inventory'],

  // Phase 10: Advanced Financial Accounting, Tax Compliance & Business Intelligence
  'accounting.period.view': ['owner', 'admin', 'manager', 'accountant'],
  'accounting.period.manage': ['owner', 'admin', 'accountant'],
  'accounting.journal.view': ['owner', 'admin', 'manager', 'accountant'],
  'accounting.journal.manage': ['owner', 'admin', 'accountant'],
  'accounting.journal.post': ['owner', 'admin', 'accountant'],
  'accounting.journal.reverse': ['owner', 'admin', 'accountant'],
  'accounting.reconciliation.view': ['owner', 'admin', 'manager', 'accountant'],
  'accounting.reconciliation.manage': ['owner', 'admin', 'accountant'],
  'financial_reports.view': ['owner', 'admin', 'manager', 'accountant'],
  'tax_reports.view': ['owner', 'admin', 'manager', 'accountant'],
  'tax_period.manage': ['owner', 'admin', 'accountant'],
  'cashflow.view': ['owner', 'admin', 'manager', 'accountant'],
  'cost_center.view': ['owner', 'admin', 'manager', 'accountant'],
  'cost_center.manage': ['owner', 'admin', 'manager'],
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
