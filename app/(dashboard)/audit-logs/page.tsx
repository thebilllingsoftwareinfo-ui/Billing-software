'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Filter, Search, Calendar, ChevronLeft, ChevronRight, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (resourceType) params.set('resourceType', resourceType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to fetch audit logs');
      }

      const json = await res.json();
      setLogs(json.data?.logs || []);
      setTotalCount(json.data?.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching audit log records');
    } finally {
      setIsLoading(false);
    }
  }, [action, resourceType, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const getActionBadge = (act: string) => {
    switch (act) {
      case 'created':
      case 'invoice.created':
      case 'payment.created':
      case 'customer.created':
      case 'product.created':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">CREATED</span>;
      case 'finalized':
      case 'invoice.finalized':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">FINALIZED</span>;
      case 'cancelled':
      case 'invoice.cancelled':
        return <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[11px]">CANCELLED</span>;
      case 'paid':
      case 'payment.modified':
        return <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px]">PAYMENT</span>;
      case 'login':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-bold text-[11px]">LOGIN</span>;
      case 'logout':
        return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold text-[11px]">LOGOUT</span>;
      case 'role_changed':
      case 'permission_changed':
      case 'invited':
        return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">RBAC</span>;
      case 'setting_changed':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">SETTINGS</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-bold text-[11px] uppercase">{act}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Audit Logging Command Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable, append-only security audit trail recording all system operations, auth events, and data changes.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <Lock className="w-4 h-4 text-amber-600" />
          Immutable Append-Only Ledger (Read-Only)
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 font-medium">Action:</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-8 border border-gray-300 rounded-md px-2 bg-white font-medium text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="finalized">Finalized</option>
            <option value="cancelled">Cancelled</option>
            <option value="paid">Paid</option>
            <option value="invited">Invited</option>
            <option value="role_changed">Role Changed</option>
            <option value="setting_changed">Setting Changed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 font-medium">Entity:</span>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="h-8 border border-gray-300 rounded-md px-2 bg-white font-medium text-gray-800 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">All Entities</option>
            <option value="invoice">Invoices</option>
            <option value="payment">Payments</option>
            <option value="customer">Customers</option>
            <option value="product">Products</option>
            <option value="stock_movement">Stock Movements</option>
            <option value="organization_member">Staff Members</option>
            <option value="organization">Organization Settings</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-6 bg-transparent border-0 text-gray-700 font-medium focus:ring-0"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-6 bg-transparent border-0 text-gray-700 font-medium focus:ring-0"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / User ID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50/60 transition-colors font-medium">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="px-4 py-3 font-mono text-gray-900">
                        {log.user_id}
                      </td>

                      <td className="px-4 py-3">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="px-4 py-3 font-mono text-gray-700">
                        {log.resource_type}
                      </td>

                      <td className="px-4 py-3 font-mono text-gray-600">
                        {log.resource_id}
                      </td>

                      <td className="px-4 py-3 text-gray-500 font-mono">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Metadata
                        </Button>
                      </td>
                    </tr>

                    {/* Metadata JSON Drawer */}
                    {expandedLogId === log.id && (
                      <tr className="bg-gray-50/80">
                        <td colSpan={7} className="p-4 border-y">
                          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                            <div className="text-slate-400 font-semibold mb-1">// Metadata Details</div>
                            <pre>{JSON.stringify({ old_values: log.old_values, new_values: log.new_values }, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
            <div>
              Showing <span className="font-semibold text-gray-800">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-gray-800">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-gray-800">{totalCount}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(page - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(page + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
