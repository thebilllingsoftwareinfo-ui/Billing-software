// ============================================================
// lib/services/sales-order.service.ts — Phase 7C Sales Order Service
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import type { ApiSession } from '@/lib/auth/api-session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { TaxService } from '@/lib/services/tax.service';
import { InvoiceService } from '@/lib/services/invoice.service';
import { DeliveryChallanService } from '@/lib/services/delivery-challan.service';
import {
  CreateSalesOrderInput,
  createSalesOrderSchema,
  SalesOrderStatus,
} from '@/lib/validators/sales-order.schema';
import {
  demoSalesOrders,
  demoSalesOrderItems,
  demoGetCustomer,
  demoAddSalesOrder,
  demoUpdateSalesOrder,
  demoDeleteSalesOrder,
  demoGetSalesOrder,
  demoGetSalesOrders,
  demoGetNextDocSequence,
} from '@/lib/services/demo-store';

export type OpsSession = AppSession | ApiSession;

export interface SalesOrderListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export class SalesOrderService {
  /**
   * Generates next organization-scoped sales order number (e.g. SO-2026-0001).
   */
  static async generateOrderNumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    if (organizationId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const nextSeq = demoGetNextDocSequence(organizationId, 'SO', currentYear);
      return `SO-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextSeq = (count || 0) + 1;
    return `SO-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a new sales order draft or confirmed with server-side authoritative GST calculations.
   */
  static async createSalesOrder(session: OpsSession, payload: CreateSalesOrderInput) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'sales_orders.create');

    const validated = createSalesOrderSchema.parse(payload);
    const orderNumber = validated.order_number || (await this.generateOrderNumber(orgId));

    // Handle demo mode
    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const customer = demoGetCustomer(validated.customer_id);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const taxCalculation = TaxService.calculateLineItemsTax({
        sellerStateCode: '27',
        buyerStateCode: validated.place_of_supply || (customer as any).state_code || customer.customer_addresses?.[0]?.state_code || '27',
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

      const newOrder = demoAddSalesOrder({
        organization_id: orgId,
        order_number: orderNumber,
        customer_id: validated.customer_id,
        order_date: validated.order_date,
        expected_delivery_date: validated.expected_delivery_date || null,
        quotation_id: validated.quotation_id || null,
        status: 'confirmed',
        subtotal: taxCalculation.subtotal,
        discount_amount: taxCalculation.discount_amount,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        place_of_supply: validated.place_of_supply || null,
        notes: validated.notes || null,
        terms: validated.terms || null,
        created_by: userId,
        items: taxCalculation.items.map((item, idx) => ({
          id: `so-item-${Date.now()}-${idx}`,
          sales_order_id: '',
          organization_id: orgId,
          product_id: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          fulfilled_quantity: 0,
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

      await logAudit(session as any, 'sales_order.created', 'sales_orders', newOrder.id, {
        order_number: orderNumber,
        total_amount: newOrder.total_amount,
      });

      return { id: newOrder.id, order_id: newOrder.id, order_number: orderNumber };
    }

    const supabase = createAdminClient();

    // 1. Organization & Customer state codes
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, state_code, gstin')
      .eq('id', orgId)
      .single();

    if (orgErr || !org) throw new Error('Organization not found');

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, state_code, gstin')
      .eq('id', validated.customer_id)
      .eq('organization_id', orgId)
      .single();

    if (custErr || !customer) throw new Error('Customer not found or unauthorized');

    // 2. Tax calculation
    const taxCalculation = TaxService.calculateLineItemsTax({
      sellerStateCode: (org as any).state_code || '27',
      buyerStateCode: (customer as any).state_code || (org as any).state_code || '27',
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

    // 3. Insert sales order header
    const { data: rawOrder, error: insertErr } = await (supabase.from('sales_orders') as any)
      .insert({
        organization_id: orgId,
        order_number: orderNumber,
        customer_id: validated.customer_id,
        order_date: validated.order_date,
        expected_delivery_date: validated.expected_delivery_date || null,
        quotation_id: validated.quotation_id || null,
        status: 'confirmed',
        subtotal: taxCalculation.subtotal,
        discount_amount: taxCalculation.discount_amount,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        place_of_supply: validated.place_of_supply || null,
        notes: validated.notes || null,
        terms: validated.terms || null,
        created_by: userId,
      })
      .select('id')
      .single();

    if (insertErr || !rawOrder) throw new Error(insertErr?.message || 'Failed to create sales order');
    const orderId = rawOrder.id;

    // 4. Insert items
    const lineItemRows = taxCalculation.items.map((item, index) => ({
      sales_order_id: orderId,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      fulfilled_quantity: 0,
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

    await supabase.from('sales_order_items').insert(lineItemRows as any);

    await logAudit(session as any, 'sales_order.created', 'sales_orders', orderId, {
      order_number: orderNumber,
      total_amount: taxCalculation.total_amount,
    });

    return { id: orderId, order_id: orderId, order_number: orderNumber };
  }

  /**
   * Retrieves single sales order by ID.
   */
  static async getSalesOrder(session: OpsSession, orderId: string) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'sales_orders.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const order = demoGetSalesOrder(orderId, orgId);
      if (!order) throw new Error('Sales order not found');
      return order;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers(*),
        items:sales_order_items(*)
      `)
      .eq('id', orderId)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) throw new Error('Sales order not found');
    return data;
  }

  /**
   * Lists sales orders with filters and pagination.
   */
  static async listSalesOrders(session: OpsSession, filters: SalesOrderListFilters = {}) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'sales_orders.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      return demoGetSalesOrders(orgId, filters);
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers(id, name, display_name, phone, email),
        items:sales_order_items(*)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('order_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
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
   * Updates sales order status.
   */
  static async updateSalesOrderStatus(session: OpsSession, orderId: string, status: SalesOrderStatus) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'sales_orders.edit');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const updated = demoUpdateSalesOrder(orderId, orgId, { status });
      await logAudit(session as any, 'sales_order.status_updated', 'sales_orders', orderId, { status });
      return updated;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('sales_orders') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    await logAudit(session as any, 'sales_order.status_updated', 'sales_orders', orderId, { status });
    return data;
  }

  /**
   * Deletes a draft or cancelled sales order.
   */
  static async deleteSalesOrder(session: OpsSession, orderId: string) {
    const role = session.role || (session as any).member?.role || 'admin';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'sales_orders.delete');

    const order = await this.getSalesOrder(session, orderId);
    if (order.status === 'confirmed' || order.status === 'fulfilled' || order.status === 'partially_fulfilled') {
      throw new Error('Cannot delete an active or fulfilled sales order. Cancel it first.');
    }

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      demoDeleteSalesOrder(orderId, orgId);
      await logAudit(session as any, 'sales_order.deleted', 'sales_orders', orderId, { order_number: order.order_number });
      return { success: true };
    }

    const supabase = createAdminClient();
    await supabase.from('sales_order_items').delete().eq('sales_order_id', orderId);
    await supabase.from('sales_orders').delete().eq('id', orderId).eq('organization_id', orgId);

    await logAudit(session as any, 'sales_order.deleted', 'sales_orders', orderId, { order_number: order.order_number });
    return { success: true };
  }

  /**
   * Quantity-safe, idempotent conversion of Sales Order to Sales Invoice.
   * Prevents over-fulfillment beyond total ordered quantity.
   */
  static async convertToInvoice(
    session: OpsSession,
    orderId: string,
    options?: {
      items?: Array<{ order_item_id?: string; product_id?: string; convert_quantity: number }>;
    }
  ) {
    const role = session.role || (session as any).member?.role || 'sales';
    requirePermission(role, 'sales_orders.convert');

    const order = await this.getSalesOrder(session, orderId);
    if (order.status === 'cancelled') {
      throw new Error('Cannot convert a cancelled sales order');
    }
    if (order.status === 'fulfilled') {
      throw new Error('This sales order has already been completely fulfilled');
    }

    const orderItems: any[] = order.items || [];
    const itemsToConvert: any[] = [];

    for (const item of orderItems) {
      const remainingQty = Number(item.quantity) - Number(item.fulfilled_quantity || 0);
      if (remainingQty <= 0) continue;

      let qtyToFulfill = remainingQty;
      if (options?.items && options.items.length > 0) {
        const spec = options.items.find(
          (s) => (s.order_item_id && s.order_item_id === item.id) || (s.product_id && s.product_id === item.product_id)
        );
        if (spec) {
          if (spec.convert_quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
          }
          if (spec.convert_quantity > remainingQty) {
            throw new Error(
              `QUANTITY_EXCEEDED: Requested ${spec.convert_quantity} ${item.unit} for '${item.description}' exceeds remaining quantity of ${remainingQty}`
            );
          }
          qtyToFulfill = spec.convert_quantity;
        } else {
          continue; // not selected for partial conversion
        }
      }

      itemsToConvert.push({
        order_item_id: item.id,
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: qtyToFulfill,
        unit: item.unit || 'PCS',
        unit_price: Number(item.unit_price),
        discount_percent: Number(item.discount_percent || 0),
        hsn_sac_code: item.hsn_sac || undefined,
        gst_rate: Number(item.gst_rate || 0),
        is_gst_inclusive: Boolean(item.is_gst_inclusive),
      });
    }

    if (itemsToConvert.length === 0) {
      throw new Error('No remaining items or quantities available to convert to invoice');
    }

    // Create Sales Invoice via InvoiceService
    const invoicePayload = {
      customer_id: order.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: order.expected_delivery_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      place_of_supply: order.place_of_supply || undefined,
      notes: order.notes ? `Converted from Sales Order #${order.order_number}. ${order.notes}` : `Converted from Sales Order #${order.order_number}`,
      terms_and_conditions: order.terms || undefined,
      items: itemsToConvert,
    };

    const newInvoice = await InvoiceService.createInvoice(session as any, invoicePayload);

    // Update fulfilled quantities on order items
    let allFulfilled = true;
    for (const item of orderItems) {
      const converted = itemsToConvert.find((c) => c.order_item_id === item.id);
      const addedQty = converted ? converted.quantity : 0;
      const newFulfilled = Number(item.fulfilled_quantity || 0) + addedQty;
      const totalOrdered = Number(item.quantity);

      if (newFulfilled < totalOrdered) {
        allFulfilled = false;
      }

      if (addedQty > 0) {
        const userId = session.user_id || (session as any).user?.id || '';
        const orgId = session.organization_id || (session as any).organization?.id || '';
        if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
          item.fulfilled_quantity = newFulfilled;
        } else {
          const supabase = createAdminClient();
          await (supabase.from('sales_order_items') as any)
            .update({ fulfilled_quantity: newFulfilled })
            .eq('id', item.id);
        }
      }
    }

    const nextStatus: SalesOrderStatus = allFulfilled ? 'fulfilled' : 'partially_fulfilled';
    await this.updateSalesOrderStatus(session, orderId, nextStatus);

    await logAudit(session as any, 'sales_order.converted_to_invoice', 'sales_orders', orderId, {
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
      status: nextStatus,
    });

    return {
      success: true,
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
      order_status: nextStatus,
    };
  }

  /**
   * Converts Sales Order to Delivery Challan.
   */
  static async convertToDeliveryChallan(
    session: OpsSession,
    orderId: string,
    options?: {
      challan_type?: any;
      vehicle_number?: string;
      transporter_name?: string;
    }
  ) {
    const role = session.role || (session as any).member?.role || 'sales';
    requirePermission(role, 'sales_orders.convert');

    const order = await this.getSalesOrder(session, orderId);
    if (order.status === 'cancelled') {
      throw new Error('Cannot convert a cancelled sales order');
    }
    if (order.status === 'fulfilled') {
      throw new Error('This sales order has already been completely fulfilled');
    }

    const challanPayload = {
      customer_id: order.customer_id,
      challan_date: new Date().toISOString().split('T')[0],
      challan_type: options?.challan_type || 'removal_for_sale',
      sales_order_id: order.id,
      vehicle_number: options?.vehicle_number || null,
      transporter_name: options?.transporter_name || null,
      notes: order.notes ? `Converted from Sales Order #${order.order_number}. ${order.notes}` : `Converted from Sales Order #${order.order_number}`,
      items: (order.items || []).map((it: any) => ({
        product_id: it.product_id || undefined,
        description: it.description,
        quantity: Math.max(1, Number(it.quantity) - Number(it.fulfilled_quantity || 0)),
        unit: it.unit || 'PCS',
        unit_price: Number(it.unit_price || 0),
        hsn_sac: it.hsn_sac || undefined,
        gst_rate: Number(it.gst_rate || 0),
      })),
    };

    const newChallan = await DeliveryChallanService.createDeliveryChallan(session, challanPayload as any);

    return {
      success: true,
      challan_id: newChallan.id || newChallan.challan_id,
      challan_number: newChallan.challan_number,
    };
  }
}
