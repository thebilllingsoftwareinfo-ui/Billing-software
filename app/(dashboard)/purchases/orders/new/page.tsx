'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface LineItemRow {
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  hsn_sac: string;
  gst_rate: number;
  is_gst_inclusive: boolean;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('Standard commercial purchase order for procurement.');
  const [terms, setTerms] = useState<string>('Payment within 30 days of receiving goods and approved purchase bill.');

  const [items, setItems] = useState<LineItemRow[]>([
    {
      description: '',
      quantity: 1,
      unit: 'PCS',
      unit_price: 0,
      discount_percent: 0,
      hsn_sac: '',
      gst_rate: 18,
      is_gst_inclusive: false,
    },
  ]);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch('/api/suppliers').then((r) => r.json()).catch(() => ({ suppliers: [] })),
          fetch('/api/products').then((r) => r.json()).catch(() => ({ products: [] })),
        ]);
        const suppList = sRes.suppliers || sRes.data || (Array.isArray(sRes) ? sRes : []);
        const prodList = pRes.products || pRes.data || (Array.isArray(pRes) ? pRes : []);
        setSuppliers(suppList);
        setProducts(prodList);
        if (suppList.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(suppList[0].id);
        }
      } catch (err) {
        console.warn('Error loading masters', err);
      }
    }
    loadMasters();
  }, []);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prod.id,
        description: prod.name || prod.description || '',
        unit: prod.primary_unit || prod.unit || 'PCS',
        unit_price: Number(prod.purchase_price || prod.price || 0),
        hsn_sac: prod.hsn_sac_code || '',
        gst_rate: Number(prod.gst_rate || 18),
        is_gst_inclusive: Boolean(prod.is_gst_inclusive),
      };
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'PCS',
        unit_price: 0,
        discount_percent: 0,
        hsn_sac: '',
        gst_rate: 18,
        is_gst_inclusive: false,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning('At least one line item is required');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live total calculation
  let subtotal = 0;
  let totalTax = 0;
  items.forEach((item) => {
    const lineGross = item.quantity * item.unit_price;
    const discount = (lineGross * item.discount_percent) / 100;
    const lineTaxable = lineGross - discount;
    const tax = (lineTaxable * item.gst_rate) / 100;
    subtotal += lineTaxable;
    totalTax += tax;
  });
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    const invalidItems = items.filter((it) => !it.description.trim() || it.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all line items have descriptions and positive quantities');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        supplier_id: selectedSupplierId,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        notes,
        terms,
        items,
      };

      const res = await fetch('/api/purchases/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create purchase order');
      }

      toast.success(`Purchase Order ${data.po_number || ''} created successfully!`);
      router.push(`/purchases/orders/${data.id || data.po_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Error creating purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases/orders">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-purple-600" />
              New Purchase Order
            </h1>
            <p className="text-xs text-slate-500">Record a formal procurement order to your vendor with expected delivery schedule</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier & Header Metadata */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-slate-900 border-b pb-2">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-700">Supplier *</Label>
              <Select value={selectedSupplierId} onValueChange={(val) => setSelectedSupplierId(val || '')}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name || s.name} {s.phone ? `(${s.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Order Date *</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Expected Delivery Date</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-semibold text-slate-900">Procurement Items</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-1.5 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-64">Item Description / Product</TableHead>
                  <TableHead className="w-24">HSN/SAC</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-28 text-right">Unit Price</TableHead>
                  <TableHead className="w-24 text-right">Disc %</TableHead>
                  <TableHead className="w-28 text-right">GST %</TableHead>
                  <TableHead className="w-32 text-right">Line Total</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const lineGross = item.quantity * item.unit_price;
                  const discount = (lineGross * item.discount_percent) / 100;
                  const lineTaxable = lineGross - discount;
                  const tax = (lineTaxable * item.gst_rate) / 100;
                  const lineTotal = lineTaxable + tax;

                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="space-y-1">
                          {products.length > 0 && (
                            <Select
                              value={item.product_id || ''}
                              onValueChange={(val) => val && handleProductSelect(idx, val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Quick Pick Product..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Input
                            placeholder="Enter description..."
                            className="h-8 text-xs"
                            value={item.description}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItems((prev) => {
                                const c = [...prev];
                                c[idx].description = v;
                                return c;
                              });
                            }}
                            required
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="HSN"
                          className="h-8 text-xs"
                          value={item.hsn_sac}
                          onChange={(e) => {
                            const v = e.target.value;
                            setItems((prev) => {
                              const c = [...prev];
                              c[idx].hsn_sac = v;
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          className="h-8 text-xs text-right"
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setItems((prev) => {
                              const c = [...prev];
                              c[idx].quantity = v;
                              return c;
                            });
                          }}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          value={item.unit}
                          onChange={(e) => {
                            const v = e.target.value;
                            setItems((prev) => {
                              const c = [...prev];
                              c[idx].unit = v;
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="h-8 text-xs text-right"
                          value={item.unit_price}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setItems((prev) => {
                              const c = [...prev];
                              c[idx].unit_price = v;
                              return c;
                            });
                          }}
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="h-8 text-xs text-right"
                          value={item.discount_percent}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setItems((prev) => {
                              const c = [...prev];
                              c[idx].discount_percent = v;
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.gst_rate.toString()}
                          onValueChange={(val) => {
                            const rate = parseFloat(val || '0');
                            setItems((prev) => {
                              const c = [...prev];
                              c[idx].gst_rate = rate;
                              return c;
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="28">28%</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-800">
                        {formatCurrency(lineTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t gap-4">
            <div className="text-xs text-slate-500 max-w-sm">
              * Note: Purchase Orders are non-financial commitment documents. Creating a PO will not debit supplier balances or modify stock until received via Purchase Bill.
            </div>
            <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total GST:</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t pt-2">
                <span>Grand Total:</span>
                <span className="text-purple-700">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <Label className="text-xs font-medium text-slate-700">Notes / Delivery Instructions</Label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-md border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
            />
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <Label className="text-xs font-medium text-slate-700">Terms & Conditions</Label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-md border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/purchases/orders">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-36 gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save & Issue Order
          </Button>
        </div>
      </form>
    </div>
  );
}
