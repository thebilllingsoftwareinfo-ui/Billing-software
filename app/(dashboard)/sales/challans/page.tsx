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
import { Plus, Search, Truck, ArrowRight, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryChallansDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [challans, setChallans] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchChallans();
  }, [page, search, statusFilter]);

  async function fetchChallans() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/sales/delivery-challans?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChallans(data.challans || []);
        setTotalCount(data.total || 0);
      } else {
        toast.error('Failed to load delivery challans');
      }
    } catch (err) {
      toast.error('Error loading delivery challans');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'dispatched':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">DISPATCHED</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">DELIVERED</Badge>;
      case 'invoiced':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold">INVOICED</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  }

  function getChallanTypeBadge(type: string) {
    switch (type) {
      case 'supply_on_approval':
        return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">On Approval</span>;
      case 'for_job_work':
        return <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200">Job Work</span>;
      case 'removal_for_sale':
        return <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Sale Removal</span>;
      default:
        return <span className="text-xs bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200">Other</span>;
    }
  }

  const totalValue = challans.reduce((sum, dc) => sum + Number(dc.total_amount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            Delivery Challans (Rule 55)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dispatch goods for job work, supply on approval, or transit prior to tax invoice generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sales/challans/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Create Delivery Challan
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Challans</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Goods Dispatched Value</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Invoiced to Date</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {challans.filter((c) => c.status === 'invoiced').length} Billed
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search challan number, vehicle, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500">Loading delivery challans...</p>
          </div>
        ) : challans.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No Delivery Challans Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Create official Rule 55 delivery challans to accompany stock dispatches and job-work transfers.
            </p>
            <Link href="/sales/challans/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Create First Challan
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Challan #</TableHead>
                <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                <TableHead className="font-semibold text-slate-700">Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Type</TableHead>
                <TableHead className="font-semibold text-slate-700">Vehicle #</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Value</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challans.map((dc) => (
                <TableRow key={dc.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-indigo-600">
                    <Link href={`/sales/challans/${dc.id}`} className="hover:underline flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      {dc.challan_number}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {dc.customer?.display_name || dc.customer?.name || 'Customer'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{dc.challan_date}</TableCell>
                  <TableCell>{getChallanTypeBadge(dc.challan_type)}</TableCell>
                  <TableCell className="text-slate-600 text-sm font-mono">{dc.vehicle_number || '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {formatCurrency(Number(dc.total_amount || 0))}
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(dc.status)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/sales/challans/${dc.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-600 hover:text-indigo-600">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
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
