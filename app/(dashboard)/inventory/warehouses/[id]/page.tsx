'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { Warehouse, ArrowLeft, ArrowRightLeft, Search, AlertTriangle, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function WarehouseStockDetailPage() {
  const params = useParams();
  const warehouseId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<any>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  useEffect(() => {
    if (warehouseId) {
      loadData();
    }
  }, [warehouseId, search, lowStockFilter]);

  async function loadData() {
    try {
      setLoading(true);
      // 1. Fetch warehouse details
      const whRes = await fetch(`/api/inventory/warehouses/${warehouseId}`);
      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouse(whData);
      }

      // 2. Fetch stock items
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (lowStockFilter) queryParams.append('low_stock', 'true');

      const stockRes = await fetch(`/api/inventory/warehouses/${warehouseId}/stock?${queryParams.toString()}`);
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        setStock(stockData.stock || []);
      }
    } catch {
      toast.error('Failed to load warehouse stock details');
    } finally {
      setLoading(false);
    }
  }

  const totalUnits = stock.reduce((sum, it) => sum + Number(it.current_quantity || 0), 0);
  const totalReserved = stock.reduce((sum, it) => sum + Number(it.reserved_quantity || 0), 0);
  const totalAvailable = Math.max(0, totalUnits - totalReserved);
  const totalValue = stock.reduce((sum, it) => sum + Number(it.stock_value || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/inventory/warehouses">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Warehouses
          </Button>
        </Link>
        <Link href={`/inventory/transfers?source=${warehouseId}`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            Transfer Stock From Here
          </Button>
        </Link>
      </div>

      {/* Warehouse Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">{warehouse?.name || 'Warehouse Stock'}</h1>
            <Badge variant="outline" className="font-mono text-xs uppercase bg-slate-50">
              {warehouse?.code || 'WH'}
            </Badge>
            {warehouse?.is_default && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">Default Warehouse</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {warehouse?.address ? `${warehouse.address}, ${warehouse.city || ''}` : 'Location details not specified'}
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <div>
            <span className="text-slate-400 block text-xs">Type</span>
            <span className="font-medium capitalize">{warehouse?.type || 'Godown'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Contact</span>
            <span className="font-medium">{warehouse?.contact_person || '—'}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Stock</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalUnits.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total units in godown</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reserved Stock</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalReserved.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Committed in Sales Orders</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Stock</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalAvailable.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Physical minus Reserved</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Stock Value</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Cost valuation</p>
        </div>
      </div>

      {/* Stock List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={lowStockFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={lowStockFilter ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Low Stock Only
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Loading warehouse stock...</p>
          </div>
        ) : stock.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No stock recorded in this warehouse</p>
            <p className="text-sm text-slate-400 mt-1">Receive purchases or transfer inventory to this location.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                <TableHead className="font-semibold text-slate-700">Product Name</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Physical Stock</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Reserved</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Available Stock</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Avg Cost</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs font-medium text-slate-700">{item.sku}</TableCell>
                  <TableCell className="font-medium text-slate-900">{item.product_name}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {item.current_quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-amber-600 font-medium">
                    {item.reserved_quantity > 0 ? item.reserved_quantity.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    {item.available_quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-slate-600 text-sm">
                    {formatCurrency(item.average_cost)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    {formatCurrency(item.stock_value)}
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
