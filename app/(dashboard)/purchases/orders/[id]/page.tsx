'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ArrowLeft,
  FileText,
  Truck,
  CheckCircle2,
  Printer,
  XCircle,
  Loader2,
  ShoppingBag,
  Building,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [order, setOrder] = useState<any>(null);

  // Partial receive modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (id) fetchOrderDetail();
  }, [id]);

  async function fetchOrderDetail() {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchases/orders/${id}`);
      if (!res.ok) throw new Error('Purchase order not found');
      const data = await res.json();
      setOrder(data);

      // Initialize receive quantities
      const initial: Record<string, number> = {};
      (data.items || []).forEach((item: any) => {
        const remaining = Math.max(0, Number(item.quantity) - Number(item.received_quantity || 0));
        initial[item.id] = remaining;
      });
      setReceiveQuantities(initial);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenReceiveModal = () => {
    const initial: Record<string, number> = {};
    (order?.items || []).forEach((item: any) => {
      const remaining = Math.max(0, Number(item.quantity) - Number(item.received_quantity || 0));
      initial[item.id] = remaining;
    });
    setReceiveQuantities(initial);
    setShowReceiveModal(true);
  };

  const handleExecuteConvert = async () => {
    try {
      setConverting(true);

      const itemsSpec = Object.entries(receiveQuantities)
        .map(([itemId, qty]) => ({
          po_item_id: itemId,
          receive_quantity: Number(qty) || 0,
        }))
        .filter((it) => it.receive_quantity > 0);

      if (itemsSpec.length === 0) {
        toast.error('Please enter at least one item quantity to receive');
        return;
      }

      const res = await fetch(`/api/purchases/orders/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsSpec }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion to purchase bill failed');

      toast.success(`Purchase Bill #${data.bill_number || ''} generated successfully!`);
      setShowReceiveModal(false);
      router.push(`/purchases/bills/${data.bill_id || data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert to purchase bill');
    } finally {
      setConverting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      const res = await fetch(`/api/purchases/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
      toast.success('Purchase Order cancelled');
      fetchOrderDetail();
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirm('Permanently delete this purchase order? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/purchases/orders/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete order');
      toast.success('Purchase Order deleted');
      router.push('/purchases/orders');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting order');
    }
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'issued':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">ISSUED</Badge>;
      case 'partially_received':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">PARTIALLY RECEIVED</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">RECEIVED</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status?.toUpperCase()}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm">Loading purchase order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">Purchase Order not found.</p>
        <Link href="/purchases/orders">
          <Button variant="outline" className="mt-4">
            Return to Purchase Orders
          </Button>
        </Link>
      </div>
    );
  }

  const supplierName = order.supplier?.display_name || order.supplier?.name || 'Direct Supplier';
  const canConvert = order.status !== 'cancelled' && order.status !== 'received';
  const canCancel = order.status === 'draft' || order.status === 'issued';
  const canDelete = order.status === 'draft' || order.status === 'cancelled';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/purchases/orders" className="print:hidden">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{order.po_number}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {new Date(order.order_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-slate-700"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelOrder}
              className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              <XCircle className="w-4 h-4" /> Cancel Order
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteOrder}
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              Delete
            </Button>
          )}

          {canConvert && (
            <Button
              size="sm"
              onClick={handleOpenReceiveModal}
              disabled={converting}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium"
            >
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Receive Goods (Convert to Bill)
            </Button>
          )}
        </div>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Supplier & Logistics Details Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Supplier Information
            </p>
            <p className="text-base font-bold text-slate-900">{supplierName}</p>
            {order.supplier?.gstin && (
              <p className="text-xs text-slate-600 mt-0.5">GSTIN: {order.supplier.gstin}</p>
            )}
            {order.supplier?.phone && (
              <p className="text-xs text-slate-600">Phone: {order.supplier.phone}</p>
            )}
            {order.supplier?.email && (
              <p className="text-xs text-slate-600">Email: {order.supplier.email}</p>
            )}
          </div>

          <div className="space-y-1 text-sm text-slate-600 md:text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Procurement Schedule
            </p>
            <p>
              <span className="text-slate-400">Order Date: </span>
              <span className="font-medium text-slate-800">
                {new Date(order.order_date).toLocaleDateString()}
              </span>
            </p>
            {order.expected_delivery_date && (
              <p>
                <span className="text-slate-400">Expected Delivery: </span>
                <span className="font-medium text-purple-700">
                  {new Date(order.expected_delivery_date).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Order Items Table */}
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Ordered Items & Fulfillment Status</h3>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">GST %</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.items || []).map((it: any) => {
                const orderedQty = Number(it.quantity || 0);
                const receivedQty = Number(it.received_quantity || 0);
                const remaining = Math.max(0, orderedQty - receivedQty);
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium text-slate-900">
                      {it.description}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {it.hsn_sac || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {orderedQty} {it.unit}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {receivedQty} {it.unit}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600">
                      {remaining} {it.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(it.unit_price || 0))}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-600">
                      {it.gst_rate}%
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatCurrency(Number(it.total_amount || 0))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Financial Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t gap-4">
            <div className="text-xs text-slate-500 max-w-sm space-y-1">
              <p>
                <span className="font-medium">Terms:</span> {order.terms || 'Standard vendor terms'}
              </p>
              {order.notes && (
                <p>
                  <span className="font-medium">Notes:</span> {order.notes}
                </p>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span>{formatCurrency(Number(order.taxable_amount || 0))}</span>
              </div>
              {Number(order.cgst_amount || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>CGST:</span>
                  <span>{formatCurrency(Number(order.cgst_amount || 0))}</span>
                </div>
              )}
              {Number(order.sgst_amount || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>SGST:</span>
                  <span>{formatCurrency(Number(order.sgst_amount || 0))}</span>
                </div>
              )}
              {Number(order.igst_amount || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGST:</span>
                  <span>{formatCurrency(Number(order.igst_amount || 0))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t pt-2">
                <span>Order Total:</span>
                <span className="text-purple-700">{formatCurrency(Number(order.total_amount || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partial Receive / Convert Modal */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              Receive Items into Purchase Bill
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Specify the quantities physically delivered and accepted. You can receive partial shipments; remaining quantities will stay open on this purchase order.
            </p>

            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-32 text-right">Receive Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.items || []).map((it: any) => {
                  const orderedQty = Number(it.quantity || 0);
                  const receivedQty = Number(it.received_quantity || 0);
                  const remaining = Math.max(0, orderedQty - receivedQty);
                  if (remaining <= 0) return null;

                  return (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {it.description}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600">
                        {orderedQty} {it.unit}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-amber-600">
                        {remaining} {it.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          step="any"
                          value={receiveQuantities[it.id] ?? remaining}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setReceiveQuantities((prev) => ({
                              ...prev,
                              [it.id]: val,
                            }));
                          }}
                          className="h-8 text-xs text-right font-medium"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReceiveModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteConvert}
              disabled={converting}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Generate Purchase Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
