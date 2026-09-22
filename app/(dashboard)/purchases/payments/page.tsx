'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  DollarSign,
  FileText,
  Calendar,
  Printer,
  Eye,
  Share2,
  Trash2,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';
import { PaymentOutModal } from '@/components/payments/payment-out-modal';
import { RowActionsMenu } from '@/components/common/row-actions-menu';

export default function PaymentOutDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
  }, [search, selectedType]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType && selectedType !== 'all') params.append('paymentType', selectedType);

      const res = await fetch(`/api/payments-out?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch {
      toast.error('Failed to load payment-out records');
    } finally {
      setLoading(false);
    }
  }

  const totalPaidOutPaise = payments.reduce((sum, p) => sum + (p.amount_paise || 0), 0);
  const uniqueParties = new Set(payments.map((p) => p.party_name)).size;

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete payment voucher for ${name}?`)) {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      toast.success('Payment voucher deleted');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment-Out</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Purchases & Expenses
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track and record payments made to suppliers, vendors, and parties. Manage payment vouchers and receipts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRecordModalOpen(true)}
          className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment-Out</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid Out</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPaidOutPaise)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Payment Receipts</p>
            <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parties Paid</p>
            <p className="text-2xl font-bold text-slate-900">{uniqueParties}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by party, receipt no, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Payment Types</option>
            <option value="rahul">rahul</option>
            <option value="Cash">Cash</option>
            <option value="Bank Account">Bank Account</option>
            <option value="Cheque">Cheque</option>
            <option value="UPI">UPI</option>
          </select>
        </div>
      </div>

      {/* Payment-Out Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-sm">Loading payment records...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Payment-Out vouchers found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Record payments made to suppliers or vendors for goods and services.
            </p>
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              + Record Payment-Out
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Party Name</th>
                  <th className="py-3.5 px-4">Payment Type</th>
                  <th className="py-3.5 px-4">Ref No.</th>
                  <th className="py-3.5 px-4 text-right">Amount Paid</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {p.payment_date || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      #{p.receipt_no}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>
                        <span>{p.party_name}</span>
                        {p.description && (
                          <span className="block text-xs text-slate-400 truncate max-w-xs">
                            {p.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium">
                        {p.payment_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                      {p.reference_no || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600 whitespace-nowrap">
                      {formatCurrency(p.amount_paise || 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingPayment(p)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                          title="View Voucher"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = `Payment-Out receipt #${p.receipt_no} to ${p.party_name} of ${formatCurrency(p.amount_paise)}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.party_name)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment-Out Modal matching Reference Image 1 */}
      <PaymentOutModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => fetchPayments()}
        initialReceiptNo={payments.length + 1}
      />

      {/* Voucher View Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Payment-Out Voucher</h3>
                <p className="text-xs text-slate-500">Receipt #{viewingPayment.receipt_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <Trash2 className="w-0 h-0" />
                <span>✕</span>
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Party Name</span>
                <span className="font-semibold text-slate-900">{viewingPayment.party_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900">{viewingPayment.payment_date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Type</span>
                <span className="font-semibold text-slate-900">{viewingPayment.payment_type}</span>
              </div>
              {viewingPayment.reference_no && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Reference No</span>
                  <span className="font-mono text-slate-700">{viewingPayment.reference_no}</span>
                </div>
              )}
              {viewingPayment.description && (
                <div className="py-1 border-b border-slate-100">
                  <span className="text-slate-500 block text-xs mb-1">Description</span>
                  <p className="text-slate-800 text-xs bg-slate-50 p-2 rounded">
                    {viewingPayment.description}
                  </p>
                </div>
              )}
              <div className="flex justify-between py-2 font-bold text-base bg-red-50/70 p-2 rounded">
                <span className="text-red-700">Amount Paid</span>
                <span className="text-red-700">{formatCurrency(viewingPayment.amount_paise)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
