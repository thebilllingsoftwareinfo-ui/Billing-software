'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function StockCountsPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [warehouseId, setWarehouseId] = useState('');
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Selected Count for viewing/reconciliation
  const [activeCount, setActiveCount] = useState<any>(null);
  const [countItems, setCountItems] = useState<any[]>([]);

  useEffect(() => {
    loadDependencies();
    fetchCounts();
  }, []);

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

  async function fetchCounts() {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/stock-counts');
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || []);
      }
    } catch {
      toast.error('Failed to load stock counts');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCount(e: React.FormEvent) {
    e.preventDefault();
    if (!warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }

    try {
      setSubmitting(true);
      // Fetch current warehouse stock to snapshot system quantities
      const stockRes = await fetch(`/api/inventory/warehouses/${warehouseId}/stock`);
      let stockList = [];
      if (stockRes.ok) {
        const data = await stockRes.json();
        stockList = data.stock || [];
      }

      // If no items in warehouse, fallback to products list
      const itemsPayload =
        stockList.length > 0
          ? stockList.map((s: any) => ({
              product_id: s.product_id,
              system_quantity: Number(s.current_quantity || 0),
              physical_quantity: Number(s.current_quantity || 0),
              unit_cost: Number(s.average_cost || 0),
            }))
          : products.slice(0, 5).map((p: any) => ({
              product_id: p.id,
              system_quantity: Number(p.current_stock || 0),
              physical_quantity: Number(p.current_stock || 0),
              unit_cost: Number(p.purchase_price || 0),
            }));

      if (itemsPayload.length === 0) {
        toast.error('No products available to count');
        return;
      }

      const res = await fetch('/api/inventory/stock-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          count_date: countDate,
          notes,
          items: itemsPayload,
        }),
      });

      if (res.ok) {
        toast.success('Stock count session started');
        setIsModalOpen(false);
        setWarehouseId('');
        setNotes('');
        fetchCounts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to start stock count');
      }
    } catch {
      toast.error('Network error creating stock count');
    } finally {
      setSubmitting(false);
    }
  }

  function openCountDetails(count: any) {
    setActiveCount(count);
    setCountItems(count.items || []);
  }

  const [savingCounts, setSavingCounts] = useState(false);

  function handleItemQtyChange(productId: string, val: string) {
    const num = val === '' ? 0 : Number(val);
    setCountItems((prev) =>
      prev.map((it) => {
        if (it.product_id === productId) {
          return {
            ...it,
            physical_quantity: num,
            difference: num - Number(it.system_quantity || 0),
          };
        }
        return it;
      })
    );
  }

  async function handleSaveCountItems() {
    if (!activeCount) return;
    try {
      setSavingCounts(true);
      const res = await fetch(`/api/inventory/stock-counts/${activeCount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: countItems.map((it) => ({
            product_id: it.product_id,
            system_quantity: it.system_quantity,
            physical_quantity: it.physical_quantity,
            notes: it.notes,
          })),
        }),
      });

      if (res.ok) {
        toast.success('Counted quantities saved successfully');
        fetchCounts();
        setActiveCount((prev: any) => ({ ...prev, status: 'counted' }));
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save counts');
      }
    } catch {
      toast.error('Network error saving counts');
    } finally {
      setSavingCounts(false);
    }
  }

  async function handleApprove(countId: string) {
    try {
      const res = await fetch(`/api/inventory/stock-counts/${countId}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Stock count approved');
        fetchCounts();
        setActiveCount(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to approve');
      }
    } catch {
      toast.error('Error approving count');
    }
  }

  async function handlePostReconciliation(countId: string) {
    if (!confirm('Are you sure you want to post reconciliation? Canonical stock adjustments will be created immediately.')) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/stock-counts/${countId}/post`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Reconciliation posted! Stock balances updated.');
        fetchCounts();
        setActiveCount(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to post reconciliation');
      }
    } catch {
      toast.error('Error posting reconciliation');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'counted':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">COUNTED</Badge>;
      case 'approved':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">APPROVED</Badge>;
      case 'posted':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">POSTED</Badge>;
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
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            Physical Stock Count & Reconciliation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct warehouse stocktakes, track physical vs system variances, and post auditable adjustments.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Start Stocktake
        </Button>
      </div>

      {/* Counts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Loading stock count sessions...</p>
          </div>
        ) : counts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No stock count sessions yet</p>
            <p className="text-sm text-slate-400 mt-1">Start a physical stock count session to reconcile warehouse quantities.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Count #</TableHead>
                <TableHead className="font-semibold text-slate-700">Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Warehouse</TableHead>
                <TableHead className="font-semibold text-slate-700">Items Counted</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.map((c) => {
                const wh = warehouses.find((w) => w.id === c.warehouse_id);
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono font-medium text-slate-900">{c.count_number}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{c.count_date}</TableCell>
                    <TableCell className="text-slate-900 font-medium">{wh?.name || c.warehouse_id}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{c.items?.length || 0} product(s)</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openCountDetails(c)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs"
                      >
                        Inspect & Reconcile
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Start Stocktake Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Physical Stock Count</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCount} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Select Warehouse to Count *</Label>
              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose warehouse..." />
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
              <Label>Count Date *</Label>
              <Input
                type="date"
                value={countDate}
                onChange={(e) => setCountDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Notes / Audit Scope</Label>
              <Input
                placeholder="e.g. Month-end godown audit"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Initialize Stocktake
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details & Reconciliation Dialog */}
      <Dialog open={Boolean(activeCount)} onOpenChange={(open) => !open && setActiveCount(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Stocktake #{activeCount?.count_number}</DialogTitle>
              {activeCount && getStatusBadge(activeCount.status)}
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Physical Count</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countItems.map((it: any) => {
                  const prod = products.find((p) => p.id === it.product_id);
                  const diff = it.difference;
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium text-slate-900">
                        {prod?.name || it.product_id}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {it.system_quantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {activeCount?.status === 'draft' || activeCount?.status === 'counted' ? (
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={it.physical_quantity}
                            onChange={(e) => handleItemQtyChange(it.product_id, e.target.value)}
                            className="w-28 text-right h-8 ml-auto font-mono text-sm"
                          />
                        ) : (
                          it.physical_quantity
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          diff === 0 ? 'text-slate-500' : diff > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <DialogFooter className="pt-4 flex items-center justify-between w-full">
              <Button type="button" variant="outline" onClick={() => setActiveCount(null)}>
                Close
              </Button>
              <div className="space-x-2 flex items-center">
                {(activeCount?.status === 'draft' || activeCount?.status === 'counted') && (
                  <Button
                    onClick={handleSaveCountItems}
                    disabled={savingCounts}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    {savingCounts && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    Save Counts
                  </Button>
                )}
                {activeCount?.status === 'counted' && (
                  <Button
                    onClick={() => handleApprove(activeCount.id)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Approve Variance
                  </Button>
                )}
                {(activeCount?.status === 'approved' || activeCount?.status === 'counted') && (
                  <Button
                    onClick={() => handlePostReconciliation(activeCount.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Post Reconciliation
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
