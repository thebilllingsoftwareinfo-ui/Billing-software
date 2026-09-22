'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { Plus, Search, FileText, Download, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function QuotationsDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchQuotations();
  }, [page, search, statusFilter]);

  async function fetchQuotations() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/quotations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.quotations || []);
        setTotalCount(data.total || 0);
      } else {
        toast.error('Failed to load quotations');
      }
    } catch (err) {
      toast.error('Error loading quotations');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">SENT</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">ACCEPTED</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">REJECTED</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">EXPIRED</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">CONVERTED</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  }

  const totalValuePaise = quotations.reduce((sum, q) => sum + (q.total_paise || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotations & Estimates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create proposals, send estimates to clients, track approvals, and convert directly to Sales Invoices.
          </p>
        </div>

        <Link href="/sales/quotations/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Create Quotation
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotations Value</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValuePaise)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotes Count</p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversion Workflow</p>
            <p className="text-sm font-semibold text-indigo-600 mt-1">1-Click Invoice Conversion Ready</p>
          </div>
        </div>
      </div>

      {/* Directory Filters & Data Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search quotation # or customer..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-indigo-600" /> Loading quotations...
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No quotations found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((q) => (
                  <TableRow key={q.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-indigo-600">
                      <Link href={`/sales/quotations/${q.id}`}>
                        {q.quotation_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-700">{q.quotation_date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{q.customers?.name}</p>
                        <p className="text-xs text-slate-500">{q.customers?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{q.valid_until || '—'}</TableCell>
                    <TableCell>{getStatusBadge(q.status)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(q.total_paise)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/sales/quotations/${q.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/api/quotations/${q.id}/pdf?download=true`, '_blank')}
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
