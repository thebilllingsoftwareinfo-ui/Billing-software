'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Scale,
  Calendar,
  Printer,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

interface TrialBalanceAccount {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  debit_balance: number;
  credit_balance: number;
}

interface TrialBalanceResponse {
  as_of_date: string;
  accounts: TrialBalanceAccount[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  difference: number;
}

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrialBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOfDate) params.append('asOfDate', asOfDate);

      const res = await fetch(`/api/accounting/trial-balance?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        toast.error(json.error || 'Failed to fetch trial balance');
      }
    } catch (err) {
      console.error('Error fetching trial balance:', err);
      toast.error('Failed to load trial balance');
    } finally {
      setIsLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchTrialBalance();
  }, [fetchTrialBalance]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || !data.accounts.length) {
      toast.info('No accounts to export');
      return;
    }

    const headers = ['Account Code', 'Account Name', 'Type', 'Debit (₹)', 'Credit (₹)'];
    const rows = data.accounts.map((a) => [
      a.account_code,
      `"${a.account_name.replace(/"/g, '""')}"`,
      a.account_type,
      a.debit_balance,
      a.credit_balance,
    ]);
    rows.push(['TOTAL', '', '', data.total_debit, data.total_credit]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trial_balance_${asOfDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Trial balance CSV downloaded');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trial Balance</h1>
            {data && (
              <Badge
                variant="outline"
                className={
                  data.is_balanced
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }
              >
                {data.is_balanced ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> In Balance
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Out of Balance ({formatCurrency(data.difference)})
                  </span>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Summary of all account closing balances. Total debits must equal total credits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="print:hidden">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">As of Date:</label>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-[160px] text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrialBalance}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Update
          </Button>
        </div>

        {data && (
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-gray-500">
              Total Accounts: <strong className="text-gray-900">{data.accounts.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="w-[15%] font-semibold text-gray-700">Account Code</TableHead>
              <TableHead className="w-[45%] font-semibold text-gray-700">Account Name</TableHead>
              <TableHead className="w-[15%] font-semibold text-gray-700">Type</TableHead>
              <TableHead className="w-[12.5%] font-semibold text-gray-700 text-right">Debit Balance (₹)</TableHead>
              <TableHead className="w-[12.5%] font-semibold text-gray-700 text-right">Credit Balance (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Calculating trial balance...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : !data || data.accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-gray-400">
                  No accounts with balances found for this date.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.accounts.map((acc) => (
                  <TableRow key={acc.account_id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-mono text-sm font-semibold text-indigo-600">
                      {acc.account_code}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/accounting/general-ledger?accountId=${acc.account_id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 hover:underline flex items-center gap-1.5"
                      >
                        {acc.account_name}
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-gray-400" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                        {acc.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-gray-900">
                      {acc.debit_balance > 0 ? formatCurrency(acc.debit_balance) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-gray-900">
                      {acc.credit_balance > 0 ? formatCurrency(acc.credit_balance) : '—'}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Invariant Balanced Totals Row */}
                <TableRow className="bg-gray-100/90 font-bold border-t-2 border-gray-300">
                  <TableCell colSpan={3} className="text-gray-900 text-base">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono text-indigo-900 text-base">
                    {formatCurrency(data.total_debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-indigo-900 text-base">
                    {formatCurrency(data.total_credit)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Invariant Banner */}
      {data && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            data.is_balanced
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {data.is_balanced ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {data.is_balanced
                  ? 'Double-Entry Invariant Satisfied: Total Debits equal Total Credits'
                  : 'Double-Entry Invariant Violated: Out of balance!'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {data.is_balanced
                  ? `Both sides total ${formatCurrency(data.total_debit)}. All posted journals balance.`
                  : `Debit = ${formatCurrency(data.total_debit)}, Credit = ${formatCurrency(data.total_credit)}, Discrepancy = ${formatCurrency(data.difference)}`}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-sm">
            {data.is_balanced ? 'Δ ₹0.00' : `Δ ${formatCurrency(data.difference)}`}
          </span>
        </div>
      )}
    </div>
  );
}
