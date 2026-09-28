'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Download,
  Percent,
  Search,
  PieChart,
  BarChart2,
  Users,
  Package,
} from 'lucide-react';

interface ProfitSummary {
  gross_sales: number;
  discounts: number;
  net_revenue: number;
  tax_collected: number;
  cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  total_invoices_count: number;
}

interface ProfitEntity {
  entity_id: string;
  entity_name: string;
  code?: string;
  sales_volume: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_percent: number;
}

export default function ProfitabilityPage() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'salespersons'>('products');
  const [entities, setEntities] = useState<ProfitEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchEntities(activeTab);
  }, [activeTab]);

  async function fetchSummary() {
    try {
      const res = await fetch('/api/analytics/profitability');
      const data = await res.json();
      if (res.ok && data.data) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchEntities(view: 'products' | 'customers' | 'salespersons') {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/profitability?view=${view}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setEntities(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (entities.length === 0) return;
    const headers = ['Entity ID', 'Name', 'Sales Volume', 'Revenue (INR)', 'COGS (INR)', 'Gross Profit (INR)', 'Margin %'];
    const rows = entities.map((e) => [
      e.entity_id,
      `"${e.entity_name}"`,
      e.sales_volume,
      e.revenue,
      e.cogs,
      e.gross_profit,
      e.margin_percent,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `profitability_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredEntities = entities.filter(
    (e) =>
      e.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-600" /> Margins & Profitability Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Gross Profit, Cost of Goods Sold (COGS), and Margin % across products, customers and staff.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition shadow-sm text-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Net Revenue</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">₹{summary.net_revenue.toLocaleString()}</div>
            <span className="text-xs text-gray-400 mt-1 block">Excl. ₹{summary.tax_collected.toLocaleString()} Tax</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total COGS</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">₹{summary.cogs.toLocaleString()}</div>
            <span className="text-xs text-gray-400 mt-1 block">Inventory Cost Basis</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Gross Profit</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">₹{summary.gross_profit.toLocaleString()}</div>
            <span className="text-xs text-emerald-600 font-medium mt-1 block">Revenue - COGS</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Gross Margin</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{summary.gross_margin_percent}%</div>
            <span className="text-xs text-gray-400 mt-1 block">{summary.total_invoices_count} Invoices</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" /> By Product
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'customers'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" /> By Customer
        </button>
        <button
          onClick={() => setActiveTab('salespersons')}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'salespersons'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> By Salesperson
        </button>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-gray-500">{filteredEntities.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3 text-right">Volume</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3 text-right">COGS</th>
                <th className="px-5 py-3 text-right">Gross Profit</th>
                <th className="px-5 py-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Loading breakdown...</td>
                </tr>
              ) : filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">No data found.</td>
                </tr>
              ) : (
                filteredEntities.map((ent) => (
                  <tr key={ent.entity_id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      <div>{ent.entity_name}</div>
                      {ent.code && <div className="text-xs text-gray-400 font-mono">{ent.code}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-700">
                      {ent.sales_volume}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                      ₹{ent.revenue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-rose-600">
                      ₹{ent.cogs.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">
                      ₹{ent.gross_profit.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-indigo-600">
                      {ent.margin_percent}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
