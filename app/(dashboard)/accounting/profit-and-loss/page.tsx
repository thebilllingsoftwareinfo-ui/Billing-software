'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Calendar,
  Printer,
  Download,
  RefreshCw,
  ArrowUpRight,
  TrendingDown,
  DollarSign,
  PieChart,
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

interface ProfitAndLossResponse {
  period: {
    start_date?: string;
    end_date?: string;
  };
  income: {
    operating_income: StatementLine[];
    other_income: StatementLine[];
    total: number;
  };
  expenses: {
    cogs: StatementLine[];
    operating_expenses: StatementLine[];
    total: number;
  };
  gross_profit: number;
  net_profit: number;
}

export default function ProfitAndLossPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<ProfitAndLossResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPnL = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/accounting/profit-and-loss?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        toast.error(json.error || 'Failed to fetch Profit & Loss statement');
      }
    } catch (err) {
      console.error('Error fetching P&L:', err);
      toast.error('Failed to load P&L statement');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[][] = [
      ['Profit & Loss Statement'],
      [`Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`],
      [],
      ['REVENUE / INCOME'],
      ['Account Code', 'Account Name', 'Amount (₹)'],
    ];

    data.income.operating_income.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    data.income.other_income.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    rows.push(['TOTAL INCOME', '', String(data.income.total)]);
    rows.push([]);

    rows.push(['COST OF GOODS / PURCHASES']);
    data.expenses.cogs.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    rows.push(['GROSS PROFIT', '', String(data.gross_profit)]);
    rows.push([]);

    rows.push(['OPERATING EXPENSES']);
    data.expenses.operating_expenses.forEach(l => rows.push([l.account_code, l.account_name, String(l.amount)]));
    rows.push(['TOTAL EXPENSES', '', String(data.expenses.total)]);
    rows.push([]);

    rows.push(['NET PROFIT / LOSS', '', String(data.net_profit)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `profit_and_loss_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('P&L CSV downloaded');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profit & Loss</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Income Statement
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Summary of revenues, cost of sales, and operating expenses over the chosen financial period.
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
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">From:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px] text-sm"
          />
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">To:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px] text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPnL}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Apply Filter
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-medium text-gray-500">Total Revenue / Income</span>
            <div className="mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600 block">
                {formatCurrency(data.income.total)}
              </span>
              <span className="text-xs text-gray-500">Sales & Other Income</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-medium text-gray-500">Cost of Goods / Purchases</span>
            <div className="mt-1">
              <span className="text-2xl font-bold font-mono text-amber-600 block">
                {formatCurrency(data.expenses.cogs.reduce((s, c) => s + c.amount, 0))}
              </span>
              <span className="text-xs text-gray-500">Direct Cost of Sales</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <span className="text-xs font-medium text-gray-500">Operating Expenses</span>
            <div className="mt-1">
              <span className="text-2xl font-bold font-mono text-rose-600 block">
                {formatCurrency(data.expenses.operating_expenses.reduce((s, c) => s + c.amount, 0))}
              </span>
              <span className="text-xs text-gray-500">Rent, Salary, Utilities, etc.</span>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border shadow-sm ${
              data.net_profit >= 0
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-rose-50/60 border-rose-200'
            }`}
          >
            <span
              className={`text-xs font-medium ${
                data.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              Net Profit / (Loss)
            </span>
            <div className="mt-1">
              <span
                className={`text-2xl font-bold font-mono block ${
                  data.net_profit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {formatCurrency(data.net_profit)}
              </span>
              <span
                className={`text-xs ${
                  data.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {data.net_profit >= 0 ? 'Profitable period' : 'Net deficit'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed P&L Financial Statement Tables */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Calculating income statement...</span>
          </div>
        ) : !data ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No statement data available.
          </div>
        ) : (
          <div className="divide-y">
            {/* 1. Operating Income Section */}
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                1. Revenue / Operating Income
              </h3>
              <Table>
                <TableBody>
                  {data.income.operating_income.map((item) => (
                    <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                      <TableCell className="w-[15%] font-mono text-xs text-indigo-600">
                        {item.account_code}
                      </TableCell>
                      <TableCell className="w-[65%]">
                        <Link
                          href={`/accounting/general-ledger?accountId=${item.account_id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1.5"
                        >
                          {item.account_name}
                          <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                        </Link>
                      </TableCell>
                      <TableCell className="w-[20%] text-right font-mono font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.income.other_income.length > 0 && (
                    <>
                      <TableRow className="bg-gray-50/50">
                        <TableCell colSpan={3} className="text-xs font-semibold text-gray-500 uppercase">
                          Other Income
                        </TableCell>
                      </TableRow>
                      {data.income.other_income.map((item) => (
                        <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                          <TableCell className="font-mono text-xs text-indigo-600">
                            {item.account_code}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/accounting/general-ledger?accountId=${item.account_id}`}
                              className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1.5"
                            >
                              {item.account_name}
                              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-gray-900">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                  <TableRow className="bg-emerald-50/40 font-bold border-t">
                    <TableCell colSpan={2} className="text-emerald-950">Total Income</TableCell>
                    <TableCell className="text-right font-mono text-emerald-800 text-base">
                      {formatCurrency(data.income.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* 2. Cost of Sales / COGS */}
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                2. Cost of Sales / Purchases
              </h3>
              <Table>
                <TableBody>
                  {data.expenses.cogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-gray-400 py-2">
                        No direct cost of sales recorded in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.expenses.cogs.map((item) => (
                      <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                        <TableCell className="w-[15%] font-mono text-xs text-indigo-600">
                          {item.account_code}
                        </TableCell>
                        <TableCell className="w-[65%]">
                          <Link
                            href={`/accounting/general-ledger?accountId=${item.account_id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            {item.account_name}
                            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                          </Link>
                        </TableCell>
                        <TableCell className="w-[20%] text-right font-mono font-medium text-gray-900">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-amber-50/40 font-bold border-t">
                    <TableCell colSpan={2} className="text-amber-950">Gross Profit (Total Income - COGS)</TableCell>
                    <TableCell className="text-right font-mono text-amber-900 text-base">
                      {formatCurrency(data.gross_profit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* 3. Operating Expenses */}
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                3. Operating Expenses
              </h3>
              <Table>
                <TableBody>
                  {data.expenses.operating_expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-gray-400 py-2">
                        No operating expenses recorded in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.expenses.operating_expenses.map((item) => (
                      <TableRow key={item.account_id} className="hover:bg-gray-50/50">
                        <TableCell className="w-[15%] font-mono text-xs text-indigo-600">
                          {item.account_code}
                        </TableCell>
                        <TableCell className="w-[65%]">
                          <Link
                            href={`/accounting/general-ledger?accountId=${item.account_id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            {item.account_name}
                            <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                          </Link>
                        </TableCell>
                        <TableCell className="w-[20%] text-right font-mono font-medium text-gray-900">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-rose-50/40 font-bold border-t">
                    <TableCell colSpan={2} className="text-rose-950">Total Operating Expenses</TableCell>
                    <TableCell className="text-right font-mono text-rose-900 text-base">
                      {formatCurrency(data.expenses.operating_expenses.reduce((s, c) => s + c.amount, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* 4. Net Profit / Loss Final Summary */}
            <div className="p-4 sm:p-6 bg-gray-50/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500 block">Final Result</span>
                <span className="text-xl font-bold text-gray-900">Net Profit / (Loss)</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xl font-bold font-mono ${
                    data.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(data.net_profit)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
