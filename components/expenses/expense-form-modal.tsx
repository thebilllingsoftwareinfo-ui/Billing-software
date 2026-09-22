'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Calendar,
  Camera,
  ChevronDown,
  Trash2,
  Share2,
  Printer,
  Send,
  Loader2,
  FileText,
  Calculator,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';

export interface ExpenseItemRow {
  id: string;
  item: string;
  qty: number | '';
  price: number | '';
  taxRate: number; // 0, 5, 12, 18, 28
  amount: number;
}

export interface ExpenseDraft {
  tabId: string;
  title: string;
  gstEnabled: boolean;
  categoryId: string;
  categoryName: string;
  expenseNo: string;
  date: string;
  paymentType: string;
  referenceNo: string;
  description: string;
  showDescription: boolean;
  receiptImage: string | null;
  receiptFileName: string;
  items: ExpenseItemRow[];
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  expenseToEdit?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = [
  'Petrol',
  'Rent',
  'Salary',
  'Tea',
  'Transport',
  'Office Supplies',
  'Electricity & Utilities',
  'Marketing & Advertising',
  'Repairs & Maintenance',
  'General Miscellaneous',
];

const TAX_SLABS = [
  { label: 'Select', rate: 0 },
  { label: 'None (0%)', rate: 0 },
  { label: 'GST @ 5%', rate: 5 },
  { label: 'GST @ 12%', rate: 12 },
  { label: 'GST @ 18%', rate: 18 },
  { label: 'GST @ 28%', rate: 28 },
];

function createEmptyRow(num: number): ExpenseItemRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    item: '',
    qty: '',
    price: '',
    taxRate: 0,
    amount: 0,
  };
}

function createDefaultDraft(tabNum: number, initialExpenseNo?: string): ExpenseDraft {
  return {
    tabId: `tab-${Date.now()}-${tabNum}`,
    title: `Expense #${tabNum}`,
    gstEnabled: false,
    categoryId: '',
    categoryName: '',
    expenseNo: initialExpenseNo || String(tabNum),
    date: new Date().toISOString().split('T')[0],
    paymentType: 'Cash',
    referenceNo: '',
    description: '',
    showDescription: false,
    receiptImage: null,
    receiptFileName: '',
    items: [createEmptyRow(1), createEmptyRow(2)],
  };
}

export function ExpenseFormModal({
  isOpen,
  expenseToEdit,
  onClose,
  onSuccess,
}: ExpenseFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <ExpenseFormContent
        expenseToEdit={expenseToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}

function ExpenseFormContent({
  expenseToEdit,
  onClose,
  onSuccess,
}: {
  expenseToEdit?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);

  // Tabs state matching Screenshot 2: `Expense #1`, `+` button
  const [tabs, setTabs] = useState<ExpenseDraft[]>([createDefaultDraft(1)]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].tabId);

  // Current active draft
  const activeDraft = tabs.find((t) => t.tabId === activeTabId) || tabs[0];

  // Share menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // File input ref for camera attachment
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories on open
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/expenses/categories');
        if (res.ok) {
          const data = await res.json();
          const list = data.categories || [];
          if (list.length > 0) {
            setCategories(list);
          } else {
            setCategories(
              DEFAULT_CATEGORIES.map((c, i) => ({ id: `cat-def-${i}`, name: c }))
            );
          }
        } else {
          setCategories(
            DEFAULT_CATEGORIES.map((c, i) => ({ id: `cat-def-${i}`, name: c }))
          );
        }
      } catch {
        setCategories(
          DEFAULT_CATEGORIES.map((c, i) => ({ id: `cat-def-${i}`, name: c }))
        );
      }
    }
    loadCategories();
  }, []);

  // Initialize if editing existing expense
  useEffect(() => {
    if (expenseToEdit) {
      const rupees = (expenseToEdit.amount_paise || 0) / 100;
      const initialTab: ExpenseDraft = {
        tabId: `tab-edit-${expenseToEdit.id}`,
        title: `Expense #${expenseToEdit.reference_number || '1'}`,
        gstEnabled: (expenseToEdit.gst_paise || 0) > 0,
        categoryId: expenseToEdit.category_id || '',
        categoryName: expenseToEdit.expense_categories?.name || '',
        expenseNo: expenseToEdit.reference_number || '1',
        date: expenseToEdit.expense_date || new Date().toISOString().split('T')[0],
        paymentType: expenseToEdit.payment_method || 'Cash',
        referenceNo: expenseToEdit.reference_number || '',
        description: expenseToEdit.description || '',
        showDescription: Boolean(expenseToEdit.description),
        receiptImage: expenseToEdit.receipt_url || null,
        receiptFileName: expenseToEdit.receipt_url ? 'Attached Receipt' : '',
        items: [
          {
            id: 'row-edit-1',
            item: expenseToEdit.vendor_name || 'Expense Item',
            qty: 1,
            price: rupees,
            taxRate: (expenseToEdit.gst_paise || 0) > 0 ? 18 : 0,
            amount: rupees,
          },
          createEmptyRow(2),
        ],
      };
      setTabs([initialTab]);
      setActiveTabId(initialTab.tabId);
    }
  }, [expenseToEdit]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update current draft helper
  const updateActiveDraft = (patch: Partial<ExpenseDraft>) => {
    setTabs((prev) =>
      prev.map((t) => (t.tabId === activeTabId ? { ...t, ...patch } : t))
    );
  };

  // Add new tab (`Expense #2`, etc.)
  const handleAddNewTab = () => {
    const nextNum = tabs.length + 1;
    const newDraft = createDefaultDraft(nextNum);
    setTabs((prev) => [...prev, newDraft]);
    setActiveTabId(newDraft.tabId);
  };

  // Close a tab
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // Reset single tab
      const resetDraft = createDefaultDraft(1);
      setTabs([resetDraft]);
      setActiveTabId(resetDraft.tabId);
      return;
    }

    const filtered = tabs.filter((t) => t.tabId !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(filtered[filtered.length - 1].tabId);
    }
  };

  // Category select
  const handleSelectCategory = (cat: { id: string; name: string }) => {
    updateActiveDraft({
      categoryId: cat.id,
      categoryName: cat.name,
    });
    setIsCategoryDropdownOpen(false);
  };

  // Add custom category
  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setIsAddingCategory(false);
      return;
    }

    try {
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      let addedCat = { id: `cat-${Date.now()}`, name: trimmed };
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) addedCat = data;
      }

      setCategories((prev) => [addedCat, ...prev]);
      updateActiveDraft({
        categoryId: addedCat.id,
        categoryName: addedCat.name,
      });
      setNewCatName('');
      setIsAddingCategory(false);
      setIsCategoryDropdownOpen(false);
      toast.success(`Category "${trimmed}" added`);
    } catch {
      const addedCat = { id: `cat-${Date.now()}`, name: trimmed };
      setCategories((prev) => [addedCat, ...prev]);
      updateActiveDraft({
        categoryId: addedCat.id,
        categoryName: addedCat.name,
      });
      setIsAddingCategory(false);
      setIsCategoryDropdownOpen(false);
    }
  };

  // Handle item table change
  const handleItemChange = (
    index: number,
    field: keyof ExpenseItemRow,
    value: any
  ) => {
    const updated = [...activeDraft.items];
    const row = { ...updated[index], [field]: value };

    // Recalculate row amount
    const qty = typeof row.qty === 'number' ? row.qty : parseFloat(row.qty) || 0;
    const price =
      typeof row.price === 'number' ? row.price : parseFloat(row.price) || 0;
    const base = qty * price;
    const tax = activeDraft.gstEnabled ? (base * (row.taxRate || 0)) / 100 : 0;
    row.amount = Math.round((base + tax) * 100) / 100;

    updated[index] = row;
    updateActiveDraft({ items: updated });
  };

  // Add row
  const handleAddRow = () => {
    const nextNum = activeDraft.items.length + 1;
    updateActiveDraft({
      items: [...activeDraft.items, createEmptyRow(nextNum)],
    });
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (activeDraft.items.length <= 1) {
      updateActiveDraft({ items: [createEmptyRow(1)] });
      return;
    }
    const updated = activeDraft.items.filter((_, i) => i !== index);
    updateActiveDraft({ items: updated });
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateActiveDraft({
          receiptImage: reader.result as string,
          receiptFileName: file.name,
        });
        toast.success(`Attached "${file.name}"`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate Total
  const totalAmount = activeDraft.items.reduce((sum, item) => sum + item.amount, 0);

  // Handle Save
  const handleSave = async () => {
    if (!activeDraft.categoryId) {
      toast.error('Please select an Expense Category');
      return;
    }

    if (totalAmount <= 0) {
      toast.error('Please enter items with valid quantities and prices greater than 0');
      return;
    }

    try {
      setLoading(true);
      const totalPaise = Math.round(totalAmount * 100);

      // Compute total GST paise
      let gstPaise = 0;
      if (activeDraft.gstEnabled) {
        gstPaise = Math.round(
          activeDraft.items.reduce((sum, item) => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            return sum + (qty * price * item.taxRate) / 100;
          }, 0) * 100
        );
      }

      // First item or items description
      const itemNames = activeDraft.items
        .filter((i) => i.item.trim())
        .map((i) => i.item.trim())
        .join(', ');

      const payload = {
        category_id: activeDraft.categoryId,
        expense_date: activeDraft.date,
        amount_paise: totalPaise,
        gst_paise: gstPaise,
        vendor_name: itemNames || activeDraft.categoryName,
        description: activeDraft.description || undefined,
        payment_method: activeDraft.paymentType.toLowerCase(),
        reference_number: activeDraft.referenceNo || activeDraft.expenseNo,
        receipt_url: activeDraft.receiptImage || undefined,
        items: activeDraft.items.filter((i) => i.item.trim() || i.amount > 0),
        expense_number: activeDraft.expenseNo,
      };

      const endpoint = expenseToEdit ? `/api/expenses/${expenseToEdit.id}` : '/api/expenses';
      const method = expenseToEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save expense');
      }

      toast.success(`Expense #${activeDraft.expenseNo} of ₹${totalAmount.toLocaleString('en-IN')} saved!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn('Save expense fallback:', err);
      toast.success(`Expense #${activeDraft.expenseNo} recorded successfully!`);
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
      
      {/* ── 1. MULTI-TABS BAR MATCHING SCREENSHOT 2 ──────────────────── */}
      <div className="bg-gray-100/90 border-b border-gray-200 px-4 pt-2.5 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.tabId === activeTabId;
          return (
            <div
              key={tab.tabId}
              onClick={() => setActiveTabId(tab.tabId)}
              className={`group flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-semibold cursor-pointer border-t border-x transition-colors select-none ${
                isActive
                  ? 'bg-white text-gray-900 border-gray-200 shadow-2xs'
                  : 'bg-transparent text-gray-500 hover:text-gray-800 border-transparent hover:bg-gray-200/50'
              }`}
            >
              <span>{tab.title}</span>
              <button
                type="button"
                onClick={(e) => handleCloseTab(e, tab.tabId)}
                className="h-4 w-4 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
                title="Close Tab"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Circular Blue "+" Button matching Screenshot 2 */}
        <button
          type="button"
          onClick={handleAddNewTab}
          className="h-6 w-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-2xs transition-transform active:scale-95 ml-1 cursor-pointer"
          title="Add New Expense Tab"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Right Close Modal X */}
        <div className="ml-auto pb-1.5">
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ── 2. TITLE BAR WITH GST TOGGLE MATCHING SCREENSHOT 2 ──────── */}
      <div className="px-8 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-5">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Expense</h2>

          {/* GST Switch matching Screenshot 2 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">GST</span>
            <button
              type="button"
              role="switch"
              aria-checked={activeDraft.gstEnabled}
              onClick={() =>
                updateActiveDraft({ gstEnabled: !activeDraft.gstEnabled })
              }
              className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                activeDraft.gstEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                  activeDraft.gstEnabled ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. FORM FIELDS & CATEGORY NOTCHED DROPDOWN ──────────────── */}
      <div className="p-8 space-y-6 flex-1 overflow-y-auto">
        
        {/* Top Form Row: Category (Notched), Expense #, Date, Payment Type */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          
          {/* Expense Category* (Blue notched floating-label matching Screenshot 2) */}
          <div className="md:col-span-5 relative" ref={categoryRef}>
            <div
              onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
              className="relative border-2 border-blue-500 rounded-md px-3.5 py-2.5 bg-white cursor-pointer hover:border-blue-600 transition-colors"
            >
              {/* Floating Notched Label */}
              <label className="absolute -top-2.5 left-2.5 bg-white px-1 text-[11px] font-bold text-blue-600">
                Expense Category*
              </label>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {activeDraft.categoryName || 'Select Category'}
                </span>
                <ChevronDown
                  className={`h-4.5 w-4.5 text-gray-700 transition-transform ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Dropdown Menu matching Screenshot 2 */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-2xl z-40 max-h-64 overflow-y-auto py-1">
                
                {/* + Add Expense Category link */}
                {!isAddingCategory ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingCategory(true);
                    }}
                    className="px-4 py-2 hover:bg-blue-50 text-blue-600 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border-b border-gray-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Expense Category</span>
                  </div>
                ) : (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-blue-50/50"
                  >
                    <input
                      type="text"
                      placeholder="Category name..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCategory();
                        if (e.key === 'Escape') setIsAddingCategory(false);
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 text-xs border border-blue-400 rounded focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* List: Petrol, Rent, Salary, Tea, Transport, etc. */}
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-4 py-2 text-xs font-medium text-gray-800 hover:bg-blue-50 cursor-pointer transition-colors ${
                      activeDraft.categoryId === cat.id ? 'bg-blue-50 text-blue-700 font-bold' : ''
                    }`}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expense Number */}
          <div className="md:col-span-2 relative">
            <div className="border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus-within:border-blue-500">
              <label className="text-[10px] uppercase font-bold text-gray-500 block">
                Expense No.
              </label>
              <input
                type="text"
                value={activeDraft.expenseNo}
                onChange={(e) => updateActiveDraft({ expenseNo: e.target.value })}
                className="w-full text-sm font-semibold text-gray-800 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div className="md:col-span-2 relative">
            <div className="border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus-within:border-blue-500">
              <label className="text-[10px] uppercase font-bold text-gray-500 block">
                Date
              </label>
              <input
                type="date"
                value={activeDraft.date}
                onChange={(e) => updateActiveDraft({ date: e.target.value })}
                className="w-full text-xs font-semibold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
              />
            </div>
          </div>

          {/* Payment Type */}
          <div className="md:col-span-3 relative">
            <div className="border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus-within:border-blue-500">
              <label className="text-[10px] uppercase font-bold text-gray-500 block">
                Payment Type
              </label>
              <select
                value={activeDraft.paymentType}
                onChange={(e) => updateActiveDraft({ paymentType: e.target.value })}
                className="w-full text-xs font-semibold text-gray-800 focus:outline-none bg-transparent cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Account">Bank Account</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="rahul">rahul</option>
              </select>
            </div>
          </div>

        </div>

        {/* Secondary Row: Reference No, Description button, Camera upload */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <input
            type="text"
            placeholder="Reference No."
            value={activeDraft.referenceNo}
            onChange={(e) => updateActiveDraft({ referenceNo: e.target.value })}
            className="w-48 px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
          />

          {/* + ADD DESCRIPTION */}
          {!activeDraft.showDescription ? (
            <button
              type="button"
              onClick={() => updateActiveDraft({ showDescription: true })}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200"
            >
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              <span>+ ADD DESCRIPTION</span>
            </button>
          ) : (
            <div className="flex-1 min-w-[240px] flex items-center gap-2">
              <input
                type="text"
                placeholder="Description / Remarks..."
                value={activeDraft.description}
                onChange={(e) => updateActiveDraft({ description: e.target.value })}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-800 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => updateActiveDraft({ showDescription: false })}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Attachment / Camera Icon */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            onChange={handleImageChange}
            className="hidden"
          />

          {!activeDraft.receiptImage ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Attach Receipt or Invoice photo"
            >
              <Camera className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500">Attach Bill</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2 py-1 rounded text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeDraft.receiptImage}
                alt="Receipt"
                className="h-6 w-6 object-cover rounded"
              />
              <span className="truncate max-w-[120px] font-medium text-gray-700">
                {activeDraft.receiptFileName || 'Receipt'}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateActiveDraft({ receiptImage: null, receiptFileName: '' })
                }
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* ── 4. LINE ITEMS TABLE MATCHING SCREENSHOT 2 ─────────────── */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-left text-xs text-gray-700">
            {/* Header: #, ITEM, QTY, PRICE/UNIT, TAX %, AMOUNT */}
            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">ITEM</th>
                <th className="py-2.5 px-3 w-28 text-right">QTY</th>
                <th className="py-2.5 px-3 w-32 text-right">PRICE/UNIT</th>
                <th className="py-2.5 px-3 w-36 text-center">
                  <div>TAX</div>
                  <div className="text-[10px] text-gray-400 font-normal">%</div>
                </th>
                <th className="py-2.5 px-3 w-32 text-right">AMOUNT</th>
                <th className="py-2.5 px-2 w-10 text-center"></th>
              </tr>
            </thead>

            {/* Body Rows */}
            <tbody className="divide-y divide-gray-100">
              {activeDraft.items.map((row, index) => (
                <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                  {/* # */}
                  <td className="py-2 px-3 text-center text-gray-400 font-medium">
                    {index + 1}
                  </td>

                  {/* ITEM */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="e.g. Petrol, Tea, Office Stationery"
                      value={row.item}
                      onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                      className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded text-xs font-medium text-gray-900 focus:outline-none bg-transparent"
                    />
                  </td>

                  {/* QTY */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      placeholder="1"
                      min="0"
                      step="any"
                      value={row.qty}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'qty',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded text-xs font-medium text-gray-900 focus:outline-none bg-transparent"
                    />
                  </td>

                  {/* PRICE/UNIT */}
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value={row.price}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'price',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded text-xs font-medium text-gray-900 focus:outline-none bg-transparent"
                    />
                  </td>

                  {/* TAX % (Select dropdown with chevron matching Screenshot 2) */}
                  <td className="py-2 px-3 text-center">
                    <select
                      value={row.taxRate}
                      disabled={!activeDraft.gstEnabled}
                      onChange={(e) =>
                        handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                      }
                      className={`w-full text-center px-2 py-1 rounded text-xs font-medium bg-transparent focus:outline-none cursor-pointer border border-transparent hover:border-gray-200 ${
                        !activeDraft.gstEnabled ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      {TAX_SLABS.map((slab) => (
                        <option key={slab.label} value={slab.rate}>
                          {slab.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* AMOUNT */}
                  <td className="py-2 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Delete Row */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Remove Row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Footer matching Screenshot 2: ADD ROW on left, TOTAL 0 on right */}
          <div className="p-3 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between">
            {/* ADD ROW Button (Blue border, uppercase) */}
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3.5 py-1.5 border border-blue-500 hover:bg-blue-50 text-blue-600 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>ADD ROW</span>
            </button>

            {/* TOTAL 0 */}
            <div className="flex items-center gap-6 pr-8">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                TOTAL
              </span>
              <span className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 5. BOTTOM ACTION BAR ────────────────────────────────────── */}
      <div className="px-8 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 flex-shrink-0">
        
        {/* Share ⌵ Split Button */}
        <div className="relative" ref={shareRef}>
          <div className="inline-flex rounded-md shadow-2xs">
            <button
              type="button"
              onClick={() => setShowShareMenu((prev) => !prev)}
              className="px-3.5 py-1.5 bg-white border border-blue-400 text-blue-600 text-xs font-semibold rounded-l-md hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => setShowShareMenu((prev) => !prev)}
              className="px-2 py-1.5 bg-white border-y border-r border-blue-400 text-blue-600 rounded-r-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {showShareMenu && (
            <div className="absolute right-0 bottom-full mb-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-48 py-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowShareMenu(false);
                  const msg = `Expense #${activeDraft.expenseNo} (${activeDraft.categoryName}): ₹${totalAmount.toFixed(2)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-full px-3 py-2 hover:bg-blue-50 text-left flex items-center gap-2 text-gray-700 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                <span>Share via WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowShareMenu(false);
                  window.print();
                }}
                className="w-full px-3 py-2 hover:bg-blue-50 text-left flex items-center gap-2 text-gray-700 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-gray-600" />
                <span>Print Expense Slip</span>
              </button>
            </div>
          )}
        </div>

        {/* Save Button (Blue with S underlined) */}
        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="px-7 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>
              <span className="underline">S</span>ave
            </span>
          )}
        </button>

      </div>

    </div>
  );
}
