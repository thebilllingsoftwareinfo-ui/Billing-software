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
import { CashBankService } from '@/lib/services/cash-bank.service';
import { AccountingService } from '@/lib/services/accounting.service';
import { FinancialPeriodService } from '@/lib/services/financial-period.service';

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
    await FinancialPeriodService.validatePostingDate(session, validatedPayload.payment_date);

    if (userId.includes('demo')) {
      const demoRes = demoAddPayment({
        ...validatedPayload,
        organization_id: orgId,
      });
      try {
        await AccountingService.postCustomerPaymentAccounting(session, {
          id: demoRes.id,
          payment_date: validatedPayload.payment_date,
          amount: validatedPayload.amount,
          payment_method: validatedPayload.payment_method,
          customer_name: 'Customer',
          reference_number: validatedPayload.reference_number || undefined,
        });
      } catch (accErr: any) {
        console.warn('[PaymentService] Accounting posting notice (demo):', accErr?.message);
      }
      return {
        payment_id: demoRes.id,
        amount: validatedPayload.amount,
        allocated_invoices: demoRes.allocations,
        created_at: demoRes.created_at,
      };
    }

    const supabase = createAdminClient();

    // 1. Verify Customer belongs to Organization
    const { data: rawCustomer, error: customerErr } = await supabase
      .from('customers')
      .select('id, name, email, gstin, outstanding')
      .eq('id', validatedPayload.customer_id)
      .eq('organization_id', orgId)
      .single();

    const customer = rawCustomer as any;
    if (customerErr || !customer) {
      if (userId.includes('demo')) {
        const demoRes = demoAddPayment({
          ...validatedPayload,
          organization_id: orgId,
        });
        return {
          payment_id: demoRes.id,
          amount: validatedPayload.amount,
          allocated_invoices: demoRes.allocations,
          created_at: demoRes.created_at,
        };
      }
      throw new Error('Customer not found or unauthorized');
    }

    // 2. Total allocated validation
    const totalAllocatedPaise = validatedPayload.allocations.reduce(
      (sum, item) => sum + item.allocated_amount,
      0
    );

    if (totalAllocatedPaise > validatedPayload.amount) {
      throw new Error(
        `Total allocated amount (₹${(totalAllocatedPaise ).toFixed(2)}) cannot exceed total payment amount (₹${(validatedPayload.amount ).toFixed(2)})`
      );
    }

    // 3. Fetch and validate each allocated invoice
    const invoiceIds = validatedPayload.allocations.map((a) => a.invoice_id);
    const { data: rawInvoices, error: invoicesErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, total_amount, paid, amount_paid, status, payment_status, customer_id')
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
      new_paid: number;
      new_status: string;
      invoice_total: number;
      allocated: number;
    }> = [];

    for (const allocation of validatedPayload.allocations) {
      const inv = invoices.find((i) => i.id === allocation.invoice_id);
      if (!inv) {
        throw new Error(`Invoice ID ${allocation.invoice_id} not found`);
      }

      if (inv.customer_id !== validatedPayload.customer_id) {
        throw new Error(`Invoice ${inv.invoice_number} does not belong to selected customer`);
      }

      const currentPaid = Number(inv.amount_paid ?? inv.paid ?? 0);
      const invoiceTotal = Number(inv.total_amount ?? inv.total ?? 0);
      const currentOutstanding = Math.max(0, invoiceTotal - currentPaid);

      if (allocation.allocated_amount > currentOutstanding && !validatedPayload.allow_overpayment) {
        throw new Error(
          `Overpayment Guard: Allocated payment ₹${(allocation.allocated_amount ).toFixed(2)} exceeds invoice ${inv.invoice_number} outstanding balance ₹${(currentOutstanding ).toFixed(2)}. Enable explicit overpayment policy to override.`
        );
      }

      const newPaid = currentPaid + allocation.allocated_amount;
      
      // Calculate auto status transition
      let newStatus = inv.status;
      if (newPaid >= invoiceTotal) {
        newStatus = 'paid';
      } else if (newPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'sent';
      }

      invoiceUpdates.push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        new_paid: newPaid,
        new_status: newStatus,
        invoice_total: invoiceTotal,
        allocated: allocation.allocated_amount,
      });
    }

    // 4. Create Payment record
    const { data: rawPaymentRecord, error: paymentInsertErr } = await supabase
      .from('payments')
      .insert({
        organization_id: orgId,
        customer_id: validatedPayload.customer_id,
        payment_date: validatedPayload.payment_date,
        amount: validatedPayload.amount,
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
      allocated: update.allocated,
    }));

    const { error: allocInsertErr } = await supabase
      .from('payment_allocations')
      .insert(allocationRows as any);

    if (allocInsertErr) {
      throw new Error(`Failed to insert payment allocations: ${allocInsertErr.message}`);
    }

    // 6. Update target invoices (both canonical and compatibility fields)
    for (const update of invoiceUpdates) {
      const balanceDue = Math.max(0, update.invoice_total - update.new_paid);
      const { error: updateInvErr } = await (supabase.from('invoices') as any)
        .update({
          paid: update.new_paid,
          amount_paid: update.new_paid,
          balance_due: balanceDue,
          status: update.new_status,
          payment_status: update.new_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)
        .eq('organization_id', orgId);

      if (updateInvErr) {
        throw new Error(`Failed to update invoice ${update.invoice_number}: ${updateInvErr.message}`);
      }
    }

    // 7. Record into customer_transactions ledger
    try {
      await (supabase.from('customer_transactions') as any).insert({
        organization_id: orgId,
        customer_id: validatedPayload.customer_id,
        transaction_type: 'payment',
        reference_type: 'payment',
        reference_id: paymentRecord.id,
        reference_number: validatedPayload.reference_number || paymentRecord.id,
        amount: -Number(validatedPayload.amount), // payment reduces customer balance
        transaction_date: validatedPayload.payment_date,
        narration: validatedPayload.notes || `Payment received via ${(validatedPayload.payment_method || 'Cash').toUpperCase()}`,
        created_by: userId,
      });
    } catch {
      // Table might not exist or optional in some setups
    }

    // 7b. Post to Cash/Bank Financial Ledger
    try {
      await CashBankService.recordTransaction(session, {
        direction: 'in',
        amount: validatedPayload.amount,
        transaction_type: 'payment_in',
        transaction_date: validatedPayload.payment_date,
        payment_mode: validatedPayload.payment_method,
        reference_type: 'payment',
        reference_id: paymentRecord.id,
        reference_number: validatedPayload.reference_number || paymentRecord.id,
        narration: `Customer payment received for ${customer.name || 'Customer'} via ${(validatedPayload.payment_method || 'Cash').toUpperCase()}`,
      });
    } catch (cbErr: any) {
      console.warn('[PaymentService] Cash/Bank recording notice:', cbErr.message);
    }

    // 7c. Post to Double-Entry Accounting
    try {
      await AccountingService.postCustomerPaymentAccounting(session, {
        id: paymentRecord.id,
        payment_date: validatedPayload.payment_date,
        amount: validatedPayload.amount,
        payment_method: validatedPayload.payment_method,
        customer_name: customer.name || 'Customer',
        reference_number: validatedPayload.reference_number || undefined,
      });
    } catch (accErr: any) {
      console.warn('[PaymentService] Accounting posting notice (prod):', accErr?.message);
    }

    // 8. Recalculate and sync customer outstanding balance
    await this.syncCustomerOutstanding(orgId, validatedPayload.customer_id);

    // 9. Audit trail log
    await logAudit(session, 'payment.created', 'payments', paymentRecord.id, {
      customer_id: validatedPayload.customer_id,
      customer_name: customer.name,
      amount: validatedPayload.amount,
      payment_method: validatedPayload.payment_method,
      allocations_count: validatedPayload.allocations.length,
      allocated_invoices: invoiceUpdates.map((u) => u.invoice_number),
    });

    return {
      payment_id: paymentRecord.id,
      amount: validatedPayload.amount,
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
      .select('total, paid, total_amount, paid_amount')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .not('status', 'in', '("draft","void","cancelled")');

    const unpaidInvoices = (rawUnpaidInvoices || []) as any[];
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => {
      const total = Number(inv.total_amount ?? inv.total ?? 0);
      const paid = Number(inv.paid_amount ?? inv.paid ?? 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    await (supabase.from('customers') as any)
      .update({
        outstanding_balance: totalOutstanding,
        outstanding: Math.round(totalOutstanding * 100),
        outstanding_paise: Math.round(totalOutstanding * 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('organization_id', organizationId);

    return totalOutstanding;
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
          amount,
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
          allocated,
          invoices (
            id,
            invoice_number,
            invoice_date,
            total,
            paid,
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
        amount,
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


