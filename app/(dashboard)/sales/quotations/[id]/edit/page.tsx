'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
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

export default function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quotationDate, setQuotationDate] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('');

  const [items, setItems] = useState<LineItemRow[]>([]);

  useEffect(() => {
    fetchQuotationAndMasters();
  }, [id]);

  async function fetchQuotationAndMasters() {
    try {
      setLoading(true);
      const [qRes, custRes, prodRes] = await Promise.all([
        fetch(`/api/quotations/${id}`),
        fetch('/api/customers?limit=100'),
        fetch('/api/products?limit=100'),
      ]);

      if (!qRes.ok) throw new Error('Quotation not found');
      const quotation = await qRes.json();

      if (['converted', 'accepted', 'rejected'].includes(quotation.status)) {
        toast.error(`Cannot edit quotation in ${quotation.status.toUpperCase()} status.`);
        router.push(`/sales/quotations/${id}`);
        return;
      }

      if (custRes.ok) {
        const cData = await custRes.json();
        setCustomers(cData.customers || []);
      }
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.products || []);
      }

      setSelectedCustomerId(quotation.customer_id);
      setQuotationDate(quotation.quotation_date);
      setValidUntil(quotation.valid_until || '');
      setNotes(quotation.notes || '');
      setTerms(quotation.terms || '');

      const mappedItems = (quotation.quotation_line_items || []).map((item: any) => ({
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unit_price_rupees: Number(item.unit_price_paise || 0) / 100,
        discount_pct: Number(item.discount_pct || 0),
        hsn_sac: item.hsn_sac || '',
        gst_rate: Number(item.gst_rate || 0),
        gst_type: item.gst_type || 'exclusive',
      }));

      setItems(mappedItems.length > 0 ? mappedItems : [
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
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

  function handleItemChange(index: number, field: keyof LineItemRow, value: any) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    try {
      setSaving(true);
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

      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update quotation');
      }

      toast.success('Quotation updated successfully!');
      router.push(`/sales/quotations/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading quotation editor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <Link href={`/sales/quotations/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Quotation</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  <TableHead className="w-64">Item / Description</TableHead>
                  <TableHead className="w-24">HSN/SAC</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-24 text-right">Rate (₹)</TableHead>
                  <TableHead className="w-20 text-right">Disc %</TableHead>
                  <TableHead className="w-24 text-right">GST %</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        placeholder="Description..."
                        className="h-8 text-xs"
                        value={row.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        required
                      />
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
                        onValueChange={(val: any) => handleItemChange(idx, 'gst_rate', parseFloat(val || '0'))}
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
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`/sales/quotations/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
