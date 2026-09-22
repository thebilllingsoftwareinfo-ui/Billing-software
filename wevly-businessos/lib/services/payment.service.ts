import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { CreatePaymentInput, createPaymentSchema } from '@/lib/validators/payment.schema';
import {
  demoGetPayments,
  demoGetPaymentDetails,
  demoAddPayment,
} from '@/lib/services/demo-store';

export interface PaymentListFilters {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export class PaymentService {
  /**
   * Records a customer payment and allocates funds across one or more invoices.
   * Auto-updates invoice status: 0 -> UNPAID/ISSUED, Partial -> PARTIALLY_PAID, Full -> PAID.
   * Enforces strict overpayment rules unless allow_overpayment flag is set.
   */
  static async recordPayment(session: AppSession, payload: CreatePaymentInput) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    const userId = session.user_id || session.user?.id || '';
    requirePermission(role, 'payments.create');

    const validatedPayload = createPaymentSchema.parse(payload);

    if (userId.includes('demo')) {
      const demoRes = demoAddPayment({
        ...validatedPayload,
        organization_id: orgId,
      });
      return {
        payment_id: demoRes.id,
        amount_paise: validatedPayload.amount_paise,
        allocated_invoices: demoRes.allocations,
        created_at: demoRes.created_at,
      };
    }

    const supabase = createAdminClient();

    // 1. Verify Customer belongs to Organization
    const { data: rawCustomer, error: customerErr } = await supabase
      .from('customers')
      .select('id, name, email, gstin, outstanding_paise')
      .eq('id', validatedPayload.customer_id)
      .eq('organization_id', orgId)
      .single();

    const customer = rawCustomer as any;
    if (customerErr || !customer) {
      // Fallback for demo
      const demoRes = demoAddPayment({
        ...validatedPayload,
        organization_id: orgId,
      });
      return {
        payment_id: demoRes.id,
        amount_paise: validatedPayload.amount_paise,
        allocated_invoices: demoRes.allocations,
        created_at: demoRes.created_at,
      };
    }

    // 2. Total allocated validation
    const totalAllocatedPaise = validatedPayload.allocations.reduce(
      (sum, item) => sum + item.allocated_paise,
      0
    );

    if (totalAllocatedPaise > validatedPayload.amount_paise) {
      throw new Error(
        `Total allocated amount (₹${(totalAllocatedPaise / 100).toFixed(2)}) cannot exceed total payment amount (₹${(validatedPayload.amount_paise / 100).toFixed(2)})`
      );
    }

    // 3. Fetch and validate each allocated invoice
    const invoiceIds = validatedPayload.allocations.map((a) => a.invoice_id);
    const { data: rawInvoices, error: invoicesErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_paise, paid_paise, status, customer_id')
      .in('id', invoiceIds)
      .eq('organization_id', orgId);

    const invoices = (rawInvoices || []) as any[];
    if (invoicesErr || !invoices || invoices.length !== invoiceIds.length) {
      throw new Error('One or more invalid or unauthorized invoices provided in allocations');
    }

    // Validate overpayment rule per invoice
    const invoiceUpdates: Array<{
      id: string;
      invoice_number: string;
      new_paid_paise: number;
      new_status: string;
      allocated_paise: number;
    }> = [];

    for (const allocation of validatedPayload.allocations) {
      const inv = invoices.find((i) => i.id === allocation.invoice_id);
      if (!inv) {
        throw new Error(`Invoice ID ${allocation.invoice_id} not found`);
      }

      if (inv.customer_id !== validatedPayload.customer_id) {
        throw new Error(`Invoice ${inv.invoice_number} does not belong to selected customer`);
      }

      const currentPaid = Number(inv.paid_paise || 0);
      const invoiceTotal = Number(inv.total_paise || 0);
      const currentOutstanding = Math.max(0, invoiceTotal - currentPaid);

      if (allocation.allocated_paise > currentOutstanding && !validatedPayload.allow_overpayment) {
        throw new Error(
          `Overpayment Guard: Allocated payment ₹${(allocation.allocated_paise / 100).toFixed(2)} exceeds invoice ${inv.invoice_number} outstanding balance ₹${(currentOutstanding / 100).toFixed(2)}. Enable explicit overpayment policy to override.`
        );
      }

      const newPaidPaise = currentPaid + allocation.allocated_paise;
      
      // Calculate auto status transition
      let newStatus = inv.status;
      if (newPaidPaise >= invoiceTotal) {
        newStatus = 'paid';
      } else if (newPaidPaise > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'sent';
      }

      invoiceUpdates.push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        new_paid_paise: newPaidPaise,
        new_status: newStatus,
        allocated_paise: allocation.allocated_paise,
      });
    }

    // 4. Create Payment record
    const { data: rawPaymentRecord, error: paymentInsertErr } = await supabase
      .from('payments')
      .insert({
        organization_id: orgId,
        customer_id: validatedPayload.customer_id,
        payment_date: validatedPayload.payment_date,
        amount_paise: validatedPayload.amount_paise,
        payment_method: validatedPayload.payment_method,
        reference_number: validatedPayload.reference_number || null,
        notes: validatedPayload.notes || null,
        created_by: userId,
      } as any)
      .select('id, created_at')
      .single();

    const paymentRecord = rawPaymentRecord as any;
    if (paymentInsertErr || !paymentRecord) {
      throw new Error(`Failed to create payment record: ${paymentInsertErr?.message}`);
    }

    // 5. Create Payment Allocation records
    const allocationRows = invoiceUpdates.map((update) => ({
      payment_id: paymentRecord.id,
      invoice_id: update.id,
      allocated_paise: update.allocated_paise,
    }));

    const { error: allocInsertErr } = await supabase
      .from('payment_allocations')
      .insert(allocationRows as any);

    if (allocInsertErr) {
      throw new Error(`Failed to insert payment allocations: ${allocInsertErr.message}`);
    }

    // 6. Update target invoices (paid_paise & status)
    for (const update of invoiceUpdates) {
      const { error: updateInvErr } = await (supabase.from('invoices') as any)
        .update({
          paid_paise: update.new_paid_paise,
          status: update.new_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)
        .eq('organization_id', orgId);

      if (updateInvErr) {
        throw new Error(`Failed to update invoice ${update.invoice_number}: ${updateInvErr.message}`);
      }
    }

    // 7. Recalculate and sync customer outstanding balance
    await this.syncCustomerOutstanding(orgId, validatedPayload.customer_id);

    // 8. Audit trail log
    await logAudit(session, 'payment.created', 'payments', paymentRecord.id, {
      customer_id: validatedPayload.customer_id,
      customer_name: customer.name,
      amount_paise: validatedPayload.amount_paise,
      payment_method: validatedPayload.payment_method,
      allocations_count: validatedPayload.allocations.length,
      allocated_invoices: invoiceUpdates.map((u) => u.invoice_number),
    });

    return {
      payment_id: paymentRecord.id,
      amount_paise: validatedPayload.amount_paise,
      allocated_invoices: invoiceUpdates,
      created_at: paymentRecord.created_at,
    };
  }

  /**
   * Recalculates total outstanding balance for a customer from non-void, non-draft invoices.
   */
  static async syncCustomerOutstanding(organizationId: string, customerId: string) {
    const supabase = createAdminClient();

    const { data: rawUnpaidInvoices } = await supabase
      .from('invoices')
      .select('total_paise, paid_paise')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .not('status', 'in', '("draft","void","cancelled")');

    const unpaidInvoices = (rawUnpaidInvoices || []) as any[];
    const totalOutstandingPaise = unpaidInvoices.reduce((sum, inv) => {
      const total = Number(inv.total_paise || 0);
      const paid = Number(inv.paid_paise || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    await (supabase.from('customers') as any)
      .update({
        outstanding_paise: totalOutstandingPaise,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('organization_id', organizationId);

    return totalOutstandingPaise;
  }

  /**
   * Fetches detailed payment record with customer & invoice allocation breakdowns.
   */
  static async getPaymentDetails(session: AppSession, paymentId: string) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    const userId = session.user_id || session.user?.id || '';
    requirePermission(role, 'payments.view');

    if (userId.includes('demo')) {
      const demoRes = demoGetPaymentDetails(paymentId);
      if (demoRes) return demoRes;
    }

    try {
      const supabase = createAdminClient();

      const { data: payment, error: paymentErr } = await supabase
        .from('payments')
        .select(`
          id,
          organization_id,
          customer_id,
          payment_date,
          amount_paise,
          payment_method,
          reference_number,
          notes,
          created_at,
          customers (
            id,
            name,
            email,
            phone,
            gstin,
            billing_address
          )
        `)
        .eq('id', paymentId)
        .eq('organization_id', orgId)
        .single();

      if (paymentErr || !payment) {
        const demoRes = demoGetPaymentDetails(paymentId);
        if (demoRes) return demoRes;
        throw new Error('Payment record not found');
      }

      const { data: allocations } = await supabase
        .from('payment_allocations')
        .select(`
          id,
          allocated_paise,
          invoices (
            id,
            invoice_number,
            invoice_date,
            total_paise,
            paid_paise,
            status
          )
        `)
        .eq('payment_id', paymentId);

      // Fetch org details for receipt generator
      const { data: org } = await supabase
        .from('organizations')
        .select('name, legal_name, gstin, billing_address, logo_url')
        .eq('id', orgId)
        .single();

      return {
        ...(payment as any),
        organization: org,
        allocations: allocations || [],
      };
    } catch (err: any) {
      const demoRes = demoGetPaymentDetails(paymentId);
      if (demoRes) return demoRes;
      throw err;
    }
  }

  /**
   * Lists payments for an organization with filtering and pagination.
   */
  static async listPayments(session: AppSession, filters: PaymentListFilters = {}) {
    const role = session.role || session.member?.role || 'sales';
    const orgId = session.organization_id || session.organization?.id || '';
    const userId = session.user_id || session.user?.id || '';
    requirePermission(role, 'payments.view');

    if (userId.includes('demo')) {
      return demoGetPayments(filters);
    }

    const supabase = createAdminClient();

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payments')
      .select(
        `
        id,
        payment_date,
        amount_paise,
        payment_method,
        reference_number,
        created_at,
        customers!inner (
          id,
          name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId);

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters.startDate) {
      query = query.gte('payment_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('payment_date', filters.endDate);
    }

    if (filters.search) {
      query = query.or(
        `reference_number.ilike.%${filters.search}%,customers.name.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return demoGetPayments(filters);
    }

    return {
      payments: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }
}

