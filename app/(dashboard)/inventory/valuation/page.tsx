'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import { DollarSign, Download, Search, Warehouse, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function InventoryValuationPage() {
  const [loading, setLoading] = useState(true);
  const [valuation, setValuation] = useState<any>(null);
  const [method, setMethod] = useState<'weighted_average' | 'fifo' | 'lifo'>('weighted_average');

  useEffect(() => {
    fetchValuation();
  }, [method]);

  async function fetchValuation() {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/valuation?method=${method}`);
      if (res.ok) {
        const data = await res.json();
        setValuation(data);
      }
    } catch {
      toast.error('Failed to load inventory valuation');
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (!valuation?.warehouses) return;
    const headers = ['Method', 'Warehouse Code', 'Warehouse Name', 'Total Products', 'Physical Units', 'Cost Valuation (INR)', 'Retail Valuation (INR)'];
    const rows = valuation.warehouses.map((w: any) => [
      method.toUpperCase(),
      w.warehouse_code,
      `"${w.warehouse_name}"`,
      w.total_products,
      w.total_units,
      w.total_cost_value,
      w.total_retail_value,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_valuation_${method}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Valuation report exported to CSV');
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-blue-600" />
              Stock Valuation & Analytics
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase font-mono text-xs">
              {method === 'fifo' ? 'FIFO' : method === 'lifo' ? 'LIFO' : 'WEIGHTED AVERAGE'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock valuation across godowns, cost-basis analysis, and retail potential.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-48">
            <Select value={method} onValueChange={(val: any) => setMethod(val)}>
              <SelectTrigger className="bg-white border-slate-300">
                <SelectValue placeholder="Valuation Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted_average">Weighted Average</SelectItem>
                <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                <SelectItem value="lifo">LIFO (Last In, First Out)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExportCsv} variant="outline" className="border-slate-300">
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Stock</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {valuation?.total_stock_units?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Total inventory units</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Units</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {valuation?.total_available_units?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Uncommitted stock</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost Valuation</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatCurrency(valuation?.total_cost_valuation || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Asset book value</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retail Sales Potential</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(valuation?.total_retail_valuation || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Estimated gross proceeds</p>
        </div>
      </div>

      {/* Warehouse Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-blue-600" />
            Warehouse-Wise Valuation Breakdown
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Calculating valuations...</p>
          </div>
        ) : !valuation?.warehouses || valuation.warehouses.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No warehouse stock data found</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Warehouse Code</TableHead>
                <TableHead className="font-semibold text-slate-700">Warehouse Name</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Tracked SKUs</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Physical Units</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Cost Value (Asset)</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Retail Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valuation.warehouses.map((wh: any) => (
                <TableRow key={wh.warehouse_id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono font-medium text-slate-900">{wh.warehouse_code}</TableCell>
                  <TableCell className="font-medium text-slate-900">{wh.warehouse_name}</TableCell>
                  <TableCell className="text-right text-slate-700">{wh.total_products}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {wh.total_units.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    {formatCurrency(wh.total_cost_value)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    {formatCurrency(wh.total_retail_value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
