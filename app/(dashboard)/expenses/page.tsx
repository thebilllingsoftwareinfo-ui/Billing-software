'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import {
  Plus,
  Search,
  DollarSign,
  PieChart,
  FolderPlus,
  Loader2,
  Archive,
  ArchiveRestore,
  Pencil,
  Paperclip,
  ExternalLink,
  Copy,
  Printer,
  Trash2,
} from 'lucide-react';
import { ExpenseFormModal } from '@/components/expenses/expense-form-modal';
import { ManageCategoriesModal } from '@/components/expenses/manage-categories-modal';
import { RowActionsMenu } from '@/components/common/row-actions-menu';
import { toast } from 'sonner';

export default function ExpensesDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);

  // Summaries
  const [summaries, setSummaries] = useState<any>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsFormModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInitialData();
  }, [page, search, selectedCategory, paymentMethod, showArchived]);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (selectedCategory && selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (paymentMethod && paymentMethod !== 'all') params.append('paymentMethod', paymentMethod);
      if (showArchived) params.append('archived', 'true');

      const [expRes, catRes, sumRes] = await Promise.all([
        fetch(`/api/expenses?${params.toString()}`),
        fetch('/api/expenses/categories'),
        fetch('/api/expenses/summary'),
      ]);

      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
        setTotalCount(data.total || 0);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummaries(sumData);
      }
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveToggle(expense: any) {
    try {
      const isArchiving = !expense.is_archived;
      const res = await fetch(`/api/expenses/${expense.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: isArchiving }),
      });

      if (res.ok) {
        toast.success(`Expense ${isArchiving ? 'archived' : 'restored'} successfully`);
        fetchInitialData();
      } else {
        toast.error('Failed to toggle archive state');
      }
    } catch (err) {
      toast.error('Error modifying archive state');
    }
  }

  function handleEditClick(expense: any) {
    setExpenseToEdit(expense);
    setIsFormModalOpen(true);
  }

  function handleDuplicateExpense(expense: any) {
    const duplicated = {
      ...expense,
      id: `exp-${Date.now()}`,
      reference_number: expense.reference_number ? `${expense.reference_number}-COPY` : `EXP-${Date.now().toString().slice(-4)}`,
      expense_date: new Date().toISOString().split('T')[0],
    };
    setExpenses((prev) => [duplicated, ...prev]);
    toast.success('Expense voucher duplicated!');
  }

  function handleDeleteExpense(expense: any) {
    if (!confirm(`Are you sure you want to delete expense record for ${expense.vendor_name || 'this item'}?`)) return;
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    toast.success('Expense record deleted');
  }

  function handlePrintExpense(expense: any) {
    toast.info(`Preparing voucher print for ${expense.reference_number || 'expense'}...`);
    window.print();
  }

  function handleCreateClick() {
    setExpenseToEdit(null);
    setIsFormModalOpen(true);
  }

  const monthlyTotPaise = summaries?.monthlySummary?.totalAmountPaise || 0;
  const topCatName = summaries?.monthlySummary?.topCategory || 'N/A';
  const categoryBreakdown = summaries?.categorySummary || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operating Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track business overheads, vendor payouts, category breakdowns, and receipt attachments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            <FolderPlus className="w-4 h-4 mr-2 text-indigo-600" /> Categories
          </Button>
          <Button onClick={handleCreateClick} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Record Expense
          </Button>
        </div>
      </div>

      {/* KPI & Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Operating Expenses</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyTotPaise)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Expense Category</p>
            <p className="text-xl font-bold text-slate-900 truncate max-w-44">{topCatName}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expense Records Count</p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown Progress Cards */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Expense Breakdown by Category
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {categoryBreakdown.slice(0, 4).map((cat: any) => (
              <div key={cat.categoryId} className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span className="truncate">{cat.name}</span>
                  <span>{cat.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, cat.percentage)}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-slate-900 text-right">
                  {formatCurrency(cat.amountPaise)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Directory & Table Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search vendor, ref #, or notes..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val || 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentMethod}
              onValueChange={(val) => {
                setPaymentMethod(val || 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
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

            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowArchived(!showArchived);
                setPage(1);
              }}
            >
              <Archive className="w-4 h-4 mr-1.5" />
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor / Payee</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-indigo-600" /> Loading expenses...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No operating expense records found.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((e) => (
                  <TableRow key={e.id} className={e.is_archived ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50/80'}>
                    <TableCell className="font-medium text-slate-900">{e.expense_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                        {e.expense_categories?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {e.vendor_name || '—'}
                      {e.description && (
                        <p className="text-xs text-slate-500 font-normal truncate max-w-xs">{e.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[11px]">
                        {e.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {e.reference_number || '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(e.amount_paise)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        {e.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(e.receipt_url, '_blank')}
                            title="View Receipt Attachment"
                          >
                            <Paperclip className="w-4 h-4 text-indigo-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(e)}
                          title="Edit Expense"
                        >
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </Button>
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Edit Expense',
                              icon: Pencil,
                              onClick: () => handleEditClick(e),
                            },
                            {
                              label: 'Duplicate Expense',
                              icon: Copy,
                              onClick: () => handleDuplicateExpense(e),
                            },
                            ...(e.receipt_url
                              ? [
                                  {
                                    label: 'Open Receipt File',
                                    icon: Paperclip,
                                    onClick: () => window.open(e.receipt_url, '_blank'),
                                  },
                                ]
                              : []),
                            {
                              label: 'Print Voucher',
                              icon: Printer,
                              onClick: () => handlePrintExpense(e),
                              divider: true,
                            },
                            {
                              label: e.is_archived ? 'Restore Expense' : 'Archive Expense',
                              icon: e.is_archived ? ArchiveRestore : Archive,
                              onClick: () => handleArchiveToggle(e),
                            },
                            {
                              label: 'Delete Expense',
                              icon: Trash2,
                              onClick: () => handleDeleteExpense(e),
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

      {/* Record/Edit Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        expenseToEdit={expenseToEdit}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => fetchInitialData()}
      />

      {/* Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => fetchInitialData()}
      />
    </div>
  );
}
