import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession, OrgRole, MemberStatus } from '@/types/app.types';
import { requirePermission } from '@/lib/auth/permissions';
import { AuditService } from '@/lib/services/audit.service';

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
    requirePermission(session.member.role, 'staff.manage');
    const supabase = createAdminClient();
    const orgId = session.organization.id;

    const { data: members, error } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, created_at, updated_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch staff members: ${error.message}`);
    }

    return members || [];
  }

  /**
   * Invites a new team member to the organization with a specific role.
   */
  static async inviteStaffMember(session: AppSession, payload: InviteStaffPayload) {
    requirePermission(session.member.role, 'staff.manage');
    const supabase = createAdminClient();
    const orgId = session.organization.id;

    const role = payload.role.toLowerCase() as OrgRole;
    const allowedRoles: OrgRole[] = ['admin', 'manager', 'sales', 'inventory', 'accountant', 'staff'];
    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid role '${payload.role}'. Must be one of: ${allowedRoles.join(', ')}`);
    }

    // Check if user or invitation already exists in org
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('id', payload.email) // using email match if unlinked
      .maybeSingle();

    if (existingMember) {
      throw new Error(`Staff member with email '${payload.email}' already exists in this organization`);
    }

    const newMemberId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMember = {
      id: newMemberId,
      organization_id: orgId,
      user_id: newMemberId, // Placeholder until user accepts invite
      role,
      status: 'invited' as MemberStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('organization_members')
      .insert(newMember as any)
      .select()
      .single();

    if (insertErr) {
      throw new Error(`Failed to invite staff member: ${insertErr.message}`);
    }

    // Audit Log
    await AuditService.log({
      organization_id: orgId,
      user_id: session.user.id,
      action: 'invited',
      resource_type: 'organization_member',
      resource_id: newMemberId,
      details: { email: payload.email, role, invited_by: session.user.email },
    });

    return inserted;
  }

  /**
   * Updates a staff member's role.
   */
  static async updateStaffRole(session: AppSession, memberId: string, newRole: OrgRole) {
    requirePermission(session.member.role, 'staff.manage');
    const supabase = createAdminClient();
    const orgId = session.organization.id;

    // Prevent non-owners from assigning owner role
    if (newRole === 'owner' && session.member.role !== 'owner') {
      throw new Error('FORBIDDEN: Only organization Owners can transfer Owner status');
    }

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

    if (targetMember.role === 'owner' && session.member.role !== 'owner') {
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
      user_id: session.user.id,
      action: 'role_changed',
      resource_type: 'organization_member',
      resource_id: memberId,
      details: { previous_role: targetMember.role, new_role: newRole },
    });

    return updated;
  }

  /**
   * Updates a staff member's status (active / suspended).
   */
  static async updateStaffStatus(session: AppSession, memberId: string, status: MemberStatus) {
    requirePermission(session.member.role, 'staff.manage');
    const supabase = createAdminClient();
    const orgId = session.organization.id;

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
      user_id: session.user.id,
      action: 'updated',
      resource_type: 'organization_member',
      resource_id: memberId,
      details: { previous_status: targetMember.status, new_status: status },
    });

    return updated;
  }
}
