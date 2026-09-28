// ============================================================================
// lib/services/ar-ap-intelligence.service.ts — Phase 10 Receivables & Payables Intelligence
//
// Computes aging brackets (Current, 1–30, 31–60, 61–90, 90+ days),
// customer/supplier drilldowns, overdue warnings, and credit exposure.
// INVARIANT: Uses canonical invoices, purchase bills, and payments. No duplicate data stores.
// ============================================================================

import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import {
  demoInvoices,
  demoCustomers,
  demoPurchaseBills,
  demoSuppliers,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface AgeingBracket {
  current: number; // Not yet due
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

export interface CustomerAgeingItem {
  customer_id: string;
  customer_name: string;
  phone?: string | null;
  credit_limit: number;
  available_credit: number;
  utilization_percent: number;
  total_receivable: number;
  total_overdue: number;
  brackets: AgeingBracket;
  invoices: Array<{
    invoice_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    days_overdue: number;
    amount: number;
    balance_due: number;
    status: string;
  }>;
}

export interface ARAgeingSummary {
  as_of_date: string;
  total_receivable: number;
  total_overdue: number;
  brackets: AgeingBracket;
  customer_count: number;
  overdue_customer_count: number;
  customers: CustomerAgeingItem[];
}

export interface SupplierAgeingItem {
  supplier_id: string;
  supplier_name: string;
  phone?: string | null;
  total_payable: number;
  total_overdue: number;
  brackets: AgeingBracket;
  bills: Array<{
    bill_id: string;
    bill_number: string;
    bill_date: string;
    due_date: string;
    days_overdue: number;
    amount: number;
    balance_due: number;
    status: string;
  }>;
}

export interface APAgeingSummary {
  as_of_date: string;
  total_payable: number;
  total_overdue: number;
  brackets: AgeingBracket;
  supplier_count: number;
  overdue_supplier_count: number;
  suppliers: SupplierAgeingItem[];
}

export class ARAPIntelligenceService {
  /**
   * Computes comprehensive Accounts Receivable (Customer) Ageing & Exposure.
   */
  static async getARAgeing(session: AppSession, asOfDate?: string): Promise<ARAgeingSummary> {
    requirePermission(session.role, 'receivables.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const refDate = asOfDate || new Date().toISOString().split('T')[0];
    const refTime = new Date(refDate).getTime();

    // Filter unpaid/partially paid invoices for this organization
    const activeInvoices = demoInvoices.filter(
      (inv) =>
        inv.organization_id === orgId &&
        inv.payment_status !== 'paid' &&
        inv.status !== 'cancelled' &&
        inv.status !== 'void'
    );

    const overallBrackets: AgeingBracket = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      total: 0,
    };

    let totalReceivable = 0;
    let totalOverdue = 0;

    const customerMap = new Map<string, CustomerAgeingItem>();

    // Seed customer details
    const orgCustomers = demoCustomers.filter((c) => c.organization_id === orgId);
    for (const cust of orgCustomers) {
      const limit = Number(cust.credit_limit || 0);
      customerMap.set(cust.id, {
        customer_id: cust.id,
        customer_name: (cust as any).display_name || (cust as any).name || 'Customer',
        phone: cust.phone || (cust as any).mobile || null,
        credit_limit: limit,
        available_credit: limit,
        utilization_percent: 0,
        total_receivable: 0,
        total_overdue: 0,
        brackets: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 },
        invoices: [],
      });
    }

    for (const inv of activeInvoices) {
      const balanceDue = Number(inv.total_amount || 0) - Number(inv.amount_paid || 0);
      if (balanceDue <= 0) continue;

      totalReceivable += balanceDue;

      const dueDate = inv.due_date || inv.invoice_date;
      const dueTime = new Date(dueDate).getTime();
      const diffDays = Math.floor((refTime - dueTime) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);

      let bracketKey: keyof Omit<AgeingBracket, 'total'> = 'current';
      if (daysOverdue > 90) bracketKey = 'days_90_plus';
      else if (daysOverdue > 60) bracketKey = 'days_61_90';
      else if (daysOverdue > 30) bracketKey = 'days_31_60';
      else if (daysOverdue > 0) bracketKey = 'days_1_30';

      overallBrackets[bracketKey] += balanceDue;
      overallBrackets.total += balanceDue;

      if (daysOverdue > 0) {
        totalOverdue += balanceDue;
      }

      let custItem = customerMap.get(inv.customer_id);
      if (!custItem) {
        custItem = {
          customer_id: inv.customer_id,
          customer_name: (inv as any).customer_name || inv.customers?.display_name || 'Customer',
          credit_limit: 0,
          available_credit: 0,
          utilization_percent: 0,
          total_receivable: 0,
          total_overdue: 0,
          brackets: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 },
          invoices: [],
        };
        customerMap.set(inv.customer_id, custItem);
      }

      custItem.total_receivable += balanceDue;
      custItem.brackets[bracketKey] += balanceDue;
      custItem.brackets.total += balanceDue;

      if (daysOverdue > 0) {
        custItem.total_overdue += balanceDue;
      }

      custItem.invoices.push({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: dueDate,
        days_overdue: daysOverdue,
        amount: Number(inv.total_amount),
        balance_due: balanceDue,
        status: inv.payment_status || 'unpaid',
      });
    }

    // Finalize utilization & credit stats
    const customersList: CustomerAgeingItem[] = [];
    let overdueCustomerCount = 0;

    for (const cust of customerMap.values()) {
      if (cust.total_receivable > 0) {
        if (cust.credit_limit > 0) {
          cust.available_credit = Math.max(0, cust.credit_limit - cust.total_receivable);
          cust.utilization_percent = Math.min(100, Math.round((cust.total_receivable / cust.credit_limit) * 100));
        }
        if (cust.total_overdue > 0) {
          overdueCustomerCount++;
        }
        customersList.push(cust);
      }
    }

    return {
      as_of_date: refDate,
      total_receivable: Math.round(totalReceivable * 100) / 100,
      total_overdue: Math.round(totalOverdue * 100) / 100,
      brackets: overallBrackets,
      customer_count: customersList.length,
      overdue_customer_count: overdueCustomerCount,
      customers: customersList.sort((a, b) => b.total_receivable - a.total_receivable),
    };
  }

  /**
   * Computes comprehensive Accounts Payable (Supplier) Ageing & Commitments.
   */
  static async getAPAgeing(session: AppSession, asOfDate?: string): Promise<APAgeingSummary> {
    requirePermission(session.role, 'payables.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const refDate = asOfDate || new Date().toISOString().split('T')[0];
    const refTime = new Date(refDate).getTime();

    // Filter unpaid/partial purchase bills
    const activeBills = demoPurchaseBills.filter(
      (b) =>
        b.organization_id === orgId &&
        b.status !== 'paid' &&
        b.status !== 'cancelled'
    );

    const overallBrackets: AgeingBracket = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_90_plus: 0,
      total: 0,
    };

    let totalPayable = 0;
    let totalOverdue = 0;

    const supplierMap = new Map<string, SupplierAgeingItem>();

    for (const bill of activeBills) {
      const balanceDue = Number(bill.total_amount || 0) - Number(bill.amount_paid || 0);
      if (balanceDue <= 0) continue;

      totalPayable += balanceDue;

      const dueDate = bill.due_date || bill.bill_date;
      const dueTime = new Date(dueDate).getTime();
      const diffDays = Math.floor((refTime - dueTime) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);

      let bracketKey: keyof Omit<AgeingBracket, 'total'> = 'current';
      if (daysOverdue > 90) bracketKey = 'days_90_plus';
      else if (daysOverdue > 60) bracketKey = 'days_61_90';
      else if (daysOverdue > 30) bracketKey = 'days_31_60';
      else if (daysOverdue > 0) bracketKey = 'days_1_30';

      overallBrackets[bracketKey] += balanceDue;
      overallBrackets.total += balanceDue;

      if (daysOverdue > 0) {
        totalOverdue += balanceDue;
      }

      let suppItem = supplierMap.get(bill.supplier_id);
      if (!suppItem) {
        const supp = demoSuppliers.find((s) => s.id === bill.supplier_id);
        suppItem = {
          supplier_id: bill.supplier_id,
          supplier_name: (supp as any)?.display_name || (supp as any)?.name || (bill as any).supplier_name || 'Vendor',
          phone: supp?.phone || null,
          total_payable: 0,
          total_overdue: 0,
          brackets: { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 },
          bills: [],
        };
        supplierMap.set(bill.supplier_id, suppItem);
      }

      suppItem.total_payable += balanceDue;
      suppItem.brackets[bracketKey] += balanceDue;
      suppItem.brackets.total += balanceDue;

      if (daysOverdue > 0) {
        suppItem.total_overdue += balanceDue;
      }

      suppItem.bills.push({
        bill_id: bill.id,
        bill_number: bill.bill_number,
        bill_date: bill.bill_date,
        due_date: dueDate,
        days_overdue: daysOverdue,
        amount: Number(bill.total_amount),
        balance_due: balanceDue,
        status: bill.status || 'unpaid',
      });
    }

    const suppliersList = Array.from(supplierMap.values());
    const overdueSupplierCount = suppliersList.filter((s) => s.total_overdue > 0).length;

    return {
      as_of_date: refDate,
      total_payable: Math.round(totalPayable * 100) / 100,
      total_overdue: Math.round(totalOverdue * 100) / 100,
      brackets: overallBrackets,
      supplier_count: suppliersList.length,
      overdue_supplier_count: overdueSupplierCount,
      suppliers: suppliersList.sort((a, b) => b.total_payable - a.total_payable),
    };
  }

  static async getArAging(session: AppSession, opts?: { as_of_date?: string }) {
    const raw = await this.getARAgeing(session, opts?.as_of_date);
    return {
      as_of_date: raw.as_of_date,
      summary: {
        total: raw.total_receivable,
        current: raw.brackets.current,
        days1_30: raw.brackets.days_1_30,
        days31_60: raw.brackets.days_31_60,
        days61_90: raw.brackets.days_61_90,
        days90_plus: raw.brackets.days_90_plus,
      },
      customers: raw.customers.map((c) => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        invoices_count: c.invoices.length,
        buckets: {
          total: c.brackets.total,
          current: c.brackets.current,
          days1_30: c.brackets.days_1_30,
          days31_60: c.brackets.days_31_60,
          days61_90: c.brackets.days_61_90,
          days90_plus: c.brackets.days_90_plus,
        },
      })),
    };
  }

  static async getApAging(session: AppSession, opts?: { as_of_date?: string }) {
    const raw = await this.getAPAgeing(session, opts?.as_of_date);
    return {
      as_of_date: raw.as_of_date,
      summary: {
        total: raw.total_payable,
        current: raw.brackets.current,
        days1_30: raw.brackets.days_1_30,
        days31_60: raw.brackets.days_31_60,
        days61_90: raw.brackets.days_61_90,
        days90_plus: raw.brackets.days_90_plus,
      },
      suppliers: raw.suppliers.map((s) => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        bills_count: s.bills.length,
        buckets: {
          total: s.brackets.total,
          current: s.brackets.current,
          days1_30: s.brackets.days_1_30,
          days31_60: s.brackets.days_31_60,
          days61_90: s.brackets.days_61_90,
          days90_plus: s.brackets.days_90_plus,
        },
      })),
    };
  }

  static async getCustomerAging(session: AppSession, customerId: string, asOfDate?: string) {
    const raw = await this.getARAgeing(session, asOfDate);
    const found = raw.customers.find((c) => c.customer_id === customerId);
    if (!found) {
      return {
        customer_id: customerId,
        customer_name: 'Customer',
        invoices_count: 0,
        buckets: { total: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0 },
      };
    }
    return {
      customer_id: found.customer_id,
      customer_name: found.customer_name,
      invoices_count: found.invoices.length,
      buckets: {
        total: found.brackets.total,
        current: found.brackets.current,
        days1_30: found.brackets.days_1_30,
        days31_60: found.brackets.days_31_60,
        days61_90: found.brackets.days_61_90,
        days90_plus: found.brackets.days_90_plus,
      },
    };
  }

  static async getSupplierAging(session: AppSession, supplierId: string, asOfDate?: string) {
    const raw = await this.getAPAgeing(session, asOfDate);
    const found = raw.suppliers.find((s) => s.supplier_id === supplierId);
    if (!found) {
      return {
        supplier_id: supplierId,
        supplier_name: 'Supplier',
        bills_count: 0,
        buckets: { total: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90_plus: 0 },
      };
    }
    return {
      supplier_id: found.supplier_id,
      supplier_name: found.supplier_name,
      bills_count: found.bills.length,
      buckets: {
        total: found.brackets.total,
        current: found.brackets.current,
        days1_30: found.brackets.days_1_30,
        days31_60: found.brackets.days_31_60,
        days61_90: found.brackets.days_61_90,
        days90_plus: found.brackets.days_90_plus,
      },
    };
  }
}

export const ArApIntelligenceService = ARAPIntelligenceService;
