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
import { ArrowLeft, Plus, Trash2, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface LineItemRow {
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_rupees: number;
  discount_pct: number;
  hsn_sac: string;
  gst_rate: number;
  gst_type: 'exclusive' | 'inclusive';
}

export default function CreateQuotationPage() {
  const router = router_hook();
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quotationDate, setQuotationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days valid
  );
  const [notes, setNotes] = useState<string>('Thank you for considering our estimate.');
  const [terms, setTerms] = useState<string>('Valid for 30 days. Payment terms: 100% on invoice delivery.');

  const [items, setItems] = useState<LineItemRow[]>([
    {
      description: '',
      quantity: 1,
      unit: 'PCS',
      unit_price_rupees: 0,
      discount_pct: 0,
      hsn_sac: '',
      gst_rate: 18,
      gst_type: 'exclusive',
    },
  ]);

  function router_hook() {
    return useRouter();
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch('/api/customers?limit=100'),
        fetch('/api/products?limit=100'),
      ]);

      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData.customers || []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
    } catch (err) {
      toast.error('Failed to load customers/products');
    }
  }

  function handleAddRow() {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit: 'PCS',
        unit_price_rupees: 0,
        discount_pct: 0,
        hsn_sac: '',
        gst_rate: 18,
        gst_type: 'exclusive',
      },
    ]);
  }

  function handleRemoveRow(index: number) {
    if (items.length === 1) {
      toast.error('At least one line item is required');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleProductSelect(index: number, productId: string) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          product_id: prod.id,
          description: prod.name,
          unit: prod.unit || 'PCS',
          unit_price_rupees: (prod.selling_price_paise || 0) / 100,
          hsn_sac: prod.hsn_sac || '',
          gst_rate: prod.gst_rate || 18,
        };
      })
    );
  }

  function handleItemChange(index: number, field: keyof LineItemRow, value: any) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  }

  // Live Summary Calculations
  let subtotalRupees = 0;
  let taxRupees = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price_rupees) || 0;
    const discPct = Number(item.discount_pct) || 0;
    const gstRate = Number(item.gst_rate) || 0;

    const baseAmount = qty * price * (1 - discPct / 100);
    subtotalRupees += baseAmount;
    taxRupees += baseAmount * (gstRate / 100);
  });

  const grandTotalRupees = subtotalRupees + taxRupees;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (items.some((i) => !i.description || i.quantity <= 0)) {
      toast.error('Please fill in valid item descriptions and quantities');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customer_id: selectedCustomerId,
        quotation_date: quotationDate,
        valid_until: validUntil || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items: items.map((item) => ({
          product_id: item.product_id || undefined,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price_paise: Math.round(item.unit_price_rupees * 100),
          discount_pct: item.discount_pct,
          hsn_sac: item.hsn_sac || undefined,
          gst_rate: item.gst_rate,
          gst_type: item.gst_type,
        })),
      };

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create quotation');
      }

      toast.success('Quotation created successfully!');
      router.push(`/sales/quotations/${data.quotation_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Quotation creation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales/quotations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Quotation</h1>
            <p className="text-xs text-slate-500">
              Prepare a formal estimate or quote with GST tax calculations for your client.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Quote Header Details */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="customer">Customer *</Label>
            <Select value={selectedCustomerId} onValueChange={(val) => setSelectedCustomerId(val || '')}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.gstin ? `(${c.gstin})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qdate">Quotation Date *</Label>
            <Input
              id="qdate"
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="valid">Valid Until Date</Label>
            <Input
              id="valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Line Items Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Line Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
              <Plus className="w-4 h-4 mr-1" /> Add Row
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-64">Item / Product</TableHead>
                  <TableHead className="w-24">HSN/SAC</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-24 text-right">Rate (₹)</TableHead>
                  <TableHead className="w-20 text-right">Disc %</TableHead>
                  <TableHead className="w-24 text-right">GST %</TableHead>
                  <TableHead className="w-28 text-right">Amount (₹)</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row, idx) => {
                  const qty = Number(row.quantity) || 0;
                  const price = Number(row.unit_price_rupees) || 0;
                  const disc = Number(row.discount_pct) || 0;
                  const lineTotal = qty * price * (1 - disc / 100);

                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="space-y-1">
                          <Select
                            onValueChange={(val: any) => handleProductSelect(idx, String(val || ''))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Quick select product..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} (₹{(p.selling_price_paise / 100).toFixed(2)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Description..."
                            className="h-8 text-xs"
                            value={row.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            required
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Input
                          placeholder="HSN"
                          className="h-8 text-xs"
                          value={row.hsn_sac}
                          onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)}
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs text-right"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs text-right"
                          value={row.unit_price_rupees || ''}
                          onChange={(e) => handleItemChange(idx, 'unit_price_rupees', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          className="h-8 text-xs text-right"
                          value={row.discount_pct || ''}
                          onChange={(e) => handleItemChange(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>

                      <TableCell>
                        <Select
                          value={row.gst_rate.toString()}
                          onValueChange={(val) => handleItemChange(idx, 'gst_rate', parseFloat(val || '0'))}
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

                      <TableCell className="text-right font-semibold text-slate-900">
                        ₹{lineTotal.toFixed(2)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRow(idx)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Dynamic Summary Cards */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-4 border-t">
            <div className="w-full md:w-1/2 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Input
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full md:w-80 bg-slate-50 p-4 rounded-lg border space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Base:</span>
                <span className="font-semibold text-slate-900">₹{subtotalRupees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Est. Tax (GST):</span>
                <span className="font-semibold text-slate-900">₹{taxRupees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-indigo-600">₹{grandTotalRupees.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/sales/quotations">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save & Create Quotation
          </Button>
        </div>
      </form>
    </div>
  );
}
