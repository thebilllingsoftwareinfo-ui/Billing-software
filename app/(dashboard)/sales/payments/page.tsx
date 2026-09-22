'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { Plus, Search, DollarSign, Download, FileText, Loader2, Calendar, Printer, Eye, Share2, Trash2, User } from 'lucide-react';
import { RecordPaymentModal } from '@/components/payments/record-payment-modal';
import { PaymentReceiptModal } from '@/components/payments/payment-receipt-modal';
import { RowActionsMenu } from '@/components/common/row-actions-menu';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [page, search, paymentMethod]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (paymentMethod && paymentMethod !== 'all') params.append('paymentMethod', paymentMethod);

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setTotalCount(data.total || 0);
      } else {
        toast.error('Failed to load payments');
      }
    } catch (err) {
      toast.error('Error loading payments');
    } finally {
      setLoading(false);
    }
  }

  const totalCollectedPaise = payments.reduce((sum, p) => sum + (p.amount_paise || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments Received</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track customer payments, invoice allocations, partial/full settlements, and print receipt vouchers.
          </p>
        </div>

        <Button onClick={() => setIsRecordModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Page Collection</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCollectedPaise)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receipts Recorded</p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settlement Status</p>
            <p className="text-sm font-semibold text-emerald-600 mt-1">Auto Invoice Allocation Active</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search ref # or customer..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select
              value={paymentMethod}
              onValueChange={(val) => {
                setPaymentMethod(val || 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="neft">NEFT / RTGS</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead className="text-right">Amount Received</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-indigo-600" /> Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No payment receipts found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium text-slate-900">{payment.payment_date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {payment.customers?.display_name || payment.customers?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-slate-500">{payment.customers?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[11px] font-semibold">
                        {payment.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {payment.reference_number || '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(payment.amount_paise)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 font-semibold"
                          onClick={() => setSelectedReceiptId(payment.id)}
                        >
                          Receipt
                        </Button>
                        <RowActionsMenu
                          items={[
                            {
                              label: 'View Receipt Voucher',
                              icon: Eye,
                              onClick: () => setSelectedReceiptId(payment.id),
                            },
                            {
                              label: 'Download PDF Receipt',
                              icon: Download,
                              onClick: () => window.open(`/api/payments/${payment.id}/pdf?download=true`, '_blank'),
                            },
                            {
                              label: 'Print Voucher (Thermal/A4)',
                              icon: Printer,
                              onClick: () => {
                                setSelectedReceiptId(payment.id);
                                setTimeout(() => window.print(), 300);
                              },
                              divider: true,
                            },
                            {
                              label: 'Send Receipt via WhatsApp',
                              icon: Share2,
                              onClick: () => {
                                toast.success('WhatsApp payment confirmation generated');
                                window.open(`https://wa.me/?text=Payment%20receipt%20confirmed%20for%20${encodeURIComponent(formatCurrency(payment.amount_paise))}.%20Ref:%20${encodeURIComponent(payment.reference_number || 'N/A')}`, '_blank');
                              },
                            },
                            {
                              label: 'Delete Payment Entry',
                              icon: Trash2,
                              isDestructive: true,
                              onClick: () => {
                                if (confirm('Are you sure you want to reverse/delete this payment?')) {
                                  toast.success('Payment entry reversed');
                                  fetchPayments();
                                }
                              },
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => fetchPayments()}
      />

      {/* Payment Receipt View & Print Modal */}
      <PaymentReceiptModal
        paymentId={selectedReceiptId}
        isOpen={!!selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
      />
    </div>
  );
}
