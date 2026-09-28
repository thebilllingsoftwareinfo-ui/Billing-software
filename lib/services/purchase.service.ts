import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { TaxService } from '@/lib/services/tax.service';
import { InventoryService } from '@/lib/services/inventory.service';
import {
  CreatePurchaseBillInput,
  createPurchaseBillSchema,
  PurchaseBillStatus,
} from '@/lib/validators/purchase.schema';
import { PurchaseTransactionService } from '@/lib/services/purchase-transaction.service';
import {
  demoGetPurchaseBills,
  demoGetPurchaseBill,
  demoAddPurchaseBill,
  demoFinalizePurchaseBill,
  demoSuppliers,
  demoGetSupplier,
  demoTransactions,
} from '@/lib/services/demo-store';

export interface PurchaseBillListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export class PurchaseService {
  /**
   * Creates a new purchase bill draft with server-side GST calculation.
   */
  static async createPurchaseBill(session: AppSession, payload: CreatePurchaseBillInput) {
    const res = await PurchaseTransactionService.executePurchase(session, {
      ...payload,
      status: 'draft',
    });
    return {
      id: res.bill.id,
      bill_id: res.bill.id,
      bill_number: res.bill.bill_number,
      total_amount: res.bill.total_amount,
      total_paise: Math.round(Number(res.bill.total_amount || 0) * 100),
    };
  }

  /**
   * Finalizes a purchase bill draft: increases stock, creates supplier ledger debit, updates payables.
   */
  static async finalizePurchaseBill(session: AppSession, billId: string) {
    const res = await PurchaseTransactionService.finalizeDraft(session, billId);
    return {
      bill_id: res.bill.id,
      bill_number: res.bill.bill_number,
      status: res.bill.status,
      stock_movements_posted: res.stockMovementsCount,
    };
  }

  /**
   * Safely cancels a purchase bill with atomic stock, payable, and cash/bank reversal.
   */
  static async cancelPurchaseBill(session: AppSession, billId: string) {
    return PurchaseTransactionService.cancelPurchaseBill(session, billId);
  }

  /**
   * Records a standalone payment to a supplier, with overpayment guard and cash/bank integration.
   */
  static async recordSupplierPayment(session: AppSession, payload: any) {
    return PurchaseTransactionService.recordSupplierPayment(session, payload);
  }

  /**
   * Recalculates and updates total outstanding payable balance for a supplier.
   */
  static async syncSupplierOutstanding(organizationId: string, supplierId: string) {
    const supabase = createAdminClient();

    const { data: rawBills } = await supabase
      .from('purchase_bills')
      .select('total_amount, total_paise, paid_amount, paid_paise')
      .eq('organization_id', organizationId)
      .eq('supplier_id', supplierId)
      .not('status', 'in', '("draft","void","cancelled")');

    const approvedBills = (rawBills || []) as any[];
    const totalOutstanding = approvedBills.reduce((sum, bill) => {
      const total = Number(bill.total_amount ?? (bill.total_paise ? bill.total_paise / 100 : 0));
      const paid = Number(bill.paid_amount ?? (bill.paid_paise ? bill.paid_paise / 100 : 0));
      return sum + Math.max(0, total - paid);
    }, 0);

    await (supabase.from('suppliers') as any)
      .update({
        outstanding_balance: totalOutstanding,
        outstanding_paise: Math.round(totalOutstanding * 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', supplierId)
      .eq('organization_id', organizationId);

    return totalOutstanding;
  }

  /**
   * Fetches full purchase bill details with line items and supplier.
   */
  static async getPurchaseBillDetails(session: AppSession, billId: string) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    requirePermission(role, 'purchases.view');
    const supabase = createAdminClient();

    const { data: bill, error } = await supabase
      .from('purchase_bills')
      .select(`
        *,
        suppliers (
          id,
          name,
          email,
          phone,
          gstin,
          billing_address
        ),
        purchase_bill_items (
          *
        )
      `)
      .eq('id', billId)
      .eq('organization_id', orgId)
      .single();

    if (error || !bill) {
      const demoBill = demoGetPurchaseBill(billId);
      if (demoBill) {
        return demoBill;
      }
      throw new Error('Purchase bill not found');
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name, legal_name, gstin, billing_address')
      .eq('id', orgId)
      .single();

    return {
      ...(bill as any),
      organization: org,
    };
  }

  /**
   * Lists purchase bills with filtering and pagination.
   */
  static async listPurchaseBills(session: AppSession, filters: PurchaseBillListFilters = {}) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    requirePermission(role, 'purchases.view');
    const supabase = createAdminClient();

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('purchase_bills')
      .select(
        `
        id,
        bill_number,
        bill_date,
        due_date,
        status,
        total_amount,
        paid_amount,
        total_paise,
        paid_paise,
        created_at,
        suppliers (
          id,
          name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId);

    const effectiveStatus = filters.status === 'unpaid' ? 'approved' : filters.status;
    if (effectiveStatus && effectiveStatus !== 'all') {
      query = query.eq('status', effectiveStatus);
    }

    if (filters.supplierId) {
      query = query.eq('supplier_id', filters.supplierId);
    }

    if (filters.startDate) {
      query = query.gte('bill_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('bill_date', filters.endDate);
    }

    if (filters.search) {
      query = query.or(
        `bill_number.ilike.%${filters.search}%,suppliers.name.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query
      .order('bill_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) {
      const demoRes = demoGetPurchaseBills({
        search: filters.search,
        status: filters.status,
        page,
        limit,
      });
      let filtered = demoRes.bills;
      if (filters.supplierId) {
        filtered = filtered.filter((b: any) => b.supplier_id === filters.supplierId);
      }
      return {
        bills: filtered,
        total: filtered.length,
        page: 1,
        limit: limit,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      };
    }

    return {
      bills: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Generates complete Supplier Statement & Ledger breakdown.
   */
  static async getSupplierStatement(session: AppSession, supplierId: string) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    const userId = session.user_id || session.user?.id || '';
    requirePermission(role, 'suppliers.view');

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    if (userId.includes('demo') || !isValidUUID(supplierId)) {
      const demoSupp = demoGetSupplier(supplierId);
      if (demoSupp) {
        const demoRes = demoGetPurchaseBills({ limit: 100 });
        const demoBills = demoRes.bills.filter((b: any) => b.supplier_id === supplierId);
        const activeBills = demoBills.filter((b: any) => b.status !== 'draft' && b.status !== 'cancelled' && b.status !== 'void');
        const totalPurchases = activeBills.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
        const totalPaid = activeBills.reduce((sum: number, b: any) => sum + Number(b.paid_amount || 0), 0);
        const outstanding = Math.max(0, totalPurchases - totalPaid);
        const txns = demoTransactions.filter((t: any) => t.supplier_id === supplierId);
        return {
          supplier: demoSupp,
          metrics: {
            total_purchases: totalPurchases,
            total_paid: totalPaid,
            outstanding_payable: outstanding,
            total_purchases_paise: Math.round(totalPurchases * 100),
            total_paid_paise: Math.round(totalPaid * 100),
            outstanding_payable_paise: Math.round(outstanding * 100),
            bills_count: demoBills.length,
          },
          history: demoBills,
          transactions: txns,
        };
      }
    }

    const supabase = createAdminClient();

    const { data: supplier, error: suppErr } = await supabase
      .from('suppliers')
      .select('id, name, email, phone, gstin, state_code, billing_address, outstanding_balance, outstanding_paise')
      .eq('id', supplierId)
      .eq('organization_id', orgId)
      .single();

    if (suppErr || !supplier) {
      const demoSupp = demoGetSupplier(supplierId);
      if (demoSupp) {
        const demoRes = demoGetPurchaseBills({ limit: 100 });
        const demoBills = demoRes.bills.filter((b: any) => b.supplier_id === supplierId);
        const activeBills = demoBills.filter((b: any) => b.status !== 'draft' && b.status !== 'cancelled' && b.status !== 'void');
        const totalPurchases = activeBills.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
        const totalPaid = activeBills.reduce((sum: number, b: any) => sum + Number(b.paid_amount || 0), 0);
        const outstanding = Math.max(0, totalPurchases - totalPaid);
        return {
          supplier: demoSupp,
          metrics: {
            total_purchases: totalPurchases,
            total_paid: totalPaid,
            outstanding_payable: outstanding,
            total_purchases_paise: Math.round(totalPurchases * 100),
            total_paid_paise: Math.round(totalPaid * 100),
            outstanding_payable_paise: Math.round(outstanding * 100),
            bills_count: demoBills.length,
          },
          history: demoBills,
        };
      }
      throw new Error('Supplier not found');
    }

    const { data: rawBills } = await supabase
      .from('purchase_bills')
      .select('id, bill_number, bill_date, status, total_amount, paid_amount, total_paise, paid_paise')
      .eq('organization_id', orgId)
      .eq('supplier_id', supplierId)
      .order('bill_date', { ascending: false });

    const bills = (rawBills || []) as any[];

    const activeBills = bills.filter((b: any) => b.status !== 'draft' && b.status !== 'cancelled' && b.status !== 'void');
    const totalPurchases = activeBills.reduce((sum, b) => sum + Number(b.total_amount ?? (b.total_paise ? b.total_paise / 100 : 0)), 0);
    const totalPaid = activeBills.reduce((sum, b) => sum + Number(b.paid_amount ?? (b.paid_paise ? b.paid_paise / 100 : 0)), 0);
    const totalOutstanding = Math.max(0, totalPurchases - totalPaid);

    // Fetch canonical supplier transactions ledger
    let transactions: any[] = [];
    try {
      const { data: rawTxns } = await (supabase.from('supplier_transactions') as any)
        .select('*')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });
      transactions = rawTxns || [];
    } catch {
      transactions = [];
    }

    return {
      supplier,
      metrics: {
        total_purchases: totalPurchases,
        total_paid: totalPaid,
        outstanding_payable: totalOutstanding,
        total_purchases_paise: Math.round(totalPurchases * 100),
        total_paid_paise: Math.round(totalPaid * 100),
        outstanding_payable_paise: Math.round(totalOutstanding * 100),
        bills_count: bills.length,
      },
      history: bills,
      transactions,
    };
  }
}


