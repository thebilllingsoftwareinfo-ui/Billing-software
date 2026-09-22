'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRupeeWords } from '@/lib/utils/number-to-words';
import { Download, Printer, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentReceiptModalProps {
  paymentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentReceiptModal({ paymentId, isOpen, onClose }: PaymentReceiptModalProps) {
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentDetails(paymentId);
    } else {
      setPayment(null);
    }
  }, [isOpen, paymentId]);

  async function fetchPaymentDetails(id: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/payments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPayment(data);
      } else {
        toast.error('Failed to load payment details');
      }
    } catch (err) {
      toast.error('Error fetching payment details');
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPDF() {
    if (!paymentId) return;
    window.open(`/api/payments/${paymentId}/pdf?download=true`, '_blank');
  }

  function handlePrintReceipt() {
    if (!paymentId) return;
    const printWindow = window.open(`/api/payments/${paymentId}/pdf`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Payment Receipt
          </DialogTitle>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintReceipt} disabled={!payment}>
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
            <Button variant="default" size="sm" onClick={handleDownloadPDF} disabled={!payment}>
              <Download className="w-4 h-4 mr-1.5" /> Download PDF
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Loading payment receipt...
          </div>
        ) : !payment ? (
          <div className="py-12 text-center text-slate-500">Payment receipt details not found.</div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Header info */}
            <div className="flex flex-wrap justify-between items-start gap-4 p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Received</p>
                <p className="text-2xl font-bold text-emerald-950 mt-0.5">
                  {formatCurrency(payment.amount_paise)}
                </p>
                <p className="text-xs text-emerald-700 italic mt-1">
                  {formatRupeeWords(payment.amount_paise)}
                </p>
              </div>

              <div className="text-right space-y-1">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-medium">
                  {payment.payment_method?.toUpperCase()}
                </Badge>
                <p className="text-xs text-slate-600">Date: {payment.payment_date}</p>
                {payment.reference_number && (
                  <p className="text-xs text-slate-500">Ref #: {payment.reference_number}</p>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 text-xs border rounded-md p-3 bg-slate-50">
              <div>
                <p className="font-semibold text-slate-500 uppercase text-[10px]">Received From</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{payment.customers?.name}</p>
                {payment.customers?.gstin && <p className="text-slate-600">GSTIN: {payment.customers.gstin}</p>}
                {payment.customers?.email && <p className="text-slate-600">{payment.customers.email}</p>}
              </div>

              <div>
                <p className="font-semibold text-slate-500 uppercase text-[10px]">Receipt ID</p>
                <p className="font-mono text-slate-900 font-semibold text-sm mt-0.5">
                  REC-{payment.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-slate-600">Allocated Invoices: {payment.allocations?.length || 0}</p>
              </div>
            </div>

            {/* Allocations Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Allocated Invoices Breakdown
              </h4>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead className="text-right">Invoice Total</TableHead>
                      <TableHead className="text-right">Allocated Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payment.allocations || []).map((alloc: any, idx: number) => {
                      const inv = alloc.invoices;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-900">
                            {inv?.invoice_number || 'N/A'}
                          </TableCell>
                          <TableCell>{inv?.invoice_date || 'N/A'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv?.total_paise || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-indigo-700">
                            {formatCurrency(alloc.allocated_paise || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {payment.notes && (
              <div className="text-xs p-3 bg-slate-50 border rounded-md">
                <span className="font-semibold text-slate-700">Notes: </span>
                <span className="text-slate-600">{payment.notes}</span>
              </div>
            )}

            {/* Embedded Live PDF iFrame Preview */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Live PDF Receipt Document Preview
              </h4>
              <div className="border rounded-lg overflow-hidden bg-slate-100 h-72">
                <iframe
                  src={`/api/payments/${payment.id}/pdf`}
                  className="w-full h-full border-none"
                  title="Payment Receipt PDF Preview"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
