'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Scale,
  RefreshCw,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  opening_balance: number;
  opening_balance_type: 'DEBIT' | 'CREDIT';
  current_balance: number;
  is_system_account: boolean;
  is_active: boolean;
  description?: string;
}

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>('ASSET');
  const [formOpeningBalance, setFormOpeningBalance] = useState('0');
  const [formBalanceType, setFormBalanceType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [formDescription, setFormDescription] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== 'all') params.set('account_type', typeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/accounting/accounts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading Chart of Accounts');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function handleOpenCreate() {
    setEditingAccount(null);
    setFormCode('');
    setFormName('');
    setFormType('ASSET');
    setFormOpeningBalance('0');
    setFormBalanceType('DEBIT');
    setFormDescription('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(acc: Account) {
    setEditingAccount(acc);
    setFormCode(acc.account_code);
    setFormName(acc.account_name);
    setFormType(acc.account_type);
    setFormOpeningBalance(String(acc.opening_balance || 0));
    setFormBalanceType(acc.opening_balance_type || 'DEBIT');
    setFormDescription(acc.description || '');
    setIsModalOpen(true);
  }

  async function handleSubmitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Account Code and Account Name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        account_code: formCode.trim(),
        account_name: formName.trim(),
        account_type: formType,
        opening_balance: parseFloat(formOpeningBalance) || 0,
        opening_balance_type: formBalanceType,
        description: formDescription.trim() || undefined,
      };

      if (editingAccount) {
        const res = await fetch(`/api/accounting/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update account');
        }
        toast.success(`Account ${payload.account_code} updated successfully`);
      } else {
        const res = await fetch('/api/accounting/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create account');
        }
        toast.success(`Account ${payload.account_code} created successfully`);
      }

      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'ASSET':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ASSET</Badge>;
      case 'LIABILITY':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">LIABILITY</Badge>;
      case 'EQUITY':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">EQUITY</Badge>;
      case 'INCOME':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">INCOME</Badge>;
      case 'EXPENSE':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">EXPENSE</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  }

  const assetCount = accounts.filter((a) => a.account_type === 'ASSET').length;
  const liabilityCount = accounts.filter((a) => a.account_type === 'LIABILITY').length;
  const incomeCount = accounts.filter((a) => a.account_type === 'INCOME').length;
  const expenseCount = accounts.filter((a) => a.account_type === 'EXPENSE').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chart of Accounts</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            General ledger master accounts for double-entry bookkeeping, trial balance, and financial reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/accounting/journal-entries')}
            className="text-xs font-semibold gap-1.5"
          >
            <FileText className="h-4 w-4 text-slate-600" />
            Journal Entries
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Asset Accounts</div>
          <div className="text-xl font-bold text-blue-700 mt-1">{assetCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Cash, Bank, AR, Inventory</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Liability Accounts</div>
          <div className="text-xl font-bold text-amber-700 mt-1">{liabilityCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Accounts Payable, GST liabilities</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Income Accounts</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{incomeCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Sales Revenue & Other Income</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Expense Accounts</div>
          <div className="text-xl font-bold text-rose-700 mt-1">{expenseCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Purchases, Rent, Payroll, Utilities</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search code or account name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Account Types</SelectItem>
              <SelectItem value="ASSET">Assets</SelectItem>
              <SelectItem value="LIABILITY">Liabilities</SelectItem>
              <SelectItem value="EQUITY">Equity</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expenses</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            className="text-xs gap-1.5"
            title="Refresh accounts"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Accounts Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-xs">
                  Loading Chart of Accounts...
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-xs">
                  No accounts found matching your filter.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((acc) => (
                <TableRow key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-slate-800">
                    {acc.account_code}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-xs text-slate-900">{acc.account_name}</div>
                    {acc.description && (
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{acc.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{getTypeBadge(acc.account_type)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-slate-900">
                    {formatCurrency(Math.round((acc.current_balance || 0) * 100))}
                  </TableCell>
                  <TableCell>
                    {acc.is_system_account ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500" title="Protected System Account">
                        <Lock className="h-3 w-3 text-slate-400" /> System
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Custom</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {acc.is_active ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/accounting/general-ledger?account_id=${acc.id}`)}
                        className="h-7 px-2 text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        title="View General Ledger"
                      >
                        Ledger <ArrowUpRight className="h-3 w-3 ml-0.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(acc)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                        title="Edit Account"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Account Modal (Create / Edit) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingAccount ? 'Edit Account' : 'New General Ledger Account'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingAccount
                ? 'Update account metadata and description.'
                : 'Define a new double-entry account in your Chart of Accounts.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAccount} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Account Code *</label>
                <Input
                  placeholder="e.g. 1090"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  disabled={editingAccount?.is_system_account}
                  className="mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Account Type *</label>
                <Select
                  value={formType}
                  onValueChange={(val: any) => setFormType(val)}
                  disabled={editingAccount?.is_system_account}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Account Name *</label>
              <Input
                placeholder="e.g. Office Equipment"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>

            {!editingAccount && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Opening Balance (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Balance Type</label>
                  <Select value={formBalanceType} onValueChange={(val: any) => setFormBalanceType(val)}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBIT">Debit (Dr)</SelectItem>
                      <SelectItem value="CREDIT">Credit (Cr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Input
                placeholder="Optional notes or accounting context"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                {isSubmitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
