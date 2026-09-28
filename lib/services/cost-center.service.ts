// ============================================================================
// lib/services/cost-center.service.ts — Phase 10 Cost Centers & Business Units
//
// Manages organizational segmentations: Cost Center, Business Unit, Branch,
// Department, and Project.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import { CostCenterInput, costCenterSchema } from '@/lib/validators/financial-intelligence.schema';
import { demoCostCenters, DemoCostCenter, DEMO_ORG_ID } from '@/lib/services/demo-store';

function checkIsSupabase(session: { org_id?: string; organization_id?: string; user_id?: string }): boolean {
  const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
    orgId !== DEMO_ORG_ID &&
    !session.user_id?.includes('demo')
  );
}

export class CostCenterService {
  /**
   * Retrieves all cost centers / business units for the organization.
   */
  static async getCostCenters(
    session: AppSession,
    filter?: { type?: string; is_active?: boolean; search?: string } | boolean
  ): Promise<DemoCostCenter[]> {
    requirePermission(session.role, 'cost_center.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    const activeOnly = typeof filter === 'boolean' ? filter : filter?.is_active;
    const typeFilter = typeof filter === 'object' ? filter?.type : undefined;
    const searchFilter = typeof filter === 'object' ? filter?.search?.toLowerCase() : undefined;

    if (isSupabase) {
      const supabase = createAdminClient();
      let query = supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', orgId);

      if (activeOnly !== undefined) {
        query = query.eq('is_active', activeOnly);
      }
      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query.order('name', { ascending: true });
      if (error) throw new Error(error.message);
      let res = data || [];
      if (searchFilter) {
        res = res.filter((c: any) => c.name.toLowerCase().includes(searchFilter) || c.code.toLowerCase().includes(searchFilter));
      }
      return res;
    }

    return demoCostCenters
      .filter((cc) => {
        if (cc.organization_id !== orgId) return false;
        if (activeOnly !== undefined && cc.is_active !== activeOnly) return false;
        if (typeFilter && cc.type !== typeFilter) return false;
        if (searchFilter && !cc.name.toLowerCase().includes(searchFilter) && !cc.code.toLowerCase().includes(searchFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getCostCenterById(session: AppSession, id: string): Promise<DemoCostCenter | null> {
    requirePermission(session.role, 'cost_center.view');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data } = await supabase.from('cost_centers').select('*').eq('id', id).eq('organization_id', orgId).single();
      return data || null;
    }
    return demoCostCenters.find((c) => c.id === id && c.organization_id === orgId) || null;
  }


  /**
   * Creates a new cost center / business unit.
   */
  static async createCostCenter(session: AppSession, input: CostCenterInput): Promise<DemoCostCenter> {
    requirePermission(session.role, 'cost_center.manage');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const validated = costCenterSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('cost_centers')
        .insert({
          organization_id: orgId,
          code: validated.code,
          name: validated.name,
          type: validated.type || 'cost_center',
          is_active: validated.is_active !== undefined ? validated.is_active : true,
          description: validated.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit(session, 'cost_center.created', 'cost_centers', data.id, {
        code: data.code,
        name: data.name,
      });
      return data;
    }

    const existing = demoCostCenters.find(
      (cc) => cc.organization_id === orgId && cc.code.toLowerCase() === validated.code.toLowerCase()
    );
    if (existing) {
      throw new Error(`Cost center with code '${validated.code}' already exists.`);
    }

    const newCC: DemoCostCenter = {
      id: `cc-${Date.now().toString().slice(-4)}`,
      organization_id: orgId,
      code: validated.code,
      name: validated.name,
      type: validated.type || 'cost_center',
      is_active: validated.is_active !== undefined ? validated.is_active : true,
      description: validated.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    demoCostCenters.push(newCC);
    await logAudit(session, 'cost_center.created', 'cost_centers', newCC.id, {
      code: newCC.code,
      name: newCC.name,
    });
    return newCC;
  }

  /**
   * Updates an existing cost center.
   */
  static async updateCostCenter(
    session: AppSession,
    id: string,
    input: Partial<CostCenterInput>
  ): Promise<DemoCostCenter> {
    requirePermission(session.role, 'cost_center.manage');
    const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('cost_centers')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      await logAudit(session, 'cost_center.updated', 'cost_centers', id, input);
      return data;
    }

    const cc = demoCostCenters.find((c) => c.id === id && c.organization_id === orgId);
    if (!cc) throw new Error('Cost center not found.');

    if (input.code && input.code !== cc.code) {
      const duplicate = demoCostCenters.find(
        (c) => c.id !== id && c.organization_id === orgId && c.code.toLowerCase() === input.code!.toLowerCase()
      );
      if (duplicate) throw new Error(`Cost center with code '${input.code}' already exists.`);
      cc.code = input.code;
    }

    if (input.name) cc.name = input.name;
    if (input.type) cc.type = input.type;
    if (input.is_active !== undefined) cc.is_active = input.is_active;
    if (input.description !== undefined) cc.description = input.description;
    cc.updated_at = new Date().toISOString();

    await logAudit(session, 'cost_center.updated', 'cost_centers', id, input);
    return cc;
  }
}
