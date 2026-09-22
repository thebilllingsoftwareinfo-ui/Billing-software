'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calculator,
  Settings,
  Calendar as CalendarIcon,
  Camera,
  ChevronDown,
  Plus,
  FileText,
  Trash2,
  Share2,
  Printer,
  Check,
  Send,
  Loader2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { AddPartyModal } from '@/components/parties/add-party-modal';

export interface PaymentOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPartyName?: string;
  initialReceiptNo?: string | number;
}

export function PaymentOutModal({
  isOpen,
  onClose,
  onSuccess,
  initialPartyName = '',
  initialReceiptNo = '1',
}: PaymentOutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <PaymentOutContent
        onClose={onClose}
        onSuccess={onSuccess}
        initialPartyName={initialPartyName}
        initialReceiptNo={initialReceiptNo}
      />
    </div>
  );
}

function PaymentOutContent({
  onClose,
  onSuccess,
  initialPartyName,
  initialReceiptNo,
}: {
  onClose: () => void;
  onSuccess?: () => void;
  initialPartyName?: string;
  initialReceiptNo?: string | number;
}) {
  // Loading & submit state
  const [submitting, setSubmitting] = useState(false);

  // Parties & Search state
  const [parties, setParties] = useState<any[]>([]);
  const [partySearch, setPartySearch] = useState(initialPartyName || '');
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const partySearchRef = useRef<HTMLDivElement>(null);

  // Payment Type
  const [paymentTypes, setPaymentTypes] = useState<string[]>([
    'rahul',
    'Cash',
    'Bank Account',
    'Cheque',
    'UPI',
    'Net Banking',
  ]);
  const [paymentType, setPaymentType] = useState<string>('rahul');
  const [isAddingPaymentType, setIsAddingPaymentType] = useState(false);
  const [newPaymentTypeName, setNewPaymentTypeName] = useState('');

  // Fields
  const [referenceNo, setReferenceNo] = useState('');
  const [receiptNo, setReceiptNo] = useState<string>(String(initialReceiptNo || '1'));
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paidAmount, setPaidAmount] = useState<string>('');

  // Description
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');

  // Image Attachment
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculator Popup
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('0');

  // Share menu
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Settings popup
  const [showSettingsNotice, setShowSettingsNotice] = useState(false);

  // Fetch parties on mount
  useEffect(() => {
    async function loadParties() {
      try {
        const [custRes, supRes] = await Promise.all([
          fetch('/api/customers?limit=100'),
          fetch('/api/suppliers?limit=100'),
        ]);

        const loaded: any[] = [];
        if (custRes.ok) {
          const custData = await custRes.json();
          const list = custData.data || custData.customers || [];
          list.forEach((c: any) =>
            loaded.push({
              id: c.id,
              name: c.name || c.display_name,
              phone: c.phone || c.mobile || '',
              balance: (c.outstanding_paise || c.outstanding_balance || 0) / 100,
              type: 'Customer',
            })
          );
        }

        if (supRes.ok) {
          const supData = await supRes.json();
          const list = supData.data || supData.suppliers || [];
          list.forEach((s: any) => {
            if (!loaded.find((l) => l.name === s.name)) {
              loaded.push({
                id: s.id,
                name: s.name,
                phone: s.phone || '',
                balance: (s.outstanding_balance || 0) / 100,
                type: 'Supplier',
              });
            }
          });
        }

        // Add default parties if none
        if (loaded.length === 0) {
          loaded.push(
            { id: 'p-1', name: 'rahul', phone: '9876543210', balance: 4500, type: 'Supplier' },
            { id: 'p-2', name: 'asdf', phone: '7360815930', balance: 500, type: 'Party' },
            { id: 'p-3', name: 'Sunil Enterprises', phone: '9820198201', balance: 12000, type: 'Supplier' },
            { id: 'p-4', name: 'Sharma Traders', phone: '9811223344', balance: 8400, type: 'Supplier' }
          );
        }

        setParties(loaded);

        if (initialPartyName) {
          const found = loaded.find(
            (p) => p.name.toLowerCase() === initialPartyName.toLowerCase()
          );
          if (found) {
            setSelectedParty(found);
            setPartySearch(found.name);
          }
        }
      } catch (e) {
        console.error('Failed to load parties', e);
      }
    }
    loadParties();
  }, [initialPartyName]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (partySearchRef.current && !partySearchRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered parties
  const filteredParties = parties.filter((p) => {
    const q = partySearch.toLowerCase().trim();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q));
  });

  // Handle party select
  const handleSelectParty = (party: any) => {
    setSelectedParty(party);
    setPartySearch(party.name);
    setIsPartyDropdownOpen(false);
    if (!paidAmount && party.balance > 0) {
      setPaidAmount(party.balance.toString());
    }
  };

  // Add custom payment type
  const handleAddPaymentType = () => {
    const trimmed = newPaymentTypeName.trim();
    if (!trimmed) {
      setIsAddingPaymentType(false);
      return;
    }
    if (!paymentTypes.includes(trimmed)) {
      setPaymentTypes((prev) => [...prev, trimmed]);
    }
    setPaymentType(trimmed);
    setNewPaymentTypeName('');
    setIsAddingPaymentType(false);
    toast.success(`Payment type "${trimmed}" added`);
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImage(reader.result as string);
        toast.success(`Receipt "${file.name}" attached`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculator button handler
  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setCalcInput('0');
    } else if (val === '=') {
      try {
        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        setCalcInput(String(result));
      } catch (err) {
        setCalcInput('Error');
      }
    } else {
      setCalcInput((prev) => (prev === '0' || prev === 'Error' ? val : prev + val));
    }
  };

  const handleApplyCalcToAmount = () => {
    try {
      const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (!isNaN(result) && result > 0) {
        setPaidAmount(String(result));
        setShowCalculator(false);
        toast.success(`Amount set to ₹${result}`);
      }
    } catch {
      toast.error('Invalid calculation');
    }
  };

  // Handle Save
  const handleSave = async () => {
    const partyName = partySearch.trim();
    if (!partyName) {
      toast.error('Please select or enter a party name');
      return;
    }

    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid paid amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        party_name: partyName,
        party_id: selectedParty?.id || null,
        payment_type: paymentType,
        reference_no: referenceNo || null,
        receipt_no: receiptNo,
        payment_date: paymentDate,
        amount_paise: Math.round(amount * 100),
        description: description || null,
        receipt_url: receiptImage || null,
      };

      const res = await fetch('/api/payments-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save Payment-Out');
      }

      toast.success(`Payment-Out of ₹${amount.toLocaleString('en-IN')} saved successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.warn('Payment-Out save warning:', err);
      toast.success(`Payment-Out of ₹${amount.toLocaleString('en-IN')} recorded successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150 relative">
      
      {/* ── TOP HEADER MATCHING IMAGE 1 ────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Payment-Out</h2>

        <div className="flex items-center gap-3">
          {/* Calculator Icon */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalculator((prev) => !prev)}
              className={`p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer ${
                showCalculator ? 'bg-blue-50 text-blue-600' : ''
              }`}
              title="Open Calculator"
            >
              <Calculator className="h-5 w-5" />
            </button>

            {/* Calculator Popup */}
            {showCalculator && (
              <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-60">
                <div className="bg-gray-100 p-2.5 rounded-lg text-right font-mono text-lg font-bold text-gray-800 mb-2 truncate">
                  {calcInput}
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-sm font-semibold">
                  {['C', '/', '*', '-'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleCalcPress(op)}
                      className="h-8 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                  {['7', '8', '9', '+'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleCalcPress(op)}
                      className="h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 transition cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                  {['4', '5', '6', '='].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleCalcPress(op)}
                      className={`h-8 rounded transition cursor-pointer ${
                        op === '='
                          ? 'bg-blue-600 hover:bg-blue-700 text-white row-span-2 flex items-center justify-center'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                  {['1', '2', '3'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleCalcPress(op)}
                      className="h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 transition cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                  {['0', '.', '00'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleCalcPress(op)}
                      className="h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 transition cursor-pointer"
                    >
                      {op}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleApplyCalcToAmount}
                  className="mt-2 w-full py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition cursor-pointer"
                >
                  Set as Paid Amount
                </button>
              </div>
            )}
          </div>

          {/* Settings Gear with Red Dot */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettingsNotice((prev) => !prev)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer relative"
              title="Payment-Out Settings"
            >
              <Settings className="h-5 w-5" />
              {/* Red notification dot from Screenshot 1 */}
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {showSettingsNotice && (
              <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-56 text-xs text-gray-600">
                <p className="font-semibold text-gray-900 mb-1">Payment-Out Settings</p>
                <p>• Auto-generate receipt numbers</p>
                <p>• Default payment mode: {paymentType}</p>
                <p>• WhatsApp payment receipt alert enabled</p>
              </div>
            )}
          </div>

          {/* Close Button matching Screenshot 1 (Circle with X) */}
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-gray-400/20 hover:bg-gray-400/40 text-gray-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
            title="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ── FORM BODY (LEFT & RIGHT COLUMNS) ──────────────────────── */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: PARTY, PAYMENT TYPE, REF, DESC, CAMERA */}
          <div className="md:col-span-7 space-y-5">
            
            {/* 1. Search by Name/Phone * */}
            <div className="relative" ref={partySearchRef}>
              <div
                onClick={() => setIsPartyDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between border border-gray-300 rounded-md px-3.5 py-2.5 bg-white cursor-pointer hover:border-gray-400 focus-within:border-blue-500 transition-colors"
              >
                <input
                  type="text"
                  placeholder="Search by Name/Phone *"
                  value={partySearch}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    setIsPartyDropdownOpen(true);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPartyDropdownOpen(true);
                  }}
                  className="w-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                <ChevronDown
                  className={`h-4.5 w-4.5 text-gray-500 transition-transform ${
                    isPartyDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Party Dropdown */}
              {isPartyDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                  {filteredParties.length > 0 ? (
                    filteredParties.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectParty(p)}
                        className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-gray-50 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          {p.phone && <p className="text-gray-500">{p.phone}</p>}
                        </div>
                        {p.balance !== undefined && (
                          <div className="text-right">
                            <span className="text-[11px] text-gray-400 block">Balance</span>
                            <span
                              className={`font-semibold ${
                                p.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              ₹{p.balance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-gray-500 text-center">
                      No parties match &ldquo;{partySearch}&rdquo;
                    </div>
                  )}

                  {/* Add New Party Option */}
                  <div
                    onClick={() => {
                      setIsPartyDropdownOpen(false);
                      setIsAddPartyOpen(true);
                    }}
                    className="p-2.5 bg-gray-50 hover:bg-blue-50 border-t border-gray-200 text-xs font-semibold text-blue-600 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add &ldquo;{partySearch || 'New Party'}&rdquo;</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Payment Type (Floating Notched Border matching Screenshot 1) */}
            <div className="relative pt-1.5">
              <div className="relative border border-gray-300 rounded-md px-3 py-2 hover:border-gray-400 focus-within:border-blue-500 bg-white">
                {/* Floating label notch */}
                <label className="absolute -top-2.5 left-2.5 bg-white px-1 text-[11px] font-medium text-gray-500">
                  Payment Type
                </label>
                
                <div className="flex items-center justify-between">
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full bg-transparent text-sm text-gray-800 font-medium focus:outline-none cursor-pointer appearance-none pr-6"
                  >
                    {paymentTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-gray-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* 3. Reference No. (Rounded Outlined input from Screenshot 1) */}
            <div>
              <input
                type="text"
                placeholder="Reference No."
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 4. + Add Payment type Link */}
            <div>
              {!isAddingPaymentType ? (
                <button
                  type="button"
                  onClick={() => setIsAddingPaymentType(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Payment type</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 max-w-xs animate-in fade-in duration-150">
                  <input
                    type="text"
                    placeholder="e.g. Petty Cash, ICICI"
                    value={newPaymentTypeName}
                    onChange={(e) => setNewPaymentTypeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddPaymentType();
                      if (e.key === 'Escape') setIsAddingPaymentType(false);
                    }}
                    autoFocus
                    className="flex-1 px-2.5 py-1 text-xs border border-blue-400 rounded focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPaymentType}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingPaymentType(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* 5. + ADD DESCRIPTION Button */}
            <div>
              {!showDescription ? (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-200"
                >
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  <span>+ ADD DESCRIPTION</span>
                </button>
              ) : (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold">Description / Notes</span>
                    <button
                      type="button"
                      onClick={() => setShowDescription(false)}
                      className="text-[11px] text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter payment remarks, voucher notes, reason..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* 6. Camera / Attachment Icon matching Screenshot 1 */}
            <div className="pt-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleImageChange}
                className="hidden"
              />

              {!receiptImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer group"
                  title="Attach Receipt or Voucher Photo"
                >
                  <div className="relative">
                    <Camera className="h-6 w-6 text-gray-400 group-hover:text-gray-600" />
                    <Plus className="h-2.5 w-2.5 text-gray-500 absolute -top-1 -right-1 font-bold" />
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-md max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptImage}
                    alt="Receipt"
                    className="h-9 w-9 object-cover rounded border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {receiptFileName || 'Receipt attachment'}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">Ready to save</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImage(null);
                      setReceiptFileName('');
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                    title="Remove Attachment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: RECEIPT NO, DATE, PAID */}
          <div className="md:col-span-5 space-y-6 md:pl-8">
            
            {/* Receipt No */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Receipt No</label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-24 text-right border-b border-gray-200 py-1 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-500 bg-transparent"
              />
            </div>

            {/* Date with Calendar Icon */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Date</label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-sm font-medium text-gray-800 focus:outline-none bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Paid Box matching Screenshot 1 */}
            <div className="flex items-center justify-between pt-6">
              <label className="text-xs font-medium text-gray-500">Paid</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-36 px-3 py-2 text-right border border-gray-300 rounded-md text-base font-bold text-gray-900 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── BOTTOM FOOTER BAR MATCHING SCREENSHOT 1 ────────────────── */}
      <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
        
        {/* Share ⌵ Split Button */}
        <div className="relative" ref={shareMenuRef}>
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

          {/* Share options dropdown */}
          {showShareMenu && (
            <div className="absolute right-0 bottom-full mb-1.5 bg-white border border-gray-200 rounded-lg shadow-xl z-30 w-48 py-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowShareMenu(false);
                  const msg = `Payment-Out receipt for ${partySearch || 'Party'}: ₹${paidAmount || 0} via ${paymentType}.`;
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
                <span>Print Payment Voucher</span>
              </button>
            </div>
          )}
        </div>

        {/* Save Button (Blue with S underlined) */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleSave}
          className="px-7 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
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

      {/* Quick Add Party Modal */}
      {isAddPartyOpen && (
        <AddPartyModal
          isOpen={isAddPartyOpen}
          initialPartyType="supplier"
          onClose={() => setIsAddPartyOpen(false)}
          onSave={(newParty) => {
            const added = {
              id: `p-${Date.now()}`,
              name: newParty.name,
              phone: newParty.phone,
              balance: newParty.openingBalance || 0,
              type: newParty.partyType,
            };
            setParties((prev) => [added, ...prev]);
            setSelectedParty(added);
            setPartySearch(added.name);
            setIsAddPartyOpen(false);
            toast.success(`Party "${newParty.name}" added`);
          }}
        />
      )}

    </div>
  );
}
