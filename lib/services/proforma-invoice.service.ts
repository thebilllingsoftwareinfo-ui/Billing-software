// ============================================================
// lib/services/proforma-invoice.service.ts — Phase 7C Proforma Invoice Service
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import type { ApiSession } from '@/lib/auth/api-session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { TaxService } from '@/lib/services/tax.service';
import { InvoiceService } from '@/lib/services/invoice.service';
import {
  CreateProformaInvoiceInput,
  createProformaInvoiceSchema,
  ProformaInvoiceStatus,
} from '@/lib/validators/proforma-invoice.schema';
import {
  demoProformaInvoices,
  demoGetCustomer,
  demoAddProformaInvoice,
  demoGetProformaInvoice,
  demoGetProformaInvoices,
  demoUpdateProformaInvoice,
  demoDeleteProformaInvoice,
  demoGetNextDocSequence,
} from '@/lib/services/demo-store';

export type OpsSession = AppSession | ApiSession;

export interface ProformaInvoiceListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export class ProformaInvoiceService {
  /**
   * Generates next organization-scoped proforma invoice number (e.g. PI-2026-0001).
   */
  static async generateProformaNumber(organizationId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    if (organizationId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const nextSeq = demoGetNextDocSequence(organizationId, 'PI', currentYear);
      return `PI-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from('proforma_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextSeq = (count || 0) + 1;
    return `PI-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a new proforma invoice with authoritative server-side GST calculations.
   * Proforma invoices do NOT create accounting journals or deduct stock.
   */
  static async createProformaInvoice(session: OpsSession, payload: CreateProformaInvoiceInput) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'proforma_invoices.create');

    const validated = createProformaInvoiceSchema.parse(payload);
    const proformaNumber = validated.proforma_number || (await this.generateProformaNumber(orgId));

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
          discountPct: item.discount_percent,
          hsnSac: item.hsn_sac || undefined,
          gstRate: item.gst_rate,
          gstType: item.is_gst_inclusive ? 'inclusive' : 'exclusive',
        })),
      });

      const newPI = demoAddProformaInvoice({
        organization_id: orgId,
        proforma_number: proformaNumber,
        customer_id: validated.customer_id,
        proforma_date: validated.proforma_date,
        expiry_date: validated.expiry_date || null,
        quotation_id: validated.quotation_id || null,
        sales_order_id: validated.sales_order_id || null,
        status: 'sent',
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
          id: `pi-item-${Date.now()}-${idx}`,
          proforma_invoice_id: '',
          organization_id: orgId,
          product_id: item.productId || null,
          description: item.description,
          quantity: item.quantity,
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

      await logAudit(session as any, 'proforma_invoice.created', 'proforma_invoices', newPI.id, {
        proforma_number: proformaNumber,
        total_amount: newPI.total_amount,
      });

      return { id: newPI.id, proforma_id: newPI.id, proforma_number: proformaNumber };
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
        discountPct: item.discount_percent,
        hsnSac: item.hsn_sac || undefined,
        gstRate: item.gst_rate,
        gstType: item.is_gst_inclusive ? 'inclusive' : 'exclusive',
      })),
    });

    const { data: rawPI, error: insertErr } = await (supabase.from('proforma_invoices') as any)
      .insert({
        organization_id: orgId,
        proforma_number: proformaNumber,
        customer_id: validated.customer_id,
        proforma_date: validated.proforma_date,
        expiry_date: validated.expiry_date || null,
        quotation_id: validated.quotation_id || null,
        sales_order_id: validated.sales_order_id || null,
        status: 'sent',
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

    if (insertErr || !rawPI) throw new Error(insertErr?.message || 'Failed to create proforma invoice');
    const proformaId = rawPI.id;

    const lineItemRows = taxCalculation.items.map((item, index) => ({
      proforma_invoice_id: proformaId,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
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

    await supabase.from('proforma_invoice_items').insert(lineItemRows as any);

    await logAudit(session as any, 'proforma_invoice.created', 'proforma_invoices', proformaId, {
      proforma_number: proformaNumber,
      total_amount: taxCalculation.total_amount,
    });

    return { id: proformaId, proforma_id: proformaId, proforma_number: proformaNumber };
  }

  /**
   * Retrieves single proforma invoice by ID.
   */
  static async getProformaInvoice(session: OpsSession, proformaId: string) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'proforma_invoices.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const pi = demoGetProformaInvoice(proformaId, orgId);
      if (!pi) throw new Error('Proforma invoice not found');
      return pi;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('proforma_invoices')
      .select(`
        *,
        customer:customers(*),
        items:proforma_invoice_items(*)
      `)
      .eq('id', proformaId)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) throw new Error('Proforma invoice not found');
    return data;
  }

  /**
   * Lists proforma invoices with filters.
   */
  static async listProformaInvoices(session: OpsSession, filters: ProformaInvoiceListFilters = {}) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'proforma_invoices.view');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      return demoGetProformaInvoices(orgId, filters);
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('proforma_invoices')
      .select(`
        *,
        customer:customers(id, name, display_name, phone, email),
        items:proforma_invoice_items(*)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('proforma_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.startDate) query = query.gte('proforma_date', filters.startDate);
    if (filters.endDate) query = query.lte('proforma_date', filters.endDate);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return {
      proforma_invoices: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Updates proforma invoice status.
   */
  static async updateProformaInvoiceStatus(session: OpsSession, proformaId: string, status: ProformaInvoiceStatus) {
    const role = session.role || (session as any).member?.role || 'sales';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'proforma_invoices.edit');

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      const updated = demoUpdateProformaInvoice(proformaId, orgId, { status });
      await logAudit(session as any, 'proforma_invoice.status_updated', 'proforma_invoices', proformaId, { status });
      return updated;
    }

    const supabase = createAdminClient();
    const { data, error } = await (supabase.from('proforma_invoices') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', proformaId)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    await logAudit(session as any, 'proforma_invoice.status_updated', 'proforma_invoices', proformaId, { status });
    return data;
  }

  /**
   * Deletes a draft or cancelled proforma invoice.
   */
  static async deleteProformaInvoice(session: OpsSession, proformaId: string) {
    const role = session.role || (session as any).member?.role || 'admin';
    const orgId = session.organization_id || (session as any).organization?.id || '';
    const userId = session.user_id || (session as any).user?.id || '';
    requirePermission(role, 'proforma_invoices.delete');

    const pi = await this.getProformaInvoice(session, proformaId);
    if (pi.status === 'converted') {
      throw new Error('Cannot delete an already converted proforma invoice');
    }

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      demoDeleteProformaInvoice(proformaId, orgId);
      await logAudit(session as any, 'proforma_invoice.deleted', 'proforma_invoices', proformaId, { proforma_number: pi.proforma_number });
      return { success: true };
    }

    const supabase = createAdminClient();
    await supabase.from('proforma_invoice_items').delete().eq('proforma_invoice_id', proformaId);
    await supabase.from('proforma_invoices').delete().eq('id', proformaId).eq('organization_id', orgId);

    await logAudit(session as any, 'proforma_invoice.deleted', 'proforma_invoices', proformaId, { proforma_number: pi.proforma_number });
    return { success: true };
  }

  /**
   * Converts Proforma Invoice into Tax Invoice.
   * Preserves proforma invoice record, creates new Invoice via InvoiceService,
   * links converted_invoice_id, and sets status = 'converted'.
   */
  static async convertToInvoice(session: OpsSession, proformaId: string) {
    const role = session.role || (session as any).member?.role || 'sales';
    requirePermission(role, 'proforma_invoices.convert');

    const pi = await this.getProformaInvoice(session, proformaId);
    if (pi.status === 'converted' || pi.converted_invoice_id) {
      throw new Error('This proforma invoice has already been converted to an invoice');
    }
    if (pi.status === 'cancelled') {
      throw new Error('Cannot convert a cancelled proforma invoice');
    }

    const rawItems: any[] = pi.items || [];
    const invoicePayload = {
      customer_id: pi.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      place_of_supply: pi.place_of_supply || undefined,
      notes: pi.notes ? `Converted from Proforma Invoice #${pi.proforma_number}. ${pi.notes}` : `Converted from Proforma Invoice #${pi.proforma_number}`,
      terms_and_conditions: pi.terms || undefined,
      items: rawItems.map((item: any) => ({
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unit_price: Number(item.unit_price),
        discount_percent: Number(item.discount_percent || 0),
        hsn_sac_code: item.hsn_sac || undefined,
        gst_rate: Number(item.gst_rate || 0),
        is_gst_inclusive: Boolean(item.is_gst_inclusive),
      })),
    };

    const newInvoice = await InvoiceService.createInvoice(session as any, invoicePayload);

    const userId = session.user_id || (session as any).user?.id || '';
    const orgId = session.organization_id || (session as any).organization?.id || '';

    if (userId.includes('demo') || orgId.includes('demo') || !orgId) {
      demoUpdateProformaInvoice(proformaId, orgId, {
        converted_invoice_id: newInvoice.invoice_id,
        status: 'converted',
      });
    } else {
      const supabase = createAdminClient();
      await (supabase.from('proforma_invoices') as any)
        .update({
          converted_invoice_id: newInvoice.invoice_id,
          status: 'converted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', proformaId)
        .eq('organization_id', orgId);
    }

    await logAudit(session as any, 'proforma_invoice.converted_to_invoice', 'proforma_invoices', proformaId, {
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
    });

    return {
      success: true,
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
    };
  }
}
