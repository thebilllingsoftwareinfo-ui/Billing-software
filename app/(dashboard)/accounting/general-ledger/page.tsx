'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Search,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Printer,
  Download,
  RefreshCw,
  Eye,
  Layers,
  FileSpreadsheet,
  CheckCircle2
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

interface AccountOption {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface LedgerTransaction {
  id: string;
  entry_id: string;
  entry_number: string;
  date: string;
  description: string;
  reference_type?: string;
  reference_number?: string;
  debit: number;
  credit: number;
  running_balance: number;
}

interface LedgerResponse {
  account: {
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
    normal_balance: string;
  };
  period: {
    start_date?: string;
    end_date?: string;
  };
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  transactions: LedgerTransaction[];
}

export default function GeneralLedgerPage() {
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get('accountId') || '';

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch accounts list
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounting/accounts');
      const data = await res.json();
      if (res.ok) {
        const accs = data.accounts || [];
        setAccounts(accs);
        if (!selectedAccountId && accs.length > 0) {
          setSelectedAccountId(accs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts for ledger:', err);
    }
  }, [selectedAccountId]);

  // Fetch ledger data
  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ accountId: selectedAccountId });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/accounting/ledger?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLedgerData(data);
      } else {
        toast.error(data.error || 'Failed to load general ledger');
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
      toast.error('Failed to load ledger data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, startDate, endDate]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger();
    }
  }, [selectedAccountId, fetchLedger]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!ledgerData || !ledgerData.transactions.length) {
      toast.info('No transaction data to export');
      return;
    }

    const headers = ['Date', 'Entry #', 'Description', 'Reference', 'Debit', 'Credit', 'Running Balance'];
    const rows = ledgerData.transactions.map((t) => [
      t.date,
      t.entry_number,
      `"${t.description.replace(/"/g, '""')}"`,
      t.reference_number || '',
      t.debit,
      t.credit,
      t.running_balance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledger_${ledgerData.account.account_code}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV downloaded');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">General Ledger</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Account Activity
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Audit individual account movements, opening and closing balances, and running totals.
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

      {/* Filter / Account Selection Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm print:hidden">
        <div className="flex flex-1 items-center gap-3 w-full">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Account:</label>
          <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || '')}>
            <SelectTrigger className="w-full md:w-[320px] bg-gray-50/50">
              <SelectValue placeholder="Select an account..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  <span className="font-mono text-indigo-600 font-semibold mr-2">{acc.account_code}</span>
                  {acc.account_name} ({acc.account_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs text-gray-500">From:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[140px] text-xs"
          />
          <label className="text-xs text-gray-500">To:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[140px] text-xs"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLedger}
            disabled={isLoading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Account Info and Summary Metric Cards */}
      {ledgerData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Account</span>
            <div className="mt-1">
              <span className="font-bold text-gray-900 text-lg block">{ledgerData.account.account_name}</span>
              <span className="font-mono text-xs text-indigo-600">{ledgerData.account.account_code} • {ledgerData.account.account_type}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Opening Balance</span>
            <div className="mt-1">
              <span className="font-bold text-gray-900 text-lg block">
                {formatCurrency(Math.abs(ledgerData.opening_balance))}
              </span>
              <span className="text-xs text-gray-500">
                {ledgerData.opening_balance >= 0 ? 'Debit balance' : 'Credit balance'}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-medium text-gray-500 block">Period Movement</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs text-emerald-600 font-semibold font-mono">
                +{formatCurrency(ledgerData.total_debit)} Dr
              </span>
              <span className="text-xs text-rose-600 font-semibold font-mono">
                -{formatCurrency(ledgerData.total_credit)} Cr
              </span>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <span className="text-xs font-medium text-indigo-600 block">Closing Balance</span>
            <div className="mt-1">
              <span className="font-bold text-indigo-950 text-xl block">
                {formatCurrency(Math.abs(ledgerData.closing_balance))}
              </span>
              <span className="text-xs text-indigo-700 font-medium">
                {ledgerData.closing_balance >= 0 ? 'Dr (Normal)' : 'Cr'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Transactions Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-semibold text-gray-700">Date</TableHead>
              <TableHead className="font-semibold text-gray-700">Entry #</TableHead>
              <TableHead className="font-semibold text-gray-700">Description / Memo</TableHead>
              <TableHead className="font-semibold text-gray-700">Reference</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Debit</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Credit</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Running Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Loading ledger activity...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : !ledgerData ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-gray-500">
                  Select an account above to view transactions.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Opening Balance Row */}
                <TableRow className="bg-gray-50/50 font-medium border-b text-gray-600">
                  <TableCell colSpan={4} className="py-2.5">
                    Opening Balance
                  </TableCell>
                  <TableCell className="text-right py-2.5 font-mono">
                    {ledgerData.opening_balance > 0 ? formatCurrency(ledgerData.opening_balance) : '—'}
                  </TableCell>
                  <TableCell className="text-right py-2.5 font-mono">
                    {ledgerData.opening_balance < 0 ? formatCurrency(Math.abs(ledgerData.opening_balance)) : '—'}
                  </TableCell>
                  <TableCell className="text-right py-2.5 font-mono font-semibold text-gray-900">
                    {formatCurrency(ledgerData.opening_balance)}
                  </TableCell>
                </TableRow>

                {ledgerData.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-gray-400">
                      No journal activity recorded for this account during this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerData.transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                        {tx.date}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-indigo-600">
                          {tx.entry_number}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-800">{tx.description}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {tx.reference_number || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-900">
                        {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-900">
                        {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(tx.running_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* Closing Balance Row */}
                <TableRow className="bg-indigo-50/30 font-bold border-t-2 border-indigo-200">
                  <TableCell colSpan={4} className="py-3 text-indigo-900">
                    Closing Balance as of {endDate || 'Today'}
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono text-gray-900">
                    {formatCurrency(ledgerData.total_debit)}
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono text-gray-900">
                    {formatCurrency(ledgerData.total_credit)}
                  </TableCell>
                  <TableCell className="text-right py-3 font-mono text-indigo-700 text-base">
                    {formatCurrency(ledgerData.closing_balance)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
