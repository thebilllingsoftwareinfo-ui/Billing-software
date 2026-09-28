'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { Plus, Search, FileText, ArrowRight, Loader2, CheckCircle2, ShoppingBag, Truck, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseOrdersDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [page, search, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/purchases/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalCount(data.total || 0);
      } else {
        toast.error('Failed to load purchase orders');
      }
    } catch (err) {
      toast.error('Error loading purchase orders');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'issued':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">ISSUED</Badge>;
      case 'partially_received':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">PARTIAL</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">RECEIVED</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  }

  const totalValue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const activeCount = orders.filter((o) => o.status === 'issued' || o.status === 'partially_received').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-purple-600" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Issue procurement orders to suppliers, manage delivery schedules, and receive incoming inventory seamlessly into Purchase Bills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/purchases/orders/new">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Create Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Purchase Orders</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Delivery</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Procurement Value</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by PO #, supplier name..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="partially_received">Partially Received</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-sm">Loading purchase orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No Purchase Orders Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">
              Get started by creating your first purchase order to track vendor procurement and inbound goods.
            </p>
            <Link href="/purchases/orders/new">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Create Purchase Order
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">PO Number</TableHead>
                <TableHead className="font-semibold text-slate-700">Supplier</TableHead>
                <TableHead className="font-semibold text-slate-700">Order Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Expected Delivery</TableHead>
                <TableHead className="font-semibold text-slate-700">Items</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Total Amount</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((po) => {
                const supplierName =
                  po.supplier?.display_name || po.supplier?.name || 'Direct Supplier';
                return (
                  <TableRow key={po.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-purple-600 hover:underline">
                      <Link href={`/purchases/orders/${po.id}`}>
                        {po.po_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {supplierName}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(po.order_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {po.expected_delivery_date ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {po.items?.length || 0} items
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatCurrency(Number(po.total_amount || 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(po.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/purchases/orders/${po.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
