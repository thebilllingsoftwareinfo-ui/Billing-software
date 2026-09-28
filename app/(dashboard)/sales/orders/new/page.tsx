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
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingCart, CheckCircle2 } from 'lucide-react';
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

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('27');
  const [notes, setNotes] = useState<string>('Standard commercial sales order.');
  const [terms, setTerms] = useState<string>('Goods once sold will be dispatched against confirmed delivery challan or invoice.');

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
        const [cRes, pRes] = await Promise.all([
          fetch('/api/customers').then((r) => r.json()).catch(() => ({ customers: [] })),
          fetch('/api/products').then((r) => r.json()).catch(() => ({ products: [] })),
        ]);
        const custList = cRes.customers || cRes.data || (Array.isArray(cRes) ? cRes : []);
        const prodList = pRes.products || pRes.data || (Array.isArray(pRes) ? pRes : []);
        setCustomers(custList);
        setProducts(prodList);
        if (custList.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custList[0].id);
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
        unit_price: Number(prod.sale_price || prod.price || 0),
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
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
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
        customer_id: selectedCustomerId,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        place_of_supply: placeOfSupply,
        notes,
        terms,
        items,
      };

      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sales order');
      }

      toast.success(`Sales Order ${data.order_number || ''} created successfully!`);
      router.push(`/sales/orders/${data.id || data.order_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Error creating sales order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales/orders">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
              New Sales Order
            </h1>
            <p className="text-xs text-slate-500">Record a confirmed customer order with reserved inventory items</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Basic Information Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Customer *</Label>
            <Select value={selectedCustomerId} onValueChange={(val) => setSelectedCustomerId(val || '')}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.display_name || c.name} {c.phone ? `(${c.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Order Date *</Label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="bg-slate-50 border-slate-200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Expected Delivery Date</Label>
            <Input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Order Line Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-1.5 h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[30%]">Item & Description</TableHead>
                <TableHead className="w-[12%]">Qty</TableHead>
                <TableHead className="w-[10%]">Unit</TableHead>
                <TableHead className="w-[15%]">Price (₹)</TableHead>
                <TableHead className="w-[12%]">Disc %</TableHead>
                <TableHead className="w-[12%]">GST %</TableHead>
                <TableHead className="w-[9%] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="space-y-1">
                    {products.length > 0 && (
                      <Select
                        value={item.product_id || ''}
                        onValueChange={(val) => val && handleProductSelect(idx, val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-slate-50 mb-1">
                          <SelectValue placeholder="Quick select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (Stock: {p.current_stock || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      placeholder="Item description *"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[idx].description = e.target.value;
                        setItems(copy);
                      }}
                      className="h-8 text-xs"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[idx].quantity = parseFloat(e.target.value) || 0;
                        setItems(copy);
                      }}
                      className="h-8 text-xs"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.unit}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[idx].unit = e.target.value;
                        setItems(copy);
                      }}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unit_price}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[idx].unit_price = parseFloat(e.target.value) || 0;
                        setItems(copy);
                      }}
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount_percent}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[idx].discount_percent = parseFloat(e.target.value) || 0;
                        setItems(copy);
                      }}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.gst_rate.toString()}
                      onValueChange={(val) => {
                        const copy = [...items];
                        copy[idx].gst_rate = parseFloat(val || '0');
                        setItems(copy);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Nil)</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Notes, Terms & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Order Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes or customer remarks..."
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Terms & Conditions</Label>
              <Input
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Delivery & payment terms..."
                className="bg-white"
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Financial Summary</h4>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Taxable Subtotal:</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Estimated GST Tax:</span>
              <span className="font-mono">{formatCurrency(totalTax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t pt-2">
              <span>Order Grand Total:</span>
              <span className="font-mono text-indigo-600">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save & Confirm Sales Order
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
