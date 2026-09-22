'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRupeeWords } from '@/lib/utils/number-to-words';
import {
  ArrowLeft,
  Truck,
  DollarSign,
  ShoppingCart,
  Printer,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState<any>(null);

  useEffect(() => {
    fetchStatement();
  }, [id]);

  async function fetchStatement() {
    try {
      setLoading(true);
      const res = await fetch(`/api/suppliers/${id}/statement`);
      if (res.ok) {
        const data = await res.json();
        setStatement(data);
      } else {
        toast.error('Failed to load supplier statement');
      }
    } catch (err) {
      toast.error('Error fetching supplier statement');
    } finally {
      setLoading(false);
    }
  }

  function handlePrintStatement() {
    window.print();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">APPROVED</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">PAID</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">PARTIAL</Badge>;
      case 'overdue':
        return <Badge variant="destructive">OVERDUE</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading supplier statement & history...</p>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="p-6 text-center text-slate-500 space-y-3">
        <p>Supplier record not found.</p>
        <Link href="/purchases/bills">
          <Button variant="outline">Back to Purchase Bills</Button>
        </Link>
      </div>
    );
  }

  const supp = statement.supplier;
  const metrics = statement.metrics;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/purchases/bills">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Supplier Statement — {supp.name}
            </h1>
            <p className="text-xs text-slate-500">
              Complete purchase history ledger and current outstanding vendor payables.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handlePrintStatement}>
          <Printer className="w-4 h-4 mr-1.5" /> Print Statement
        </Button>
      </div>

      {/* Supplier Profile Info Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor Details</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{supp.name}</p>
          {supp.gstin && <p className="text-xs text-slate-600">GSTIN: {supp.gstin}</p>}
          {supp.phone && <p className="text-xs text-slate-600">Phone: {supp.phone}</p>}
          {supp.email && <p className="text-xs text-slate-600">Email: {supp.email}</p>}
        </div>

        <div className="md:col-span-2 flex flex-col justify-center text-right">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Current Outstanding Payable</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">
            {formatCurrency(metrics.outstanding_payable_paise)}
          </p>
          <p className="text-xs text-slate-500 italic mt-0.5">
            {formatRupeeWords(metrics.outstanding_payable_paise)}
          </p>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchases</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics.total_purchases_paise)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid Amount</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics.total_paid_paise)}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bills Recorded</p>
            <p className="text-2xl font-bold text-slate-900">{metrics.bills_count}</p>
          </div>
        </div>
      </div>

      {/* Purchase History Ledger Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Purchase Transaction History</h3>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Bill Number</TableHead>
                <TableHead>Bill Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(statement.history || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    No purchase transaction history found for this supplier.
                  </TableCell>
                </TableRow>
              ) : (
                (statement.history || []).map((b: any) => {
                  const total = b.total_paise || 0;
                  const paid = b.paid_paise || 0;
                  const due = Math.max(0, total - paid);

                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold text-indigo-600">
                        <Link href={`/purchases/bills/${b.id}`}>
                          {b.bill_number}
                        </Link>
                      </TableCell>
                      <TableCell>{b.bill_date}</TableCell>
                      <TableCell>{getStatusBadge(b.status)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {formatCurrency(paid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">
                        {formatCurrency(due)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/purchases/bills/${b.id}`}>
                          <Button variant="outline" size="sm">
                            View Bill
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
