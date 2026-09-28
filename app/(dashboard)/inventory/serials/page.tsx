'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Hash, Plus, Search, ArrowRightLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SerialNumbersPage() {
  const [loading, setLoading] = useState(true);
  const [serials, setSerials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState<any>(null);
  const [targetWarehouse, setTargetWarehouse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    serial_number: '',
    purchase_reference: '',
    notes: '',
  });

  useEffect(() => {
    loadDependencies();
    fetchSerials();
  }, [search, statusFilter]);

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

  async function fetchSerials() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/inventory/serials?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSerials(data.serials || []);
      }
    } catch {
      toast.error('Failed to load serial numbers');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSerial(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.product_id || !formData.warehouse_id || !formData.serial_number.trim()) {
      toast.error('Product, warehouse, and serial number are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/inventory/serials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Serial number registered');
        setIsModalOpen(false);
        setFormData({
          product_id: '',
          warehouse_id: '',
          serial_number: '',
          purchase_reference: '',
          notes: '',
        });
        fetchSerials();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to register serial number');
      }
    } catch {
      toast.error('Network error registering serial');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransferSerial(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSerial || !targetWarehouse) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/inventory/serials/${selectedSerial.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_warehouse_id: targetWarehouse }),
      });

      if (res.ok) {
        toast.success('Serial unit transferred successfully');
        setIsTransferModalOpen(false);
        setSelectedSerial(null);
        setTargetWarehouse('');
        fetchSerials();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to transfer serial unit');
      }
    } catch {
      toast.error('Network error transferring serial');
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">AVAILABLE</Badge>;
      case 'reserved':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">RESERVED</Badge>;
      case 'sold':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">SOLD</Badge>;
      case 'damaged':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">DAMAGED</Badge>;
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
            <Hash className="h-6 w-6 text-blue-600" />
            Serial Number Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track high-value physical units, warranties, and individual warehouse locations.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Register Serial
        </Button>
      </div>

      {/* Serials Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Status:</span>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Loading serial numbers...</p>
          </div>
        ) : serials.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Hash className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No serial numbers found</p>
            <p className="text-sm text-slate-400 mt-1">Register serial numbers on purchase receiving or manual inward entry.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Serial #</TableHead>
                <TableHead className="font-semibold text-slate-700">Product</TableHead>
                <TableHead className="font-semibold text-slate-700">Warehouse Location</TableHead>
                <TableHead className="font-semibold text-slate-700">Purchase Ref</TableHead>
                <TableHead className="font-semibold text-slate-700">Sale Ref</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serials.map((sn) => {
                const prod = products.find((p) => p.id === sn.product_id);
                const wh = warehouses.find((w) => w.id === sn.warehouse_id);

                return (
                  <TableRow key={sn.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono font-medium text-slate-900">{sn.serial_number}</TableCell>
                    <TableCell className="font-medium text-slate-900">{prod?.name || sn.product_id}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{wh?.name || sn.warehouse_id}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{sn.purchase_reference || '—'}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{sn.sale_reference || '—'}</TableCell>
                    <TableCell>{getStatusBadge(sn.status)}</TableCell>
                    <TableCell className="text-right">
                      {sn.status === 'available' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSerial(sn);
                            setIsTransferModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                          Transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Register Serial Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Serial Number</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSerial} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(val) => setFormData({ ...formData, product_id: val || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Warehouse Location *</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(val) => setFormData({ ...formData, warehouse_id: val || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse..." />
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
              <Label>Serial Number *</Label>
              <Input
                placeholder="e.g. SN-A109-9821"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Purchase / Inward Reference</Label>
              <Input
                placeholder="e.g. Bill #PB-2026-0041"
                value={formData.purchase_reference}
                onChange={(e) => setFormData({ ...formData, purchase_reference: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Serial Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Unit to Another Warehouse</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferSerial} className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-slate-500">
                Serial Number: <span className="font-mono font-bold text-slate-800">{selectedSerial?.serial_number}</span>
              </p>
            </div>
            <div className="space-y-1">
              <Label>Destination Warehouse *</Label>
              <Select value={targetWarehouse} onValueChange={(val) => setTargetWarehouse(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.id !== selectedSerial?.warehouse_id)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Transfer Unit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
