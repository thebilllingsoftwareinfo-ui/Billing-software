import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession, AuditAction, ResourceType } from '@/types/app.types';
import { requirePermission } from '@/lib/auth/permissions';

export interface AuditLogEntry {
  organization_id: string;
  user_id: string;
  action: AuditAction;
  resource_type: ResourceType;
  resource_id: string;
  details?: Record<string, any> | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface AuditFilterOptions {
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Writes an immutable append-only audit record to the audit_logs database table.
   * Silently catches errors to guarantee that audit logging never crashes business flows.
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = createAdminClient();

      const record = {
        organization_id: entry.organization_id,
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        old_values: entry.old_values ?? entry.details ?? null,
        new_values: entry.new_values ?? null,
        ip_address: entry.ip_address ?? null,
        user_agent: entry.user_agent ?? null,
        created_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from('audit_logs') as any).insert(record);

      if (error) {
        console.error('[AuditService] Database insert error:', error.message);
      }
    } catch (err: any) {
      console.error('[AuditService] Exception writing audit log:', err.message);
    }
  }

  /**
   * Fetches paginated, read-only audit log records for authorized users (Owner & Admin).
   * Audit records are strictly read-only; no UPDATE or DELETE API endpoints exist.
   */
  static async getAuditLogs(session: AppSession, filter: AuditFilterOptions = {}) {
    const role = session.role || session.member?.role || 'owner';
    const orgId = session.organization_id || session.organization?.id || '';
    requirePermission(role, 'audit_logs.view');
    const supabase = createAdminClient();

    const page = filter.page || 1;
    const limit = filter.limit || 20;

    let query = (supabase.from('audit_logs') as any)
      .select('id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, created_at', {
        count: 'exact',
      })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (filter.action) {
      query = query.eq('action', filter.action);
    }

    if (filter.resourceType) {
      query = query.eq('resource_type', filter.resourceType);
    }

    if (filter.startDate) {
      query = query.gte('created_at', `${filter.startDate}T00:00:00Z`);
    }

    if (filter.endDate) {
      query = query.lte('created_at', `${filter.endDate}T23:59:59Z`);
    }

    const from = (page - 1) * limit;
    const to = page * limit - 1;
    query = query.range(from, to);

    const { data: logs, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return {
      logs: logs || [],
      totalCount: count || 0,
      page,
      limit,
    };
  }
}

export async function logAudit(
  entryOrSession: AuditLogEntry | AppSession | any,
  action?: AuditAction | string,
  resource_type?: ResourceType | string,
  resource_id?: string,
  details?: Record<string, any>
): Promise<void> {
  if (entryOrSession && typeof entryOrSession === 'object' && 'organization_id' in entryOrSession && 'user_id' in entryOrSession && !action) {
    return AuditService.log(entryOrSession as AuditLogEntry);
  }

  const orgId = entryOrSession?.organization_id || entryOrSession?.organization?.id || '';
  const userId = entryOrSession?.user_id || entryOrSession?.user?.id || '';

  return AuditService.log({
    organization_id: orgId,
    user_id: userId,
    action: (action || 'updated') as AuditAction,
    resource_type: (resource_type || 'system') as ResourceType,
    resource_id: resource_id || '',
    details: details || null,
  });
}

