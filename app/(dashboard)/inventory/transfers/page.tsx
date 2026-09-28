'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRightLeft, Plus, Search, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function StockTransfersPage() {
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit: string; notes?: string }[]>([
    { product_id: '', quantity: 1, unit: 'PCS' },
  ]);

  useEffect(() => {
    loadDependencies();
    fetchTransfers();
  }, [statusFilter]);

  async function loadDependencies() {
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch('/api/inventory/warehouses'),
        fetch('/api/products?limit=100'),
      ]);
      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouses(whData.warehouses || []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || prodData.items || []);
      }
    } catch {
      // Best effort load
    }
  }

  async function fetchTransfers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/inventory/transfers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers || []);
      }
    } catch {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems([...items, { product_id: '', quantity: 1, unit: 'PCS' }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceWarehouse || !destinationWarehouse) {
      toast.error('Please select both source and destination warehouses');
      return;
    }
    if (sourceWarehouse === destinationWarehouse) {
      toast.error('Source and destination warehouses cannot be the same');
      return;
    }
    const invalidItem = items.find((it) => !it.product_id || it.quantity <= 0);
    if (invalidItem) {
      toast.error('All transfer items must have a valid product and quantity greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_warehouse_id: sourceWarehouse,
          destination_warehouse_id: destinationWarehouse,
          transfer_date: transferDate,
          status: 'in_transit',
          notes,
          items,
        }),
      });

      if (res.ok) {
        toast.success('Stock transfer initiated in transit');
        setIsModalOpen(false);
        resetForm();
        fetchTransfers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to initiate transfer');
      }
    } catch {
      toast.error('Network error initiating transfer');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSourceWarehouse('');
    setDestinationWarehouse('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([{ product_id: '', quantity: 1, unit: 'PCS' }]);
  }

  async function handleReceive(transferId: string) {
    try {
      const res = await fetch(`/api/inventory/transfers/${transferId}/receive`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Transfer received successfully. Stock updated at destination.');
        fetchTransfers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to receive transfer');
      }
    } catch {
      toast.error('Network error receiving transfer');
    }
  }

  async function handleCancel(transferId: string) {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;
    try {
      const res = await fetch(`/api/inventory/transfers/${transferId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Transfer cancelled');
        fetchTransfers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to cancel transfer');
      }
    } catch {
      toast.error('Network error cancelling transfer');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'in_transit':
      case 'initiated':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">IN TRANSIT</Badge>;
      case 'received':
      case 'transferred':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">RECEIVED</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-500">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            Stock Transfers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inter-warehouse stock movements with zero accounting disruption and strict quantity safety.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Transfer
        </Button>
      </div>

      {/* Transfers List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Filter Status:</span>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Loading transfers...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ArrowRightLeft className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No stock transfers found</p>
            <p className="text-sm text-slate-400 mt-1">Transfer goods between your warehouses to maintain optimal inventory.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Transfer #</TableHead>
                <TableHead className="font-semibold text-slate-700">Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Source Warehouse</TableHead>
                <TableHead className="font-semibold text-slate-700">Destination</TableHead>
                <TableHead className="font-semibold text-slate-700">Items</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((tr) => {
                const sourceWh = warehouses.find((w) => w.id === tr.source_warehouse_id);
                const destWh = warehouses.find((w) => w.id === tr.destination_warehouse_id);
                const isPending = tr.status === 'in_transit' || tr.status === 'initiated' || tr.status === 'draft';

                return (
                  <TableRow key={tr.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono font-medium text-slate-900">{tr.transfer_number}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{tr.transfer_date}</TableCell>
                    <TableCell className="text-slate-900 font-medium">
                      {sourceWh?.name || tr.source_warehouse_id}
                    </TableCell>
                    <TableCell className="text-slate-900 font-medium">
                      {destWh?.name || tr.destination_warehouse_id}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {tr.items?.length || 1} item(s)
                    </TableCell>
                    <TableCell>{getStatusBadge(tr.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleReceive(tr.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Receive
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(tr.id)}
                            className="text-red-600 hover:bg-red-50 h-8 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* New Transfer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Initiate Stock Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTransfer} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Source Warehouse (Deduct Stock) *</Label>
                <Select value={sourceWarehouse} onValueChange={(val) => setSourceWarehouse(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Destination Warehouse (Receive Stock) *</Label>
                <Select value={destinationWarehouse} onValueChange={(val) => setDestinationWarehouse(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} disabled={w.id === sourceWarehouse}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Transfer Date *</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Notes / Reason</Label>
                <Input
                  placeholder="e.g. Branch replenishment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-slate-800">Transfer Items</Label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <Select
                        value={item.product_id}
                        onValueChange={(val) => {
                          const updated = [...items];
                          updated[idx].product_id = val || '';
                          setItems(updated);
                        }}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku || 'N/A'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                        className="bg-white"
                        required
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-1">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item Line
              </Button>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dispatch Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
