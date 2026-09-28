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
  CheckCircle2,
  Printer,
  XCircle,
  Loader2,
  ShoppingCart,
  User,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (id) fetchOrderDetail();
  }, [id]);

  async function fetchOrderDetail() {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/orders/${id}`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  const handleConvertToInvoice = async () => {
    if (!confirm('Convert this Sales Order into a Tax Invoice?')) return;
    try {
      setConverting(true);
      const res = await fetch(`/api/sales/orders/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'invoice' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      toast.success(`Converted to Invoice #${data.invoice_number || ''}!`);
      router.push(`/sales/invoices/${data.invoice_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleCreateChallan = async () => {
    if (!order) return;
    try {
      setConverting(true);
      const payload = {
        customer_id: order.customer_id,
        challan_date: new Date().toISOString().split('T')[0],
        challan_type: 'removal_for_sale',
        sales_order_id: order.id,
        notes: `Generated for Sales Order #${order.order_number}`,
        items: (order.items || []).map((it: any) => ({
          product_id: it.product_id || undefined,
          description: it.description,
          quantity: Math.max(1, Number(it.quantity) - Number(it.fulfilled_quantity || 0)),
          unit: it.unit || 'PCS',
          unit_price: Number(it.unit_price || 0),
          hsn_sac: it.hsn_sac || undefined,
          gst_rate: Number(it.gst_rate || 0),
        })),
      };

      const res = await fetch('/api/sales/delivery-challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Delivery Challan');
      toast.success(`Delivery Challan #${data.challan_number || ''} created!`);
      router.push(`/sales/challans/${data.id || data.challan_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create challan');
    } finally {
      setConverting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this sales order?')) return;
    try {
      const res = await fetch(`/api/sales/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed to cancel order');
      toast.success('Sales order cancelled');
      fetchOrderDetail();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling order');
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-base text-slate-700">Sales order not found.</p>
        <Link href="/sales/orders">
          <Button variant="outline">Back to Sales Orders</Button>
        </Link>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales/orders" className="print:hidden">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{order.order_number}</h1>
              <Badge variant="outline" className="uppercase font-semibold">
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Created on {order.order_date}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {order.status !== 'cancelled' && order.status !== 'fulfilled' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateChallan}
                disabled={converting}
                className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Truck className="w-4 h-4" /> Create Challan
              </Button>
              <Button
                size="sm"
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Convert to Invoice
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          {order.status !== 'cancelled' && order.status !== 'fulfilled' && (
            <Button variant="ghost" size="sm" onClick={handleCancelOrder} className="text-red-600 hover:bg-red-50">
              Cancel Order
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
            {order.customer?.display_name || order.customer?.name || 'Customer'}
          </p>
          {order.customer?.phone && <p className="text-sm text-slate-600">Phone: {order.customer.phone}</p>}
          {order.customer?.gstin && <p className="text-sm text-slate-600">GSTIN: {order.customer.gstin}</p>}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" /> Delivery & Status
          </div>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Order Date:</span> {order.order_date}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Expected Delivery:</span> {order.expected_delivery_date || 'Not specified'}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium">Place of Supply:</span> State Code {order.place_of_supply || '27'}
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/75 border-b border-slate-200 font-semibold text-sm text-slate-800">
          Ordered Items & Fulfillment Progress
        </div>
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Ordered</TableHead>
              <TableHead className="text-center">Fulfilled</TableHead>
              <TableHead className="text-center">Remaining</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it: any, idx: number) => {
              const ordered = Number(it.quantity);
              const fulfilled = Number(it.fulfilled_quantity || 0);
              const remaining = Math.max(0, ordered - fulfilled);
              return (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-slate-900">{it.description}</TableCell>
                  <TableCell className="text-center">
                    {ordered} {it.unit}
                  </TableCell>
                  <TableCell className="text-center font-medium text-emerald-600">
                    {fulfilled} {it.unit}
                  </TableCell>
                  <TableCell className="text-center font-medium text-amber-600">
                    {remaining} {it.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(Number(it.unit_price))}</TableCell>
                  <TableCell className="text-right font-semibold font-mono">
                    {formatCurrency(Number(it.total_amount))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Totals Summary */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-200 flex flex-col items-end space-y-1 text-sm">
          <div className="flex justify-between w-64 text-slate-600">
            <span>Taxable Amount:</span>
            <span className="font-mono">{formatCurrency(Number(order.taxable_amount || order.subtotal || 0))}</span>
          </div>
          <div className="flex justify-between w-64 text-slate-600">
            <span>CGST + SGST / IGST:</span>
            <span className="font-mono">
              {formatCurrency(
                Number(order.cgst_amount || 0) + Number(order.sgst_amount || 0) + Number(order.igst_amount || 0)
              )}
            </span>
          </div>
          <div className="flex justify-between w-64 text-base font-bold text-slate-900 border-t pt-1">
            <span>Order Total:</span>
            <span className="font-mono text-indigo-600">{formatCurrency(Number(order.total_amount || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
