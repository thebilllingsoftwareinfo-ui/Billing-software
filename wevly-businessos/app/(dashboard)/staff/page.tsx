'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Shield, CheckCircle, Clock, AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteStaffModal } from '@/components/staff/invite-staff-modal';
import { OrgRole, MemberStatus } from '@/types/app.types';

interface StaffMember {
  id: string;
  user_id: string;
  role: OrgRole;
  status: MemberStatus;
  created_at: string;
}

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to fetch staff members');
      }

      const json = await res.json();
      setMembers(json.data || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching staff team members');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    try {
      const res = await fetch(`/api/staff/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to update role');
      }

      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusToggle = async (memberId: string, currentStatus: MemberStatus) => {
    const nextStatus: MemberStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/staff/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to update status');
      }

      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Staff Management & Access Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage organization team members, assign granular RBAC roles, and enforce server-side security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStaff} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff Member
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Staff Members Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">Team Members ({members.length})</h2>
          <span className="text-xs text-gray-500 font-medium">Server-side authorization enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-100/70 border-b text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3">Member ID</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No staff members found in this organization.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                      {member.id}
                    </td>

                    <td className="px-6 py-4">
                      {member.role === 'owner' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold text-[11px]">
                          <Shield className="w-3 h-3 text-purple-600" />
                          OWNER
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                          className="h-7 text-xs font-semibold border border-gray-300 rounded-md px-2 bg-white text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="manager">MANAGER</option>
                          <option value="sales">SALES</option>
                          <option value="inventory">INVENTORY</option>
                          <option value="accountant">ACCOUNTANT</option>
                          <option value="staff">STAFF</option>
                        </select>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {member.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                      {member.status === 'invited' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px]">
                          <Clock className="w-3 h-3" />
                          Invited
                        </span>
                      )}
                      {member.status === 'suspended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold text-[11px]">
                          <AlertOctagon className="w-3 h-3" />
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-500">
                      {new Date(member.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(member.id, member.status)}
                          className={
                            member.status === 'active'
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs'
                          }
                        >
                          {member.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteStaffModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchStaff}
      />
    </div>
  );
}
