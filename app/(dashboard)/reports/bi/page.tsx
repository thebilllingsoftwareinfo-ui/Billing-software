'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';

interface BiMetrics {
  kpis: {
    total_revenue: number;
    revenue_growth_pct: number;
    gross_profit: number;
    gross_margin_pct: number;
    net_profit: number;
    net_margin_pct: number;
    operating_cash_flow: number;
    working_capital: number;
    dso_days: number;
    dpo_days: number;
    cash_conversion_cycle_days: number;
  };
  monthly_trends: Array<{
    month: string;
    revenue: number;
    cogs: number;
    gross_profit: number;
    net_profit: number;
  }>;
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    recommended_action: string;
  }>;
  segmentation: {
    top_revenue_customers: Array<{ name: string; revenue: number; pct_of_total: number }>;
    top_margin_products: Array<{ name: string; margin_pct: number }>;
  };
}

export default function ExecutiveBiDashboardPage() {
  const [metrics, setMetrics] = useState<BiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/executive-bi');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch executive BI metrics');
      }
      const data = await res.json();
      setMetrics(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const kpis = metrics?.kpis || {
    total_revenue: 0,
    revenue_growth_pct: 0,
    gross_profit: 0,
    gross_margin_pct: 0,
    net_profit: 0,
    net_margin_pct: 0,
    operating_cash_flow: 0,
    working_capital: 0,
    dso_days: 0,
    dpo_days: 0,
    cash_conversion_cycle_days: 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Executive Business Intelligence & KPI Cockpit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time executive metrics, working capital cycle, margin health, and automated financial alerts.
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="flex items-center gap-2 h-9 text-slate-700 dark:text-slate-200"
        >
          <Download className="h-4 w-4" />
          Export Executive Brief
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Calculating executive BI intelligence...</div>
      ) : error ? (
        <div className="p-8 text-center text-rose-500">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards (Row 1) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Gross Revenue</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                    +{kpis.revenue_growth_pct.toFixed(1)}% YoY
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(kpis.total_revenue)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Total recognized sales turnover</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Gross Profit</span>
                  <span className="font-mono text-xs text-indigo-600 font-bold">{kpis.gross_margin_pct.toFixed(1)}% Margin</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(kpis.gross_profit)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Revenue minus COGS</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Net Operating Profit</span>
                  <span className="font-mono text-xs text-emerald-600 font-bold">{kpis.net_margin_pct.toFixed(1)}% Margin</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(kpis.net_profit)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Net of all opex & tax provisions</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Working Capital
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(kpis.working_capital)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Current Assets minus Current Liabilities</p>
              </CardContent>
            </Card>
          </div>

          {/* Working Capital & Cash Conversion Cycle (Row 2) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  Days Sales Outstanding (DSO)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(kpis.dso_days)} Days
                </div>
                <p className="text-xs text-slate-500 mt-1">Avg days to collect receivables</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Days Payable Outstanding (DPO)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(kpis.dpo_days)} Days
                </div>
                <p className="text-xs text-slate-500 mt-1">Avg days to settle vendor bills</p>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cash Conversion Cycle (CCC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {Math.round(kpis.cash_conversion_cycle_days)} Days
                </div>
                <p className="text-xs text-indigo-600/80 mt-1">Cash cycle efficiency</p>
              </CardContent>
            </Card>
          </div>

          {/* Actionable Alerts Panel */}
          {metrics && metrics.alerts.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm">
              <CardHeader className="pb-3 border-b border-amber-200 dark:border-amber-900">
                <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  Actionable Executive Alerts ({metrics.alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {metrics.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            alert.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                        />
                        {alert.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{alert.description}</p>
                    </div>
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
                      Recommendation: {alert.recommended_action}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Monthly Trajectory Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Multi-Month Trajectory Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Month</th>
                      <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                      <th className="px-6 py-3 font-semibold text-right">COGS</th>
                      <th className="px-6 py-3 font-semibold text-right">Gross Profit</th>
                      <th className="px-6 py-3 font-semibold text-right">Net Profit</th>
                      <th className="px-6 py-3 font-semibold text-right">Net Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(metrics?.monthly_trends || []).map((m) => {
                      const marginPct = m.revenue > 0 ? (m.net_profit / m.revenue) * 100 : 0;
                      return (
                        <tr key={m.month} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{m.month}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(m.revenue)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                            {formatCurrency(m.cogs)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(m.gross_profit)}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(m.net_profit)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs font-semibold">
                            {marginPct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
