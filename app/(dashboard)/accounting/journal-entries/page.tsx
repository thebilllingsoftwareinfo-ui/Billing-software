'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ArrowRightLeft,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Trash2,
  RefreshCw,
  Scale
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

interface AccountOption {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalEntryLine {
  id?: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  description: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  source: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  lines: JournalEntryLine[];
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);

  // Selected Entry for View / Reverse
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Journal Entry Form State
  const [newEntryDate, setNewEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEntryDescription, setNewEntryDescription] = useState('');
  const [newEntryReference, setNewEntryReference] = useState('');
  const [newEntryLines, setNewEntryLines] = useState<JournalEntryLine[]>([
    { account_id: '', debit: 0, credit: 0, description: '' },
    { account_id: '', debit: 0, credit: 0, description: '' },
  ]);

  // Fetch Accounts for dropdown
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounting/accounts');
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  }, []);

  // Fetch Journal Entries
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/accounting/journal-entries?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
      } else {
        toast.error(data.error || 'Failed to fetch journal entries');
      }
    } catch (err) {
      console.error('Failed to load journal entries:', err);
      toast.error('Network error while loading entries');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, [fetchAccounts, fetchEntries]);

  // Calculations for Create Modal
  const totalDebitPaise = newEntryLines.reduce((sum, l) => sum + Math.round((Number(l.debit) || 0) * 100), 0);
  const totalCreditPaise = newEntryLines.reduce((sum, l) => sum + Math.round((Number(l.credit) || 0) * 100), 0);
  const totalDebit = totalDebitPaise / 100;
  const totalCredit = totalCreditPaise / 100;
  const isBalanced = totalDebitPaise > 0 && totalDebitPaise === totalCreditPaise;
  const difference = Math.abs(totalDebit - totalCredit);

  // Line item manipulation
  const handleAddLine = () => {
    setNewEntryLines(prev => [
      ...prev,
      { account_id: '', debit: 0, credit: 0, description: '' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (newEntryLines.length <= 2) {
      toast.error('A journal entry must have at least 2 lines');
      return;
    }
    setNewEntryLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    setNewEntryLines(prev => {
      const updated = [...prev];
      const line = { ...updated[index], [field]: value };
      
      // Auto-clear opposite debit/credit if entered
      if (field === 'debit' && Number(value) > 0) {
        line.credit = 0;
      } else if (field === 'credit' && Number(value) > 0) {
        line.debit = 0;
      }
      
      updated[index] = line;
      return updated;
    });
  };

  // Submit New Journal Entry
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryDescription.trim()) {
      toast.error('Description is required');
      return;
    }

    if (!isBalanced) {
      toast.error('Entry is unbalanced. Total Debit must equal Total Credit');
      return;
    }

    const invalidLines = newEntryLines.some(l => !l.account_id || (l.debit <= 0 && l.credit <= 0));
    if (invalidLines) {
      toast.error('Each line must have an account and either a debit or credit amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        entry_date: newEntryDate,
        description: newEntryDescription,
        reference_type: newEntryReference ? 'MANUAL' : undefined,
        reference_number: newEntryReference || undefined,
        lines: newEntryLines.map(l => ({
          account_id: l.account_id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || newEntryDescription,
        })),
      };

      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Journal entry ${data.entry.entry_number} posted successfully`);
        setCreateModalOpen(false);
        // Reset form
        setNewEntryDescription('');
        setNewEntryReference('');
        setNewEntryLines([
          { account_id: '', debit: 0, credit: 0, description: '' },
          { account_id: '', debit: 0, credit: 0, description: '' },
        ]);
        fetchEntries();
      } else {
        toast.error(data.error || 'Failed to post journal entry');
      }
    } catch (err) {
      console.error('Error posting entry:', err);
      toast.error('Failed to post journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reverse Journal Entry
  const handleReverseSubmit = async () => {
    if (!selectedEntry) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries/${selectedEntry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reverseReason }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Entry ${selectedEntry.entry_number} reversed. Reversal entry: ${data.reversal_entry?.entry_number}`);
        setReverseModalOpen(false);
        setReverseReason('');
        setSelectedEntry(null);
        fetchEntries();
      } else {
        toast.error(data.error || 'Failed to reverse entry');
      }
    } catch (err) {
      console.error('Error reversing entry:', err);
      toast.error('Failed to reverse entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.entry_number.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.reference_number && e.reference_number.toLowerCase().includes(q)) ||
      (e.source && e.source.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Journal Entries</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Double-Entry Ledger
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            View all posted journals, audit debits and credits, or record manual adjusting entries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEntries()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by entry #, reference, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50/50"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="POSTED">Posted</SelectItem>
              <SelectItem value="REVERSED">Reversed</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            type="date"
            placeholder="From Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[140px] text-xs"
          />
          <span className="text-gray-400 text-sm">to</span>
          <Input
            type="date"
            placeholder="To Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[140px] text-xs"
          />
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-gray-500"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-semibold text-gray-700">Date</TableHead>
              <TableHead className="font-semibold text-gray-700">Entry #</TableHead>
              <TableHead className="font-semibold text-gray-700">Reference / Source</TableHead>
              <TableHead className="font-semibold text-gray-700">Description</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Debit</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Credit</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span>Loading journal entries...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ArrowRightLeft className="w-8 h-8 text-gray-300" />
                    <span className="font-medium text-gray-700">No journal entries found</span>
                    <span className="text-xs text-gray-400">
                      {searchQuery ? 'Try adjusting your search criteria' : 'Create a new journal entry to begin'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                    {entry.entry_date}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm font-semibold text-indigo-600">
                      {entry.entry_number}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-800">
                        {entry.source || 'MANUAL'}
                      </span>
                      {entry.reference_number && (
                        <span className="text-xs text-gray-500">
                          {entry.reference_type ? `${entry.reference_type}: ` : ''}{entry.reference_number}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-gray-700">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-gray-900">
                    {formatCurrency(entry.total_debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-gray-900">
                    {formatCurrency(entry.total_credit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        entry.status === 'POSTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : entry.status === 'REVERSED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-indigo-600"
                        title="View Lines"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setViewModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {entry.status === 'POSTED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Reverse Entry"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setReverseModalOpen(true);
                          }}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Journal Entry Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              New Journal Entry
            </DialogTitle>
            <DialogDescription>
              Record a double-entry transaction. Total debits must equal total credits before posting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-6 pt-2">
            {/* Header Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Entry Date</label>
                <Input
                  type="date"
                  value={newEntryDate}
                  onChange={(e) => setNewEntryDate(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Description</label>
                <Input
                  placeholder="e.g. Monthly office rent payment or Adjusting depreciation"
                  value={newEntryDescription}
                  onChange={(e) => setNewEntryDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Reference # (Optional)</label>
                <Input
                  placeholder="e.g. CHQ-9912 or INV-REF"
                  value={newEntryReference}
                  onChange={(e) => setNewEntryReference(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[30%]">Account</TableHead>
                    <TableHead className="w-[30%]">Line Memo / Description</TableHead>
                    <TableHead className="w-[18%] text-right">Debit (₹)</TableHead>
                    <TableHead className="w-[18%] text-right">Credit (₹)</TableHead>
                    <TableHead className="w-[4%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newEntryLines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="p-2">
                        <Select
                          value={line.account_id}
                          onValueChange={(val) => handleLineChange(idx, 'account_id', val)}
                        >
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                <span className="font-mono text-indigo-600 mr-2">{acc.account_code}</span>
                                {acc.account_name} ({acc.account_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          placeholder="Memo (optional)"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          className="text-xs h-8"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ''}
                          placeholder="0.00"
                          onChange={(e) => handleLineChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                          className="text-xs h-8 text-right font-mono"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ''}
                          placeholder="0.00"
                          onChange={(e) => handleLineChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                          className="text-xs h-8 text-right font-mono"
                        />
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-rose-600"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={newEntryLines.length <= 2}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Line
              </Button>

              {/* Real-time Balancing Box */}
              <div className="flex items-center gap-6 bg-gray-50 px-4 py-2 rounded-lg border text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Total Debit</span>
                  <span className="font-mono font-semibold text-gray-900">{formatCurrency(totalDebit)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Total Credit</span>
                  <span className="font-mono font-semibold text-gray-900">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="border-l pl-4">
                  <span className="text-gray-500 text-xs block">Balance Check</span>
                  {isBalanced ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 text-xs">
                      <CheckCircle2 className="w-4 h-4" /> Balanced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-rose-600 text-xs">
                      <AlertCircle className="w-4 h-4" /> Difference: {formatCurrency(difference)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isBalanced || isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Journal Entry'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Entry Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Entry {selectedEntry?.entry_number}</span>
              </div>
              <Badge
                variant="outline"
                className={
                  selectedEntry?.status === 'POSTED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedEntry?.status === 'REVERSED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }
              >
                {selectedEntry?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Posted on {selectedEntry?.entry_date} • Source: {selectedEntry?.source || 'MANUAL'}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 pt-2">
              <div className="bg-gray-50 p-3 rounded-lg border text-sm grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block">Description</span>
                  <span className="font-medium text-gray-900">{selectedEntry.description}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Reference</span>
                  <span className="font-medium text-gray-900">
                    {selectedEntry.reference_type ? `${selectedEntry.reference_type}: ` : ''}
                    {selectedEntry.reference_number || 'None'}
                  </span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{line.account_name}</div>
                          <div className="font-mono text-xs text-indigo-600">{line.account_code}</div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {line.description || selectedEntry.description}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50/80 font-bold border-t">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right font-mono text-indigo-700">
                        {formatCurrency(selectedEntry.total_debit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-indigo-700">
                        {formatCurrency(selectedEntry.total_credit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Entry Confirmation Modal */}
      <Dialog open={reverseModalOpen} onOpenChange={setReverseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Reverse Journal Entry
            </DialogTitle>
            <DialogDescription>
              This will create a compensating journal entry with debits and credits swapped, marking {selectedEntry?.entry_number} as REVERSED. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Reason for Reversal</label>
              <Input
                placeholder="e.g. Correction of wrong account or cancelled transaction"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setReverseModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverseSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reversing...
                </>
              ) : (
                'Confirm Reversal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
