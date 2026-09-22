'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRupeeWords } from '@/lib/utils/number-to-words';
import {
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  Truck,
  Loader2,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [bill, setBill] = useState<any>(null);

  useEffect(() => {
    fetchBill();
  }, [id]);

  async function fetchBill() {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBill(data);
      } else {
        toast.error('Failed to load purchase bill details');
      }
    } catch (err) {
      toast.error('Error fetching purchase bill');
    } finally {
      setLoading(false);
    }
  }

  // Finalize Purchase Bill: Increases Stock Inventory, Creates Supplier Payable, Writes Audit Log
  async function handleFinalizeBill() {
    try {
      setFinalizing(true);
      const res = await fetch(`/api/purchases/${id}/finalize`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to finalize purchase bill');
      }

      toast.success('Purchase bill finalized! Inventory stock increased and supplier payable updated.');
      fetchBill();
    } catch (err: any) {
      toast.error(err.message || 'Finalization failed');
    } finally {
      setFinalizing(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">APPROVED / FINALIZED</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">PAID</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">PARTIAL</Badge>;
      case 'overdue':
        return <Badge variant="destructive">OVERDUE</Badge>;
      default:
        return <Badge variant="outline">{status?.toUpperCase()}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading purchase bill...</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-6 text-center text-slate-500 space-y-3">
        <p>Purchase bill not found.</p>
        <Link href="/purchases/bills">
          <Button variant="outline">Back to Purchase Bills</Button>
        </Link>
      </div>
    );
  }

  const isFinalized = bill.status !== 'draft';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/purchases/bills">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Bill #{bill.bill_number}
              </h1>
              {getStatusBadge(bill.status)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bill Date: {bill.bill_date} {bill.due_date ? `· Due Date: ${bill.due_date}` : ''}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isFinalized && (
            <Button
              variant="default"
              size="sm"
              onClick={handleFinalizeBill}
              disabled={finalizing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {finalizing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4 mr-1.5" />
              )}
              Finalize Bill (Increase Stock & Post Payable)
            </Button>
          )}

          <Link href={`/purchases/suppliers/${bill.supplier_id}`}>
            <Button variant="outline" size="sm">
              <Truck className="w-4 h-4 mr-1.5 text-indigo-600" /> Supplier Statement
            </Button>
          </Link>
        </div>
      </div>

      {/* Finalized Banner */}
      {isFinalized && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">Purchase Bill Finalized & Stock Ledger Updated</p>
            <p className="text-xs text-emerald-700">
              Inventory stock quantities have been posted to the stock ledger and supplier payable balance updated.
            </p>
          </div>
        </div>
      )}

      {/* Details Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier Vendor</p>
            <Link href={`/purchases/suppliers/${bill.supplier_id}`} className="hover:underline">
              <p className="text-lg font-bold text-slate-900 mt-1">{bill.suppliers?.name}</p>
            </Link>
            {bill.suppliers?.gstin && (
              <p className="text-xs text-slate-600 mt-0.5">GSTIN: {bill.suppliers.gstin}</p>
            )}
            {bill.suppliers?.phone && (
              <p className="text-xs text-slate-600 mt-0.5">Phone: {bill.suppliers.phone}</p>
            )}
            {bill.suppliers?.email && (
              <p className="text-xs text-slate-600 mt-0.5">Email: {bill.suppliers.email}</p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bill Amount</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">
              {formatCurrency(bill.total_paise)}
            </p>
            <p className="text-xs text-slate-600 italic mt-1">
              {formatRupeeWords(bill.total_paise)}
            </p>
            <div className="mt-2 text-xs">
              <span className="text-slate-500">Paid: </span>
              <span className="font-semibold text-emerald-700">{formatCurrency(bill.paid_paise || 0)}</span>
              <span className="mx-1.5">•</span>
              <span className="text-slate-500">Balance Due: </span>
              <span className="font-semibold text-amber-700">
                {formatCurrency(Math.max(0, (bill.total_paise || 0) - (bill.paid_paise || 0)))}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Purchased Products & Inbound Inventory Items
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product / Description</TableHead>
                  <TableHead className="w-28">HSN/SAC</TableHead>
                  <TableHead className="w-20 text-right">Inbound Qty</TableHead>
                  <TableHead className="w-28 text-right">Unit Price</TableHead>
                  <TableHead className="w-20 text-right">Disc %</TableHead>
                  <TableHead className="w-24 text-right">GST %</TableHead>
                  <TableHead className="w-32 text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bill.purchase_bill_items || []).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-slate-900">{item.description}</TableCell>
                    <TableCell className="text-slate-600">{item.hsn_sac || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-700">
                      +{item.quantity} {item.unit || ''}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price_paise)}</TableCell>
                    <TableCell className="text-right">{item.discount_pct || 0}%</TableCell>
                    <TableCell className="text-right">{item.gst_rate || 0}%</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(item.line_total_paise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
          <div className="space-y-3 w-full md:w-1/2 text-xs text-slate-600">
            {bill.notes && (
              <div>
                <span className="font-bold text-slate-700">Purchase Notes: </span>
                <span>{bill.notes}</span>
              </div>
            )}
          </div>

          <div className="w-full md:w-72 bg-slate-50 p-4 rounded-lg border space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Base:</span>
              <span>{formatCurrency(bill.subtotal_paise)}</span>
            </div>
            {bill.cgst_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Input CGST:</span>
                <span>{formatCurrency(bill.cgst_paise)}</span>
              </div>
            )}
            {bill.sgst_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Input SGST:</span>
                <span>{formatCurrency(bill.sgst_paise)}</span>
              </div>
            )}
            {bill.igst_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Input IGST:</span>
                <span>{formatCurrency(bill.igst_paise)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Bill Amount:</span>
              <span className="text-indigo-600">{formatCurrency(bill.total_paise)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
