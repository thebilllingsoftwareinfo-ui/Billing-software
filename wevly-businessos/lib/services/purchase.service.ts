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
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    const userId = session.user_id || session.user?.id || '';
    requirePermission(role, 'purchases.create');

    const validated = createPurchaseBillSchema.parse(payload);
    const supabase = createAdminClient();

    // 1. Verify Supplier belongs to Organization
    const { data: rawSupplier, error: suppErr } = await supabase
      .from('suppliers')
      .select('id, name, state_code, gstin')
      .eq('id', validated.supplier_id)
      .eq('organization_id', orgId)
      .single();

    const supplier = rawSupplier as any;
    if (suppErr || !supplier) {
      throw new Error('Supplier not found or unauthorized');
    }

    // 2. Fetch Organization details for state_code
    const { data: rawOrg } = await supabase
      .from('organizations')
      .select('state_code, gstin')
      .eq('id', orgId)
      .single();

    const org = rawOrg as any;

    // 3. Calculate GST breakdown
    const taxCalculation = TaxService.calculateLineItemsTax({
      sellerStateCode: supplier.state_code || '07',
      buyerStateCode: org?.state_code || supplier.state_code || '07',
      sellerGstin: supplier.gstin || undefined,
      buyerGstin: org?.gstin || undefined,
      items: validated.items.map((item) => ({
        productId: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPricePaise: item.unit_price_paise,
        discountPct: item.discount_pct,
        hsnSac: item.hsn_sac || undefined,
        gstRate: item.gst_rate,
        gstType: item.gst_type,
      })),
    });

    // 4. Save purchase bill header
    const { data: rawBill, error: insertErr } = await supabase
      .from('purchase_bills')
      .insert({
        organization_id: orgId,
        supplier_id: validated.supplier_id,
        bill_number: validated.bill_number,
        bill_date: validated.bill_date,
        due_date: validated.due_date || null,
        status: 'draft',
        subtotal_paise: taxCalculation.subtotalPaise,
        taxable_paise: taxCalculation.taxablePaise,
        cgst_paise: taxCalculation.cgstPaise,
        sgst_paise: taxCalculation.sgstPaise,
        igst_paise: taxCalculation.igstPaise,
        total_paise: taxCalculation.totalPaise,
        paid_paise: 0,
        notes: validated.notes || null,
        created_by: userId,
      } as any)
      .select('id, created_at')
      .single();

    const bill = rawBill as any;
    if (insertErr || !bill) {
      throw new Error(`Failed to create purchase bill: ${insertErr?.message}`);
    }

    // 5. Save purchase bill line items
    const lineItemRows = taxCalculation.items.map((item, index) => ({
      purchase_bill_id: bill.id,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unit: validated.items[index]?.unit || 'PCS',
      unit_price_paise: item.unitPricePaise,
      discount_pct: item.discountPct,
      hsn_sac: item.hsnSac || null,
      gst_rate: item.gstRate,
      gst_type: item.gstType,
      cgst_paise: item.cgstPaise,
      sgst_paise: item.sgstPaise,
      igst_paise: item.igstPaise,
      line_subtotal_paise: item.subtotalPaise,
      line_total_paise: item.totalPaise,
      sort_order: index,
    }));

    const { error: itemsErr } = await supabase.from('purchase_bill_items').insert(lineItemRows as any);

    if (itemsErr) {
      throw new Error(`Failed to save purchase bill line items: ${itemsErr.message}`);
    }

    // 6. Audit log
    await logAudit(session, 'purchase_bill.created', 'purchase_bills', bill.id, {
      bill_number: validated.bill_number,
      supplier_id: validated.supplier_id,
      supplier_name: supplier.name,
      total_paise: taxCalculation.totalPaise,
    });

    return {
      bill_id: bill.id,
      bill_number: validated.bill_number,
      total_paise: taxCalculation.totalPaise,
    };
  }

  /**
   * FINALIZES PURCHASE BILL:
   * 1. Creates purchase transaction (sets status = 'approved').
   * 2. Increases inventory stock for each product line item via PURCHASE movements.
   * 3. Creates/updates supplier payable balance (suppliers.outstanding_paise).
   * 4. Writes audit log.
   */
  static async finalizePurchaseBill(session: AppSession, billId: string) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    requirePermission(role, 'purchases.create');
    const supabase = createAdminClient();

    // 1. Fetch Purchase Bill & Items
    const { data: rawBill, error: billErr } = await supabase
      .from('purchase_bills')
      .select(`
        *,
        suppliers (
          id,
          name,
          outstanding_paise
        ),
        purchase_bill_items (*)
      `)
      .eq('id', billId)
      .eq('organization_id', orgId)
      .single();

    const bill = rawBill as any;
    if (billErr || !bill) {
      throw new Error('Purchase bill not found');
    }

    if (bill.status !== 'draft') {
      throw new Error(`Purchase bill is already finalized (Current status: ${bill.status.toUpperCase()})`);
    }

    // 2. Update status to approved
    const { error: updateErr } = await (supabase.from('purchase_bills') as any)
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', billId)
      .eq('organization_id', orgId);

    if (updateErr) {
      throw new Error(`Failed to finalize purchase bill: ${updateErr.message}`);
    }

    // 3. Increase Inventory Stock for each product line item
    const items = bill.purchase_bill_items || [];
    for (const item of items) {
      if (item.product_id) {
        await InventoryService.postMovement(session, {
          product_id: item.product_id,
          movement_type: 'purchase',
          quantity: Number(item.quantity),
          reference_type: 'purchase_bill',
          reference_id: bill.id,
          notes: `Stock inbound from Purchase Bill #${bill.bill_number}`,
        });
      }
    }

    // 4. Update Supplier Payable Balance (Increase supplier outstanding)
    await this.syncSupplierOutstanding(orgId, bill.supplier_id);

    // 5. Audit Log
    await logAudit(session, 'purchase_bill.finalized', 'purchase_bills', billId, {
      bill_number: bill.bill_number,
      supplier_id: bill.supplier_id,
      supplier_name: bill.suppliers?.name,
      total_paise: bill.total_paise,
      items_count: items.length,
    });

    return {
      bill_id: billId,
      bill_number: bill.bill_number,
      status: 'approved',
      stock_movements_posted: items.filter((i: any) => i.product_id).length,
    };
  }

  /**
   * Recalculates and updates total outstanding payable balance for a supplier.
   */
  static async syncSupplierOutstanding(organizationId: string, supplierId: string) {
    const supabase = createAdminClient();

    const { data: rawBills } = await supabase
      .from('purchase_bills')
      .select('total_paise, paid_paise')
      .eq('organization_id', organizationId)
      .eq('supplier_id', supplierId)
      .not('status', 'in', '("draft","void","cancelled")');

    const approvedBills = (rawBills || []) as any[];
    const totalOutstandingPaise = approvedBills.reduce((sum, bill) => {
      const total = Number(bill.total_paise || 0);
      const paid = Number(bill.paid_paise || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    await (supabase.from('suppliers') as any)
      .update({
        outstanding_paise: totalOutstandingPaise,
        updated_at: new Date().toISOString(),
      })
      .eq('id', supplierId)
      .eq('organization_id', organizationId);

    return totalOutstandingPaise;
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

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
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

    if (error) {
      throw new Error(`Failed to list purchase bills: ${error.message}`);
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
    requirePermission(role, 'suppliers.view');
    const supabase = createAdminClient();

    const { data: supplier, error: suppErr } = await supabase
      .from('suppliers')
      .select('id, name, email, phone, gstin, state_code, billing_address, outstanding_paise')
      .eq('id', supplierId)
      .eq('organization_id', orgId)
      .single();

    if (suppErr || !supplier) {
      throw new Error('Supplier not found');
    }

    const { data: rawBills } = await supabase
      .from('purchase_bills')
      .select('id, bill_number, bill_date, status, total_paise, paid_paise')
      .eq('organization_id', orgId)
      .eq('supplier_id', supplierId)
      .order('bill_date', { ascending: false });

    const bills = (rawBills || []) as any[];

    const totalPurchasesPaise = bills.reduce((sum, b) => sum + Number(b.total_paise || 0), 0);
    const totalPaidPaise = bills.reduce((sum, b) => sum + Number(b.paid_paise || 0), 0);
    const totalOutstandingPaise = bills.reduce(
      (sum, b) => sum + Math.max(0, Number(b.total_paise || 0) - Number(b.paid_paise || 0)),
      0
    );

    return {
      supplier,
      metrics: {
        total_purchases_paise: totalPurchasesPaise,
        total_paid_paise: totalPaidPaise,
        outstanding_payable_paise: totalOutstandingPaise,
        bills_count: bills.length,
      },
      history: bills,
    };
  }
}

