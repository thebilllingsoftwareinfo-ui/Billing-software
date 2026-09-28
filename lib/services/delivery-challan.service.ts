// ============================================================
// lib/services/delivery-challan.service.ts — Phase 7C Delivery Challan Service
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import type { ApiSession } from '@/lib/auth/api-session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { TaxService } from '@/lib/services/tax.service';
import { InvoiceService } from '@/lib/services/invoice.service';
import { postInventoryMovement } from '@/lib/services/inventory.service';
import {
  CreateDeliveryChallanInput,
  createDeliveryChallanSchema,
  DeliveryChallanStatus,
} from '@/lib/validators/delivery-challan.schema';
import {
  demoDeliveryChallans,
  demoGetCustomer,
  demoAddDeliveryChallan,
  demoGetDeliveryChallan,
  demoGetDeliveryChallans,
  demoUpdateDeliveryChallan,
  demoDeleteDeliveryChallan,
  demoDeductStock,
  demoRestoreStock,
  demoGetNextDocSequence,
} from '@/lib/services/demo-store';

export type OpsSession = AppSession | ApiSession;

export interface DeliveryChallanListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  challanType?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export class DeliveryChallanService {
  /**
   * Generates next organization-scoped delivery challan number (e.g. DC-2026-0001).
   */
  static async generateChallanNumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    if (organizationId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const nextSeq = demoGetNextDocSequence(organizationId, 'DC', currentYear);
      return `DC-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from('delivery_challans')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextSeq = (count || 0) + 1;
    return `DC-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a new Delivery Challan (Rule 55 CGST compliant).
   */
  static async createDeliveryChallan(session: OpsSession, payload: CreateDeliveryChallanInput) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'delivery_challans.create');

    const validated = createDeliveryChallanSchema.parse(payload);
    const challanNumber = validated.challan_number || (await this.generateChallanNumber(orgId));

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const customer = demoGetCustomer(validated.customer_id);
      if (!customer) throw new Error('Customer not found');

      const taxCalculation = TaxService.calculateLineItemsTax({
        sellerStateCode: '27',
        buyerStateCode: (customer as any).state_code || customer.customer_addresses?.[0]?.state_code || '27',
        items: validated.items.map((item) => ({
          productId: item.product_id || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          hsnSac: item.hsn_sac || undefined,
          gstRate: item.gst_rate,
        })),
      });

      const newDC = demoAddDeliveryChallan({
        organization_id: orgId,
        challan_number: challanNumber,
        customer_id: validated.customer_id,
        challan_date: validated.challan_date,
        challan_type: validated.challan_type,
        sales_order_id: validated.sales_order_id || null,
        vehicle_number: validated.vehicle_number || null,
        transporter_name: validated.transporter_name || null,
        delivery_address: validated.delivery_address || null,
        status: validated.status || 'draft',
        subtotal: taxCalculation.subtotal,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        notes: validated.notes || null,
        created_by: userId,
        items: taxCalculation.items.map((item, idx) => ({
          id: `dc-item-${Date.now()}-${idx}`,
          delivery_challan_id: '',
          organization_id: orgId,
          product_id: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          invoiced_quantity: 0,
          unit: validated.items[idx]?.unit || 'PCS',
          unit_price: item.unit_price,
          hsn_sac: item.hsn_sac || null,
          gst_rate: item.gst_rate,
          taxable_amount: item.taxable_amount,
          cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount,
          igst_amount: item.igst_amount,
          total_amount: item.total_amount,
          sort_order: idx,
        })),
      });

      // Stock deduction only on physical dispatch
      if (newDC.status === 'dispatched') {
        for (const it of newDC.items) {
          if (it.product_id) {
            demoDeductStock(it.product_id, it.quantity);
          }
        }
      }

      await logAudit(session as any, 'delivery_challan.created', 'delivery_challans', newDC.id, {
        challan_number: challanNumber,
        total_amount: newDC.total_amount,
        status: newDC.status,
      });

      return { id: newDC.id, challan_id: newDC.id, challan_number: challanNumber };
    }

    const supabase = createAdminClient();

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

    const taxCalculation = TaxService.calculateLineItemsTax({
      sellerStateCode: (org as any).state_code || '27',
      buyerStateCode: (customer as any).state_code || (org as any).state_code || '27',
      items: validated.items.map((item) => ({
        productId: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        hsnSac: item.hsn_sac || undefined,
        gstRate: item.gst_rate,
      })),
    });

    const { data: rawDC, error: insertErr } = await (supabase.from('delivery_challans') as any)
      .insert({
        organization_id: orgId,
        challan_number: challanNumber,
        customer_id: validated.customer_id,
        challan_date: validated.challan_date,
        challan_type: validated.challan_type,
        sales_order_id: validated.sales_order_id || null,
        vehicle_number: validated.vehicle_number || null,
        transporter_name: validated.transporter_name || null,
        delivery_address: validated.delivery_address || null,
        status: validated.status || 'draft',
        subtotal: taxCalculation.subtotal,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        notes: validated.notes || null,
        created_by: userId,
      })
      .select('id')
      .single();

    if (insertErr || !rawDC) throw new Error(insertErr?.message || 'Failed to create delivery challan');
    const challanId = rawDC.id;

    const lineItemRows = taxCalculation.items.map((item, index) => ({
      delivery_challan_id: challanId,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      invoiced_quantity: 0,
      unit: validated.items[index]?.unit || 'PCS',
      unit_price: item.unit_price,
      hsn_sac: item.hsn_sac || null,
      gst_rate: item.gst_rate,
      taxable_amount: item.taxable_amount,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total_amount: item.total_amount,
      sort_order: index,
    }));

    await supabase.from('delivery_challan_items').insert(lineItemRows as any);

    // Physical stock movement OUT upon dispatch
    if ((validated.status || 'draft') === 'dispatched') {
      for (const item of taxCalculation.items) {
        if (item.productId) {
          await postInventoryMovement({
            organization_id: orgId,
            product_id: item.productId,
            movement_type: 'sale',
            quantity: -Math.abs(item.quantity),
            reference_type: 'manual',
            reference_id: challanId,
            reference_number: challanNumber,
            notes: `Dispatched via Delivery Challan #${challanNumber}`,
            user_id: userId,
          });
        }
      }
    }

    await logAudit(session as any, 'delivery_challan.created', 'delivery_challans', challanId, {
      challan_number: challanNumber,
      total_amount: taxCalculation.total_amount,
      status: validated.status || 'draft',
    });

    return { id: challanId, challan_id: challanId, challan_number: challanNumber };
  }

  /**
   * Retrieves single delivery challan by ID.
   */
  static async getDeliveryChallan(session: OpsSession, challanId: string) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'delivery_challans.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const dc = demoGetDeliveryChallan(challanId, orgId);
      if (!dc) throw new Error('Delivery challan not found');
      return dc;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('delivery_challans')
      .select(`
        *,
        customer:customers(*),
        items:delivery_challan_items(*)
      `)
      .eq('id', challanId)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) throw new Error('Delivery challan not found');
    return data;
  }

  /**
   * Lists delivery challans with filters.
   */
  static async listDeliveryChallans(session: OpsSession, filters: DeliveryChallanListFilters = {}) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'delivery_challans.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      return demoGetDeliveryChallans(orgId, filters);
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('delivery_challans')
      .select(`
        *,
        customer:customers(id, name, display_name, phone, email),
        items:delivery_challan_items(*)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('challan_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.challanType) query = query.eq('challan_type', filters.challanType);
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.startDate) query = query.gte('challan_date', filters.startDate);
    if (filters.endDate) query = query.lte('challan_date', filters.endDate);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return {
      challans: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Updates delivery challan status.
   */
  static async updateDeliveryChallanStatus(session: OpsSession, challanId: string, status: DeliveryChallanStatus) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'delivery_challans.edit');

    const existing = await this.getDeliveryChallan(session, challanId);

    // If transitioning to dispatched from draft/pending, deduct stock!
    if (status === 'dispatched' && existing.status !== 'dispatched') {
      const items: any[] = existing.items || [];
      if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
        for (const it of items) {
          if (it.product_id) demoDeductStock(it.product_id, it.quantity);
        }
      } else {
        for (const it of items) {
          if (it.product_id) {
            await postInventoryMovement({
              organization_id: orgId,
              product_id: it.product_id,
              movement_type: 'sale',
              quantity: -Math.abs(it.quantity),
              reference_type: 'manual',
              reference_id: challanId,
              reference_number: existing.challan_number,
              notes: `Dispatched via Delivery Challan #${existing.challan_number}`,
              user_id: userId,
            });
          }
        }
      }
    }

    // If cancelling a dispatched challan, atomically restore stock!
    if (status === 'cancelled' && (existing.status === 'dispatched' || existing.status === 'delivered')) {
      const items: any[] = existing.items || [];
      if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
        for (const it of items) {
          if (it.product_id) demoRestoreStock(it.product_id, it.quantity);
        }
      } else {
        for (const it of items) {
          if (it.product_id) {
            await postInventoryMovement({
              organization_id: orgId,
              product_id: it.product_id,
              movement_type: 'return_in',
              quantity: Math.abs(it.quantity),
              reference_type: 'manual',
              reference_id: challanId,
              reference_number: existing.challan_number,
              notes: `Restored stock from cancelled Delivery Challan #${existing.challan_number}`,
              user_id: userId,
            });
          }
        }
      }
    }

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const updated = demoUpdateDeliveryChallan(challanId, orgId, { status });
      await logAudit(session as any, 'delivery_challan.status_updated', 'delivery_challans', challanId, { status });
      return updated;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('delivery_challans') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', challanId)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    await logAudit(session as any, 'delivery_challan.status_updated', 'delivery_challans', challanId, { status });
    return data;
  }

  /**
   * Converts Delivery Challan into a Tax Invoice without duplicate inventory deduction.
   */
  static async convertToInvoice(session: OpsSession, challanId: string) {
    const role = session.role || (session as any).member?.role || 'sales';
    requirePermission(role, 'delivery_challans.convert');

    const dc = await this.getDeliveryChallan(session, challanId);
    if (dc.status === 'invoiced' || dc.converted_invoice_id) {
      throw new Error('This delivery challan has already been invoiced');
    }
    if (dc.status === 'cancelled') {
      throw new Error('Cannot convert a cancelled delivery challan');
    }

    const rawItems: any[] = dc.items || [];
    const invoicePayload = {
      customer_id: dc.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      notes: dc.notes ? `Converted from Delivery Challan #${dc.challan_number}. ${dc.notes}` : `Converted from Delivery Challan #${dc.challan_number}`,
      // Flag: Stock was ALREADY deducted upon challan dispatch, so skip duplicate inventory movement
      skip_inventory_movement: true,
      items: rawItems.map((item: any) => ({
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unit_price: Number(item.unit_price),
        discount_percent: 0,
        hsn_sac_code: item.hsn_sac || undefined,
        gst_rate: Number(item.gst_rate || 0),
        is_gst_inclusive: false,
      })),
    };

    const newInvoice = await InvoiceService.createInvoice(session as any, invoicePayload);

    const userId = session.user_id || (session as any).user?.id || '';
    const orgId = session.organization_id || (session as any).organization?.id || '';

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      demoUpdateDeliveryChallan(challanId, orgId, {
        converted_invoice_id: newInvoice.invoice_id,
        status: 'invoiced',
      });
    } else {
      const supabase = createAdminClient();
      await (supabase.from('delivery_challans') as any)
        .update({
          converted_invoice_id: newInvoice.invoice_id,
          status: 'invoiced',
          updated_at: new Date().toISOString(),
        })
        .eq('id', challanId)
        .eq('organization_id', orgId);
    }

    await logAudit(session as any, 'delivery_challan.converted_to_invoice', 'delivery_challans', challanId, {
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
    });

    return {
      success: true,
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
    };
  }

  /**
   * Deletes a draft or cancelled delivery challan.
   */
  static async deleteDeliveryChallan(session: OpsSession, challanId: string) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'delivery_challans.delete');

    const dc = await this.getDeliveryChallan(session, challanId);
    if (dc.status === 'invoiced' || dc.status === 'dispatched' || dc.status === 'delivered') {
      throw new Error('Cannot delete an active or invoiced delivery challan. Cancel it first.');
    }

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      demoDeleteDeliveryChallan(challanId, orgId);
      await logAudit(session as any, 'delivery_challan.deleted', 'delivery_challans', challanId, { challan_number: dc.challan_number });
      return { success: true };
    }

    const supabase = createAdminClient();
    await supabase.from('delivery_challan_items').delete().eq('delivery_challan_id', challanId);
    await supabase.from('delivery_challans').delete().eq('id', challanId).eq('organization_id', orgId);

    await logAudit(session as any, 'delivery_challan.deleted', 'delivery_challans', challanId, { challan_number: dc.challan_number });
    return { success: true };
  }
}
