'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Calendar,
  Layers,
  Building
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';

interface AccountOption {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
}

interface AccountingSettings {
  fiscal_year_start_month: number;
  accounting_basis: 'ACCRUAL' | 'CASH';
  auto_post_invoices: boolean;
  auto_post_purchases: boolean;
  auto_post_payments: boolean;
  auto_post_expenses: boolean;
  default_accounts: {
    sales_account_id?: string;
    purchase_account_id?: string;
    inventory_account_id?: string;
    accounts_receivable_id?: string;
    accounts_payable_id?: string;
    cash_account_id?: string;
    bank_account_id?: string;
    input_cgst_id?: string;
    input_sgst_id?: string;
    input_igst_id?: string;
    output_cgst_id?: string;
    output_sgst_id?: string;
    output_igst_id?: string;
  };
}

interface OpeningBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
}

export default function AccountingSettingsPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalanceRow[]>([]);
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSubmittingOpeningBalances, setIsSubmittingOpeningBalances] = useState(false);

  // Load initial settings and accounts
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, setRes] = await Promise.all([
        fetch('/api/accounting/accounts'),
        fetch('/api/accounting/settings'),
      ]);

      const accData = await accRes.json();
      const setData = await setRes.json();

      if (accRes.ok) {
        const fetchedAccounts: AccountOption[] = accData.accounts || [];
        setAccounts(fetchedAccounts);

        // Prepopulate opening balance rows
        setOpeningBalances(
          fetchedAccounts.map((a: any) => ({
            account_id: a.id,
            account_code: a.account_code,
            account_name: a.account_name,
            account_type: a.account_type,
            amount: a.opening_balance || 0,
            type: a.opening_balance_type || (['ASSET', 'EXPENSE'].includes(a.account_type) ? 'DEBIT' : 'CREDIT'),
          }))
        );
      }

      if (setRes.ok) {
        setSettings(setData.settings);
      }
    } catch (err) {
      console.error('Failed to load accounting settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle settings toggle & select change
  const handleToggle = (field: keyof AccountingSettings) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [field]: !settings[field],
    });
  };

  const handleDefaultAccountChange = (key: string, val: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      default_accounts: {
        ...settings.default_accounts,
        [key]: val,
      },
    });
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/accounting/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Accounting configuration updated successfully');
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Opening Balance calculation
  const totalDebitPaise = openingBalances.reduce(
    (sum, r) => (r.type === 'DEBIT' ? sum + Math.round((Number(r.amount) || 0) * 100) : sum),
    0
  );
  const totalCreditPaise = openingBalances.reduce(
    (sum, r) => (r.type === 'CREDIT' ? sum + Math.round((Number(r.amount) || 0) * 100) : sum),
    0
  );
  const totalDebit = totalDebitPaise / 100;
  const totalCredit = totalCreditPaise / 100;
  const isOpeningBalanced = totalDebitPaise === totalCreditPaise;
  const difference = Math.abs(totalDebit - totalCredit);

  // Handle Opening Balance Row change
  const handleOpeningRowChange = (index: number, field: 'amount' | 'type', value: any) => {
    setOpeningBalances((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Save Opening Balances
  const handleSaveOpeningBalances = async () => {
    if (!isOpeningBalanced) {
      toast.error('Opening balances must be balanced. Total Debits must equal Total Credits.');
      return;
    }

    const nonZeroEntries = openingBalances.filter((r) => r.amount > 0);
    if (nonZeroEntries.length === 0) {
      toast.info('No non-zero opening balances to record');
      return;
    }

    setIsSubmittingOpeningBalances(true);
    try {
      const payload = {
        as_of_date: asOfDate,
        balances: nonZeroEntries.map((r) => ({
          account_id: r.account_id,
          amount: Number(r.amount),
          type: r.type,
        })),
      };

      const res = await fetch('/api/accounting/opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Opening balances saved and journal entry posted successfully');
        loadData();
      } else {
        toast.error(data.error || 'Failed to save opening balances');
      }
    } catch (err) {
      console.error('Error saving opening balances:', err);
      toast.error('Failed to submit opening balances');
    } finally {
      setIsSubmittingOpeningBalances(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Accounting Settings</h1>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            System Configuration
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Manage fiscal year preferences, default mapping accounts, automated posting rules, and balanced opening balances.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span>Loading accounting configuration...</span>
        </div>
      ) : (
        <>
          {/* Section 1: Accounting Automation & Preferences */}
          {settings && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">General Preferences & Automation</h2>
                    <p className="text-xs text-gray-500">
                      Configure how automatic double-entry journal entries are generated from sales, purchases, and expenses.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fiscal Year & Basis */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                      Fiscal Year Starting Month
                    </label>
                    <Select
                      value={String(settings.fiscal_year_start_month)}
                      onValueChange={(val) =>
                        setSettings({ ...settings, fiscal_year_start_month: parseInt(val || '4', 10) })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January (Calendar Year)</SelectItem>
                        <SelectItem value="4">April (Standard Indian FY - Apr to Mar)</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
                      Accounting Basis
                    </label>
                    <Select
                      value={settings.accounting_basis}
                      onValueChange={(val: any) =>
                        setSettings({ ...settings, accounting_basis: val })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCRUAL">Accrual Basis (Recommended)</SelectItem>
                        <SelectItem value="CASH">Cash Basis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Auto-Posting Toggles */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Automatic Journal Posting Rules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100/70">
                      <input
                        type="checkbox"
                        checked={settings.auto_post_invoices}
                        onChange={() => handleToggle('auto_post_invoices')}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">Auto-post Sales Invoices</span>
                        <span className="text-xs text-gray-500">
                          DR Accounts Receivable / Cash, CR Sales, CR Output GST
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100/70">
                      <input
                        type="checkbox"
                        checked={settings.auto_post_purchases}
                        onChange={() => handleToggle('auto_post_purchases')}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">Auto-post Purchase Bills</span>
                        <span className="text-xs text-gray-500">
                          DR Purchase/Inventory, DR Input GST, CR Accounts Payable
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100/70">
                      <input
                        type="checkbox"
                        checked={settings.auto_post_payments}
                        onChange={() => handleToggle('auto_post_payments')}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">Auto-post Customer & Supplier Payments</span>
                        <span className="text-xs text-gray-500">
                          Synchronize AR/AP and Bank/Cash ledgers automatically
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100/70">
                      <input
                        type="checkbox"
                        checked={settings.auto_post_expenses}
                        onChange={() => handleToggle('auto_post_expenses')}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">Auto-post Business Expenses</span>
                        <span className="text-xs text-gray-500">
                          DR Expense Account, CR Cash / Bank
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Default System Accounts Mapping */}
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Default Mapping Accounts</h3>
                    <p className="text-xs text-gray-500">
                      These accounts serve as authoritative targets for automated transaction postings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Default Sales Account</label>
                      <Select
                        value={settings.default_accounts.sales_account_id || ''}
                        onValueChange={(val) => handleDefaultAccountChange('sales_account_id', val || '')}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.filter(a => a.account_type === 'INCOME').map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.account_code} - {a.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Default Purchase Account</label>
                      <Select
                        value={settings.default_accounts.purchase_account_id || ''}
                        onValueChange={(val) => handleDefaultAccountChange('purchase_account_id', val || '')}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.filter(a => a.account_type === 'EXPENSE').map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.account_code} - {a.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Accounts Receivable (Customer Ledger)</label>
                      <Select
                        value={settings.default_accounts.accounts_receivable_id || ''}
                        onValueChange={(val) => handleDefaultAccountChange('accounts_receivable_id', val || '')}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.filter(a => a.account_type === 'ASSET').map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.account_code} - {a.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Accounts Payable (Supplier Ledger)</label>
                      <Select
                        value={settings.default_accounts.accounts_payable_id || ''}
                        onValueChange={(val) => handleDefaultAccountChange('accounts_payable_id', val || '')}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.filter(a => a.account_type === 'LIABILITY').map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.account_code} - {a.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Section 2: Balanced Opening Balances Management */}
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Opening Balances Setup</h2>
                <p className="text-xs text-gray-500">
                  Set initial account balances when onboarding. Double-entry rules require Total Debits = Total Credits.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">As of Date:</label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="w-[140px] text-xs h-8"
                  />
                </div>
                <Button
                  onClick={handleSaveOpeningBalances}
                  disabled={!isOpeningBalanced || isSubmittingOpeningBalances}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  {isSubmittingOpeningBalances ? 'Posting...' : 'Post Opening Balances'}
                </Button>
              </div>
            </div>

            {/* Invariant Balance Indicator */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Total Debits</span>
                  <span className="font-mono font-bold text-gray-900">{formatCurrency(totalDebit)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Total Credits</span>
                  <span className="font-mono font-bold text-gray-900">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="border-l pl-4">
                  <span className="text-gray-500 text-xs block">Balance Status</span>
                  {isOpeningBalanced ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 text-xs">
                      <CheckCircle2 className="w-4 h-4" /> In Balance
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-rose-600 text-xs">
                      <AlertCircle className="w-4 h-4" /> Difference: {formatCurrency(difference)}
                    </span>
                  )}
                </div>
              </div>

              {!isOpeningBalanced && (
                <span className="text-xs text-rose-600 font-medium">
                  Adjust Capital / Retained Earnings to offset the difference
                </span>
              )}
            </div>

            {/* Opening Balances Table */}
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[15%]">Account Code</TableHead>
                    <TableHead className="w-[45%]">Account Name</TableHead>
                    <TableHead className="w-[15%]">Type</TableHead>
                    <TableHead className="w-[15%] text-right">Opening Balance (₹)</TableHead>
                    <TableHead className="w-[10%] text-center">Dr / Cr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openingBalances.map((row, idx) => (
                    <TableRow key={row.account_id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                        {row.account_code}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {row.account_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {row.account_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.amount || ''}
                          placeholder="0.00"
                          onChange={(e) =>
                            handleOpeningRowChange(idx, 'amount', parseFloat(e.target.value) || 0)
                          }
                          className="h-8 text-right font-mono text-xs w-36 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={row.type}
                          onValueChange={(val: any) => handleOpeningRowChange(idx, 'type', val)}
                        >
                          <SelectTrigger className="h-8 w-20 text-xs mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT">DR</SelectItem>
                            <SelectItem value="CREDIT">CR</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
