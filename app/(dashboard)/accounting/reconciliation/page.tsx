'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Plus,
  CheckCircle2,
  AlertCircle,
  Scale,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Ban,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/currency';

interface BankReconciliation {
  id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  reconciled_balance: number;
  status: 'draft' | 'completed' | 'abandoned';
  notes?: string;
  completed_at?: string;
  matches?: Array<{
    id: string;
    journal_entry_id?: string;
    matched_amount: number;
    transaction_date: string;
    reference_number?: string;
    notes?: string;
  }>;
}

export default function BankReconciliationPage() {
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [activeSession, setActiveSession] = useState<BankReconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New reconciliation modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    account_id: '1020',
    statement_date: new Date().toISOString().split('T')[0],
    statement_balance: '',
    book_balance: '1250000',
    notes: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Mock transactions for matching simulation
  const [sampleTxns, setSampleTxns] = useState([
    { id: 'tx-01', date: '2024-10-02', ref: 'NEFT-88321', desc: 'Customer Payment - Sharma Ltd', type: 'credit', amount: 150000, matched: true },
    { id: 'tx-02', date: '2024-10-05', ref: 'CHQ-00129', desc: 'Supplier Payment - Steel Works', type: 'debit', amount: 85000, matched: true },
    { id: 'tx-03', date: '2024-10-12', ref: 'UPI-99412', desc: 'Office Utility Bill', type: 'debit', amount: 4500, matched: true },
    { id: 'tx-04', date: '2024-10-18', ref: 'IMPS-2391', desc: 'Customer Advance - Verma Enterprises', type: 'credit', amount: 75000, matched: false },
    { id: 'tx-05', date: '2024-10-22', ref: 'CHQ-00130', desc: 'Warehouse Rent', type: 'debit', amount: 35000, matched: false },
  ]);

  const fetchReconciliations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounting/reconciliation');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch reconciliations');
      }
      const data = await res.json();
      const list = data.data || [];
      setReconciliations(list);
      if (list.length > 0 && !activeSession) {
        setActiveSession(list[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSession]);

  useEffect(() => {
    fetchReconciliations();
  }, [fetchReconciliations]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: newForm.account_id,
          statement_date: newForm.statement_date,
          statement_balance: Number(newForm.statement_balance) || 0,
          book_balance: Number(newForm.book_balance) || 0,
          notes: newForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create reconciliation session');
      }
      const created = await res.json();
      setIsNewOpen(false);
      setActiveSession(created.data);
      await fetchReconciliations();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTxMatch = (id: string) => {
    setSampleTxns((prev) =>
      prev.map((t) => (t.id === id ? { ...t, matched: !t.matched } : t))
    );
  };

  const handleCompleteReconciliation = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/reconciliation/${activeSession.id}/complete`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to complete reconciliation');
      }
      const data = await res.json();
      setActiveSession(data.data);
      await fetchReconciliations();
      alert('Bank Reconciliation completed and certified!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statementBalance = activeSession?.statement_balance ?? 1250000;
  const bookBalance = activeSession?.book_balance ?? 1250000;
  const difference = Math.abs(statementBalance - bookBalance);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Bank Reconciliation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare external bank statements with General Ledger book balances and reconcile discrepancies.
          </p>
        </div>
        <Button
          onClick={() => setIsNewOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Reconciliation Session
        </Button>
      </div>

      {/* Main Reconciliation Dashboard */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading bank reconciliation sessions...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Session Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-blue-500" />
                  Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">HDFC Bank (1020)</div>
                <p className="text-xs text-slate-500 mt-1">Statement Date: {activeSession?.statement_date || 'Current'}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Statement Ending Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(statementBalance)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Per bank statement</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  General Ledger Book Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(bookBalance)}
                </div>
                <p className="text-xs text-slate-500 mt-1">GL Account #1020 balance</p>
              </CardContent>
            </Card>

            <Card
              className={
                difference === 0
                  ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm'
                  : 'border-amber-200 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm'
              }
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                    difference === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {difference === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  Unreconciled Difference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    difference === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {formatCurrency(difference)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {difference === 0 ? 'Balanced to zero' : 'Requires line matching'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Ribbon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Status: {activeSession?.status?.toUpperCase() || 'DRAFT'}
                </span>
                <p className="text-xs text-slate-500">
                  Non-destructive audit protection: Marking items matched verifies clearing dates without altering canonical GL journals.
                </p>
              </div>
            </div>

            {activeSession?.status !== 'completed' && (
              <Button
                onClick={handleCompleteReconciliation}
                disabled={actionLoading || difference !== 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete & Lock Reconciliation
              </Button>
            )}
          </div>

          {/* Transaction Matcher Grid */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Book vs Bank Transactions</span>
                <span className="text-xs font-normal text-slate-500">Click row or checkbox to match/unmatch</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3 font-semibold w-12 text-center">Match</th>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Reference</th>
                      <th className="px-6 py-3 font-semibold">Description</th>
                      <th className="px-6 py-3 font-semibold text-right">Debit (Payment)</th>
                      <th className="px-6 py-3 font-semibold text-right">Credit (Receipt)</th>
                      <th className="px-6 py-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sampleTxns.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => toggleTxMatch(t.id)}
                        className={`cursor-pointer transition-colors ${
                          t.matched
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/30'
                        }`}
                      >
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={t.matched}
                            onChange={() => toggleTxMatch(t.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{t.date}</td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{t.ref}</td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{t.desc}</td>
                        <td className="px-6 py-4 text-right font-medium text-rose-600 dark:text-rose-400">
                          {t.type === 'debit' ? formatCurrency(t.amount) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {t.type === 'credit' ? formatCurrency(t.amount) : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {t.matched ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300">
                              Cleared
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300">
                              Uncleared
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: New Reconciliation Session */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Start Bank Reconciliation</h3>
            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Bank Account *
                </label>
                <select
                  value={newForm.account_id}
                  onChange={(e) => setNewForm({ ...newForm, account_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="1020">1020 - HDFC Current Account</option>
                  <option value="1021">1021 - State Bank of India</option>
                  <option value="1022">1022 - ICICI Working Capital</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Statement Cut-off Date *
                </label>
                <Input
                  type="date"
                  required
                  value={newForm.statement_date}
                  onChange={(e) => setNewForm({ ...newForm, statement_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Statement Ending Balance (₹) *
                </label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={newForm.statement_balance}
                  onChange={(e) => setNewForm({ ...newForm, statement_balance: e.target.value })}
                  placeholder="e.g. 1250000"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Reconciliation Notes
                </label>
                <Input
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="Monthly bank statement reconciliation"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {actionLoading ? 'Starting...' : 'Start Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
