// ============================================================
// lib/services/salesperson.service.ts — Phase 9 Salesperson & Commission Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  SalespersonInput,
  salespersonSchema,
} from '@/lib/validators/pricing.schema';
import {
  demoSalespersons,
  demoSalesCommissions,
  DemoSalesperson,
  DemoSalesCommission,
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

export class SalespersonService {
  /**
   * Retrieves all salespersons for an organization.
   */
  static async getSalespersons(session: AppSession): Promise<DemoSalesperson[]> {
    requirePermission(session.role, 'salesperson.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('salespersons')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoSalespersons.filter((sp) => sp.organization_id === orgId);
  }

  static async createSalesperson(session: AppSession, input: SalespersonInput): Promise<DemoSalesperson> {
    requirePermission(session.role, 'salesperson.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const validated = salespersonSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('salespersons')
        .insert({
          organization_id: orgId,
          ...validated,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logAudit(session, 'salesperson.created', 'salespersons', data.id, {
        code: validated.code,
        name: validated.name,
      });
      return data;
    }

    const existing = demoSalespersons.find((s) => s.organization_id === orgId && s.code === validated.code);
    if (existing) throw new Error(`Salesperson code '${validated.code}' already exists`);

    const newSp: DemoSalesperson = {
      id: `sp-${Date.now()}`,
      organization_id: orgId,
      name: validated.name,
      code: validated.code,
      staff_id: validated.staff_id || null,
      email: validated.email || null,
      phone: validated.phone || null,
      commission_rate: validated.commission_rate,
      is_active: validated.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoSalespersons.push(newSp);

    await logAudit(session, 'salesperson.created', 'salespersons', newSp.id, {
      code: validated.code,
      name: validated.name,
    });
    return newSp;
  }

  static async updateSalesperson(session: AppSession, id: string, input: Partial<SalespersonInput>): Promise<DemoSalesperson> {
    requirePermission(session.role, 'salesperson.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('salespersons')
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.commission_rate !== undefined && { commission_rate: input.commission_rate }),
          ...(input.is_active !== undefined && { is_active: input.is_active }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const sp = demoSalespersons.find((s) => s.id === id && s.organization_id === orgId);
    if (!sp) throw new Error('Salesperson not found');

    if (input.name !== undefined) sp.name = input.name;
    if (input.email !== undefined) sp.email = input.email;
    if (input.phone !== undefined) sp.phone = input.phone;
    if (input.commission_rate !== undefined) sp.commission_rate = input.commission_rate;
    if (input.is_active !== undefined) sp.is_active = input.is_active;
    sp.updated_at = new Date().toISOString();

    return sp;
  }

  // ============================================================
  // Commission Calculations & Lifecycle
  // ============================================================
  /**
   * Computes and logs sales commission upon invoice generation or finalization.
   */
  static async recordSalesCommission(
    session: { org_id?: string; organization_id?: string; role?: any; [key: string]: any },
    params: {
      salesperson_id: string;
      invoice_id: string;
      sale_amount: number;
      custom_commission_rate?: number;
    }
  ): Promise<DemoSalesCommission | null> {
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && orgId !== DEMO_ORG_ID;

    let rate = params.custom_commission_rate;
    if (rate === undefined || rate === null) {
      if (isSupabase) {
        const { data: sp } = await createAdminClient()
          .from('salespersons')
          .select('commission_rate')
          .eq('id', params.salesperson_id)
          .eq('organization_id', orgId)
          .single();
        rate = Number(sp?.commission_rate || 0);
      } else {
        const sp = demoSalespersons.find((s) => s.id === params.salesperson_id && s.organization_id === orgId);
        rate = Number(sp?.commission_rate || 0);
      }
    }

    const amount = Math.round(Number(params.sale_amount) * (rate / 100) * 100) / 100;
    if (amount <= 0) return null;

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('sales_commissions')
        .upsert(
          {
            organization_id: orgId,
            salesperson_id: params.salesperson_id,
            invoice_id: params.invoice_id,
            sale_amount: params.sale_amount,
            commission_rate: rate,
            commission_amount: amount,
            status: 'pending',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,salesperson_id,invoice_id' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    } else {
      const existingIdx = demoSalesCommissions.findIndex(
        (c) =>
          c.organization_id === orgId &&
          c.salesperson_id === params.salesperson_id &&
          c.invoice_id === params.invoice_id
      );

      const commRecord: DemoSalesCommission = {
        id: existingIdx >= 0 ? demoSalesCommissions[existingIdx].id : `comm-${Date.now()}`,
        organization_id: orgId,
        salesperson_id: params.salesperson_id,
        invoice_id: params.invoice_id,
        sale_amount: params.sale_amount,
        commission_rate: rate,
        commission_amount: amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        demoSalesCommissions[existingIdx] = commRecord;
      } else {
        demoSalesCommissions.push(commRecord);
      }

      return commRecord;
    }
  }

  /**
   * Reverses commission when an invoice is cancelled or returned.
   */
  static async reverseSalesCommission(
    session: { org_id?: string; organization_id?: string; role?: any; [key: string]: any },
    invoiceId: string
  ): Promise<void> {
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && orgId !== DEMO_ORG_ID;

    if (isSupabase) {
      const supabase = createAdminClient();
      await supabase
        .from('sales_commissions')
        .update({ status: 'reversed', updated_at: new Date().toISOString() })
        .eq('invoice_id', invoiceId)
        .eq('organization_id', orgId);
    } else {
      const comm = demoSalesCommissions.find((c) => c.invoice_id === invoiceId && c.organization_id === orgId);
      if (comm) {
        comm.status = 'reversed';
        comm.updated_at = new Date().toISOString();
      }
    }
  }

  static async approveCommission(session: AppSession, commissionId: string): Promise<DemoSalesCommission> {
    requirePermission(session.role, 'commission.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('sales_commissions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', commissionId)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const comm = demoSalesCommissions.find((c) => c.id === commissionId && c.organization_id === orgId);
    if (!comm) throw new Error('Commission not found');
    comm.status = 'approved';
    comm.updated_at = new Date().toISOString();
    return comm;
  }

  static async payCommission(session: AppSession, commissionId: string): Promise<DemoSalesCommission> {
    requirePermission(session.role, 'commission.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('sales_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', commissionId)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const comm = demoSalesCommissions.find((c) => c.id === commissionId && c.organization_id === orgId);
    if (!comm) throw new Error('Commission not found');
    comm.status = 'paid';
    comm.paid_at = new Date().toISOString();
    comm.updated_at = new Date().toISOString();
    return comm;
  }

  static async getCommissions(
    session: AppSession,
    filters?: { salesperson_id?: string; status?: string }
  ): Promise<DemoSalesCommission[]> {
    requirePermission(session.role, 'commission.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      let query = supabase.from('sales_commissions').select('*').eq('organization_id', orgId);
      if (filters?.salesperson_id) query = query.eq('salesperson_id', filters.salesperson_id);
      if (filters?.status) query = query.eq('status', filters.status);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoSalesCommissions.filter(
      (c) =>
        c.organization_id === orgId &&
        (!filters?.salesperson_id || c.salesperson_id === filters.salesperson_id) &&
        (!filters?.status || c.status === filters.status)
    );
  }
}
