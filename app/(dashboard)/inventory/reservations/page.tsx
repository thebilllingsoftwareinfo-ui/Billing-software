'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Unlock, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StockReservationsPage() {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    fetchReservations();
  }, []);

  async function fetchReservations() {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/reservations');
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease(id: string) {
    if (!confirm('Are you sure you want to release this stock reservation? Available stock will increase immediately.')) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/reservations/${id}/release`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Reservation released successfully');
        fetchReservations();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to release reservation');
      }
    } catch {
      toast.error('Network error releasing reservation');
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-blue-600" />
            Stock Reservations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-sales commitments from Sales Orders. Reduces Available Stock without altering physical inventory.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50/75 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-blue-600 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <span className="font-semibold">Reservation Safety Invariant:</span> Reserved stock prevents accidental overselling.
          When a Sales Order converts to a Delivery Challan or Invoice, the reserved quantity is consumed automatically.
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm">Loading stock reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bookmark className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No active stock reservations</p>
            <p className="text-sm text-slate-400 mt-1">Creating confirmed Sales Orders with stock reservation enabled will list commitments here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Product</TableHead>
                <TableHead className="font-semibold text-slate-700">Warehouse</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Reserved Qty</TableHead>
                <TableHead className="font-semibold text-slate-700">Ref Type</TableHead>
                <TableHead className="font-semibold text-slate-700">Reference ID</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((res) => (
                <TableRow key={res.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">
                    {res.products?.name || res.product_id}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {res.warehouses?.name || res.warehouse_id}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-600">
                    {res.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize text-slate-600 text-sm font-medium">
                    {res.reference_type.replace('_', ' ')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {res.reference_id}
                  </TableCell>
                  <TableCell>
                    {res.status === 'active' ? (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">ACTIVE</Badge>
                    ) : (
                      <Badge variant="outline">{res.status.toUpperCase()}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {res.status === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRelease(res.id)}
                        className="text-red-600 hover:bg-red-50 h-8 text-xs"
                      >
                        <Unlock className="h-3.5 w-3.5 mr-1" />
                        Release
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
