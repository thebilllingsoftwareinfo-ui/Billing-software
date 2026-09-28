// ============================================================
// lib/services/recurring-invoice.service.ts — Phase 9 Recurring Billing Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  RecurringInvoiceInput,
  recurringInvoiceSchema,
} from '@/lib/validators/pricing.schema';
import {
  demoRecurringInvoices,
  demoRecurringInvoiceLogs,
  demoInvoices,
  DemoRecurringInvoice,
  DemoRecurringInvoiceLog,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

function checkIsSupabase(session: { org_id?: string; organization_id?: string; user_id?: string }): boolean {
  const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
    orgId !== DEMO_ORG_ID &&
    !session.user_id?.includes('demo')
  );
}

export class RecurringInvoiceService {
  /**
   * Computes the subsequent execution date given a frequency.
   */
  static calculateNextRunDate(fromDate: string, frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
    const d = new Date(fromDate);
    if (frequency === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (frequency === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (frequency === 'quarterly') {
      d.setMonth(d.getMonth() + 3);
    } else if (frequency === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d.toISOString().split('T')[0];
  }

  static async getRecurringInvoices(session: AppSession): Promise<DemoRecurringInvoice[]> {
    requirePermission(session.role, 'recurring.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoRecurringInvoices.filter((r) => r.organization_id === orgId);
  }

  static async createRecurringInvoice(session: AppSession, input: RecurringInvoiceInput): Promise<DemoRecurringInvoice> {
    requirePermission(session.role, 'recurring.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const validated = recurringInvoiceSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('recurring_invoices')
        .insert({
          organization_id: orgId,
          template_name: validated.template_name,
          customer_id: validated.customer_id,
          frequency: validated.frequency,
          start_date: validated.start_date,
          end_date: validated.end_date || null,
          next_run_date: validated.start_date,
          payment_terms_days: validated.payment_terms_days,
          status: validated.status,
          items: validated.items,
          notes: validated.notes || null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logAudit(session, 'recurring_invoice.created', 'recurring_invoices', data.id, {
        template_name: validated.template_name,
        frequency: validated.frequency,
      });
      return data;
    }

    const newTemplate: DemoRecurringInvoice = {
      id: `rec-${Date.now()}`,
      organization_id: orgId,
      template_name: validated.template_name,
      customer_id: validated.customer_id,
      frequency: validated.frequency,
      start_date: validated.start_date,
      end_date: validated.end_date || null,
      next_run_date: validated.start_date,
      last_run_date: null,
      payment_terms_days: validated.payment_terms_days,
      status: validated.status,
      items: validated.items,
      notes: validated.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoRecurringInvoices.push(newTemplate);

    await logAudit(session, 'recurring_invoice.created', 'recurring_invoices', newTemplate.id, {
      template_name: validated.template_name,
      frequency: validated.frequency,
    });
    return newTemplate;
  }

  static async updateRecurringInvoice(
    session: AppSession,
    id: string,
    input: Partial<RecurringInvoiceInput>
  ): Promise<DemoRecurringInvoice> {
    requirePermission(session.role, 'recurring.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('recurring_invoices')
        .update({
          ...(input.template_name !== undefined && { template_name: input.template_name }),
          ...(input.frequency !== undefined && { frequency: input.frequency }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.items !== undefined && { items: input.items }),
          ...(input.notes !== undefined && { notes: input.notes }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const tpl = demoRecurringInvoices.find((r) => r.id === id && r.organization_id === orgId);
    if (!tpl) throw new Error('Recurring invoice template not found');

    if (input.template_name !== undefined) tpl.template_name = input.template_name;
    if (input.frequency !== undefined) tpl.frequency = input.frequency;
    if (input.status !== undefined) tpl.status = input.status;
    if (input.items !== undefined) tpl.items = input.items;
    if (input.notes !== undefined) tpl.notes = input.notes;
    tpl.updated_at = new Date().toISOString();

    return tpl;
  }

  /**
   * Processes all active recurring invoice templates whose next_run_date is <= currentDate.
   * Guarantees idempotency via cycle log check.
   */
  static async processDueRecurringInvoices(
    session: AppSession,
    currentDate?: string
  ): Promise<{
    processed_count: number;
    generated_invoices: Array<{ template_id: string; invoice_number: string; total: number }>;
  }> {
    requirePermission(session.role, 'recurring.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const dateStr = currentDate || new Date().toISOString().split('T')[0];
    const isSupabase = checkIsSupabase(session);

    const generatedList: Array<{ template_id: string; invoice_number: string; total: number }> = [];

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: dueTemplates, error } = await supabase
        .from('recurring_invoices')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .lte('next_run_date', dateStr);
      if (error) throw new Error(error.message);

      for (const tpl of dueTemplates || []) {
        // Idempotency: verify this template has not already generated an invoice for this cycle_date
        const { data: existingLog } = await supabase
          .from('recurring_invoice_logs')
          .select('id')
          .eq('recurring_invoice_id', tpl.id)
          .eq('cycle_date', tpl.next_run_date)
          .maybeSingle();

        if (existingLog) {
          // Advance next run date if already executed for this cycle
          const nextDate = this.calculateNextRunDate(tpl.next_run_date, tpl.frequency);
          await supabase
            .from('recurring_invoices')
            .update({ next_run_date: nextDate, updated_at: new Date().toISOString() })
            .eq('id', tpl.id);
          continue;
        }

        // Generate Invoice
        const invNum = `REC-INV-${Date.now().toString().slice(-6)}`;
        const subtotal = (tpl.items || []).reduce((acc: number, it: any) => acc + (it.quantity * it.unit_price), 0);

        const { data: newInv, error: invErr } = await supabase
          .from('invoices')
          .insert({
            organization_id: orgId,
            customer_id: tpl.customer_id,
            invoice_number: invNum,
            invoice_date: tpl.next_run_date,
            subtotal,
            tax_amount: 0,
            total_amount: subtotal,
            status: 'unpaid',
            recurring_template_id: tpl.id,
          })
          .select()
          .single();

        if (invErr) {
          await supabase.from('recurring_invoice_logs').insert({
            organization_id: orgId,
            recurring_invoice_id: tpl.id,
            cycle_date: tpl.next_run_date,
            status: 'failed',
            error_message: invErr.message,
          });
          continue;
        }

        // Log cycle success
        await supabase.from('recurring_invoice_logs').insert({
          organization_id: orgId,
          recurring_invoice_id: tpl.id,
          generated_invoice_id: newInv.id,
          cycle_date: tpl.next_run_date,
          status: 'success',
        });

        // Advance next run date or complete
        const nextDate = this.calculateNextRunDate(tpl.next_run_date, tpl.frequency);
        const isCompleted = tpl.end_date && nextDate > tpl.end_date;

        await supabase
          .from('recurring_invoices')
          .update({
            last_run_date: tpl.next_run_date,
            next_run_date: nextDate,
            status: isCompleted ? 'completed' : 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', tpl.id);

        generatedList.push({
          template_id: tpl.id,
          invoice_number: invNum,
          total: subtotal,
        });
      }
    } else {
      const due = demoRecurringInvoices.filter(
        (r) => r.organization_id === orgId && r.status === 'active' && r.next_run_date <= dateStr
      );

      for (const tpl of due) {
        // Idempotency check
        const alreadyRan = demoRecurringInvoiceLogs.some(
          (l) => l.recurring_invoice_id === tpl.id && l.cycle_date === tpl.next_run_date
        );

        if (alreadyRan) {
          tpl.next_run_date = this.calculateNextRunDate(tpl.next_run_date, tpl.frequency);
          continue;
        }

        const invNum = `REC-INV-${Date.now().toString().slice(-6)}`;
        const subtotal = (tpl.items || []).reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);

        demoInvoices.push({
          id: `inv-${Date.now()}`,
          organization_id: orgId,
          customer_id: tpl.customer_id,
          invoice_number: invNum,
          invoice_date: tpl.next_run_date,
          due_date: tpl.next_run_date,
          subtotal,
          tax_amount: 0,
          total_amount: subtotal,
          balance_due: subtotal,
          status: 'unpaid',
          items: tpl.items.map((it) => ({
            id: `item-${Date.now()}`,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate || 0,
            tax_amount: 0,
            total_price: it.quantity * it.unit_price,
          })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);

        demoRecurringInvoiceLogs.push({
          id: `log-${Date.now()}`,
          organization_id: orgId,
          recurring_invoice_id: tpl.id,
          generated_invoice_id: `inv-${Date.now()}`,
          cycle_date: tpl.next_run_date,
          status: 'success',
          created_at: new Date().toISOString(),
        });

        tpl.last_run_date = tpl.next_run_date;
        const nextDate = this.calculateNextRunDate(tpl.next_run_date, tpl.frequency);
        tpl.next_run_date = nextDate;
        if (tpl.end_date && nextDate > tpl.end_date) {
          tpl.status = 'completed';
        }

        generatedList.push({
          template_id: tpl.id,
          invoice_number: invNum,
          total: subtotal,
        });
      }
    }

    return {
      processed_count: generatedList.length,
      generated_invoices: generatedList,
    };
  }
}
