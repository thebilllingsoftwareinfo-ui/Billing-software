// ============================================================
// lib/services/purchase-order.service.ts — Phase 7C Purchase Order Service
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import type { ApiSession } from '@/lib/auth/api-session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { TaxService } from '@/lib/services/tax.service';
import { PurchaseService } from '@/lib/services/purchase.service';
import {
  CreatePurchaseOrderInput,
  createPurchaseOrderSchema,
  PurchaseOrderStatus,
} from '@/lib/validators/purchase-order.schema';
import {
  demoPurchaseOrders,
  demoGetSupplier,
  demoAddPurchaseOrder,
  demoGetPurchaseOrder,
  demoGetPurchaseOrders,
  demoUpdatePurchaseOrder,
  demoDeletePurchaseOrder,
  demoGetNextDocSequence,
} from '@/lib/services/demo-store';

export type OpsSession = AppSession | ApiSession;

export interface PurchaseOrderListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export class PurchaseOrderService {
  /**
   * Generates next organization-scoped purchase order number (e.g. PO-2026-0001).
   */
  static async generatePONumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    if (organizationId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const nextSeq = demoGetNextDocSequence(organizationId, 'PO', currentYear);
      return `PO-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextSeq = (count || 0) + 1;
    return `PO-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a new purchase order with authoritative server-side GST calculations.
   */
  static async createPurchaseOrder(session: OpsSession, payload: CreatePurchaseOrderInput) {
    const role = session.role || (session as any).member?.role || 'inventory';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'purchase_orders.create');

    const validated = createPurchaseOrderSchema.parse(payload);
    const poNumber = validated.po_number || (await this.generatePONumber(orgId));

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const supplier = demoGetSupplier(validated.supplier_id);
      if (!supplier) throw new Error('Supplier not found');

      const taxCalculation = TaxService.calculateLineItemsTax({
        sellerStateCode: supplier.state_code || '27',
        buyerStateCode: '27',
        items: validated.items.map((item) => ({
          productId: item.product_id || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discountPct: item.discount_percent,
          hsnSac: item.hsn_sac || undefined,
          gstRate: item.gst_rate,
          gstType: item.is_gst_inclusive ? 'inclusive' : 'exclusive',
        })),
      });

      const newPO = demoAddPurchaseOrder({
        organization_id: orgId,
        po_number: poNumber,
        supplier_id: validated.supplier_id,
        order_date: validated.order_date,
        expected_delivery_date: validated.expected_delivery_date || null,
        status: 'issued',
        subtotal: taxCalculation.subtotal,
        discount_amount: taxCalculation.discount_amount,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        notes: validated.notes || null,
        terms: validated.terms || null,
        created_by: userId,
        items: taxCalculation.items.map((item, idx) => ({
          id: `po-item-${Date.now()}-${idx}`,
          purchase_order_id: '',
          organization_id: orgId,
          product_id: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          received_quantity: 0,
          unit: validated.items[idx]?.unit || 'PCS',
          unit_price: item.unit_price,
          discount_percent: item.discount_pct,
          hsn_sac: item.hsn_sac || null,
          gst_rate: item.gst_rate,
          is_gst_inclusive: validated.items[idx]?.is_gst_inclusive || false,
          taxable_amount: item.taxable_amount,
          cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount,
          igst_amount: item.igst_amount,
          total_amount: item.total_amount,
          sort_order: idx,
        })),
      });

      await logAudit(session as any, 'purchase_order.created', 'purchase_orders', newPO.id, {
        po_number: poNumber,
        total_amount: newPO.total_amount,
      });

      return { id: newPO.id, po_id: newPO.id, po_number: poNumber };
    }

    const supabase = createAdminClient();

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, state_code, gstin')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) throw new Error('Organization not found');

    const { data: supplier, error: suppErr } = await supabase
      .from('suppliers')
      .select('id, state_code, gstin')
      .eq('id', validated.supplier_id)
      .eq('organization_id', orgId)
      .single();

    if (suppErr || !supplier) throw new Error('Supplier not found or unauthorized');

    const taxCalculation = TaxService.calculateLineItemsTax({
      sellerStateCode: (supplier as any).state_code || (org as any).state_code || '27',
      buyerStateCode: (org as any).state_code || '27',
      items: validated.items.map((item) => ({
        productId: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discountPct: item.discount_percent,
        hsnSac: item.hsn_sac || undefined,
        gstRate: item.gst_rate,
        gstType: item.is_gst_inclusive ? 'inclusive' : 'exclusive',
      })),
    });

    const { data: rawPO, error: insertErr } = await (supabase.from('purchase_orders') as any)
      .insert({
        organization_id: orgId,
        po_number: poNumber,
        supplier_id: validated.supplier_id,
        order_date: validated.order_date,
        expected_delivery_date: validated.expected_delivery_date || null,
        status: 'issued',
        subtotal: taxCalculation.subtotal,
        discount_amount: taxCalculation.discount_amount,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        notes: validated.notes || null,
        terms: validated.terms || null,
        created_by: userId,
      })
      .select('id')
      .single();

    if (insertErr || !rawPO) throw new Error(insertErr?.message || 'Failed to create purchase order');
    const poId = rawPO.id;

    const lineItemRows = taxCalculation.items.map((item, index) => ({
      purchase_order_id: poId,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      received_quantity: 0,
      unit: validated.items[index]?.unit || 'PCS',
      unit_price: item.unit_price,
      discount_percent: item.discount_pct,
      hsn_sac: item.hsn_sac || null,
      gst_rate: item.gst_rate,
      is_gst_inclusive: validated.items[index]?.is_gst_inclusive || false,
      taxable_amount: item.taxable_amount,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total_amount: item.total_amount,
      sort_order: index,
    }));

    await supabase.from('purchase_order_items').insert(lineItemRows as any);

    await logAudit(session as any, 'purchase_order.created', 'purchase_orders', poId, {
      po_number: poNumber,
      total_amount: taxCalculation.total_amount,
    });

    return { id: poId, po_id: poId, po_number: poNumber };
  }

  /**
   * Retrieves single purchase order by ID.
   */
  static async getPurchaseOrder(session: OpsSession, poId: string) {
    const role = session.role || (session as any).member?.role || 'inventory';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'purchase_orders.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const po = demoGetPurchaseOrder(poId, orgId);
      if (!po) throw new Error('Purchase order not found');
      return po;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(*)
      `)
      .eq('id', poId)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) throw new Error('Purchase order not found');
    return data;
  }

  /**
   * Lists purchase orders with filters.
   */
  static async listPurchaseOrders(session: OpsSession, filters: PurchaseOrderListFilters = {}) {
    const role = session.role || (session as any).member?.role || 'inventory';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'purchase_orders.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      return demoGetPurchaseOrders(orgId, filters);
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, display_name, phone, email),
        items:purchase_order_items(*)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('order_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
    if (filters.startDate) query = query.gte('order_date', filters.startDate);
    if (filters.endDate) query = query.lte('order_date', filters.endDate);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return {
      orders: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Updates purchase order status.
   */
  static async updatePurchaseOrderStatus(session: OpsSession, poId: string, status: PurchaseOrderStatus) {
    const role = session.role || (session as any).member?.role || 'inventory';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'purchase_orders.edit');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const updated = demoUpdatePurchaseOrder(poId, orgId, { status });
      await logAudit(session as any, 'purchase_order.status_updated', 'purchase_orders', poId, { status });
      return updated;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('purchase_orders') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', poId)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    await logAudit(session as any, 'purchase_order.status_updated', 'purchase_orders', poId, { status });
    return data;
  }

  /**
   * Deletes a draft or cancelled purchase order.
   */
  static async deletePurchaseOrder(session: OpsSession, poId: string) {
    const role = session.role || (session as any).member?.role || 'admin';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'purchase_orders.delete');

    const po = await this.getPurchaseOrder(session, poId);
    if (po.status === 'issued' || po.status === 'received' || po.status === 'partially_received') {
      throw new Error('Cannot delete an active or fulfilled purchase order. Cancel it first.');
    }

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      demoDeletePurchaseOrder(poId, orgId);
      await logAudit(session as any, 'purchase_order.deleted', 'purchase_orders', poId, { po_number: po.po_number });
      return { success: true };
    }

    const supabase = createAdminClient();
    await supabase.from('purchase_order_items').delete().eq('purchase_order_id', poId);
    await supabase.from('purchase_orders').delete().eq('id', poId).eq('organization_id', orgId);

    await logAudit(session as any, 'purchase_order.deleted', 'purchase_orders', poId, { po_number: po.po_number });
    return { success: true };
  }

  /**
   * Quantity-safe, partial conversion of Purchase Order to Purchase Bill.
   */
  static async convertToPurchaseBill(
    session: OpsSession,
    poId: string,
    options?: {
      items?: Array<{ po_item_id?: string; product_id?: string; receive_quantity: number }>;
    }
  ) {
    const role = session.role || (session as any).member?.role || 'inventory';
    requirePermission(role, 'purchase_orders.convert');

    const po = await this.getPurchaseOrder(session, poId);
    if (po.status === 'cancelled') {
      throw new Error('Cannot convert a cancelled purchase order');
    }
    if (po.status === 'received') {
      throw new Error('This purchase order has already been completely received');
    }

    const poItems: any[] = po.items || [];
    const itemsToBill: any[] = [];

    for (const item of poItems) {
      const remainingQty = Number(item.quantity) - Number(item.received_quantity || 0);
      if (remainingQty <= 0) continue;

      let qtyToReceive = remainingQty;
      if (options?.items && options.items.length > 0) {
        const spec = options.items.find(
          (s) => (s.po_item_id && s.po_item_id === item.id) || (s.product_id && s.product_id === item.product_id)
        );
        if (spec) {
          if (spec.receive_quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
          }
          if (spec.receive_quantity > remainingQty) {
            throw new Error(
              `QUANTITY_EXCEEDED: Requested ${spec.receive_quantity} ${item.unit} for '${item.description}' exceeds remaining quantity of ${remainingQty}`
            );
          }
          qtyToReceive = spec.receive_quantity;
        } else {
          continue;
        }
      }

      itemsToBill.push({
        po_item_id: item.id,
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: qtyToReceive,
        unit: item.unit || 'PCS',
        unit_price: Number(item.unit_price),
        discount_percent: Number(item.discount_percent || 0),
        hsn_sac: item.hsn_sac || undefined,
        gst_rate: Number(item.gst_rate || 0),
        is_gst_inclusive: Boolean(item.is_gst_inclusive),
      });
    }

    if (itemsToBill.length === 0) {
      throw new Error('No remaining items or quantities available to convert to purchase bill');
    }

    // Create Purchase Bill via PurchaseService
    const billPayload = {
      supplier_id: po.supplier_id,
      bill_date: new Date().toISOString().split('T')[0],
      due_date: po.expected_delivery_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      notes: po.notes ? `Converted from PO #${po.po_number}. ${po.notes}` : `Converted from PO #${po.po_number}`,
      items: itemsToBill,
    };

    const newBill = await PurchaseService.createPurchaseBill(session as any, billPayload as any);

    // Update received quantities
    let allReceived = true;
    for (const item of poItems) {
      const billed = itemsToBill.find((c) => c.po_item_id === item.id);
      const addedQty = billed ? billed.quantity : 0;
      const newReceived = Number(item.received_quantity || 0) + addedQty;
      const totalOrdered = Number(item.quantity);

      if (newReceived < totalOrdered) {
        allReceived = false;
      }

      if (addedQty > 0) {
        const userId = session.user_id || (session as any).user?.id || '';
        const orgId = session.organization_id || (session as any).organization?.id || '';
        if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
          item.received_quantity = newReceived;
        } else {
          const supabase = createAdminClient();
          await (supabase.from('purchase_order_items') as any)
            .update({ received_quantity: newReceived })
            .eq('id', item.id);
        }
      }
    }

    const nextStatus: PurchaseOrderStatus = allReceived ? 'received' : 'partially_received';
    await this.updatePurchaseOrderStatus(session, poId, nextStatus);

    await logAudit(session as any, 'purchase_order.converted_to_bill', 'purchase_orders', poId, {
      bill_id: newBill.bill_id,
      bill_number: newBill.bill_number,
      status: nextStatus,
    });

    return {
      success: true,
      bill_id: newBill.bill_id,
      bill_number: newBill.bill_number,
      po_status: nextStatus,
    };
  }
}
