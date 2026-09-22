'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, DollarSign, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseFormModalProps {
  isOpen: boolean;
  expenseToEdit?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseFormModal({
  isOpen,
  expenseToEdit,
  onClose,
  onSuccess,
}: ExpenseFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [categoryId, setCategoryId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (expenseToEdit) {
        setCategoryId(expenseToEdit.category_id || '');
        setExpenseDate(expenseToEdit.expense_date || new Date().toISOString().split('T')[0]);
        setAmountRupees(((expenseToEdit.amount_paise || 0) / 100).toString());
        setVendorName(expenseToEdit.vendor_name || '');
        setPaymentMethod(expenseToEdit.payment_method || 'cash');
        setReferenceNumber(expenseToEdit.reference_number || '');
        setNotes(expenseToEdit.description || '');
        setReceiptUrl(expenseToEdit.receipt_url || '');
      } else {
        setCategoryId('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setAmountRupees('');
        setVendorName('');
        setPaymentMethod('cash');
        setReferenceNumber('');
        setNotes('');
        setReceiptUrl('');
      }
    }
  }, [isOpen, expenseToEdit]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/expenses/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      toast.error('Failed to load expense categories');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      toast.error('Please select an expense category');
      return;
    }

    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      toast.error('Please enter a valid expense amount greater than zero');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        category_id: categoryId,
        expense_date: expenseDate,
        amount_paise: Math.round(rupees * 100),
        vendor_name: vendorName || undefined,
        description: notes || undefined,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        receipt_url: receiptUrl || undefined,
      };

      const isEdit = !!expenseToEdit;
      const url = isEdit ? `/api/expenses/${expenseToEdit.id}` : '/api/expenses';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      toast.success(`Expense ${isEdit ? 'updated' : 'recorded'} successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Expense submission failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            {expenseToEdit ? 'Edit Expense Record' : 'Record Operating Expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="category">Expense Category *</Label>
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Expense Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="e.g. 2500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="edate">Expense Date *</Label>
              <Input
                id="edate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>

            {/* Vendor */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor / Payee Name</Label>
              <Input
                id="vendor"
                placeholder="e.g. Acme Property Services"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="pmethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || 'cash')}>
                <SelectTrigger id="pmethod">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI / QR Code</SelectItem>
                  <SelectItem value="neft">NEFT / RTGS (Bank Transfer)</SelectItem>
                  <SelectItem value="card">Credit / Debit Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <Label htmlFor="ref">Ref / Receipt #</Label>
              <Input
                id="ref"
                placeholder="e.g. REC-981298"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            {/* Attachment URL */}
            <div className="space-y-1.5">
              <Label htmlFor="receipt" className="flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                Receipt Attachment Link
              </Label>
              <Input
                id="receipt"
                placeholder="https://... attachment link"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Purpose</Label>
            <Input
              id="notes"
              placeholder="e.g. Office internet bill for September"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {expenseToEdit ? 'Save Changes' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
