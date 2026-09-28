'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils/currency';
import { Layers, Plus, Search, AlertCircle, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BatchesAndExpiryPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    initial_quantity: 0,
    cost: 0,
  });

  useEffect(() => {
    loadDependencies();
    fetchData();
  }, [search]);

  async function loadDependencies() {
    try {
      const [prodRes, whRes] = await Promise.all([
        fetch('/api/products?limit=100'),
        fetch('/api/inventory/warehouses'),
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || prodData.items || []);
      }
      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouses(whData.warehouses || []);
      }
    } catch {
      // Best effort load
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const [batchRes, alertRes] = await Promise.all([
        fetch(`/api/inventory/batches?${params.toString()}`),
        fetch('/api/inventory/batches/expiring?days=30'),
      ]);

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData.batches || []);
      }
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setAlerts(alertData.alerts || []);
      }
    } catch {
      toast.error('Failed to load batch data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.product_id || !formData.batch_number.trim() || !formData.expiry_date) {
      toast.error('Product, batch number, and expiry date are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/inventory/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Batch registered successfully');
        setIsModalOpen(false);
        setFormData({
          product_id: '',
          warehouse_id: '',
          batch_number: '',
          manufacturing_date: '',
          expiry_date: '',
          initial_quantity: 0,
          cost: 0,
        });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create batch');
      }
    } catch {
      toast.error('Network error creating batch');
    } finally {
      setSubmitting(false);
    }
  }

  const expiredCount = alerts.filter((a) => a.status === 'EXPIRED').length;
  const criticalCount = alerts.filter((a) => a.status === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.status === 'WARNING').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            Batch & Expiry Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lot-wise tracking, automated shelf-life alerts, and perishable inventory monitoring.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Batch
        </Button>
      </div>

      {/* Expiry Alerts Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50/75 border border-red-200 p-4 rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Expired Stock</p>
            <p className="text-2xl font-bold text-red-900 mt-0.5">{expiredCount} Batches</p>
          </div>
        </div>

        <div className="bg-amber-50/75 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Expiring in 7 Days</p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">{criticalCount} Batches</p>
          </div>
        </div>

        <div className="bg-blue-50/75 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Expiring in 30 Days</p>
            <p className="text-2xl font-bold text-blue-900 mt-0.5">{warningCount} Batches</p>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search batch number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No product batches recorded</p>
            <p className="text-sm text-slate-400 mt-1">Register product batches to track expiration dates and lots.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Batch #</TableHead>
                <TableHead className="font-semibold text-slate-700">Product</TableHead>
                <TableHead className="font-semibold text-slate-700">Warehouse</TableHead>
                <TableHead className="font-semibold text-slate-700">Mfg Date</TableHead>
                <TableHead className="font-semibold text-slate-700">Expiry Date</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Available Qty</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const prod = products.find((p) => p.id === b.product_id);
                const wh = warehouses.find((w) => w.id === b.warehouse_id);
                const isExp = new Date(b.expiry_date) < new Date();

                return (
                  <TableRow key={b.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono font-medium text-slate-900">{b.batch_number}</TableCell>
                    <TableCell className="font-medium text-slate-900">{prod?.name || b.product_id}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{wh?.name || 'Unassigned'}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{b.manufacturing_date || '—'}</TableCell>
                    <TableCell className="text-slate-900 font-medium text-sm">{b.expiry_date}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {Number(b.current_quantity || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {isExp ? (
                        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                          EXPIRED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          ACTIVE
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Batch Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Product Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBatch} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Select Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(val) => setFormData({ ...formData, product_id: val || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose product..." />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Batch Number *</Label>
                <Input
                  placeholder="e.g. LOT-2026-09"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Warehouse</Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(val) => setFormData({ ...formData, warehouse_id: val || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Manufacturing Date</Label>
                <Input
                  type="date"
                  value={formData.manufacturing_date}
                  onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData({ ...formData, initial_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Cost per Unit</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
