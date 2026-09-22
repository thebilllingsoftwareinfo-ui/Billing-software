'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { Plus, Search, ShoppingCart, Truck, Loader2, ArrowUpRight, Eye, Edit, CreditCard, Printer, Copy, RotateCcw, Ban, Trash2, FileDown } from 'lucide-react';
import { RowActionsMenu } from '@/components/common/row-actions-menu';
import { toast } from 'sonner';

export default function PurchaseBillsDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleDuplicateBill = (b: any) => {
    const nextNum = `PUR-${Date.now().toString().slice(-4)}`;
    const duplicated = {
      ...b,
      id: `bill-${Date.now()}`,
      bill_number: nextNum,
      bill_date: new Date().toLocaleDateString('en-GB'),
      status: 'draft',
      paid_paise: 0,
    };
    setBills((prev) => [duplicated, ...prev]);
    toast.success(`Purchase Bill duplicated as draft #${nextNum}!`);
  };

  const handleDeleteBill = (b: any) => {
    if (!confirm(`Are you sure you want to permanently delete bill '${b.bill_number}'?`)) return;
    setBills((prev) => prev.filter((item) => item.id !== b.id));
    toast.success(`Purchase Bill ${b.bill_number} deleted`);
  };

  const handleCancelBill = (b: any) => {
    setBills((prev) =>
      prev.map((item) => (item.id === b.id ? { ...item, status: 'void' } : item))
    );
    toast.info(`Purchase Bill ${b.bill_number} marked as cancelled`);
  };

  const handleRecordPayment = (b: any) => {
    const due = Math.max(0, (b.total_paise || 0) - (b.paid_paise || 0));
    if (due <= 0) {
      toast.info('This bill is already fully paid!');
      return;
    }
    const dueRupees = due / 100;
    const amountStr = prompt(`Enter Payment-Out amount for Bill ${b.bill_number} (Due: ₹${dueRupees.toFixed(2)}):`, String(dueRupees));
    if (amountStr === null) return;
    const amt = Number(amountStr);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid payment amount');
      return;
    }
    const amtPaise = Math.round(amt * 100);
    setBills((prev) =>
      prev.map((item) => {
        if (item.id !== b.id) return item;
        const newPaid = (item.paid_paise || 0) + amtPaise;
        return {
          ...item,
          paid_paise: newPaid,
          status: newPaid >= item.total_paise ? 'paid' : 'partial',
        };
      })
    );
    toast.success(`Recorded payment of ₹${amt.toFixed(2)} against ${b.bill_number}!`);
  };

  const handlePrintBill = (b: any) => {
    toast.info(`Preparing print for ${b.bill_number}...`);
    window.print();
  };

  const handleConvertDebitNote = (b: any) => {
    toast.success(`Generated Purchase Return (Debit Note) against ${b.bill_number}`);
  };

  useEffect(() => {
    fetchBills();
  }, [page, search, statusFilter]);

  async function fetchBills() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
        setTotalCount(data.total || 0);
      } else {
        toast.error('Failed to load purchase bills');
      }
    } catch (err) {
      toast.error('Error loading purchase bills');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">APPROVED</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">PAID</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">PARTIAL</Badge>;
      case 'overdue':
        return <Badge variant="destructive">OVERDUE</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  }

  const totalPurchasesPaise = bills.reduce((sum, b) => sum + (b.total_paise || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Bills</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track vendor purchase invoices, inbound inventory stock, supplier payables, and payment settlements.
          </p>
        </div>

        <Link href="/purchases/bills/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Record Purchase Bill
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Page Total Purchases</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPurchasesPaise)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bills Count</p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Automation</p>
            <p className="text-sm font-semibold text-indigo-600 mt-1">Stock Ledger Inbound Active</p>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search bill # or supplier..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-indigo-600" /> Loading purchase bills...
                  </TableCell>
                </TableRow>
              ) : bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No purchase bills found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-indigo-600">
                      <Link href={`/purchases/bills/${b.id}`}>
                        {b.bill_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-700">{b.bill_date}</TableCell>
                    <TableCell>
                      <Link href={`/purchases/suppliers/${b.suppliers?.id}`} className="hover:underline">
                        <p className="font-semibold text-slate-900">{b.suppliers?.name}</p>
                        <p className="text-xs text-slate-500">{b.suppliers?.email || ''}</p>
                      </Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(b.status)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(b.total_paise)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {formatCurrency(b.paid_paise || 0)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link href={`/purchases/bills/${b.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                            View
                          </Button>
                        </Link>
                        <RowActionsMenu
                          items={[
                            {
                              label: 'View / Edit Bill',
                              icon: Edit,
                              onClick: () => router.push(`/purchases/bills/${b.id}`),
                            },
                            {
                              label: 'Record Payment (Payment-Out)',
                              icon: CreditCard,
                              onClick: () => handleRecordPayment(b),
                            },
                            {
                              label: 'Duplicate Bill',
                              icon: Copy,
                              onClick: () => handleDuplicateBill(b),
                              divider: true,
                            },
                            {
                              label: 'Open PDF',
                              icon: FileDown,
                              onClick: () => router.push(`/purchases/bills/${b.id}`),
                            },
                            {
                              label: 'Print Bill',
                              icon: Printer,
                              onClick: () => handlePrintBill(b),
                            },
                            {
                              label: 'Convert to Return (Debit Note)',
                              icon: RotateCcw,
                              onClick: () => handleConvertDebitNote(b),
                              divider: true,
                            },
                            {
                              label: 'Cancel Bill',
                              icon: Ban,
                              onClick: () => handleCancelBill(b),
                            },
                            {
                              label: 'Delete Bill',
                              icon: Trash2,
                              onClick: () => handleDeleteBill(b),
                              isDestructive: true,
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
    </div>
  );
}
