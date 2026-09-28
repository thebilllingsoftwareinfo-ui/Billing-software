'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Download,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/currency';

interface ApBucket {
  total: number;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90_plus: number;
}

interface SupplierAging {
  supplier_id: string;
  supplier_name: string;
  buckets: ApBucket;
  bills_count: number;
}

export default function PayablesAgingPage() {
  const [agingData, setAgingData] = useState<{
    summary: ApBucket;
    suppliers: SupplierAging[];
    as_of_date: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchAging = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/payables?as_of_date=${asOfDate}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch AP aging report');
      }
      const data = await res.json();
      setAgingData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchAging();
  }, [fetchAging]);

  const exportCSV = () => {
    if (!agingData) return;
    const headers = ['Supplier Name', 'Total Due', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];
    const rows = agingData.suppliers.map((s) => [
      `"${s.supplier_name}"`,
      s.buckets.total,
      s.buckets.current,
      s.buckets.days1_30,
      s.buckets.days31_60,
      s.buckets.days61_90,
      s.buckets.days90_plus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AP_Aging_Report_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSuppliers = (agingData?.suppliers || []).filter((s) =>
    s.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  const summary = agingData?.summary || {
    total: 0,
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90_plus: 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Accounts Payable (AP) Ageing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor vendor commitments, cash-out schedules, and manage supplier payment terms effectively.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-40 h-9"
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
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Outstanding Payables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.total)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending vendor bills</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Current (Not Due)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(summary.current)}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1">Within agreed vendor credit terms</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              1–60 Days Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {formatCurrency(summary.days1_30 + summary.days31_60)}
            </div>
            <p className="text-xs text-amber-600/80 mt-1">Approaching late payment penalties</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              60+ Days Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {formatCurrency(summary.days61_90 + summary.days90_plus)}
            </div>
            <p className="text-xs text-rose-600/80 mt-1">Vendor credit hold risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Supplier Aging Breakdown
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier..."
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Calculating payables aging buckets...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500">{error}</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No supplier payables found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Supplier</th>
                    <th className="px-6 py-3 font-semibold text-right">Total Balance</th>
                    <th className="px-6 py-3 font-semibold text-right">Current</th>
                    <th className="px-6 py-3 font-semibold text-right">1–30 Days</th>
                    <th className="px-6 py-3 font-semibold text-right">31–60 Days</th>
                    <th className="px-6 py-3 font-semibold text-right">61–90 Days</th>
                    <th className="px-6 py-3 font-semibold text-right">90+ Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.supplier_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                        {s.supplier_name}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(s.buckets.total)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.buckets.current)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                        {formatCurrency(s.buckets.days1_30)}
                      </td>
                      <td className="px-6 py-4 text-right text-amber-600 dark:text-amber-400">
                        {formatCurrency(s.buckets.days31_60)}
                      </td>
                      <td className="px-6 py-4 text-right text-amber-700 dark:text-amber-500 font-medium">
                        {formatCurrency(s.buckets.days61_90)}
                      </td>
                      <td className="px-6 py-4 text-right text-rose-600 dark:text-rose-400 font-bold">
                        {formatCurrency(s.buckets.days90_plus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
