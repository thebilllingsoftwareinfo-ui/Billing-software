import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { TaxService } from '@/lib/services/tax.service';
import { InvoiceService } from '@/lib/services/invoice.service';
import { SalesOrderService } from '@/lib/services/sales-order.service';
import { ProformaInvoiceService } from '@/lib/services/proforma-invoice.service';
import {
  CreateQuotationInput,
  createQuotationSchema,
  QuotationStatus,
} from '@/lib/validators/quotation.schema';
import { demoQuotationStates } from '@/lib/services/demo-store';

export interface QuotationListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export class QuotationService {
  /**
   * Generates next organization-scoped quotation number (e.g. QT-2026-0001).
   */
  static async generateQuotationNumber(organizationId: string): Promise<string> {
    const supabase = createAdminClient();
    const currentYear = new Date().getFullYear();

    const { count } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextSeq = (count || 0) + 1;
    return `QT-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a new quotation with server-side authoritative GST calculations.
   */
  static async createQuotation(session: AppSession, payload: CreateQuotationInput) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    const userId = session.user_id || session.user?.id || '';
    requirePermission(role, 'quotations.create');

    const validated = createQuotationSchema.parse(payload);
    const supabase = createAdminClient();

    // 1. Fetch Organization & Customer info for GST tax rules
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, state_code, gstin')
      .eq('id', orgId)
      .single();

    const orgObj = org as any;
    if (orgErr || !orgObj) {
      throw new Error('Organization details not found');
    }

    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .select('id, name, state_code, gstin')
      .eq('id', validated.customer_id)
      .eq('organization_id', orgId)
      .single();

    const customerObj = customer as any;
    if (customerErr || !customerObj) {
      throw new Error('Customer not found or unauthorized');
    }

    // 2. Generate quotation number if not provided
    const quotationNumber =
      validated.quotation_number || (await this.generateQuotationNumber(orgId));

    // 3. Compute GST breakdown using central TaxService
    const taxCalculation = TaxService.calculateLineItemsTax({
      sellerStateCode: orgObj.state_code || '07',
      buyerStateCode: customerObj.state_code || orgObj.state_code || '07',
      sellerGstin: orgObj.gstin || undefined,
      buyerGstin: customerObj.gstin || undefined,
      items: validated.items.map((item) => ({
        productId: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        unitPricePaise: item.unit_price_paise,
        discountPct: item.discount_pct,
        hsnSac: item.hsn_sac || undefined,
        gstRate: item.gst_rate,
        gstType: item.gst_type,
      })),
    });

    // 4. Save quotation header record
    const { data: rawQuotation, error: insertErr } = await supabase
      .from('quotations')
      .insert({
        organization_id: orgId,
        customer_id: validated.customer_id,
        quotation_number: quotationNumber,
        quotation_date: validated.quotation_date,
        valid_until: validated.valid_until || null,
        status: 'draft',
        // Decimal rupees
        subtotal: taxCalculation.subtotal,
        discount_amount: taxCalculation.discount_amount,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        // Legacy paise compatibility
        subtotal_paise: taxCalculation.subtotalPaise,
        discount_paise: taxCalculation.discountPaise,
        taxable_paise: taxCalculation.taxablePaise,
        cgst_paise: taxCalculation.cgstPaise,
        sgst_paise: taxCalculation.sgstPaise,
        igst_paise: taxCalculation.igstPaise,
        total_paise: taxCalculation.totalPaise,
        notes: validated.notes || null,
        terms: validated.terms || null,
        created_by: userId,
      } as any)
      .select('id, created_at')
      .single();

    const quotation = rawQuotation as any;
    if (insertErr || !quotation) {
      throw new Error(`Failed to create quotation: ${insertErr?.message}`);
    }

    // 5. Save quotation line items to canonical quotation_items
    const lineItemRows = taxCalculation.items.map((item, index) => ({
      quotation_id: quotation.id,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unit: validated.items[index]?.unit || 'PCS',
      unit_price: item.unit_price,
      discount_percent: item.discount_pct,
      taxable_amount: item.taxable_amount,
      hsn_sac: item.hsn_sac || null,
      gst_rate: item.gst_rate,
      gst_type: item.gst_type,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total_amount: item.total_amount,
      // Compatibility paise fields
      unit_price_paise: item.unitPricePaise,
      discount_pct: item.discountPct,
      line_subtotal_paise: item.subtotalPaise,
      cgst_paise: item.cgstPaise,
      sgst_paise: item.sgstPaise,
      igst_paise: item.igstPaise,
      line_total_paise: item.totalPaise,
      sort_order: index,
    }));

    // Try canonical table first, fallback to view alias
    const { error: itemsErr } = await supabase.from('quotation_items').insert(lineItemRows as any);
    if (itemsErr) {
      await supabase.from('quotation_line_items').insert(lineItemRows as any);
    }

    // 6. Audit log
    await logAudit(session, 'quotation.created', 'quotations', quotation.id, {
      quotation_number: quotationNumber,
      customer_id: validated.customer_id,
      customer_name: customerObj.name,
      total_amount: taxCalculation.total_amount,
      total_paise: taxCalculation.totalPaise,
    });

    return {
      quotation_id: quotation.id,
      quotation_number: quotationNumber,
      total_amount: taxCalculation.total_amount,
      total_paise: taxCalculation.totalPaise,
    };
  }

  /**
   * Updates an existing quotation. Edits allowed only on DRAFT or SENT status.
   */
  static async updateQuotation(session: AppSession, quotationId: string, payload: CreateQuotationInput) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    requirePermission(role, 'quotations.edit');

    const validated = createQuotationSchema.parse(payload);
    const supabase = createAdminClient();

    // Check existing quotation status
    const { data: rawExisting } = await supabase
      .from('quotations')
      .select('id, status, quotation_number')
      .eq('id', quotationId)
      .eq('organization_id', orgId)
      .single();

    const existing = rawExisting as any;
    if (!existing) {
      throw new Error('Quotation not found');
    }

    if (['converted', 'accepted', 'rejected'].includes(existing.status)) {
      throw new Error(`Cannot edit quotation in ${existing.status.toUpperCase()} status.`);
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('state_code, gstin')
      .eq('id', orgId)
      .single();

    const { data: customer } = await supabase
      .from('customers')
      .select('state_code, gstin')
      .eq('id', validated.customer_id)
      .single();

    const orgObj = org as any;
    const customerObj = customer as any;

    const taxCalculation = TaxService.calculateLineItemsTax({
      sellerStateCode: orgObj?.state_code || '07',
      buyerStateCode: customerObj?.state_code || orgObj?.state_code || '07',
      sellerGstin: orgObj?.gstin || undefined,
      buyerGstin: customerObj?.gstin || undefined,
      items: validated.items.map((item) => ({
        productId: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        unitPricePaise: item.unit_price_paise,
        discountPct: item.discount_pct,
        hsnSac: item.hsn_sac || undefined,
        gstRate: item.gst_rate,
        gstType: item.gst_type,
      })),
    });

    // Update Header
    await (supabase.from('quotations') as any)
      .update({
        customer_id: validated.customer_id,
        quotation_date: validated.quotation_date,
        valid_until: validated.valid_until || null,
        // Decimal rupees
        subtotal: taxCalculation.subtotal,
        discount_amount: taxCalculation.discount_amount,
        taxable_amount: taxCalculation.taxable_amount,
        cgst_amount: taxCalculation.cgst_amount,
        sgst_amount: taxCalculation.sgst_amount,
        igst_amount: taxCalculation.igst_amount,
        total_amount: taxCalculation.total_amount,
        // Legacy paise compatibility
        subtotal_paise: taxCalculation.subtotalPaise,
        discount_paise: taxCalculation.discountPaise,
        taxable_paise: taxCalculation.taxablePaise,
        cgst_paise: taxCalculation.cgstPaise,
        sgst_paise: taxCalculation.sgstPaise,
        igst_paise: taxCalculation.igstPaise,
        total_paise: taxCalculation.totalPaise,
        notes: validated.notes || null,
        terms: validated.terms || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .eq('organization_id', orgId);

    // Delete old items & re-insert to canonical quotation_items
    await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
    await supabase.from('quotation_line_items').delete().eq('quotation_id', quotationId);

    const lineItemRows = taxCalculation.items.map((item, index) => ({
      quotation_id: quotationId,
      organization_id: orgId,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unit: validated.items[index]?.unit || 'PCS',
      unit_price: item.unit_price,
      discount_percent: item.discount_pct,
      taxable_amount: item.taxable_amount,
      hsn_sac: item.hsn_sac || null,
      gst_rate: item.gst_rate,
      gst_type: item.gst_type,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total_amount: item.total_amount,
      // Compatibility paise fields
      unit_price_paise: item.unitPricePaise,
      discount_pct: item.discountPct,
      line_subtotal_paise: item.subtotalPaise,
      cgst_paise: item.cgstPaise,
      sgst_paise: item.sgstPaise,
      igst_paise: item.igstPaise,
      line_total_paise: item.totalPaise,
      sort_order: index,
    }));

    const { error: insertItemsErr } = await supabase.from('quotation_items').insert(lineItemRows as any);
    if (insertItemsErr) {
      await supabase.from('quotation_line_items').insert(lineItemRows as any);
    }

    await logAudit(session, 'quotation.updated', 'quotations', quotationId, {
      quotation_number: existing.quotation_number,
      total_amount: taxCalculation.total_amount,
      total_paise: taxCalculation.totalPaise,
    });

    return { quotation_id: quotationId };
  }

  /**
   * Updates status of a quotation (e.g. SENT, ACCEPTED, REJECTED, EXPIRED).
   */
  static async updateQuotationStatus(session: AppSession, quotationId: string, status: QuotationStatus | string) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'quotations.edit');
    const userId = session.user_id || session.user?.id || '';
    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (!demoQuotationStates[quotationId]) {
        demoQuotationStates[quotationId] = {};
      }
      demoQuotationStates[quotationId].status = String(status);
      return { quotation_id: quotationId, status };
    }
    const supabase = createAdminClient();
    const orgId = session.organization?.id || (session as any).organization_id;

    const { data: existingData } = await supabase
      .from('quotations')
      .select('id, status, quotation_number')
      .eq('id', quotationId)
      .eq('organization_id', orgId)
      .single();

    const existing = existingData as any;

    if (!existing) {
      throw new Error('Quotation not found');
    }

    if (existing.status === 'converted' && status !== 'converted') {
      throw new Error('Cannot change status of an already converted quotation');
    }

    await (supabase.from('quotations') as any)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .eq('organization_id', orgId);

    await logAudit(session, 'quotation.status_changed', 'quotations', quotationId, {
      quotation_number: existing.quotation_number,
      previous_status: existing.status,
      new_status: status,
    });

    return { quotation_id: quotationId, status };
  }

  /**
   * CONVERT QUOTATION TO SALES INVOICE.
   * Crucial rule: Does NOT mutate the quotation into the invoice.
   * Preserves original quotation intact, creates a brand new Sales Invoice via InvoiceService,
   * and links converted_invoice_id on the quotation with status = 'converted'.
   */
  static async convertQuotationToInvoice(session: AppSession, quotationId: string) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'quotations.convert');
    const userId = session.user_id || session.user?.id || '';
    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (quotationId === 'quot-demo-1') {
        if (demoQuotationStates['quot-demo-1']?.status === 'converted' || demoQuotationStates['quot-demo-1']?.converted_invoice_id) {
          throw new Error('This quotation has already been converted to an invoice');
        }
        const invoicePayload = {
          customer_id: 'cust-demo-1',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          notes: 'Converted from Quotation #QT-2026-0001',
          items: [
            {
              description: 'Industrial Heavy Duty Piping',
              quantity: 5,
              unit: 'PCS',
              unit_price: 1000,
              discount_percent: 0,
              gst_rate: 18,
            },
          ],
        };
        const newInvoice = await InvoiceService.createInvoice(session, invoicePayload);
        demoQuotationStates['quot-demo-1'] = {
          status: 'converted',
          converted_invoice_id: newInvoice.invoice_id,
        };
        return {
          quotation_id: quotationId,
          quotation_number: 'QT-2026-0001',
          invoice_id: newInvoice.invoice_id,
          invoice_number: newInvoice.invoice_number,
        };
      }
    }
    const supabase = createAdminClient();
    const orgId = session.organization?.id || (session as any).organization_id;

    // 1. Fetch Quotation & Line Items (trying quotation_items or quotation_line_items)
    let rawQuotation: any = null;
    const { data: qData, error: qErr } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items (*)
      `)
      .eq('id', quotationId)
      .eq('organization_id', orgId)
      .single();

    if (!qErr && qData) {
      rawQuotation = qData;
    } else {
      const { data: fallbackQ } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_line_items (*)
        `)
        .eq('id', quotationId)
        .eq('organization_id', orgId)
        .single();
      rawQuotation = fallbackQ;
    }

    const quotation = rawQuotation as any;

    if (!quotation) {
      throw new Error('Quotation not found or unauthorized');
    }

    if (quotation.status === 'converted' || quotation.converted_invoice_id) {
      throw new Error('This quotation has already been converted to an invoice');
    }

    const rawItems = quotation.quotation_items || quotation.quotation_line_items || [];

    // 2. Prepare payload for new Sales Invoice via InvoiceService
    const invoicePayload = {
      customer_id: quotation.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +15 days
      place_of_supply: quotation.place_of_supply || undefined,
      notes: quotation.notes ? `Converted from Quotation #${quotation.quotation_number}. ${quotation.notes}` : `Converted from Quotation #${quotation.quotation_number}`,
      terms_and_conditions: quotation.terms || undefined,
      items: rawItems.map((item: any) => {
        const unitPrice = Number(item.unit_price ?? (item.unit_price_paise ? item.unit_price_paise / 100 : 0));
        return {
          product_id: item.product_id || undefined,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit || 'PCS',
          unit_price: unitPrice,
          discount_percent: Number(item.discount_percent ?? item.discount_pct ?? 0),
          hsn_sac_code: item.hsn_sac || undefined,
          gst_rate: Number(item.gst_rate || 0),
          is_gst_inclusive: item.gst_type === 'inclusive' || Boolean(item.is_gst_inclusive),
        };
      }),
    };

    // 3. Create brand new Sales Invoice
    const newInvoice = await InvoiceService.createInvoice(session, invoicePayload);

    // 4. Update Original Quotation (Link converted_invoice_id & set status = 'converted')
    await (supabase.from('quotations') as any)
      .update({
        converted_invoice_id: newInvoice.invoice_id,
        status: 'converted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId)
      .eq('organization_id', orgId);

    // 5. Audit Trail
    await logAudit(session, 'quotation.converted', 'quotations', quotationId, {
      quotation_number: quotation.quotation_number,
      converted_to_invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
    });

    return {
      quotation_id: quotationId,
      quotation_number: quotation.quotation_number,
      invoice_id: newInvoice.invoice_id,
      invoice_number: newInvoice.invoice_number,
    };
  }

  /**
   * CONVERT QUOTATION TO SALES ORDER.
   */
  static async convertQuotationToSalesOrder(session: AppSession, quotationId: string) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'quotations.convert');
    const userId = session.user_id || session.user?.id || '';
    const details = await this.getQuotationDetails(session, quotationId);
    const q = details.quotation;

    if (q.status === 'converted' || q.converted_invoice_id) {
      throw new Error('This quotation has already been converted');
    }
    if (q.status === 'rejected' || q.status === 'cancelled') {
      throw new Error('Cannot convert a rejected or cancelled quotation');
    }

    const payload = {
      customer_id: q.customer_id,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: q.valid_until || undefined,
      quotation_id: q.id,
      place_of_supply: q.place_of_supply || undefined,
      notes: q.notes ? `Converted from Quotation #${q.quotation_number}. ${q.notes}` : `Converted from Quotation #${q.quotation_number}`,
      terms: q.terms || undefined,
      items: (details.items || []).map((item: any) => ({
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unit_price: Number(item.unit_price ?? (item.unit_price_paise ? item.unit_price_paise / 100 : 0)),
        discount_percent: Number(item.discount_percent ?? item.discount_pct ?? 0),
        hsn_sac: item.hsn_sac || undefined,
        gst_rate: Number(item.gst_rate || 0),
        is_gst_inclusive: item.gst_type === 'inclusive' || Boolean(item.is_gst_inclusive),
      })),
    };

    const newOrder = await SalesOrderService.createSalesOrder(session as any, payload as any);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      demoQuotationStates[quotationId] = {
        status: 'accepted',
        converted_order_id: newOrder.order_id,
      };
    }

    await this.updateQuotationStatus(session, quotationId, 'accepted');

    return {
      success: true,
      quotation_id: quotationId,
      order_id: newOrder.order_id,
      order_number: newOrder.order_number,
    };
  }

  /**
   * CONVERT QUOTATION TO PROFORMA INVOICE.
   */
  static async convertQuotationToProforma(session: AppSession, quotationId: string) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'quotations.convert');
    const userId = session.user_id || session.user?.id || '';
    const details = await this.getQuotationDetails(session, quotationId);
    const q = details.quotation;

    if (q.status === 'converted' || q.converted_invoice_id) {
      throw new Error('This quotation has already been converted');
    }
    if (q.status === 'rejected' || q.status === 'cancelled') {
      throw new Error('Cannot convert a rejected or cancelled quotation');
    }

    const payload = {
      customer_id: q.customer_id,
      proforma_date: new Date().toISOString().split('T')[0],
      expiry_date: q.valid_until || undefined,
      quotation_id: q.id,
      place_of_supply: q.place_of_supply || undefined,
      notes: q.notes ? `Converted from Quotation #${q.quotation_number}. ${q.notes}` : `Converted from Quotation #${q.quotation_number}`,
      terms: q.terms || undefined,
      items: (details.items || []).map((item: any) => ({
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unit_price: Number(item.unit_price ?? (item.unit_price_paise ? item.unit_price_paise / 100 : 0)),
        discount_percent: Number(item.discount_percent ?? item.discount_pct ?? 0),
        hsn_sac: item.hsn_sac || undefined,
        gst_rate: Number(item.gst_rate || 0),
        is_gst_inclusive: item.gst_type === 'inclusive' || Boolean(item.is_gst_inclusive),
      })),
    };

    const newPI = await ProformaInvoiceService.createProformaInvoice(session as any, payload as any);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      demoQuotationStates[quotationId] = {
        status: 'accepted',
        converted_proforma_id: newPI.proforma_id,
      };
    }

    await this.updateQuotationStatus(session, quotationId, 'accepted');

    return {
      success: true,
      quotation_id: quotationId,
      proforma_id: newPI.proforma_id,
      proforma_number: newPI.proforma_number,
    };
  }

  /**
   * Fetches quotation details, line items, customer, org, and linked invoice info.
   */
  static async getQuotationDetails(session: AppSession, quotationId: string) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'quotations.view');
    const userId = session.user_id || session.user?.id || '';
    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (quotationId === 'quot-demo-1') {
        return {
          quotation: {
            id: 'quot-demo-1',
            quotation_number: 'QT-2026-0001',
            customer_id: 'cust-demo-1',
            valid_until: '2026-10-20',
            notes: 'Standard Quote',
            terms: 'Net 30',
            status: demoQuotationStates['quot-demo-1']?.status || 'draft',
            converted_invoice_id: demoQuotationStates['quot-demo-1']?.converted_invoice_id || null,
            converted_order_id: demoQuotationStates['quot-demo-1']?.converted_order_id || null,
            converted_proforma_id: demoQuotationStates['quot-demo-1']?.converted_proforma_id || null,
          },
          items: [
            {
              id: 'qitem-1',
              description: 'Industrial Piping',
              quantity: 5,
              unit: 'PCS',
              unit_price: 1000,
              discount_percent: 0,
              gst_rate: 18,
            },
          ],
          customer: {
            id: 'cust-demo-1',
            name: 'Apex Enterprises Pvt Ltd',
            display_name: 'Apex Enterprises',
          },
          organization: {
            name: 'Org A Industries',
          },
        };
      } else {
        throw new Error('Quotation not found');
      }
    }
    const supabase = createAdminClient();

    let { data: quotation, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          display_name,
          email,
          phone,
          gstin,
          billing_address,
          shipping_address
        ),
        quotation_items (
          *
        )
      `)
      .eq('id', quotationId)
      .eq('organization_id', session.organization?.id || (session as any).organization_id)
      .single();

    if (error || !quotation) {
      const { data: fallbackQ } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (
            id,
            name,
            display_name,
            email,
            phone,
            gstin,
            billing_address,
            shipping_address
          ),
          quotation_line_items (
            *
          )
        `)
        .eq('id', quotationId)
        .eq('organization_id', session.organization?.id || (session as any).organization_id)
        .single();
      quotation = fallbackQ;
    }

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name, legal_name, gstin, billing_address, logo_url, phone, email')
      .eq('id', session.organization?.id || (session as any).organization_id)
      .single();

    return {
      ...(quotation as any),
      organization: org,
    };
  }

  /**
   * Lists quotations with search, status filtering, and pagination.
   */
  static async listQuotations(session: AppSession, filters: QuotationListFilters = {}) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'quotations.view');
    const supabase = createAdminClient();

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('quotations')
      .select(
        `
        id,
        quotation_number,
        quotation_date,
        valid_until,
        status,
        converted_invoice_id,
        total_paise,
        created_at,
        customers (
          id,
          name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', session.organization?.id || (session as any).organization_id);

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters.startDate) {
      query = query.gte('quotation_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('quotation_date', filters.endDate);
    }

    if (filters.search) {
      query = query.or(
        `quotation_number.ilike.%${filters.search}%,customers.name.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return {
      quotations: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }
}

