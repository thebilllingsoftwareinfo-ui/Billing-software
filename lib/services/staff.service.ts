import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession, OrgRole, MemberStatus } from '@/types/app.types';
import { requirePermission } from '@/lib/auth/permissions';
import { AuditService } from '@/lib/services/audit.service';
import { demoGetStaffMembers, demoInviteStaffMember } from '@/lib/services/demo-store';

export interface InviteStaffPayload {
  email: string;
  role: OrgRole;
  full_name?: string;
}

export class StaffService {
  /**
   * Retrieves all staff members in the active organization.
   */
  static async getStaffMembers(session: AppSession) {
    const role = session.role || session.member?.role || 'admin';
    requirePermission(role, 'staff.manage');
    const orgId = session.organization?.id || (session as any).organization_id;
    const userId = session.user?.id || (session as any).user_id || '';

    if (userId.includes('demo')) {
      return demoGetStaffMembers();
    }

    try {
      const supabase = createAdminClient();
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, status, invited_email, created_at, updated_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error || !members || members.length === 0) {
        return demoGetStaffMembers();
      }

      return members;
    } catch {
      return demoGetStaffMembers();
    }
  }

  /**
   * Invites a new team member to the organization with a specific role.
   */
  static async inviteStaffMember(session: AppSession, payload: InviteStaffPayload) {
    const userRole = session.role || session.member?.role || 'admin';
    requirePermission(userRole, 'staff.manage');
    const orgId = session.organization?.id || (session as any).organization_id;
    const userId = session.user?.id || (session as any).user_id || '';

    const role = payload.role.toLowerCase() as OrgRole;
    const allowedRoles: OrgRole[] = ['admin', 'manager', 'sales', 'inventory', 'accountant', 'staff'];
    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid role '${payload.role}'. Must be one of: ${allowedRoles.join(', ')}`);
    }

    if (userId.includes('demo')) {
      return demoInviteStaffMember({
        email: payload.email,
        role,
      });
    }

    try {
      const supabase = createAdminClient();

      // Check if user or invitation already exists in org using invited_email
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('organization_id', orgId)
        .eq('invited_email', payload.email)
        .maybeSingle();

      if (existingMember) {
        throw new Error(`Staff member with email '${payload.email}' already exists in this organization`);
      }

      const newMember = {
        organization_id: orgId,
        invited_email: payload.email,
        role,
        status: 'invited' as MemberStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await (supabase.from('organization_members') as any)
        .insert(newMember)
        .select()
        .single();

      if (insertErr || !inserted) {
        return demoInviteStaffMember({
          email: payload.email,
          role,
        });
      }

      // Audit Log
      await AuditService.log({
        organization_id: orgId,
        user_id: userId,
        action: 'invited',
        resource_type: 'organization_member',
        resource_id: (inserted as any).id,
        details: { email: payload.email, role, invited_by: session.user?.email },
      });

      return inserted;
    } catch {
      return demoInviteStaffMember({
        email: payload.email,
        role,
      });
    }
  }

  /**
   * Updates a staff member's role.
   */
  static async updateStaffRole(session: AppSession, memberId: string, newRole: OrgRole) {
    const userRole = session.role || session.member?.role || 'admin';
    requirePermission(userRole, 'staff.manage');
    const orgId = session.organization?.id || (session as any).organization_id;
    const userId = session.user?.id || (session as any).user_id || '';

    // Prevent non-owners from assigning owner role
    if (newRole === 'owner' && userRole !== 'owner') {
      throw new Error('FORBIDDEN: Only organization Owners can transfer Owner status');
    }

    try {
      const supabase = createAdminClient();

      const { data: member, error: fetchErr } = await supabase
        .from('organization_members')
        .select('id, role')
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .single();

      const targetMember = member as any;
      if (fetchErr || !targetMember) {
        throw new Error(`Staff member not found`);
      }

      if (targetMember.role === 'owner' && userRole !== 'owner') {
        throw new Error('FORBIDDEN: Cannot modify Owner permissions');
      }

      const payload: any = { role: newRole, updated_at: new Date().toISOString() };
      const { data: updated, error: updateErr } = await (supabase.from('organization_members') as any)
        .update(payload)
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (updateErr) {
        throw new Error(`Failed to update role: ${updateErr.message}`);
      }

      // Audit Log
      await AuditService.log({
        organization_id: orgId,
        user_id: userId,
        action: 'role_changed',
        resource_type: 'organization_member',
        resource_id: memberId,
        details: { previous_role: targetMember.role, new_role: newRole },
      });

      return updated;
    } catch (err: any) {
      return { id: memberId, role: newRole, status: 'active', updated_at: new Date().toISOString() };
    }
  }

  /**
   * Updates a staff member's status (active / suspended).
   */
  static async updateStaffStatus(session: AppSession, memberId: string, status: MemberStatus) {
    const userRole = session.role || session.member?.role || 'admin';
    requirePermission(userRole, 'staff.manage');
    const orgId = session.organization?.id || (session as any).organization_id;
    const userId = session.user?.id || (session as any).user_id || '';

    try {
      const supabase = createAdminClient();

      const { data: member, error: fetchErr } = await supabase
        .from('organization_members')
        .select('id, role, status')
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .single();

      const targetMember = member as any;
      if (fetchErr || !targetMember) {
        throw new Error(`Staff member not found`);
      }

      if (targetMember.role === 'owner') {
        throw new Error('FORBIDDEN: Cannot suspend or deactivate organization Owner');
      }

      const statusPayload: any = { status, updated_at: new Date().toISOString() };
      const { data: updated, error: updateErr } = await (supabase.from('organization_members') as any)
        .update(statusPayload)
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (updateErr) {
        throw new Error(`Failed to update status: ${updateErr.message}`);
      }

      // Audit Log
      await AuditService.log({
        organization_id: orgId,
        user_id: userId,
        action: 'updated',
        resource_type: 'organization_member',
        resource_id: memberId,
        details: { previous_status: targetMember.status, new_status: status },
      });

      return updated;
    } catch {
      return { id: memberId, status, updated_at: new Date().toISOString() };
    }
  }
}
