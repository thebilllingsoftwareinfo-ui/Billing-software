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
  ShieldCheck,
  Layers
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

interface StatementLine {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

interface BalanceSheetResponse {
  as_of_date: string;
  assets: {
    current_assets: StatementLine[];
    fixed_assets: StatementLine[];
    total: number;
  };
  liabilities: {
    current_liabilities: StatementLine[];
    long_term_liabilities: StatementLine[];
    total: number;
  };
  equity: {
    capital: StatementLine[];
    retained_earnings: number;
    current_period_earnings: number;
    total: number;
  };
  total_liabilities_and_equity: number;
  is_balanced: boolean;
  difference: number;
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalanceSheet = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOfDate) params.append('asOfDate', asOfDate);

      const res = await fetch(`/api/accounting/balance-sheet?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        toast.error(json.error || 'Failed to fetch Balance Sheet');
      }
    } catch (err) {
      console.error('Error fetching balance sheet:', err);
      toast.error('Failed to load balance sheet');
    } finally {
      setIsLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [fetchBalanceSheet]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[][] = [
      ['Balance Sheet'],
      [`As of Date: ${asOfDate || 'Today'}`],
      [],
      ['ASSETS'],
      ['Account Code', 'Account Name', 'Amount (₹)'],
    ];

    data.assets.current_assets.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    data.assets.fixed_assets.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    rows.push(['TOTAL ASSETS', '', String(data.assets.total)]);
    rows.push([]);

    rows.push(['LIABILITIES']);
    data.liabilities.current_liabilities.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    data.liabilities.long_term_liabilities.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    rows.push(['TOTAL LIABILITIES', '', String(data.liabilities.total)]);
    rows.push([]);

    rows.push(['EQUITY']);
    data.equity.capital.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    rows.push(['RETAINED EARNINGS', '', String(data.equity.retained_earnings)]);
    rows.push(['CURRENT PERIOD EARNINGS', '', String(data.equity.current_period_earnings)]);
    rows.push(['TOTAL EQUITY', '', String(data.equity.total)]);
    rows.push([]);

    rows.push(['TOTAL LIABILITIES & EQUITY', '', String(data.total_liabilities_and_equity)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `balance_sheet_${asOfDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Balance sheet CSV downloaded');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Balance Sheet</h1>
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
                    <CheckCircle2 className="w-3.5 h-3.5" /> Balanced Equation
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
            Financial position representing Assets = Liabilities + Equity as of a specific date.
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
            onClick={fetchBalanceSheet}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Update
          </Button>
        </div>
      </div>

      {/* Fundamental Equation Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-indigo-600">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Assets</span>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-gray-900 block">
                {formatCurrency(data.assets.total)}
              </span>
              <span className="text-xs text-gray-500">Bank, Receivables, Inventory, Cash</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-amber-600">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Liabilities</span>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-gray-900 block">
                {formatCurrency(data.liabilities.total)}
              </span>
              <span className="text-xs text-gray-500">Payables, GST Output, Borrowings</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm border-l-4 border-l-emerald-600">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Equity</span>
            <div className="mt-2">
              <span className="text-2xl font-bold font-mono text-gray-900 block">
                {formatCurrency(data.equity.total)}
              </span>
              <span className="text-xs text-gray-500">Capital + Retained Earnings</span>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Assets on Left, Liabilities & Equity on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: ASSETS */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-indigo-50/50 border-b flex items-center justify-between">
              <h2 className="font-bold text-indigo-950 uppercase tracking-wider text-sm">Assets</h2>
              <span className="font-mono font-bold text-indigo-900">
                {data ? formatCurrency(data.assets.total) : '—'}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[20%]">Code</TableHead>
                  <TableHead className="w-[55%]">Account</TableHead>
                  <TableHead className="w-[25%] text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-gray-400">
                      Loading assets...
                    </TableCell>
                  </TableRow>
                ) : !data || data.assets.current_assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-gray-400">
                      No assets recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    <TableRow className="bg-gray-50/60">
                      <TableCell colSpan={3} className="text-xs font-bold text-gray-600 uppercase py-2">
                        Current Assets
                      </TableCell>
                    </TableRow>
                    {data.assets.current_assets.map((item) => (
                      <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                        <TableCell className="font-mono text-xs text-indigo-600">
                          {item.account_code}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounting/general-ledger?accountId=${item.account_id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1"
                          >
                            {item.account_name}
                            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-900">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {data.assets.fixed_assets.length > 0 && (
                      <>
                        <TableRow className="bg-gray-50/60">
                          <TableCell colSpan={3} className="text-xs font-bold text-gray-600 uppercase py-2">
                            Non-Current / Fixed Assets
                          </TableCell>
                        </TableRow>
                        {data.assets.fixed_assets.map((item) => (
                          <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                            <TableCell className="font-mono text-xs text-indigo-600">
                              {item.account_code}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/accounting/general-ledger?accountId=${item.account_id}`}
                                className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1"
                              >
                                {item.account_name}
                                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-mono text-gray-900">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 bg-gray-50 border-t flex items-center justify-between font-bold">
            <span className="text-gray-900">Total Assets</span>
            <span className="font-mono text-indigo-900 text-lg">
              {data ? formatCurrency(data.assets.total) : '₹0.00'}
            </span>
          </div>
        </div>

        {/* RIGHT: LIABILITIES & EQUITY */}
        <div className="space-y-6">
          {/* Liabilities Section */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-amber-50/50 border-b flex items-center justify-between">
              <h2 className="font-bold text-amber-950 uppercase tracking-wider text-sm">Liabilities</h2>
              <span className="font-mono font-bold text-amber-900">
                {data ? formatCurrency(data.liabilities.total) : '—'}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[20%]">Code</TableHead>
                  <TableHead className="w-[55%]">Account</TableHead>
                  <TableHead className="w-[25%] text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-gray-400">
                      Loading liabilities...
                    </TableCell>
                  </TableRow>
                ) : !data || data.liabilities.current_liabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-gray-400">
                      No liabilities recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.liabilities.current_liabilities.map((item) => (
                    <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-indigo-600">
                        {item.account_code}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/accounting/general-ledger?accountId=${item.account_id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1"
                        >
                          {item.account_name}
                          <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-900">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="p-3 bg-gray-50 border-t flex items-center justify-between font-semibold text-sm">
              <span className="text-gray-700">Total Liabilities</span>
              <span className="font-mono text-amber-900">
                {data ? formatCurrency(data.liabilities.total) : '₹0.00'}
              </span>
            </div>
          </div>

          {/* Equity Section */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-emerald-50/50 border-b flex items-center justify-between">
              <h2 className="font-bold text-emerald-950 uppercase tracking-wider text-sm">Equity</h2>
              <span className="font-mono font-bold text-emerald-900">
                {data ? formatCurrency(data.equity.total) : '—'}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[20%]">Code</TableHead>
                  <TableHead className="w-[55%]">Account</TableHead>
                  <TableHead className="w-[25%] text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-gray-400">
                      Loading equity...
                    </TableCell>
                  </TableRow>
                ) : !data ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-gray-400">
                      No equity records.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {data.equity.capital.map((item) => (
                      <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                        <TableCell className="font-mono text-xs text-indigo-600">
                          {item.account_code}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounting/general-ledger?accountId=${item.account_id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1"
                          >
                            {item.account_name}
                            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-900">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-indigo-600">3030</TableCell>
                      <TableCell className="font-medium text-gray-900">
                        Retained Earnings / Opening Equity
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-900">
                        {formatCurrency(data.equity.retained_earnings)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-indigo-600">—</TableCell>
                      <TableCell className="font-medium text-gray-900">
                        Current Period Net Earnings
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-900">
                        {formatCurrency(data.equity.current_period_earnings)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
            <div className="p-3 bg-gray-50 border-t flex items-center justify-between font-semibold text-sm">
              <span className="text-gray-700">Total Equity</span>
              <span className="font-mono text-emerald-900">
                {data ? formatCurrency(data.equity.total) : '₹0.00'}
              </span>
            </div>
          </div>

          {/* Combined Liabilities + Equity Total Row */}
          <div className="bg-gray-100 p-4 rounded-xl border flex items-center justify-between font-bold text-base">
            <span className="text-gray-900">Total Liabilities & Equity</span>
            <span className="font-mono text-indigo-950 text-lg">
              {data ? formatCurrency(data.total_liabilities_and_equity) : '₹0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Fundamental Equation Invariant Banner */}
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
                  ? 'Fundamental Accounting Equation Satisfied: Assets = Liabilities + Equity'
                  : 'Fundamental Accounting Equation Unbalanced!'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                Assets ({formatCurrency(data.assets.total)}) = Liabilities ({formatCurrency(data.liabilities.total)}) + Equity ({formatCurrency(data.equity.total)})
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-sm">
            {data.is_balanced ? 'Δ ₹0.00' : `Difference: ${formatCurrency(data.difference)}`}
          </span>
        </div>
      )}
    </div>
  );
}
