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
  Truck,
  Printer,
  Loader2,
  User,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryChallanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [challan, setChallan] = useState<any>(null);

  useEffect(() => {
    if (id) fetchChallanDetail();
  }, [id]);

  async function fetchChallanDetail() {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/delivery-challans/${id}`);
      if (!res.ok) throw new Error('Delivery challan not found');
      const data = await res.json();
      setChallan(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load challan');
    } finally {
      setLoading(false);
    }
  }

  const handleConvertToInvoice = async () => {
    if (!confirm('Convert this Delivery Challan into a Tax Invoice?')) return;
    try {
      setConverting(true);
      const res = await fetch(`/api/sales/delivery-challans/${id}/convert`, {
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

  const handleCancelChallan = async () => {
    if (!confirm('Are you sure you want to cancel this delivery challan? Dispatched stock will be restored.')) return;
    try {
      const res = await fetch(`/api/sales/delivery-challans/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed to cancel challan');
      toast.success('Delivery challan cancelled and inventory restored');
      fetchChallanDetail();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling challan');
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading delivery challan...</p>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-base text-slate-700">Delivery challan not found.</p>
        <Link href="/sales/challans">
          <Button variant="outline">Back to Challans</Button>
        </Link>
      </div>
    );
  }

  const items = challan.items || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales/challans" className="print:hidden">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{challan.challan_number}</h1>
              <Badge variant="outline" className="uppercase font-semibold">
                {challan.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Dispatched on {challan.challan_date}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {challan.status !== 'cancelled' && challan.status !== 'invoiced' && (
            <Button
              size="sm"
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate Tax Invoice
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Delivery Slip
          </Button>
          {challan.status !== 'cancelled' && challan.status !== 'invoiced' && (
            <Button variant="ghost" size="sm" onClick={handleCancelChallan} className="text-red-600 hover:bg-red-50">
              Cancel Challan
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" /> Consignee / Customer Details
          </div>
          <p className="text-base font-bold text-slate-900">
            {challan.customer?.display_name || challan.customer?.name || 'Customer'}
          </p>
          {challan.customer?.phone && <p className="text-sm text-slate-600">Phone: {challan.customer.phone}</p>}
          {challan.customer?.gstin && <p className="text-sm text-slate-600">GSTIN: {challan.customer.gstin}</p>}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Truck className="w-3.5 h-3.5" /> Transport & Consignment
          </div>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Challan Type:</span> {challan.challan_type}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Vehicle #:</span> {challan.vehicle_number || 'N/A'}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Transporter:</span> {challan.transporter_name || 'Direct Transit'}
          </p>
          {challan.delivery_address && (
            <p className="text-sm text-slate-700">
              <span className="font-medium">Destination:</span> {challan.delivery_address}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/75 border-b border-slate-200 font-semibold text-sm text-slate-800">
          Dispatched Consignment Items
        </div>
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Dispatched Qty</TableHead>
              <TableHead className="text-right">Unit Value</TableHead>
              <TableHead className="text-right">Total Indicative Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium text-slate-900">{it.description}</TableCell>
                <TableCell className="text-center font-semibold text-slate-800">
                  {it.quantity} {it.unit}
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(Number(it.unit_price))}</TableCell>
                <TableCell className="text-right font-semibold font-mono">
                  {formatCurrency(Number(it.total_amount))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-5 bg-slate-50/50 border-t border-slate-200 flex flex-col items-end space-y-1 text-sm">
          <div className="flex justify-between w-64 text-base font-bold text-slate-900">
            <span>Total Goods Value:</span>
            <span className="font-mono text-indigo-600">{formatCurrency(Number(challan.total_amount || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
