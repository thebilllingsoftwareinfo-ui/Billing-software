'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowLeft,
  FileText,
  Printer,
  Loader2,
  Receipt,
  User,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProformaInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [proforma, setProforma] = useState<any>(null);

  useEffect(() => {
    if (id) fetchProformaDetail();
  }, [id]);

  async function fetchProformaDetail() {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/proforma-invoices/${id}`);
      if (!res.ok) throw new Error('Proforma invoice not found');
      const data = await res.json();
      setProforma(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load proforma invoice');
    } finally {
      setLoading(false);
    }
  }

  const handleConvertToInvoice = async () => {
    if (!confirm('Convert this Proforma Invoice into a legal Tax Invoice?')) return;
    try {
      setConverting(true);
      const res = await fetch(`/api/sales/proforma-invoices/${id}/convert`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      toast.success(`Converted to Tax Invoice #${data.invoice_number || ''}!`);
      router.push(`/sales/invoices/${data.invoice_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this proforma invoice?')) return;
    try {
      const res = await fetch(`/api/sales/proforma-invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed to cancel proforma');
      toast.success('Proforma invoice cancelled');
      fetchProformaDetail();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling proforma');
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading proforma details...</p>
      </div>
    );
  }

  if (!proforma) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-base text-slate-700">Proforma invoice not found.</p>
        <Link href="/sales/proforma-invoices">
          <Button variant="outline">Back to Proforma Directory</Button>
        </Link>
      </div>
    );
  }

  const items = proforma.items || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales/proforma-invoices" className="print:hidden">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{proforma.proforma_number}</h1>
              <Badge variant="outline" className="uppercase font-semibold">
                {proforma.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Commercial Proforma Issued {proforma.proforma_date}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {proforma.status !== 'cancelled' && proforma.status !== 'converted' && (
            <Button
              size="sm"
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Convert to Tax Invoice
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Proforma
          </Button>
          {proforma.status !== 'cancelled' && proforma.status !== 'converted' && (
            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-red-600 hover:bg-red-50">
              Cancel Proforma
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" /> Customer Details
          </div>
          <p className="text-base font-bold text-slate-900">
            {proforma.customer?.display_name || proforma.customer?.name || 'Customer'}
          </p>
          {proforma.customer?.phone && <p className="text-sm text-slate-600">Phone: {proforma.customer.phone}</p>}
          {proforma.customer?.gstin && <p className="text-sm text-slate-600">GSTIN: {proforma.customer.gstin}</p>}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" /> Proforma Terms
          </div>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Issue Date:</span> {proforma.proforma_date}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Valid Until:</span> {proforma.expiry_date || '15 days from issue'}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Status:</span> Non-accounting draft until converted
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/75 border-b border-slate-200 font-semibold text-sm text-slate-800">
          Proforma Items & Pricing Breakdown
        </div>
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">GST Rate</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-slate-900">{it.description}</TableCell>
                <TableCell className="text-center">
                  {it.quantity} {it.unit}
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(Number(it.unit_price))}</TableCell>
                <TableCell className="text-right">{it.gst_rate}%</TableCell>
                <TableCell className="text-right font-semibold font-mono">
                  {formatCurrency(Number(it.total_amount))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals Summary */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-200 flex flex-col items-end space-y-1 text-sm">
          <div className="flex justify-between w-64 text-slate-600">
            <span>Taxable Subtotal:</span>
            <span className="font-mono">{formatCurrency(Number(proforma.taxable_amount || proforma.subtotal || 0))}</span>
          </div>
          <div className="flex justify-between w-64 text-slate-600">
            <span>GST Tax:</span>
            <span className="font-mono">
              {formatCurrency(
                Number(proforma.cgst_amount || 0) + Number(proforma.sgst_amount || 0) + Number(proforma.igst_amount || 0)
              )}
            </span>
          </div>
          <div className="flex justify-between w-64 text-base font-bold text-slate-900 border-t pt-1">
            <span>Proforma Total:</span>
            <span className="font-mono text-indigo-600">{formatCurrency(Number(proforma.total_amount || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
