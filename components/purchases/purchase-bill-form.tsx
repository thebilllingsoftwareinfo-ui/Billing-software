'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ShoppingCart,
  Barcode,
  ScanLine,
  ChevronDown,
  PlusCircle,
  X,
  Maximize2,
  Minimize2,
  MapPin,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { lookupProductByBarcode } from '@/lib/services/barcode.service';
import { STANDARD_UNITS } from '@/lib/services/unit.service';
import { STANDARD_GST_RATES } from '@/lib/services/tax.service';
import { INDIAN_STATES, filterIndianStates, IndianState } from '@/lib/constants/indian-states';
import { AddItemView } from '@/components/products/add-item-view';
import { AddPartyModal, PartyData } from '@/components/parties/add-party-modal';

interface PurchaseLineRow {
  product_id?: string;
  category?: string;
  description: string;
  quantity: number | '';
  unit: string;
  purchase_price_rupees: number | '';
  discount_pct: number | '';
  discount_amount?: number | '';
  hsn_sac: string;
  gst_rate: number | '';
  gst_type: 'exclusive' | 'inclusive';
  primary_unit?: string;
  secondary_unit?: string;
  conversion_rate?: number;
}

interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
  state?: string;
}

const DEFAULT_PARTIES: PartyOption[] = [
  {
    id: 'p-abhi',
    name: 'abhi',
    phone: '12345678',
    gstin: '',
    state: 'Maharashtra',
  },
  {
    id: 'p-asdf',
    name: 'asdf',
    phone: '7360815930',
    gstin: '',
    state: 'Maharashtra',
  },
  {
    id: 'p-sunil',
    name: 'Sunil Enterprises',
    phone: '9820198201',
    gstin: '27AABCS1429B1Z8',
    state: 'Maharashtra',
  },
  {
    id: 'p-pooja',
    name: 'Pooja Jewellers & Gems',
    phone: '9819098190',
    gstin: '27AADCP8812A1ZX',
    state: 'Maharashtra',
  },
];

const SAMPLE_PRODUCTS = [
  {
    id: 'prod-sample-1',
    name: 'Cotton Round Neck T-Shirt',
    category: 'Apparel',
    sku: 'TSHIRT-01',
    hsn_sac: '6109',
    purchase_price_paise: 28000,
    purchase_price: 280,
    sale_price: 450,
    gst_rate: 5,
    unit: 'PCS',
  },
  {
    id: 'prod-sample-2',
    name: 'Ceramic Coffee Mug 350ml',
    category: 'Ceramics',
    sku: 'MUG-02',
    hsn_sac: '6912',
    purchase_price_paise: 9500,
    purchase_price: 95,
    sale_price: 180,
    gst_rate: 18,
    unit: 'PCS',
  },
  {
    id: 'prod-sample-3',
    name: 'Wireless Optical Mouse',
    category: 'Electronics',
    sku: 'MOUSE-03',
    hsn_sac: '8471',
    purchase_price_paise: 32000,
    purchase_price: 320,
    sale_price: 550,
    gst_rate: 18,
    unit: 'PCS',
  },
  {
    id: 'prod-sample-4',
    name: 'Stainless Steel Ball Valve 1/2"',
    category: 'Hardware',
    sku: 'VALVE-04',
    hsn_sac: '8481',
    purchase_price_paise: 16000,
    purchase_price: 160,
    sale_price: 260,
    gst_rate: 18,
    unit: 'PCS',
  },
  {
    id: 'prod-sample-5',
    name: 'Hardcover Notebook A5 Rule',
    category: 'Stationery',
    sku: 'NOTE-05',
    hsn_sac: '4820',
    purchase_price_paise: 11000,
    purchase_price: 110,
    sale_price: 220,
    gst_rate: 12,
    unit: 'PCS',
  },
];

export function PurchaseBillForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  

  // Parties state
  const [parties, setParties] = useState<PartyOption[]>(DEFAULT_PARTIES);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [partySearchText, setPartySearchText] = useState<string>('');
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const partyInputRef = useRef<HTMLDivElement>(null);

  // Place of Supply state
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('Maharashtra (27)');
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const stateInputRef = useRef<HTMLDivElement>(null);

  // Products state
  const [products, setProducts] = useState<any[]>(SAMPLE_PRODUCTS);

  // Bill metadata
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');

  // Barcode quick scan state
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Price Tax Mode: Without Tax vs With Tax
  const [priceTaxMode, setPriceTaxMode] = useState<'without_tax' | 'with_tax'>('without_tax');
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpwards: boolean;
  } | null>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  // Helper for empty line item
  const createEmptyLineItem = (): PurchaseLineRow => ({
    product_id: '',
    category: 'ALL',
    description: '',
    quantity: '' as any,
    unit: 'PCS',
    purchase_price_rupees: '' as any,
    discount_pct: '' as any,
    discount_amount: '' as any,
    hsn_sac: '',
    gst_rate: 18,
    gst_type: priceTaxMode === 'with_tax' ? 'inclusive' : 'exclusive',
    primary_unit: '',
    secondary_unit: '',
    conversion_rate: 1,
  });

  const [items, setItems] = useState<PurchaseLineRow[]>([
    createEmptyLineItem(),
    createEmptyLineItem(),
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [custRes, suppRes, prodRes] = await Promise.all([
        fetch('/api/customers?limit=200'),
        fetch('/api/suppliers?limit=200'),
        fetch('/api/products?limit=200'),
      ]);

      const combinedParties: PartyOption[] = [...DEFAULT_PARTIES];

      if (custRes.ok) {
        const cData = await custRes.json();
        const cList = cData.data || cData.customers || [];
        cList.forEach((c: any) => {
          if (!combinedParties.some((p) => p.name.toLowerCase() === (c.display_name || c.name || '').toLowerCase())) {
            combinedParties.push({
              id: c.id,
              name: c.display_name || c.name,
              phone: c.phone || '',
              gstin: c.gstin || '',
              state: c.place_of_supply || c.state || (c.customer_addresses?.[0]?.state) || '',
            });
          }
        });
      }

      if (suppRes.ok) {
        const sData = await suppRes.json();
        const sList = sData.suppliers || sData.data || [];
        sList.forEach((s: any) => {
          if (!combinedParties.some((p) => p.name.toLowerCase() === (s.name || '').toLowerCase())) {
            combinedParties.push({
              id: s.id,
              name: s.name,
              phone: s.phone || '',
              gstin: s.gstin || '',
              state: s.state || s.state_code || '',
            });
          }
        });
      }

      setParties(combinedParties);

      if (prodRes.ok) {
        const pData = await prodRes.json();
        const pList = pData.data || pData.products || [];
        if (pList.length > 0) {
          setProducts(pList);
        }
      }
    } catch {
      // Fallbacks already initialized
    }
  }

  // Floating dropdown positioning calculation
  const updateDropdownCoords = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 280;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > spaceBelow;

    setDropdownCoords({
      top: openUpwards ? Math.max(10, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left: Math.max(10, Math.min(rect.left, window.innerWidth - 370)),
      width: Math.max(rect.width, 360),
      openUpwards,
    });
  };

  // Close floating dropdowns on outside click or scroll
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        itemDropdownRef.current &&
        !itemDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveItemDropdown(null);
      }
      if (
        partyInputRef.current &&
        !partyInputRef.current.contains(event.target as Node)
      ) {
        setShowPartySuggestions(false);
      }
      if (
        stateInputRef.current &&
        !stateInputRef.current.contains(event.target as Node)
      ) {
        setShowStateSuggestions(false);
      }
    }

    function handleScrollOrResize(e: Event) {
      if (itemDropdownRef.current && itemDropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setActiveItemDropdown(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Filtered parties based on partySearchText
  const filteredParties = useMemo(() => {
    const q = partySearchText.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  }, [parties, partySearchText]);

  // Filtered states based on placeOfSupply search
  const filteredStates = useMemo(() => {
    return filterIndianStates(placeOfSupply);
  }, [placeOfSupply]);

  const handleSelectParty = (p: PartyOption) => {
    setSelectedPartyId(p.id);
    setPartySearchText(p.name);
    setShowPartySuggestions(false);
    if (p.state) {
      const match = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === p.state?.toLowerCase() || s.code === p.state
      );
      if (match) {
        setPlaceOfSupply(`${match.name} (${match.code})`);
      } else {
        setPlaceOfSupply(p.state);
      }
    }
  };

  const handleSaveNewParty = (newParty: PartyData) => {
    const partyId = `party-${Date.now()}`;
    const newEntry: PartyOption = {
      id: partyId,
      name: newParty.name,
      phone: newParty.phone,
      gstin: newParty.gstin,
      state: newParty.state,
    };
    setParties((prev) => [newEntry, ...prev]);
    handleSelectParty(newEntry);
    setIsAddPartyModalOpen(false);
    toast.success(`Party "${newParty.name}" added successfully!`);
  };

  // Available categories extracted from products + standard
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    set.add('ALL');
    products.forEach((p: any) => {
      if (p.category) set.add(p.category);
      if (p.product_categories?.name) set.add(p.product_categories.name);
    });
    return Array.from(set);
  }, [products]);

  const UNIT_OPTIONS = useMemo(() => {
    const list = ['NONE', 'PCS'];
    STANDARD_UNITS.forEach((u) => {
      if (!list.includes(u.short_name)) list.push(u.short_name);
    });
    return list;
  }, []);

  // Auto-add new row when interacting with the last row
  const handleRowInteraction = (index: number) => {
    if (index === items.length - 1) {
      setItems((prev) => [...prev, createEmptyLineItem()]);
    }
  };

  function handleAddRow() {
    setItems((prev) => [...prev, createEmptyLineItem()]);
  }

  function handleRemoveRow(index: number) {
    if (items.length === 1) {
      toast.error('At least one line item is required');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (activeItemDropdown === index) {
      setActiveItemDropdown(null);
    }
  }

  // Active item catalog products filter for floating dropdown
  const activeFilteredProducts = useMemo(() => {
    if (activeItemDropdown === null || !items[activeItemDropdown]) return products;
    const currentItem = items[activeItemDropdown];
    const q = (currentItem.description || '').trim().toLowerCase();

    let filtered = products;

    if (q) {
      filtered = filtered.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const hsnMatch = (p.hsn_sac || p.hsn_sac_code) ? (p.hsn_sac || p.hsn_sac_code).includes(q) : false;
        const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        const aliasesMatch = Array.isArray(p.barcodes) && p.barcodes.some((b: string) => b && b.toLowerCase().includes(q));
        return nameMatch || skuMatch || hsnMatch || barcodeMatch || aliasesMatch;
      });
    }

    if (currentItem.category && currentItem.category !== 'ALL') {
      const catMatches = filtered.filter((p) => {
        const cat = (p as any).category || (p as any).product_categories?.name;
        return cat && cat.toLowerCase() === currentItem.category?.toLowerCase();
      });
      if (catMatches.length > 0) {
        return catMatches;
      }
    }

    return filtered;
  }, [activeItemDropdown, items, products]);

  const handleProductSelect = (index: number, productId: string, directProduct?: any) => {
    const prod = directProduct || products.find((p) => p.id === productId);
    if (!prod) return;

    const defaultUnit =
      (prod as any).purchase_unit ||
      (prod as any).primary_unit ||
      prod.product_units?.abbreviation ||
      (prod as any).unit ||
      'PCS';

    const priceRupees =
      prod.purchase_price_paise !== undefined && prod.purchase_price_paise !== null
        ? prod.purchase_price_paise / 100
        : (prod.purchase_price ?? prod.cost_price ?? (prod.selling_price_paise ? prod.selling_price_paise / 100 : prod.sale_price ?? 0));

    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        product_id: prod.id,
        description: prod.name,
        category: (prod as any).category || (prod as any).product_categories?.name || next[index].category || 'ALL',
        hsn_sac: prod.hsn_sac || prod.hsn_sac_code || '',
        quantity: next[index].quantity === '' ? 1 : next[index].quantity,
        purchase_price_rupees: Number(priceRupees) || 0,
        gst_rate: Number(prod.gst_rate) !== undefined ? Number(prod.gst_rate) : 18,
        unit: defaultUnit,
        primary_unit: (prod as any).primary_unit || '',
        secondary_unit: (prod as any).secondary_unit || '',
        conversion_rate: (prod as any).conversion_rate || 1,
      };
      return next;
    });
    setActiveItemDropdown(null);
  };

  const handleItemChange = (index: number, field: keyof PurchaseLineRow, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // Two-way discount synchronization
  const handleDiscountPercentChange = (idx: number, pctVal: string) => {
    handleRowInteraction(idx);
    setItems((prev) => {
      const next = [...prev];
      const it = { ...next[idx] };
      if (pctVal === '') {
        it.discount_pct = '';
        it.discount_amount = '';
      } else {
        const p = parseFloat(pctVal) || 0;
        it.discount_pct = p;
        const q = Number(it.quantity) || 1;
        const pr = Number(it.purchase_price_rupees) || 0;
        it.discount_amount = pr > 0 ? Math.round(((q * pr * p) / 100) * 100) / 100 : '';
      }
      next[idx] = it;
      return next;
    });
  };

  const handleDiscountAmountChange = (idx: number, amtVal: string) => {
    handleRowInteraction(idx);
    setItems((prev) => {
      const next = [...prev];
      const it = { ...next[idx] };
      if (amtVal === '') {
        it.discount_amount = '';
        it.discount_pct = '';
      } else {
        const a = parseFloat(amtVal) || 0;
        it.discount_amount = a;
        const q = Number(it.quantity) || 1;
        const pr = Number(it.purchase_price_rupees) || 0;
        const gross = q * pr;
        it.discount_pct = gross > 0 ? Math.round(((a / gross) * 100) * 100) / 100 : '';
      }
      next[idx] = it;
      return next;
    });
  };

  function handleBarcodeScan(scannedValue: string) {
    const code = scannedValue.trim();
    if (!code) return;

    const matched = lookupProductByBarcode(code, products);
    if (!matched) {
      toast.error(`No item found for barcode / SKU "${code}"`);
      return;
    }

    const existingIndex = items.findIndex((it) => it.product_id === matched.id);
    if (existingIndex >= 0) {
      // Repeat scan: Auto-increment quantity by 1
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== existingIndex) return item;
          const currentQty = Number(item.quantity) || 0;
          return { ...item, quantity: currentQty + 1 };
        })
      );
      toast.success(`Incremented: ${matched.name} (+1)`);
    } else {
      const emptyIndex = items.findIndex((it) => !it.product_id && !it.description);
      const targetUnit = (matched as any).purchase_unit || (matched as any).primary_unit || (matched as any).unit || 'PCS';
      const priceRupees =
        (matched as any).purchase_price_paise !== undefined && (matched as any).purchase_price_paise !== null
          ? (matched as any).purchase_price_paise / 100
          : ((matched as any).purchase_price ?? (matched as any).cost_price ?? ((matched as any).selling_price_paise ? (matched as any).selling_price_paise / 100 : (matched as any).sale_price ?? 0));

      const newItem: PurchaseLineRow = {
        product_id: matched.id,
        category: (matched as any).category || (matched as any).product_categories?.name || 'ALL',
        description: matched.name,
        quantity: 1,
        unit: targetUnit,
        purchase_price_rupees: Number(priceRupees) || 0,
        discount_pct: '',
        discount_amount: '',
        hsn_sac: matched.hsn_sac || (matched as any).hsn_sac_code || '',
        gst_rate: matched.gst_rate ?? 18,
        gst_type: priceTaxMode === 'with_tax' ? 'inclusive' : 'exclusive',
        primary_unit: (matched as any).primary_unit || '',
        secondary_unit: (matched as any).secondary_unit || '',
        conversion_rate: (matched as any).conversion_rate || 1,
      };

      if (emptyIndex >= 0) {
        setItems((prev) => prev.map((item, i) => (i === emptyIndex ? newItem : item)));
      } else {
        setItems((prev) => [...prev, newItem]);
      }
      toast.success(`Added item: ${matched.name}`);
    }

    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  }

  // Row metrics calculation
  const calculateRowMetrics = (item: PurchaseLineRow) => {
    const q = item.quantity === '' ? 0 : Number(item.quantity) || 0;
    const p = item.purchase_price_rupees === '' ? 0 : Number(item.purchase_price_rupees) || 0;
    const dp = item.discount_pct === '' ? 0 : Number(item.discount_pct) || 0;
    const da = item.discount_amount === '' ? 0 : Number(item.discount_amount) || 0;
    const gr = item.gst_rate === '' ? 0 : Number(item.gst_rate) || 0;

    if (q <= 0 || p <= 0) {
      return {
        taxable: 0,
        taxAmount: 0,
        taxAmountDisplay: '',
        lineTotal: 0,
        lineTotalDisplay: '₹0.00',
        hasValue: false,
      };
    }

    const gross = q * p;
    const discount = da > 0 ? da : (dp > 0 ? (gross * dp) / 100 : 0);
    const taxable = Math.max(0, gross - discount);

    let taxAmount = 0;
    let lineTotal = 0;

    if (priceTaxMode === 'with_tax') {
      const base = gr > 0 ? taxable / (1 + gr / 100) : taxable;
      taxAmount = taxable - base;
      lineTotal = taxable;
    } else {
      taxAmount = (taxable * gr) / 100;
      lineTotal = taxable + taxAmount;
    }

    return {
      taxable,
      taxAmount,
      taxAmountDisplay: taxAmount > 0 ? `₹${taxAmount.toFixed(2)}` : '₹0.00',
      lineTotal,
      lineTotalDisplay: `₹${lineTotal.toFixed(2)}`,
      hasValue: true,
    };
  };

  // Live Summary
  let subtotalRupees = 0;
  let taxRupees = 0;

  items.forEach((item) => {
    const metrics = calculateRowMetrics(item);
    if (metrics.hasValue) {
      if (priceTaxMode === 'with_tax') {
        subtotalRupees += metrics.taxable - metrics.taxAmount;
        taxRupees += metrics.taxAmount;
      } else {
        subtotalRupees += metrics.taxable;
        taxRupees += metrics.taxAmount;
      }
    }
  });

  const grandTotalRupees = subtotalRupees + taxRupees;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partySearchText.trim()) {
      toast.error('Please select or enter a party name');
      return;
    }

    if (!billNumber.trim()) {
      toast.error('Please enter the bill / invoice number');
      return;
    }

    const validItems = items.filter(
      (i) => (i.description && i.description.trim()) || i.product_id || (Number(i.purchase_price_rupees) > 0)
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one line item with description and price');
      return;
    }

    try {
      setLoading(true);

      // Resolve a valid supplier_id uuid or create/fallback
      let suppId = selectedPartyId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suppId);
      if (!isUuid) {
        // Fallback to a stable valid UUID for the party
        suppId = '00000000-0000-0000-0000-000000000001';
      }

      const payload = {
        supplier_id: suppId,
        bill_number: billNumber.trim(),
        bill_date: billDate,
        due_date: dueDate || undefined,
        notes: `Party: ${partySearchText.trim()} | Place of Supply: ${placeOfSupply}${notes ? ` | ${notes}` : ''}`,
        items: validItems.map((item) => ({
          product_id: (item.product_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.product_id)) ? item.product_id : undefined,
          description: item.description || 'Line Item',
          quantity: Number(item.quantity) || 1,
          unit: item.unit && item.unit !== 'NONE' ? item.unit : 'PCS',
          unit_price_paise: Math.round((Number(item.purchase_price_rupees) || 0) * 100),
          discount_pct: Number(item.discount_pct) || 0,
          hsn_sac: item.hsn_sac || undefined,
          gst_rate: Number(item.gst_rate) || 0,
          gst_type: priceTaxMode === 'with_tax' ? 'inclusive' : 'exclusive',
        })),
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record purchase bill');
      }

      toast.success('Purchase bill recorded successfully!');
      router.push(`/purchases/bills/${data.bill_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Purchase bill creation failed');
    } finally {
      setLoading(false);
    }
  }

  // Common Form JSX
  const renderFormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Party & Bill Metadata Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. Party Selection (Matching Add Sale & Image 2) */}
        <div ref={partyInputRef} className="relative sm:col-span-2">
          <div
            className={`relative rounded-xl border transition-all ${
              showPartySuggestions
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-semibold text-blue-600 z-10 flex items-center gap-0.5">
              Party <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder=""
                value={partySearchText}
                onChange={(e) => {
                  setPartySearchText(e.target.value);
                  setShowPartySuggestions(true);
                }}
                onFocus={() => setShowPartySuggestions(true)}
                className="w-full h-10 pl-3.5 pr-8 text-xs bg-transparent focus:outline-none text-slate-900 font-medium rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPartySuggestions(!showPartySuggestions)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Party Dropdown List */}
          {showPartySuggestions && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in duration-100 divide-y divide-slate-100">
              {/* + Add Party button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowPartySuggestions(false);
                  setIsAddPartyModalOpen(true);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 text-blue-600 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add Party</span>
              </button>

              {/* List of parties */}
              <div className="divide-y divide-slate-100">
                {filteredParties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectParty(p);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors flex flex-col group cursor-pointer"
                  >
                    <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600">
                      {p.name}
                    </span>
                    {p.phone && (
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {p.phone}
                      </span>
                    )}
                  </button>
                ))}
                {filteredParties.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching party for &quot;{partySearchText}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Bill Number */}
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="billNum" className="text-xs font-semibold text-slate-700">Bill # *</Label>
          <Input
            id="billNum"
            placeholder="e.g. BILL-SUPP-9812"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            className="h-10 text-xs rounded-xl"
            required
          />
        </div>

        {/* 3. Place of Supply */}
        <div ref={stateInputRef} className="relative sm:col-span-2">
          <div
            className={`relative rounded-xl border transition-all ${
              showStateSuggestions
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-semibold text-blue-600 z-10 flex items-center gap-0.5">
              Place of Supply <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Click or type state name / code..."
                value={placeOfSupply}
                onChange={(e) => {
                  setPlaceOfSupply(e.target.value);
                  setShowStateSuggestions(true);
                }}
                onFocus={() => setShowStateSuggestions(true)}
                className="w-full h-10 pl-9 pr-8 text-xs bg-transparent focus:outline-none text-slate-900 font-medium rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowStateSuggestions(!showStateSuggestions)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showStateSuggestions && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-100 divide-y divide-slate-100">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-600">
                <span>All States & UTs ({filteredStates.length})</span>
                <span className="text-[9px] text-slate-400">Click to select</span>
              </div>
              {filteredStates.map((st: IndianState) => (
                <button
                  key={st.code}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPlaceOfSupply(`${st.name} (${st.code})`);
                    setShowStateSuggestions(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-bold">
                      {st.code}
                    </span>
                    <span className="text-slate-800 font-medium">{st.name}</span>
                    {st.isUnionTerritory && (
                      <span className="px-1 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-semibold rounded">
                        UT
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Bill Date */}
        <div className="space-y-1">
          <Label htmlFor="bdate" className="text-xs font-semibold text-slate-700">Bill Date *</Label>
          <Input
            id="bdate"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            className="h-10 text-xs rounded-xl"
            required
          />
        </div>

        {/* 5. Due Date */}
        <div className="space-y-1">
          <Label htmlFor="ddate" className="text-xs font-semibold text-slate-700">Due Date</Label>
          <Input
            id="ddate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-10 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* ── PRODUCTS & LINE ITEMS (Vyapar 2-Tier Header & Add Sale UI/UX) ── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            Purchased Products & Items
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Product Row
          </Button>
        </div>

        {/* Quick Barcode Scanner Bar (Hardware Wedge & Camera Ready) */}
        <div className="bg-linear-to-r from-indigo-50/80 via-blue-50/50 to-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
              <Barcode className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Barcode Quick-Scan</span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ScanLine className="h-3 w-3" />
                  Hardware Wedge & Camera
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Scanning an existing item automatically increments its quantity by +1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 grow max-w-lg">
            <div className="relative w-full">
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode or type SKU and press Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBarcodeScan(barcodeInput);
                  }
                }}
                className="w-full h-9 pl-9 pr-20 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 placeholder:text-slate-400 shadow-2xs"
              />
              <Barcode className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => handleBarcodeScan(barcodeInput)}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer"
              >
                Scan
              </button>
            </div>
          </div>
        </div>

        {/* Line Items Table Section (Vyapar 2-Tier Header Design like Add Sale) */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-300 text-[11px] font-bold text-[#1e40af] uppercase tracking-wider">
                  <th rowSpan={2} className="py-2 px-2 text-center border-r border-slate-300 w-12 select-none">
                    #
                  </th>
                  <th rowSpan={2} className="py-2 px-3 text-left border-r border-slate-300 w-28 select-none">
                    CATEGORY
                  </th>
                  <th rowSpan={2} className="py-2 px-3 text-left border-r border-slate-300 min-w-[220px] select-none">
                    ITEM
                  </th>
                  <th rowSpan={2} className="py-2 px-2 text-right border-r border-slate-300 w-20 select-none">
                    QTY
                  </th>
                  <th rowSpan={2} className="py-2 px-2 text-left border-r border-slate-300 w-24 select-none">
                    UNIT
                  </th>
                  <th className="py-1.5 px-2 text-center border-r border-b border-slate-300 min-w-[130px] select-none">
                    PRICE/UNIT
                  </th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b border-slate-300 select-none">
                    DISCOUNT
                  </th>
                  <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b border-slate-300 select-none">
                    TAX
                  </th>
                  <th rowSpan={2} className="py-2 px-3 text-right border-r border-slate-300 w-28 select-none">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>AMOUNT</span>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        title="Add New Row"
                        className="text-indigo-600 hover:text-indigo-800 transition-transform hover:scale-110 p-0.5 cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                  <th rowSpan={2} className="py-2 px-1 text-center w-9 select-none"></th>
                </tr>
                <tr className="bg-[#f8fafc] border-b border-slate-300 text-[11px] font-semibold text-[#1e40af]">
                  {/* Under PRICE/UNIT */}
                  <th className="py-1 px-1 text-center border-r border-slate-300">
                    <div className="relative inline-flex items-center justify-center">
                      <select
                        value={priceTaxMode}
                        onChange={(e) => setPriceTaxMode(e.target.value as any)}
                        className="text-[10px] font-medium text-slate-700 bg-transparent border-none appearance-none pr-3.5 focus:outline-none cursor-pointer hover:text-indigo-700"
                      >
                        <option value="without_tax">Without Tax</option>
                        <option value="with_tax">With Tax</option>
                      </select>
                      <ChevronDown className="h-3 w-3 text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </th>
                  {/* Under DISCOUNT */}
                  <th className="py-1 px-1 text-center border-r border-slate-300 w-16">
                    %
                  </th>
                  <th className="py-1 px-1 text-center border-r border-slate-300 w-20">
                    AMOUNT
                  </th>
                  {/* Under TAX */}
                  <th className="py-1 px-1 text-center border-r border-slate-300 w-24">
                    %
                  </th>
                  <th className="py-1 px-1 text-center border-r border-slate-300 w-20">
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const metrics = calculateRowMetrics(item);

                  return (
                    <tr
                      key={idx}
                      onClick={() => handleRowInteraction(idx)}
                      className={`border-b border-slate-200 transition-colors group ${
                        idx % 2 === 1 ? 'bg-[#fcfdfd]' : 'bg-white'
                      } hover:bg-indigo-50/20`}
                    >
                      {/* 1. Row Number # */}
                      <td className="py-1 px-2 text-center text-slate-400 text-xs font-medium border-r border-slate-200 select-none">
                        {idx + 1}
                      </td>

                      {/* 2. Category Dropdown */}
                      <td className="p-0 border-r border-slate-200">
                        <div className="relative w-full h-full flex items-center">
                          <select
                            value={item.category || 'ALL'}
                            onChange={(e) => {
                              handleRowInteraction(idx);
                              handleItemChange(idx, 'category', e.target.value);
                            }}
                            onFocus={() => handleRowInteraction(idx)}
                            onClick={() => handleRowInteraction(idx)}
                            className="w-full h-9 pl-2 pr-5 text-xs bg-transparent border-none appearance-none rounded focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                          >
                            {availableCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 3. Item Name with Autocomplete / Direct typing */}
                      <td className="p-0 border-r border-slate-200">
                        <input
                          type="text"
                          placeholder="Type to search already listed items..."
                          value={item.description}
                          onFocus={(e) => {
                            handleRowInteraction(idx);
                            updateDropdownCoords(e.currentTarget);
                            setActiveItemDropdown(idx);
                          }}
                          onClick={(e) => {
                            handleRowInteraction(idx);
                            updateDropdownCoords(e.currentTarget);
                            setActiveItemDropdown(idx);
                          }}
                          onChange={(e) => {
                            handleRowInteraction(idx);
                            handleItemChange(idx, 'description', e.target.value);
                            updateDropdownCoords(e.currentTarget);
                            setActiveItemDropdown(idx);
                          }}
                          className="w-full h-9 px-2.5 text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white text-slate-900 font-medium placeholder:text-slate-400"
                        />
                      </td>

                      {/* 4. Quantity */}
                      <td className="p-0 border-r border-slate-200">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder=""
                          value={item.quantity === '' ? '' : item.quantity}
                          onChange={(e) => {
                            handleRowInteraction(idx);
                            handleItemChange(
                              idx,
                              'quantity',
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                            );
                          }}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className="w-full h-9 px-2 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white text-slate-900 font-medium"
                        />
                      </td>

                      {/* 5. Unit Dropdown */}
                      <td className="p-0 border-r border-slate-200">
                        <div className="relative w-full h-full flex items-center">
                          <select
                            value={item.unit || 'PCS'}
                            onChange={(e) => {
                              handleRowInteraction(idx);
                              handleItemChange(idx, 'unit', e.target.value);
                            }}
                            onFocus={() => handleRowInteraction(idx)}
                            onClick={() => handleRowInteraction(idx)}
                            className="w-full h-9 pl-2 pr-5 text-xs bg-transparent border-none appearance-none rounded focus:outline-none focus:bg-white text-slate-800 cursor-pointer"
                          >
                            {item.primary_unit && (
                              <option value={item.primary_unit}>
                                {item.primary_unit} (Base)
                              </option>
                            )}
                            {item.secondary_unit && (
                              <option value={item.secondary_unit}>
                                {item.secondary_unit} (1 {item.secondary_unit} = {item.conversion_rate || 1} {item.primary_unit})
                              </option>
                            )}
                            {UNIT_OPTIONS.filter((u) => u !== item.primary_unit && u !== item.secondary_unit).map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 6. Purchase Price / Unit */}
                      <td className="p-0 border-r border-slate-200">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder=""
                          value={item.purchase_price_rupees === '' ? '' : item.purchase_price_rupees}
                          onChange={(e) => {
                            handleRowInteraction(idx);
                            handleItemChange(
                              idx,
                              'purchase_price_rupees',
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                            );
                          }}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className="w-full h-9 px-2 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white font-mono text-slate-900 font-medium"
                        />
                      </td>

                      {/* 7. Discount % */}
                      <td className="p-0 border-r border-slate-200">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder=""
                          value={item.discount_pct === '' ? '' : item.discount_pct}
                          onChange={(e) => handleDiscountPercentChange(idx, e.target.value)}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className="w-full h-9 px-1 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white text-slate-900"
                        />
                      </td>

                      {/* 8. Discount Amount */}
                      <td className="p-0 border-r border-slate-200">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder=""
                          value={item.discount_amount === '' ? '' : item.discount_amount}
                          onChange={(e) => handleDiscountAmountChange(idx, e.target.value)}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className="w-full h-9 px-1 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white font-mono text-slate-900"
                        />
                      </td>

                      {/* 9. Tax Rate Dropdown */}
                      <td className="p-0 border-r border-slate-200">
                        <div className="relative w-full h-full flex items-center">
                          <select
                            value={item.gst_rate === '' ? '' : String(item.gst_rate)}
                            onChange={(e) => {
                              handleRowInteraction(idx);
                              handleItemChange(
                                idx,
                                'gst_rate',
                                e.target.value === '' ? '' : parseFloat(e.target.value)
                              );
                            }}
                            onFocus={() => handleRowInteraction(idx)}
                            onClick={() => handleRowInteraction(idx)}
                            className={`w-full h-9 pl-1.5 pr-4 text-xs bg-transparent border-none appearance-none rounded focus:outline-none focus:bg-white cursor-pointer ${
                              item.gst_rate === '' ? 'text-slate-400' : 'text-slate-800 font-medium'
                            }`}
                          >
                            <option value="">Select</option>
                            {STANDARD_GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                GST@{rate}%
                              </option>
                            ))}
                            {item.gst_rate !== '' && !STANDARD_GST_RATES.includes(Number(item.gst_rate) as any) && (
                              <option value={item.gst_rate}>
                                GST@{item.gst_rate}% (Custom)
                              </option>
                            )}
                          </select>
                          <ChevronDown className="h-3 w-3 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 10. Tax Amount Display */}
                      <td className="py-1 px-2.5 text-right font-mono text-xs text-slate-700 border-r border-slate-200 select-none">
                        {metrics.taxAmountDisplay}
                      </td>

                      {/* 11. Amount (Line Total Display) */}
                      <td className="py-1 px-2.5 text-right font-mono font-semibold text-xs text-slate-900 border-r border-slate-200 select-none">
                        {metrics.lineTotalDisplay}
                      </td>

                      {/* 12. Delete Action */}
                      <td className="py-1 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-slate-300 hover:text-red-600 rounded transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer info & Add Row shortcut */}
          <div className="p-2.5 bg-[#f8fafc] border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200 shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
            <div className="text-[11px] text-slate-500 font-medium">
              Total Rows: <span className="font-semibold text-slate-800">{items.length}</span> • Clicking the last row automatically creates the next row
            </div>
          </div>
        </div>

        {/* ── FLOATING CATALOG DROPDOWN (Showing already listed items) ── */}
        {activeItemDropdown !== null && dropdownCoords && (
          <div
            ref={itemDropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Header with "+ Add Item" Button */}
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 backdrop-blur-xs z-10">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const targetIdx = activeItemDropdown;
                  setActiveItemRowIndex(targetIdx);
                  setActiveItemDropdown(null);
                  setShowAddItemModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ea8b2c] hover:bg-[#d97d22] text-white text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
                title="Add New Item to Catalog"
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span>Add Item</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                  {activeFilteredProducts.length} Listed Items
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveItemDropdown(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List of Products or Empty state */}
            {activeFilteredProducts.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  No catalog items found {items[activeItemDropdown]?.description ? `matching "${items[activeItemDropdown].description}"` : ''}
                </p>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetIdx = activeItemDropdown;
                    setActiveItemRowIndex(targetIdx);
                    setActiveItemDropdown(null);
                    setShowAddItemModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#ea8b2c] hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Click here to Add New Item</span>
                </button>
              </div>
            ) : (
              <>
                {activeFilteredProducts.map((p) => {
                  const price = p.purchase_price_paise !== undefined && p.purchase_price_paise !== null
                    ? p.purchase_price_paise / 100
                    : (p.purchase_price ?? p.cost_price ?? (p.selling_price_paise ? p.selling_price_paise / 100 : p.sale_price ?? 0));

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleProductSelect(activeItemDropdown, p.id);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-indigo-50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.sku ? `SKU: ${p.sku} • ` : ''}
                          {p.hsn_sac || p.hsn_sac_code ? `HSN: ${p.hsn_sac || p.hsn_sac_code}` : ''}{' '}
                          {(p as any).category ? `• ${(p as any).category}` : ''}
                          {p.product_units?.abbreviation || p.unit ? ` • ${p.product_units?.abbreviation || p.unit}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          GST: {p.gst_rate ?? 18}%
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Quick bottom action to add another item */}
                <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const targetIdx = activeItemDropdown;
                      setActiveItemRowIndex(targetIdx);
                      setActiveItemDropdown(null);
                      setShowAddItemModal(true);
                    }}
                    className="w-full py-1.5 px-3 text-center text-xs font-bold text-[#ea8b2c] hover:text-[#d97d22] hover:bg-amber-50/70 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3 stroke-[3]" />
                    <span>Add New Item to Catalog</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notes & Summary Box */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
          <div className="w-full md:w-1/2 space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Purchase Notes</Label>
            <Input
              id="notes"
              placeholder="Optional supplier remarks or GRN reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="w-full md:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm shadow-2xs">
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Subtotal Base:</span>
              <span className="font-semibold text-slate-900 font-mono">₹{subtotalRupees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Input GST:</span>
              <span className="font-semibold text-slate-900 font-mono">₹{taxRupees.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Purchase Amount:</span>
              <span className="text-indigo-600 font-mono">₹{grandTotalRupees.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Link href="/purchases/bills">
          <Button type="button" variant="outline" disabled={loading} className="rounded-xl border-slate-200 text-xs cursor-pointer">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Draft Purchase Bill
        </Button>
      </div>
    </form>
  );

  // Common AddItem Modal JSX
  const renderAddItemModal = () =>
    showAddItemModal && (
      <div
        className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddItemModal(false);
          }
        }}
      >
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200">
          <AddItemView
            initialData={{
              name:
                activeItemRowIndex !== null && items[activeItemRowIndex]?.description
                  ? items[activeItemRowIndex].description
                  : '',
              category:
                activeItemRowIndex !== null &&
                items[activeItemRowIndex]?.category &&
                items[activeItemRowIndex]?.category !== 'ALL'
                  ? items[activeItemRowIndex].category
                  : undefined,
            }}
            onClose={() => setShowAddItemModal(false)}
            onSuccess={(savedProduct) => {
              if (savedProduct) {
                const newProductOption = {
                  id: savedProduct.id || `prod-${Date.now()}`,
                  name: savedProduct.name,
                  category: savedProduct.category || savedProduct.category_id || 'Hardware',
                  sku: savedProduct.sku || null,
                  hsn_sac: savedProduct.hsn_sac || savedProduct.hsn_sac_code || null,
                  hsn_sac_code: savedProduct.hsn_sac_code || savedProduct.hsn_sac || null,
                  purchase_price_paise: savedProduct.purchase_price_paise || (savedProduct.purchase_price ? savedProduct.purchase_price * 100 : undefined),
                  purchase_price: savedProduct.purchase_price ?? savedProduct.cost_price ?? 0,
                  sale_price: Number(savedProduct.sale_price ?? savedProduct.selling_price) || 0,
                  gst_rate: Number(savedProduct.gst_rate) !== undefined ? Number(savedProduct.gst_rate) : 18,
                  product_units: {
                    abbreviation: savedProduct.product_units?.abbreviation || savedProduct.unit || 'PCS',
                  },
                  unit: savedProduct.unit || 'PCS',
                };

                setProducts((prev) => [newProductOption, ...prev]);

                const targetIdx = activeItemRowIndex !== null ? activeItemRowIndex : Math.max(0, items.length - 1);
                handleProductSelect(targetIdx, newProductOption.id, newProductOption);
                toast.success(`"${newProductOption.name}" added and selected in purchase bill!`);
              }
              setShowAddItemModal(false);
            }}
          />
        </div>
      </div>
    );

  return (<div className="max-w-7xl mx-auto space-y-6">{renderFormContent()}{renderAddItemModal()}<AddPartyModal isOpen={isAddPartyModalOpen} onClose={() => setIsAddPartyModalOpen(false)} onSave={handleSaveNewParty} /></div>); }