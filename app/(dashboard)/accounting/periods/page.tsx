'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface FinancialPeriod {
  id: string;
  period_name: string;
  fiscal_year: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked';
  is_closed: boolean;
  closed_at?: string;
  closed_by?: string;
  closing_notes?: string;
  reopened_at?: string;
  reopen_reason?: string;
}

export default function FinancialPeriodsPage() {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null);

  // Form states
  const [newPeriod, setNewPeriod] = useState({
    period_name: '',
    fiscal_year: '2024-25',
    start_date: '',
    end_date: '',
  });
  const [closeNotes, setCloseNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/periods');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch financial periods');
      }
      const data = await res.json();
      setPeriods(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPeriod),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create period');
      }
      setIsCreateOpen(false);
      setNewPeriod({ period_name: '', fiscal_year: '2024-25', start_date: '', end_date: '' });
      await fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedPeriod) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/periods/${selectedPeriod.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Period End Closing', notes: closeNotes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to close period');
      }
      setIsCloseOpen(false);
      setSelectedPeriod(null);
      setCloseNotes('');
      await fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedPeriod) return;
    if (!reopenReason.trim()) {
      alert('Please provide an audit explanation/reason for reopening this closed period.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/periods/${selectedPeriod.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reopen period');
      }
      setIsReopenOpen(false);
      setSelectedPeriod(null);
      setReopenReason('');
      await fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openCount = periods.filter((p) => p.status === 'open' || !p.is_closed).length;
  const closedCount = periods.filter((p) => p.status === 'closed' || p.is_closed).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Financial Periods & Year-End Closing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage fiscal cycles, lock historical transactions, and safeguard the general ledger.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Financial Period
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{periods.length}</div>
            <p className="text-xs text-slate-500 mt-1">Configured fiscal intervals</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Open Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{openCount}</div>
            <p className="text-xs text-emerald-600/80 mt-1">Accepting active postings</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Closed / Locked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{closedCount}</div>
            <p className="text-xs text-amber-600/80 mt-1">Transactions safeguarded</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Active Fiscal Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">FY 2024-25</div>
            <p className="text-xs text-blue-600/80 mt-1">01 Apr 2024 - 31 Mar 2025</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-sm">
        <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <div>
          <span className="font-semibold">Statutory Accounting Invariant:</span> When a financial period is closed, all sales, purchases, payments, and journal entries with posting dates falling into that period are strictly rejected to guarantee statutory audit integrity.
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Fiscal Calendar Schedule</span>
            <span className="text-xs font-normal text-slate-500">Sorted by posting timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading financial periods...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No financial periods configured yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Period Name</th>
                    <th className="px-6 py-3 font-semibold">Fiscal Year</th>
                    <th className="px-6 py-3 font-semibold">Date Range</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Audit Details</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periods.map((p) => {
                    const isClosed = p.status === 'closed' || p.is_closed;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                          {p.period_name}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                          {p.fiscal_year}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {p.start_date} <ArrowRight className="inline h-3 w-3 text-slate-400" /> {p.end_date}
                        </td>
                        <td className="px-6 py-4">
                          {isClosed ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 flex items-center gap-1 w-fit">
                              <Lock className="h-3 w-3" />
                              Closed
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              Open
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {isClosed ? (
                            <div>
                              <div>Closed: {p.closed_at ? new Date(p.closed_at).toLocaleDateString() : 'Yes'}</div>
                              {p.closing_notes && <div className="italic text-slate-400 truncate max-w-xs">{p.closing_notes}</div>}
                            </div>
                          ) : p.reopen_reason ? (
                            <div>
                              <div className="text-amber-600">Reopened: {p.reopened_at ? new Date(p.reopened_at).toLocaleDateString() : 'Yes'}</div>
                              <div className="italic text-slate-400 truncate max-w-xs">{p.reopen_reason}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {isClosed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPeriod(p);
                                setIsReopenOpen(true);
                              }}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50 h-8"
                            >
                              <Unlock className="h-3.5 w-3.5 mr-1" />
                              Reopen
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPeriod(p);
                                setIsCloseOpen(true);
                              }}
                              className="text-slate-700 hover:bg-slate-100 h-8"
                            >
                              <Lock className="h-3.5 w-3.5 mr-1 text-amber-600" />
                              Close Period
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Create Period */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Financial Period</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Period Name (e.g. October 2024 / Q3 FY25)
                </label>
                <Input
                  required
                  value={newPeriod.period_name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period_name: e.target.value })}
                  placeholder="October 2024"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Fiscal Year
                </label>
                <Input
                  required
                  value={newPeriod.fiscal_year}
                  onChange={(e) => setNewPeriod({ ...newPeriod, fiscal_year: e.target.value })}
                  placeholder="2024-25"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {actionLoading ? 'Creating...' : 'Create Period'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Period */}
      {isCloseOpen && selectedPeriod && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Lock className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Close Period: {selectedPeriod.period_name}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Closing this period will lock all accounts and prevent new sales, purchases, or ledger entries dated between{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedPeriod.start_date}</span> and{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedPeriod.end_date}</span>.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Closing Notes / Audit Reference (Optional)
              </label>
              <Input
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Year-end reconciliation finalized"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCloseOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleClose}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {actionLoading ? 'Closing...' : 'Confirm & Close Period'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reopen Period */}
      {isReopenOpen && selectedPeriod && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Reopen Closed Period: {selectedPeriod.period_name}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Reopening a closed period allows retrospective edits. For regulatory and audit compliance, you must state a mandatory reason.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Mandatory Reason for Reopening *
              </label>
              <Input
                required
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Statutory auditor adjustment entry required"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsReopenOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReopen}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? 'Reopening...' : 'Confirm Reopen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
