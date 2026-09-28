'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  Building,
  Landmark,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/currency';

interface CashFlowStatement {
  operating_activities: {
    customer_receipts: number;
    supplier_payments: number;
    operating_expenses: number;
    tax_payments: number;
    net_operating_cash: number;
  };
  investing_activities: {
    fixed_asset_purchases: number;
    fixed_asset_sales: number;
    net_investing_cash: number;
  };
  financing_activities: {
    capital_injections: number;
    drawings_dividends: number;
    loan_proceeds: number;
    loan_repayments: number;
    net_financing_cash: number;
  };
  opening_cash_balance: number;
  net_change_in_cash: number;
  closing_cash_balance: number;
  from_date: string;
  to_date: string;
}

export default function CashFlowPage() {
  const [statement, setStatement] = useState<CashFlowStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState('2024-04-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchCashFlow = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/cash-flow?from_date=${fromDate}&to_date=${toDate}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch cash flow statement');
      }
      const data = await res.json();
      setStatement(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchCashFlow();
  }, [fetchCashFlow]);

  const exportCSV = () => {
    if (!statement) return;
    const lines = [
      ['Cash Flow Statement', `${statement.from_date} to ${statement.to_date}`],
      [],
      ['1. Cash Flows from Operating Activities', ''],
      ['Cash receipts from customers', statement.operating_activities.customer_receipts],
      ['Cash paid to suppliers', -statement.operating_activities.supplier_payments],
      ['Cash paid for operating expenses', -statement.operating_activities.operating_expenses],
      ['Taxes paid', -statement.operating_activities.tax_payments],
      ['Net Cash from Operating Activities', statement.operating_activities.net_operating_cash],
      [],
      ['2. Cash Flows from Investing Activities', ''],
      ['Capital asset purchases', -statement.investing_activities.fixed_asset_purchases],
      ['Sale of capital assets', statement.investing_activities.fixed_asset_sales],
      ['Net Cash from Investing Activities', statement.investing_activities.net_investing_cash],
      [],
      ['3. Cash Flows from Financing Activities', ''],
      ['Capital injections', statement.financing_activities.capital_injections],
      ['Drawings & dividends', -statement.financing_activities.drawings_dividends],
      ['Loan proceeds', statement.financing_activities.loan_proceeds],
      ['Loan principal repayments', -statement.financing_activities.loan_repayments],
      ['Net Cash from Financing Activities', statement.financing_activities.net_financing_cash],
      [],
      ['Opening Cash & Bank Balance', statement.opening_cash_balance],
      ['Net Change in Cash', statement.net_change_in_cash],
      ['Closing Cash & Bank Balance', statement.closing_cash_balance],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cash_Flow_Statement_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const op = statement?.operating_activities || {
    customer_receipts: 0,
    supplier_payments: 0,
    operating_expenses: 0,
    tax_payments: 0,
    net_operating_cash: 0,
  };
  const inv = statement?.investing_activities || {
    fixed_asset_purchases: 0,
    fixed_asset_sales: 0,
    net_investing_cash: 0,
  };
  const fin = statement?.financing_activities || {
    capital_injections: 0,
    drawings_dividends: 0,
    loan_proceeds: 0,
    loan_repayments: 0,
    net_financing_cash: 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Cash Flow Statement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multi-tier statement tracking Operating, Investing, and Financing cash movements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-36 h-9"
          />
          <span className="text-slate-400 text-xs">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-36 h-9"
          />
          <Button
            onClick={exportCSV}
            variant="outline"
            className="flex items-center gap-2 h-9 text-slate-700 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              Net Operating Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                op.net_operating_cash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(op.net_operating_cash)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Core business generation</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-purple-500" />
              Net Investing Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                inv.net_investing_cash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(inv.net_investing_cash)}
            </div>
            <p className="text-xs text-slate-500 mt-1">CapEx and asset activities</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-amber-500" />
              Net Financing Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                fin.net_financing_cash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(fin.net_financing_cash)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Capital and loan facilities</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 dark:border-indigo-950 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Closing Cash in Hand & Bank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {formatCurrency(statement?.closing_cash_balance || 0)}
            </div>
            <p className="text-xs text-indigo-600/80 mt-1">
              Net Change: {formatCurrency(statement?.net_change_in_cash || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Statement Breakdown */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Calculating cash flow statement...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500">{error}</div>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Operating */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  1. Cash Flows from Operating Activities
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm mt-2">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Cash receipts from customers</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(op.customer_receipts)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Cash paid to suppliers</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(op.supplier_payments)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Cash paid for operating expenses</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(op.operating_expenses)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Taxes and statutory dues paid</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(op.tax_payments)}
                    </span>
                  </div>
                  <div className="py-3 flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-900/60 px-3 rounded">
                    <span className="text-slate-900 dark:text-slate-100">Net Cash Provided by Operating Activities</span>
                    <span
                      className={`font-mono text-base ${
                        op.net_operating_cash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(op.net_operating_cash)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Investing */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-500" />
                  2. Cash Flows from Investing Activities
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm mt-2">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Purchase of property, plant, & equipment</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(inv.fixed_asset_purchases)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Proceeds from sale of equipment</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inv.fixed_asset_sales)}
                    </span>
                  </div>
                  <div className="py-3 flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-900/60 px-3 rounded">
                    <span className="text-slate-900 dark:text-slate-100">Net Cash Used in Investing Activities</span>
                    <span
                      className={`font-mono text-base ${
                        inv.net_investing_cash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(inv.net_investing_cash)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Financing */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 pb-2 border-b flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-amber-500" />
                  3. Cash Flows from Financing Activities
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm mt-2">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Capital injections by owners</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(fin.capital_injections)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Owner drawings & dividends</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(fin.drawings_dividends)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Proceeds from bank loans & borrowings</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(fin.loan_proceeds)}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Principal repayment of borrowings</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(fin.loan_repayments)}
                    </span>
                  </div>
                  <div className="py-3 flex justify-between items-center font-bold bg-slate-50 dark:bg-slate-900/60 px-3 rounded">
                    <span className="text-slate-900 dark:text-slate-100">Net Cash from Financing Activities</span>
                    <span
                      className={`font-mono text-base ${
                        fin.net_financing_cash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(fin.net_financing_cash)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Cash Flow Summary Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 font-mono text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Opening Cash & Cash Equivalents</span>
                  <span>{formatCurrency(statement?.opening_cash_balance || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Net Increase / (Decrease) in Cash</span>
                  <span
                    className={
                      (statement?.net_change_in_cash || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {formatCurrency(statement?.net_change_in_cash || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-base font-bold">
                  <span className="text-indigo-300">Closing Cash & Cash Equivalents</span>
                  <span className="text-indigo-400">{formatCurrency(statement?.closing_cash_balance || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
