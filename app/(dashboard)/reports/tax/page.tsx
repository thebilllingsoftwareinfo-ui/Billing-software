'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/currency';

interface TaxComplianceSummary {
  output_gst: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  input_tax_credit: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  net_tax_payable: number;
  net_itc_balance: number;
  rate_breakdown: Array<{
    rate: number;
    taxable_amount: number;
    output_tax: number;
    input_tax: number;
  }>;
}

interface TaxPeriod {
  id: string;
  period_name: string;
  period_type: 'monthly' | 'quarterly';
  start_date: string;
  end_date: string;
  status: 'draft' | 'reviewed' | 'finalized';
  filing_due_date: string;
  filing_date?: string;
  arn_number?: string;
  notes?: string;
}

export default function TaxCompliancePage() {
  const [summary, setSummary] = useState<TaxComplianceSummary | null>(null);
  const [taxPeriods, setTaxPeriods] = useState<TaxPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState('2024-04-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Finalize modal
  const [selectedPeriod, setSelectedPeriod] = useState<TaxPeriod | null>(null);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizeNotes, setFinalizeNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, perRes] = await Promise.all([
        fetch(`/api/tax/gst-summary?from_date=${fromDate}&to_date=${toDate}`),
        fetch(`/api/tax/filing-periods`),
      ]);

      if (!sumRes.ok) {
        const err = await sumRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch tax summary');
      }

      const sumData = await sumRes.json();
      const perData = perRes.ok ? await perRes.json() : { data: [] };

      setSummary(sumData.data);
      setTaxPeriods(perData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFinalize = async () => {
    if (!selectedPeriod) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tax/filing-periods/${selectedPeriod.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: finalizeNotes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to finalize tax period');
      }
      setIsFinalizeOpen(false);
      setSelectedPeriod(null);
      setFinalizeNotes('');
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const exportCSV = () => {
    if (!summary) return;
    const lines = [
      ['GST & Tax Compliance Summary', `${fromDate} to ${toDate}`],
      [],
      ['Component', 'CGST', 'SGST', 'IGST', 'Total'],
      [
        'Output GST (Sales)',
        summary.output_gst.cgst,
        summary.output_gst.sgst,
        summary.output_gst.igst,
        summary.output_gst.total,
      ],
      [
        'Input Tax Credit (Purchases)',
        summary.input_tax_credit.cgst,
        summary.input_tax_credit.sgst,
        summary.input_tax_credit.igst,
        summary.input_tax_credit.total,
      ],
      [],
      ['Net Tax Payable to Government', summary.net_tax_payable],
      ['Net ITC Carried Forward', summary.net_itc_balance],
      [],
      ['GST Rate-wise Breakdown'],
      ['GST Rate (%)', 'Taxable Turnover', 'Output GST', 'Input Tax Credit (ITC)'],
      ...summary.rate_breakdown.map((r) => [
        `${r.rate}%`,
        r.taxable_amount,
        r.output_tax,
        r.input_tax,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GST_Tax_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const outputTotal = summary?.output_gst.total || 0;
  const itcTotal = summary?.input_tax_credit.total || 0;
  const netPayable = summary?.net_tax_payable || 0;
  const netItc = summary?.net_itc_balance || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            GST & Tax Compliance Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reconcile Output GST liability against Input Tax Credit (ITC) and monitor statutory filing periods.
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
              <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
              Total Output Tax Liability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(outputTotal)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Collected on sales invoices</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              Eligible Input Tax Credit (ITC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(itcTotal)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Claimable on purchase bills</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Net GST Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {formatCurrency(netPayable)}
            </div>
            <p className="text-xs text-rose-600/80 mt-1">Cash/bank challan requirement</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              ITC Carried Forward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(netItc)}
            </div>
            <p className="text-xs text-blue-600/80 mt-1">Available for next filing cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Output Tax Breakdown */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Output GST (Sales Tax Liability)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Central GST (CGST)</span>
              <span className="font-mono font-medium">{formatCurrency(summary?.output_gst.cgst || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">State GST (SGST)</span>
              <span className="font-mono font-medium">{formatCurrency(summary?.output_gst.sgst || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Integrated GST (IGST)</span>
              <span className="font-mono font-medium">{formatCurrency(summary?.output_gst.igst || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t text-slate-900 dark:text-slate-100">
              <span>Total Output Tax</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatCurrency(outputTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ITC Breakdown */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Input Tax Credit (ITC - Purchases)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Eligible CGST ITC</span>
              <span className="font-mono font-medium text-emerald-600">{formatCurrency(summary?.input_tax_credit.cgst || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Eligible SGST ITC</span>
              <span className="font-mono font-medium text-emerald-600">{formatCurrency(summary?.input_tax_credit.sgst || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Eligible IGST ITC</span>
              <span className="font-mono font-medium text-emerald-600">{formatCurrency(summary?.input_tax_credit.igst || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t text-slate-900 dark:text-slate-100">
              <span>Total Eligible ITC</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(itcTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Breakdown Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
            GST Rate-Wise Turnover & Tax Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">GST Slab Rate</th>
                  <th className="px-6 py-3 font-semibold text-right">Taxable Turnover</th>
                  <th className="px-6 py-3 font-semibold text-right">Output GST Liability</th>
                  <th className="px-6 py-3 font-semibold text-right">Input Tax Credit (ITC)</th>
                  <th className="px-6 py-3 font-semibold text-right">Net Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(summary?.rate_breakdown || []).map((r) => {
                  const net = r.output_tax - r.input_tax;
                  return (
                    <tr key={r.rate} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {r.rate}% Slab
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(r.taxable_amount)}
                      </td>
                      <td className="px-6 py-4 text-right text-rose-600 dark:text-rose-400">
                        {formatCurrency(r.output_tax)}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(r.input_tax)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={net >= 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {net >= 0 ? `Payable: ${formatCurrency(net)}` : `Credit: ${formatCurrency(Math.abs(net))}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Filing Periods Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Statutory Tax Filing Periods</span>
            <span className="text-xs font-normal text-slate-500">GSTR-1 & GSTR-3B compliance cycles</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">Period Name</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Due Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Filing ARN / Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {taxPeriods.map((tp) => (
                  <tr key={tp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {tp.period_name}
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-600 dark:text-slate-400">
                      {tp.period_type}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {tp.filing_due_date}
                    </td>
                    <td className="px-6 py-4">
                      {tp.status === 'finalized' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Finalized / Filed
                        </Badge>
                      ) : tp.status === 'reviewed' ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 flex items-center gap-1 w-fit">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 flex items-center gap-1 w-fit">
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {tp.arn_number || tp.filing_date || 'Pending Filing'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {tp.status !== 'finalized' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPeriod(tp);
                            setIsFinalizeOpen(true);
                          }}
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          Finalize Return
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Finalize Tax Period */}
      {isFinalizeOpen && selectedPeriod && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Finalize Tax Return: {selectedPeriod.period_name}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Finalizing locks the statutory tax return figures for GSTR-1 and GSTR-3B filings.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Filing Notes / Portal ARN Reference
              </label>
              <Input
                value={finalizeNotes}
                onChange={(e) => setFinalizeNotes(e.target.value)}
                placeholder="e.g. ARN AA270924001239X Filed on GST portal"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFinalizeOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {actionLoading ? 'Finalizing...' : 'Confirm & Finalize Return'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
