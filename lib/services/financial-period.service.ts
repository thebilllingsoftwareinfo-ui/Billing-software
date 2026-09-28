// ============================================================================
// lib/services/financial-period.service.ts — Phase 10 Financial Period Engine
//
// Governs fiscal years, monthly accounting periods, and posting locks.
// INVARIANT: A closed or locked financial period MUST NOT accept any transaction
// posting (sales, purchases, journals, payments, expenses, inventory).
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  FinancialPeriodInput,
  financialPeriodSchema,
  reopenPeriodSchema,
} from '@/lib/validators/financial-intelligence.schema';
import {
  demoFinancialPeriods,
  DemoFinancialPeriod,
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

export class FinancialPeriodService {
  /**
   * Retrieves all financial periods for an organization, optionally filtered by fiscal year.
   */
  static async getPeriods(session: AppSession, fiscalYear?: string): Promise<DemoFinancialPeriod[]> {
    requirePermission(session.role, 'accounting.period.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      let query = supabase
        .from('financial_periods')
        .select('*')
        .eq('organization_id', orgId);

      if (fiscalYear) {
        query = query.eq('fiscal_year', fiscalYear);
      }

      const { data, error } = await query.order('start_date', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoFinancialPeriods
      .filter((p) => p.organization_id === orgId && (!fiscalYear || p.fiscal_year === fiscalYear))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  /**
   * Retrieves a single financial period by ID.
   */
  static async getPeriodById(session: AppSession, periodId: string): Promise<DemoFinancialPeriod | null> {
    requirePermission(session.role, 'accounting.period.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('financial_periods')
        .select('*')
        .eq('id', periodId)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data || null;
    }

    const p = demoFinancialPeriods.find((item) => item.id === periodId && item.organization_id === orgId);
    return p ? { ...p } : null;
  }

  /**
   * Creates a new financial accounting period.
   */
  static async createPeriod(session: AppSession, input: FinancialPeriodInput): Promise<DemoFinancialPeriod> {
    requirePermission(session.role, 'accounting.period.manage');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const validated = financialPeriodSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('financial_periods')
        .insert({
          organization_id: orgId,
          fiscal_year: validated.fiscal_year,
          period_name: validated.period_name,
          period_key: validated.period_key,
          start_date: validated.start_date,
          end_date: validated.end_date,
          status: validated.status || 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit(session, 'financial_period.created', 'financial_periods', data.id, {
        period_key: data.period_key,
        fiscal_year: data.fiscal_year,
      });
      return data;
    }

    const existing = demoFinancialPeriods.find(
      (p) => p.organization_id === orgId && p.period_key === validated.period_key
    );
    if (existing) {
      throw new Error(`Period with key '${validated.period_key}' already exists for this organization.`);
    }

    const newPeriod: DemoFinancialPeriod = {
      id: `fp-${validated.period_key}-${Date.now().toString().slice(-4)}`,
      organization_id: orgId,
      fiscal_year: validated.fiscal_year,
      period_name: validated.period_name,
      period_key: validated.period_key,
      start_date: validated.start_date,
      end_date: validated.end_date,
      status: validated.status || 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    demoFinancialPeriods.push(newPeriod);
    await logAudit(session, 'financial_period.created', 'financial_periods', newPeriod.id, {
      period_key: newPeriod.period_key,
      fiscal_year: newPeriod.fiscal_year,
    });
    return newPeriod;
  }

  /**
   * Closes an open financial period, locking subsequent transaction postings.
   */
  static async closePeriod(session: AppSession, periodId: string): Promise<DemoFinancialPeriod> {
    requirePermission(session.role, 'accounting.period.manage');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const userId = session.user_id || 'usr-admin';
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('financial_periods')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', periodId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit(session, 'financial_period.closed', 'financial_periods', data.id, {
        period_key: data.period_key,
      });
      return data;
    }

    const period = demoFinancialPeriods.find((p) => p.id === periodId && p.organization_id === orgId);
    if (!period) throw new Error('Financial period not found.');
    if (period.status === 'closed' || period.status === 'locked') {
      return period; // idempotent
    }

    period.status = 'closed';
    period.closed_at = new Date().toISOString();
    period.closed_by = userId;
    period.updated_at = new Date().toISOString();

    await logAudit(session, 'financial_period.closed', 'financial_periods', period.id, {
      period_key: period.period_key,
    });
    return period;
  }

  /**
   * Reopens a closed financial period with mandatory justification reason.
   */
  static async reopenPeriod(
    session: AppSession,
    periodId: string,
    reason: string
  ): Promise<DemoFinancialPeriod> {
    requirePermission(session.role, 'accounting.period.manage');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const userId = session.user_id || 'usr-admin';
    const validated = reopenPeriodSchema.parse({ period_id: periodId, reason });
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('financial_periods')
        .update({
          status: 'open',
          reopen_reason: validated.reason,
          reopened_at: new Date().toISOString(),
          reopened_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', periodId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit(session, 'financial_period.reopened', 'financial_periods', data.id, {
        period_key: data.period_key,
        reason: validated.reason,
      });
      return data;
    }

    const period = demoFinancialPeriods.find((p) => p.id === periodId && p.organization_id === orgId);
    if (!period) throw new Error('Financial period not found.');
    if (period.status === 'locked') {
      throw new Error('PERIOD_LOCKED: Locked financial periods are permanently sealed and cannot be reopened.');
    }

    period.status = 'open';
    period.reopen_reason = validated.reason;
    period.reopened_at = new Date().toISOString();
    period.reopened_by = userId;
    period.updated_at = new Date().toISOString();

    await logAudit(session, 'financial_period.reopened', 'financial_periods', period.id, {
      period_key: period.period_key,
      reason: validated.reason,
    });
    return period;
  }

  /**
   * CRITICAL POSTING DATE VALIDATION INVARIANT:
   * Rejects any transaction posting into a closed or locked financial period.
   */
  static async validatePostingDate(
    session: { org_id?: string; organization_id?: string; user_id?: string; role?: any },
    postingDate: string
  ): Promise<boolean> {
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const dateStr = (postingDate || '').split('T')[0];
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: period } = await supabase
        .from('financial_periods')
        .select('*')
        .eq('organization_id', orgId)
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .maybeSingle();

      if (period && (period.status === 'closed' || period.status === 'locked')) {
        throw new Error(
          `PERIOD_CLOSED: The financial period '${period.period_name}' (${period.period_key}) for date ${dateStr} is closed. Posting is strictly prohibited.`
        );
      }
      return true;
    }

    const matchingPeriod = demoFinancialPeriods.find(
      (p) =>
        p.organization_id === orgId &&
        p.start_date <= dateStr &&
        p.end_date >= dateStr
    );

    if (matchingPeriod && (matchingPeriod.status === 'closed' || matchingPeriod.status === 'locked')) {
      throw new Error(
        `PERIOD_CLOSED: The financial period '${matchingPeriod.period_name}' (${matchingPeriod.period_key}) for date ${dateStr} is closed. Posting is strictly prohibited.`
      );
    }
    return true;
  }
}
