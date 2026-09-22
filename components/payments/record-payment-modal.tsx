'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({ isOpen, onClose, onSuccess }: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingInvoices, setFetchingInvoices] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [allowOverpayment, setAllowOverpayment] = useState<boolean>(false);

  // Invoices for selected customer
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({}); // invoiceId -> amountRupees

  // Load customer list on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  // Load unpaid invoices when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      fetchUnpaidInvoices(selectedCustomerId);
    } else {
      setUnpaidInvoices([]);
      setAllocations({});
    }
  }, [selectedCustomerId]);

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/customers?limit=100');
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json.customers || [];
        setCustomers(list);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  }

  async function fetchUnpaidInvoices(customerId: string) {
    try {
      setFetchingInvoices(true);
      const res = await fetch('/api/invoices?limit=100');
      if (res.ok) {
        const json = await res.json();
        const rawList = json.data || json.invoices || [];
        const customerInvs = rawList.filter((inv: any) => inv.customer_id === customerId);

        const mapped = customerInvs
          .map((inv: any) => {
            const totRupees = Number(inv.total_amount) || Number(inv.total_paise || 0) / 100;
            const paidRupees = Number(inv.amount_paid) || Number(inv.paid_paise || 0) / 100;
            const dueRupees =
              inv.balance_due !== undefined
                ? Number(inv.balance_due)
                : Math.max(0, totRupees - paidRupees);

            return {
              ...inv,
              total_paise: Math.round(totRupees * 100),
              paid_paise: Math.round(paidRupees * 100),
              balance_paise: Math.round(dueRupees * 100),
            };
          })
          .filter(
            (inv: any) =>
              inv.status !== 'draft' &&
              inv.status !== 'void' &&
              inv.status !== 'cancelled' &&
              inv.balance_paise > 0
          );

        setUnpaidInvoices(mapped);
        setAllocations({});
      }
    } catch (err) {
      toast.error('Failed to fetch customer invoices');
    } finally {
      setFetchingInvoices(false);
    }
  }

  // Auto-allocate entered amount across oldest unpaid invoices
  function handleAutoAllocate(paymentRupeesVal: number) {
    let remainingPaise = Math.round(paymentRupeesVal * 100);
    const newAllocations: Record<string, number> = {};

    for (const inv of unpaidInvoices) {
      if (remainingPaise <= 0) break;
      const invBalance = inv.balance_paise || 0;
      const allocPaise = Math.min(remainingPaise, invBalance);
      newAllocations[inv.id] = allocPaise / 100;
      remainingPaise -= allocPaise;
    }

    setAllocations(newAllocations);
  }

  function handleAmountChange(val: string) {
    setAmountRupees(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      handleAutoAllocate(num);
    }
  }

  function handleAllocationChange(invoiceId: string, val: string) {
    const num = parseFloat(val) || 0;
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: num,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    const totalAmountPaise = Math.round((parseFloat(amountRupees) || 0) * 100);
    if (totalAmountPaise <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    const allocationItems = Object.entries(allocations)
      .filter(([_, rupees]) => rupees > 0)
      .map(([invoiceId, rupees]) => ({
        invoice_id: invoiceId,
        allocated_paise: Math.round(rupees * 100),
      }));

    if (allocationItems.length === 0) {
      toast.error('Please allocate payment to at least one invoice');
      return;
    }

    const totalAllocatedPaise = allocationItems.reduce(
      (sum, item) => sum + item.allocated_paise,
      0
    );

    if (totalAllocatedPaise > totalAmountPaise) {
      toast.error('Total allocated amount exceeds recorded payment amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customer_id: selectedCustomerId,
        payment_date: paymentDate,
        amount_paise: totalAmountPaise,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        allow_overpayment: allowOverpayment,
        allocations: allocationItems,
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      toast.success('Payment recorded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  }

  const totalAllocatedRupees = Object.values(allocations).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const recordedAmountRupees = parseFloat(amountRupees) || 0;
  const unallocatedRupees = Math.max(0, recordedAmountRupees - totalAllocatedRupees);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            Record Payment Receipt
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select value={selectedCustomerId} onValueChange={(val) => setSelectedCustomerId(val || '')}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => {
                    const custName = c.display_name || c.name || 'Customer';
                    const outstandingPaise =
                      c.outstanding_paise !== undefined
                        ? c.outstanding_paise
                        : Math.round((Number(c.outstanding_balance) || 0) * 100);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {custName} {c.gstin ? `(${c.gstin})` : ''} - Outstanding: {formatCurrency(outstandingPaise)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || 'cash')}>
                <SelectTrigger id="payment_method">
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

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Received Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="e.g. 5000"
                value={amountRupees}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <Label htmlFor="reference">Ref / UTR / Cheque #</Label>
              <Input
                id="reference"
                placeholder="e.g. UTR-98218391823"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice Allocation Section */}
          <div className="border rounded-lg p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Allocate to Open Invoices</h4>
                <p className="text-xs text-slate-500">
                  Select and enter allocation amounts for customer invoices.
                </p>
              </div>

              {recordedAmountRupees > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoAllocate(recordedAmountRupees)}
                  disabled={unpaidInvoices.length === 0}
                >
                  Auto-Allocate
                </Button>
              )}
            </div>

            {fetchingInvoices ? (
              <div className="py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading customer invoices...
              </div>
            ) : unpaidInvoices.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500 bg-white border border-dashed rounded-md">
                {selectedCustomerId ? 'No open unpaid invoices for this customer.' : 'Select a customer to view open invoices.'}
              </div>
            ) : (
              <div className="border rounded-md bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100/70">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="text-right w-36">Allocated (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((inv) => {
                      const balanceRupees = (inv.balance_paise || 0) / 100;
                      const currentAlloc = allocations[inv.id] || 0;
                      const isOver = currentAlloc > balanceRupees;

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium text-slate-900">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.invoice_date}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.total_paise || 0)}</TableCell>
                          <TableCell className="text-right font-semibold text-amber-700">
                            {formatCurrency(inv.balance_paise || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              className={`text-right h-8 text-xs ${isOver ? 'border-red-500 bg-red-50' : ''}`}
                              value={currentAlloc > 0 ? currentAlloc : ''}
                              onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                              placeholder="0.00"
                            />
                            {isOver && (
                              <p className="text-[10px] text-red-600 mt-0.5 font-medium">Exceeds due</p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Allocation Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs border-t border-slate-200">
              <div className="flex gap-4">
                <span>Received: <strong className="text-slate-900 font-semibold">₹{recordedAmountRupees.toFixed(2)}</strong></span>
                <span>Allocated: <strong className="text-indigo-600 font-semibold">₹{totalAllocatedRupees.toFixed(2)}</strong></span>
                {unallocatedRupees > 0 && (
                  <span className="text-amber-700 font-medium">Unallocated: ₹{unallocatedRupees.toFixed(2)}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="overpayment"
                  checked={allowOverpayment}
                  onCheckedChange={(c: boolean) => setAllowOverpayment(!!c)}
                />
                <Label htmlFor="overpayment" className="text-xs cursor-pointer text-slate-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Allow Overpayment Policy Override
                </Label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Payment Notes</Label>
            <Input
              id="notes"
              placeholder="Internal remarks or payment confirmation note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || recordedAmountRupees <= 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
