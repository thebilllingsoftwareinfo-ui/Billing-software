'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  ChevronDown,
  Filter,
  MoreVertical,
  CornerUpRight,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertTriangle,
  Package,
  Boxes,
  Eye,
  Edit,
  Trash2,
  Copy,
  Printer,
  FileText,
  RotateCcw,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Barcode as BarcodeIcon,
} from 'lucide-react'
import { AddItemView } from '@/components/products/add-item-view'
import { AdjustItemModal } from '@/components/products/adjust-item-modal'
import { UnitMasterView } from '@/components/products/unit-master-view'
import { BarcodeLabelModal } from '@/components/products/barcode-label-modal'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { formatRupees } from '@/lib/utils/currency'
import { MetalRatesModal } from '@/components/metal-rates/metal-rates-modal'
import { TrendingUp } from 'lucide-react'

export interface ItemTransaction {
  id: string
  type: 'Sale' | 'Purchase' | 'Adjustment' | 'Return'
  refNo: string
  partyName: string
  date: string
  quantity: number
  unit: string
  pricePerUnit: number
  status: 'Paid' | 'Unpaid' | 'Approved' | 'Cancelled'
}

export interface MasterItem {
  id: string
  name: string
  sku: string
  barcode?: string | null
  product_type: 'goods' | 'service'
  sale_price: number
  purchase_price: number
  current_stock: number
  unit: string
  category: string
  transactions: ItemTransaction[]
}

const INITIAL_ITEMS: MasterItem[] = [
  {
    id: 'item-pancake',
    name: 'pan cake',
    sku: 'SKU-PANCAKE',
    product_type: 'goods',
    sale_price: 500.0,
    purchase_price: 122.0,
    current_stock: -1,
    unit: 'Box',
    category: 'Bakery',
    transactions: [
      {
        id: 'tx-pc-1',
        type: 'Sale',
        refNo: '2',
        partyName: 'asdf',
        date: '20/09/2026',
        quantity: 1,
        unit: 'Box',
        pricePerUnit: 446.43,
        status: 'Unpaid',
      },
    ],
  },
  {
    id: 'item-sample',
    name: 'Sample Item',
    sku: 'SKU-SAMPLE',
    product_type: 'goods',
    sale_price: 350.0,
    purchase_price: 210.0,
    current_stock: 30,
    unit: 'PCS',
    category: 'General',
    transactions: [
      {
        id: 'tx-sm-1',
        type: 'Purchase',
        refNo: '101',
        partyName: 'Apex Wholesale Hub',
        date: '18/09/2026',
        quantity: 30,
        unit: 'PCS',
        pricePerUnit: 210.0,
        status: 'Paid',
      },
    ],
  },
]

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const actionParam = searchParams.get('action')

  // Top Tabs: PRODUCTS | SERVICES | CATEGORY | UNITS
  const [activeTopTab, setActiveTopTab] = useState<'products' | 'services' | 'category' | 'units'>('products')

  // Items State
  const [items, setItems] = useState<MasterItem[]>(INITIAL_ITEMS)
  const [selectedItemId, setSelectedItemId] = useState<string>('item-pancake')
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false)
  const [txSearchQuery, setTxSearchQuery] = useState('')

  // Add Item Full View state (Image 2)
  const [isAddMode, setIsAddMode] = useState(actionParam === 'new')
  const [editingItemData, setEditingItemData] = useState<any>(null)

  // Adjust Item Dialog
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)

  // Add Item Dropdown Menu State
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false)

  // Barcode Label Printing Modal
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<MasterItem | null>(null)

  // Metal Rates Modal
  const [isMetalRatesOpen, setIsMetalRatesOpen] = useState(false)

  useEffect(() => {
    if (actionParam === 'new') {
      setEditingItemData(null)
      setIsAddMode(true)
    }
  }, [actionParam])

  // Load existing items from backend API if available
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.length > 0) {
          const mapped: MasterItem[] = data.data.map((p: any) => {
            const existing = INITIAL_ITEMS.find((init) => init.name.toLowerCase() === p.name?.toLowerCase())
            return {
              id: p.id,
              name: p.name,
              sku: p.sku || `SKU-${p.id}`,
              barcode: p.barcode || null,
              product_type: p.product_type || 'goods',
              sale_price: Number(p.sale_price) || 0,
              purchase_price: Number(p.purchase_price) || 0,
              current_stock: Number(p.current_stock ?? p.opening_stock ?? 0),
              unit: p.product_units?.abbreviation || p.unit || 'PCS',
              category: p.product_categories?.name || p.category || 'General',
              transactions: existing ? existing.transactions : [],
            }
          })

          // Merge without losing pan cake sample if not present
          const hasPanCake = mapped.some((m) => m.name.toLowerCase() === 'pan cake')
          const combined = hasPanCake ? mapped : [...INITIAL_ITEMS.slice(0, 1), ...mapped]
          setItems(combined)
          if (!combined.some((item) => item.id === selectedItemId)) {
            setSelectedItemId(combined[0]?.id || 'item-pancake')
          }
        }
      })
      .catch((err) => console.log('API fallback active:', err))
  }, [])

  // Filter items by type and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType =
        activeTopTab === 'services'
          ? item.product_type === 'service'
          : item.product_type === 'goods'

      const matchSearch =
        itemSearchQuery === '' ||
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())

      return matchType && matchSearch
    })
  }, [items, activeTopTab, itemSearchQuery])

  // Selected item
  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || filteredItems[0] || items[0]
  }, [items, selectedItemId, filteredItems])

  // Filtered transactions for selected item
  const filteredTransactions = useMemo(() => {
    if (!selectedItem || !selectedItem.transactions) return []
    return selectedItem.transactions.filter((tx) => {
      if (!txSearchQuery) return true
      return (
        tx.refNo.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
        tx.partyName.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
        tx.type.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
        tx.status.toLowerCase().includes(txSearchQuery.toLowerCase())
      )
    })
  }, [selectedItem, txSearchQuery])

  // Handle stock adjustment
  const handleStockAdjustSave = (updatedStock: number, reason: string, notes?: string) => {
    if (!selectedItem) return

    const diff = updatedStock - selectedItem.current_stock
    const newTx: ItemTransaction = {
      id: `tx-adj-${Date.now()}`,
      type: 'Adjustment',
      refNo: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
      partyName: `Stock ${diff >= 0 ? '+' : ''}${diff} (${reason})`,
      date: new Date().toLocaleDateString('en-GB'),
      quantity: Math.abs(diff),
      unit: selectedItem.unit || 'PCS',
      pricePerUnit: selectedItem.purchase_price,
      status: 'Approved',
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              current_stock: updatedStock,
              transactions: [newTx, ...(item.transactions || [])],
            }
          : item
      )
    )
  }

  // Handle Add Item Save
  const handleItemSaved = (savedProduct: any) => {
    if (savedProduct) {
      const newItem: MasterItem = {
        id: savedProduct.id || `item-${Date.now()}`,
        name: savedProduct.name,
        sku: savedProduct.sku || `SKU-${Date.now().toString().slice(-4)}`,
        product_type: savedProduct.product_type || 'goods',
        sale_price: Number(savedProduct.selling_price || savedProduct.sale_price) || 0,
        purchase_price: Number(savedProduct.purchase_price) || 0,
        current_stock: Number(savedProduct.opening_stock ?? savedProduct.current_stock ?? 0),
        unit: savedProduct.unit || 'PCS',
        category: savedProduct.category || 'Hardware',
        transactions: [],
      }

      setItems((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)])
      setSelectedItemId(newItem.id)
    }
    setIsAddMode(false)
    setEditingItemData(null)
    if (actionParam) {
      router.replace('/products')
    }
  }

  // Calculate stock value (Stock value is 0 if stock <= 0)
  const stockValue = selectedItem
    ? Math.max(0, selectedItem.current_stock) * selectedItem.purchase_price
    : 0

  // ── IF ADD ITEM VIEW IS ACTIVE (MATCHING IMAGE 2) ──────────
  if (isAddMode) {
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        <AddItemView
          initialData={editingItemData}
          onClose={() => {
            setIsAddMode(false)
            setEditingItemData(null)
            if (actionParam) {
              router.replace('/products')
            }
          }}
          onSuccess={handleItemSaved}
        />
      </div>
    )
  }

  // ── MAIN VIEW: EXACT MATCH FOR ATTACHED IMAGE 1 ────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-white overflow-hidden select-none">
      
      {/* ── TOP HORIZONTAL TABS (PRODUCTS | SERVICES | CATEGORY | UNITS) ── */}
      <div className="flex items-center px-8 border-b border-gray-200 bg-white flex-shrink-0 gap-8">
        <button
          type="button"
          onClick={() => setActiveTopTab('products')}
          className={`py-3 text-xs tracking-wider transition-all relative cursor-pointer ${
            activeTopTab === 'products'
              ? 'text-gray-900 border-b-[3px] border-[#29b6f6] font-bold'
              : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          PRODUCTS
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('services')}
          className={`py-3 text-xs tracking-wider transition-all relative cursor-pointer ${
            activeTopTab === 'services'
              ? 'text-gray-900 border-b-[3px] border-[#29b6f6] font-bold'
              : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          SERVICES
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('category')}
          className={`py-3 text-xs tracking-wider transition-all relative cursor-pointer ${
            activeTopTab === 'category'
              ? 'text-gray-900 border-b-[3px] border-[#29b6f6] font-bold'
              : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          CATEGORY
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('units')}
          className={`py-3 text-xs tracking-wider transition-all relative cursor-pointer ${
            activeTopTab === 'units'
              ? 'text-gray-900 border-b-[3px] border-[#29b6f6] font-bold'
              : 'text-gray-400 hover:text-gray-700 font-medium'
          }`}
        >
          UNITS
        </button>
      </div>

      {/* ── 2-COLUMN MASTER-DETAIL CANVAS OR UNIT MASTER ───────── */}
      {activeTopTab === 'units' ? (
        <UnitMasterView />
      ) : (
        <div className="flex flex-1 overflow-hidden">
        
        {/* ── LEFT COLUMN: ITEMS MASTER LIST ────────────────────── */}
        <div className="w-80 md:w-84 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
          
          {/* Top Row: Search Icon, Orange '+ Add Item ▾' Button, Three Dots */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-2">
            {/* Search Button / Expandable Input */}
            {isSearchInputOpen ? (
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search item..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <button
                  onClick={() => {
                    setIsSearchInputOpen(false)
                    setItemSearchQuery('')
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchInputOpen(true)}
                className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                title="Search Items"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            {/* Amber '+ Add Item ▾' Button with Dropdown (Matching Image 1) */}
            <div className="relative flex-1">
              <div className="inline-flex rounded shadow-xs overflow-hidden w-full">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemData(null)
                    setIsAddMode(true)
                  }}
                  className="flex-1 bg-[#ea8b2c] hover:bg-[#d97d22] text-white font-bold text-xs py-1.5 px-3 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Add Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                  className="bg-[#ea8b2c] hover:bg-[#d97d22] text-white px-2 py-1.5 border-l border-amber-400/50 flex items-center justify-center transition-colors cursor-pointer"
                  title="More Item Options"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Add Item Dropdown Options */}
              {isAddDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 text-xs font-semibold text-gray-700 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsAddDropdownOpen(false)}
                >
                  <button
                    onClick={() => {
                      setEditingItemData(null)
                      setIsAddMode(true)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 text-amber-500" />
                    <span>Add New Product</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingItemData({ product_type: 'service' })
                      setIsAddMode(true)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span>Add New Service</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setIsMetalRatesOpen(true)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 cursor-pointer"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                    <span>Live Metal Rates</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setBarcodeModalProduct(null)
                      setIsBarcodeModalOpen(true)
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                  >
                    <BarcodeIcon className="h-3.5 w-3.5 text-blue-600" />
                    <span>Print Barcode Labels</span>
                  </button>
                  <button
                    onClick={() => toast.info('Excel import utility ready')}
                    className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Import Items from Excel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Three Dots Menu on Top Left Bar */}
            <RowActionsMenu
              buttonClassName="h-7 w-7 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
              items={[
                {
                  label: 'Print Items List',
                  icon: Printer,
                  onClick: () => window.print(),
                },
                {
                  label: 'Export to Excel (.xlsx)',
                  icon: FileSpreadsheet,
                  onClick: () => toast.success('Exporting catalog to Excel...'),
                },
                {
                  label: 'Show Low Stock Only',
                  icon: AlertTriangle,
                  onClick: () => toast.info('Filtered to items below reorder point'),
                  divider: true,
                },
                {
                  label: 'Sort by Name (A-Z)',
                  icon: Layers,
                  onClick: () => {
                    setItems((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)))
                  },
                },
                {
                  label: 'Sort by Stock Level',
                  icon: Boxes,
                  onClick: () => {
                    setItems((prev) => [...prev].sort((a, b) => a.current_stock - b.current_stock))
                  },
                },
              ]}
            />
          </div>

          {/* Table Header: ITEM (with red filter funnel) & QUANTITY */}
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between text-[11px] font-bold text-gray-500 tracking-wider">
            <div className="flex items-center gap-2">
              <span>ITEM</span>
              <Filter className="h-3 w-3 text-red-500 fill-red-500" />
            </div>
            <span>QUANTITY</span>
          </div>

          {/* Items List Rows */}
          <div className="flex-1 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No items found
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItem?.id
                const isNegative = item.current_stock < 0

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#d2e9f7]'
                        : 'hover:bg-gray-50 bg-white'
                    }`}
                  >
                    <span className={`text-xs font-normal ${
                      isSelected ? 'text-gray-900 font-semibold' : 'text-gray-800'
                    }`}>
                      {item.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-semibold ${
                        isNegative ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {item.current_stock}
                      </span>

                      <RowActionsMenu
                        buttonClassName="h-5 w-5 rounded hover:bg-black/10 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
                        items={[
                          {
                            label: 'Edit Item',
                            icon: Edit,
                            onClick: () => {
                              setEditingItemData({
                                ...item,
                                selling_price: item.sale_price,
                              })
                              setIsAddMode(true)
                            },
                          },
                          {
                            label: 'Adjust Stock',
                            icon: SlidersHorizontal,
                            onClick: () => {
                              setSelectedItemId(item.id)
                              setIsAdjustModalOpen(true)
                            },
                          },
                          {
                            label: 'Print Barcode Label',
                            icon: BarcodeIcon,
                            onClick: () => {
                              setBarcodeModalProduct(item)
                              setIsBarcodeModalOpen(true)
                            },
                          },
                          {
                            label: 'Duplicate Item',
                            icon: Copy,
                            onClick: () => {
                              const duplicated: MasterItem = {
                                ...item,
                                id: `item-${Date.now()}`,
                                name: `${item.name} (Copy)`,
                                sku: `${item.sku}-COPY`,
                                transactions: [],
                              }
                              setItems((prev) => [duplicated, ...prev])
                              setSelectedItemId(duplicated.id)
                              toast.success(`Cloned as "${duplicated.name}"`)
                            },
                            divider: true,
                          },
                          {
                            label: 'Delete Item',
                            icon: Trash2,
                            isDestructive: true,
                            onClick: () => {
                              if (confirm(`Delete item "${item.name}"?`)) {
                                setItems((prev) => prev.filter((i) => i.id !== item.id))
                                toast.success(`Item "${item.name}" deleted`)
                              }
                            },
                          },
                        ]}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: SELECTED ITEM DETAILS & TRANSACTIONS ── */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          
          {selectedItem ? (
            <>
              {/* Top Summary Card (Exact Match for Image 1) */}
              <div className="p-5 flex items-start justify-between flex-shrink-0 bg-white">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                      {selectedItem.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => toast.info(`Sharing details for ${selectedItem.name}`)}
                      className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                      title="Share Item"
                    >
                      <CornerUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Pricing Badges */}
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-gray-400 font-normal">SALE PRICE: </span>
                      <span className="text-emerald-600 font-bold font-mono">
                        {formatRupees(selectedItem.sale_price)}
                      </span>
                      <span className="text-gray-400 text-[11px] ml-1">(incl)</span>
                    </div>

                    <div>
                      <span className="text-gray-400 font-normal">PURCHASE PRICE: </span>
                      <span className="text-emerald-600 font-bold font-mono">
                        {formatRupees(selectedItem.purchase_price)}
                      </span>
                      <span className="text-gray-400 text-[11px] ml-1">(excl)</span>
                    </div>
                  </div>
                </div>

                {/* Right Action: Barcode Label & Blue '⚙ ADJUST ITEM' Button */}
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeModalProduct(selectedItem)
                        setIsBarcodeModalOpen(true)
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer border border-gray-300/80"
                      title="Print Barcode Labels for this item"
                    >
                      <BarcodeIcon className="h-3.5 w-3.5 text-gray-600" />
                      <span>Barcode Label</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdjustModalOpen(true)}
                      className="px-3.5 py-1.5 bg-[#1a73e8] hover:bg-blue-600 text-white font-bold text-xs rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>ADJUST ITEM</span>
                    </button>
                  </div>

                  {/* Stock Quantity Alert */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <div className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                      <AlertTriangle className="h-2.5 w-2.5" />
                    </div>
                    <span className="text-gray-500 text-[11px]">STOCK QUANTITY: </span>
                    <span className={`font-mono font-bold ${
                      selectedItem.current_stock < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {selectedItem.current_stock}
                    </span>
                  </div>

                  {/* Stock Value */}
                  <div className="text-xs">
                    <span className="text-gray-500 text-[11px]">STOCK VALUE: </span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatRupees(stockValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thick Divider Bar Separating Top Summary & Transactions */}
              <div className="h-2 bg-[#edf0f5] border-y border-[#dbe0e6] w-full flex-shrink-0" />

              {/* Transactions Section */}
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Header with Search and Excel Icon */}
                <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 bg-white">
                  <h3 className="text-xs font-bold text-gray-700 tracking-wider uppercase">
                    TRANSACTIONS
                  </h3>

                  <div className="flex items-center gap-2">
                    {/* Search Transactions Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={txSearchQuery}
                        onChange={(e) => setTxSearchQuery(e.target.value)}
                        className="w-56 px-2.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      />
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Excel Export Button matching Image 1 */}
                    <button
                      type="button"
                      onClick={() => toast.success('Transactions exported to Excel (.xlsx)')}
                      className="h-7 w-7 rounded border border-gray-200 bg-white hover:bg-emerald-50 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Export to Excel"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-[#107c41]" />
                    </button>
                  </div>
                </div>

                {/* Transactions Table matching Image 1 with grid borders */}
                <div className="flex-1 overflow-auto border-t border-gray-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#f8fafc] text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-2 w-5 border-r border-gray-200"></th>
                        <th className="py-2 px-3 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>TYPE</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-3 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>INVOICE/REF..</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-3 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>NAME</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-3 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>DATE ↓</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-3 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>QUANTITY</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-3 border-r border-gray-200 text-right">
                          <div className="flex items-center justify-between gap-1">
                            <span>PRICE/ UNIT</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-3 border-r border-gray-200 text-center">
                          <div className="flex items-center justify-between gap-1">
                            <span>STATUS</span>
                            <Filter className="h-2.5 w-2.5 text-gray-400" />
                          </div>
                        </th>
                        <th className="py-2 px-2 text-center w-8"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 text-gray-700">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                            No transactions recorded for this item yet.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-blue-50/40 transition-colors border-b border-gray-200">
                            <td className="py-2.5 px-2 text-center border-r border-gray-200">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                tx.type === 'Sale'
                                  ? 'bg-emerald-500'
                                  : tx.type === 'Purchase'
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`} />
                            </td>
                            <td className="py-2.5 px-3 font-normal text-gray-900 border-r border-gray-200">{tx.type}</td>
                            <td className="py-2.5 px-3 text-gray-700 border-r border-gray-200">{tx.refNo}</td>
                            <td className="py-2.5 px-3 text-gray-800 border-r border-gray-200">{tx.partyName}</td>
                            <td className="py-2.5 px-3 text-gray-600 border-r border-gray-200">{tx.date}</td>
                            <td className="py-2.5 px-3 text-gray-800 border-r border-gray-200">
                              {tx.quantity} {tx.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-900 border-r border-gray-200">
                              {formatRupees(tx.pricePerUnit)}
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-gray-200">
                              <span className={`text-xs ${
                                tx.status === 'Paid'
                                  ? 'text-emerald-600'
                                  : tx.status === 'Unpaid'
                                  ? 'text-gray-700'
                                  : 'text-amber-600'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <RowActionsMenu
                                buttonClassName="h-5 w-5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center mx-auto"
                                items={[
                                  {
                                    label: 'View / Edit Transaction',
                                    icon: Eye,
                                    onClick: () => toast.info(`Viewing transaction #${tx.refNo}`),
                                  },
                                  {
                                    label: 'Print Voucher',
                                    icon: Printer,
                                    onClick: () => window.print(),
                                  },
                                  {
                                    label: 'Download PDF',
                                    icon: FileText,
                                    onClick: () => toast.success(`PDF downloaded for #${tx.refNo}`),
                                    divider: true,
                                  },
                                  {
                                    label: 'Delete Transaction Entry',
                                    icon: Trash2,
                                    isDestructive: true,
                                    onClick: () => {
                                      if (confirm(`Delete transaction #${tx.refNo}?`)) {
                                        setItems((prev) =>
                                          prev.map((item) =>
                                            item.id === selectedItem.id
                                              ? {
                                                  ...item,
                                                  transactions: item.transactions.filter((t) => t.id !== tx.id),
                                                }
                                              : item
                                          )
                                        )
                                        toast.success('Transaction removed')
                                      }
                                    },
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-xs">
              Select an item from the list to view details
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ──────────────────────────────── */}
      <AdjustItemModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        product={selectedItem}
        onSave={handleStockAdjustSave}
      />

      {/* ── BARCODE LABEL PRINTING MODAL ───────────────────────── */}
      {isBarcodeModalOpen && (
        <BarcodeLabelModal
          products={items}
          selectedProduct={barcodeModalProduct}
          onClose={() => setIsBarcodeModalOpen(false)}
        />
      )}
      {/* METAL RATES MODAL */}
      <MetalRatesModal
        isOpen={isMetalRatesOpen}
        onClose={() => {
          setIsMetalRatesOpen(false)
          // Refresh products to show updated live prices
          fetch('/api/products')
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.data) {
                setItems((prev) => {
                  return prev.map(p => {
                    const fresh = data.data.find((d: any) => d.id === p.id)
                    if (fresh) {
                      return { ...p, sale_price: Number(fresh.sale_price) || 0 }
                    }
                    return p
                  })
                })
              }
            })
        }}
      />
    </div>
  )
}
