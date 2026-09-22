'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  PauseCircle,
  RotateCcw,
  Layers,
  Percent,
  X,
  Send,
  Building2,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { InvoicePDFPreviewModal } from '@/components/invoices/invoice-pdf-preview-modal'

interface POSCartItem {
  product_id?: string
  name: string
  sku: string
  hsn_sac_code: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  gst_rate: number
}

interface HeldBill {
  id: string
  timestamp: string
  customerName: string
  items: POSCartItem[]
  totalAmount: number
}

export default function POSBillingPage() {
  const router = useRouter()
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Catalog State
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Customer State
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in')
  const [customerNameInput, setCustomerNameInput] = useState('Cash Customer (Walk-in)')
  const [customerPhoneInput, setCustomerPhoneInput] = useState('')

  // Cart State
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [heldBills, setHeldBills] = useState<HeldBill[]>([])

  // Payment Tender State
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash')
  const [cashTendered, setCashTendered] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)

  // Print Modal State
  const [completedInvoice, setCompletedInvoice] = useState<{ id: string; number: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Load products and customers
  useEffect(() => {
    fetchInitialData()
    // Auto-focus barcode scanner
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [])

  // Keyboard shortcut listener (F1, F2, F4, F8, F9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        handleNewBill()
      } else if (e.key === 'F2') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
      } else if (e.key === 'F8') {
        e.preventDefault()
        handleHoldBill()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, customerNameInput])

  const fetchInitialData = async () => {
    setLoadingProducts(true)
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products?limit=100&status=active'),
        fetch('/api/customers?limit=50'),
      ])

      const prodJson = await prodRes.json()
      const custJson = await custRes.json()

      if (prodJson.success && Array.isArray(prodJson.data)) {
        setProducts(prodJson.data)
        const cats = Array.from(
          new Set(
            prodJson.data
              .map((p: any) => p.product_categories?.name || 'General')
              .filter(Boolean)
          )
        ) as string[]
        setCategories(['All', ...cats])
      }

      if (custJson.success && Array.isArray(custJson.data)) {
        setCustomers(custJson.data)
      }
    } catch (err) {
      console.error('Error fetching POS data:', err)
      toast.error('Failed to load catalog for POS')
    } finally {
      setLoadingProducts(false)
    }
  }

  // Add Item to Cart
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id)
      if (existingIdx > -1) {
        const next = [...prev]
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        }
        return next
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            sku: product.sku || '',
            hsn_sac_code: product.hsn_sac_code || '8466',
            quantity: 1,
            unit: product.product_units?.abbreviation || 'PCS',
            unit_price: Number(product.sale_price) || 0,
            discount_percent: 0,
            gst_rate: Number(product.gst_rate) || 18,
          },
        ]
      }
    })
    toast.success(`Added ${product.name}`, { duration: 1200 })
  }

  // Handle Barcode Scanner Hit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = barcodeInput.trim()
    if (!code) return

    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase())
    )

    if (matched) {
      addToCart(matched)
      setBarcodeInput('')
    } else {
      toast.error(`No product found for barcode: ${code}`)
    }
  }

  // Cart Qty changes
  const updateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev]
      const newQty = next[index].quantity + delta
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index)
      }
      next[index] = { ...next[index], quantity: newQty }
      return next
    })
  }

  const updatePrice = (index: number, newPrice: number) => {
    setCart((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], unit_price: Math.max(0, newPrice) }
      return next
    })
  }

  const updateDiscount = (index: number, disc: number) => {
    setCart((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], discount_percent: Math.min(100, Math.max(0, disc)) }
      return next
    })
  }

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  // Cart Totals calculation
  const subtotal = cart.reduce((acc, it) => {
    const gross = it.quantity * it.unit_price
    const discount = (gross * it.discount_percent) / 100
    return acc + (gross - discount)
  }, 0)

  const taxAmount = cart.reduce((acc, it) => {
    const gross = it.quantity * it.unit_price
    const discount = (gross * it.discount_percent) / 100
    const taxable = gross - discount
    return acc + (taxable * it.gst_rate) / 100
  }, 0)

  const grandTotal = Math.round(subtotal + taxAmount)
  const roundOff = Number((grandTotal - (subtotal + taxAmount)).toFixed(2))

  const changeReturn =
    paymentMode === 'cash' && typeof cashTendered === 'number' && cashTendered > grandTotal
      ? cashTendered - grandTotal
      : 0

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty, cannot hold bill')
      return
    }
    const newHold: HeldBill = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      customerName: customerNameInput,
      items: [...cart],
      totalAmount: grandTotal,
    }
    setHeldBills((prev) => [newHold, ...prev])
    setCart([])
    toast.success(`Bill held for ${customerNameInput}`)
  }

  // Recall Held Bill
  const recallBill = (held: HeldBill) => {
    setCart(held.items)
    setCustomerNameInput(held.customerName)
    setHeldBills((prev) => prev.filter((b) => b.id !== held.id))
    toast.success(`Restored held bill ${held.id}`)
  }

  // New Bill
  const handleNewBill = () => {
    if (cart.length > 0 && !confirm('Discard active bill and start fresh?')) {
      return
    }
    setCart([])
    setSelectedCustomerId('walk-in')
    setCustomerNameInput('Cash Customer (Walk-in)')
    setCustomerPhoneInput('')
    setCashTendered('')
    barcodeInputRef.current?.focus()
  }

  // Complete & Checkout
  const handleCheckout = async (printTemplate: 'thermal_pos' | 'standard' = 'thermal_pos') => {
    if (cart.length === 0) {
      toast.error('Cannot checkout with empty cart')
      return
    }

    setSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const payload = {
        customer_id: selectedCustomerId === 'walk-in' ? 'walk-in' : selectedCustomerId,
        invoice_date: today,
        invoice_type: 'standard',
        place_of_supply: '27-Maharashtra',
        payment_status: paymentMode === 'credit' ? 'unpaid' : 'paid',
        payment_mode: paymentMode,
        amount_paid: paymentMode === 'credit' ? 0 : grandTotal,
        notes: `POS Counter Bill • Customer: ${customerNameInput} • Phone: ${customerPhoneInput || 'N/A'}`,
        items: cart.map((it) => ({
          product_id: it.product_id || null,
          description: it.name,
          hsn_sac_code: it.hsn_sac_code,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
          gst_rate: it.gst_rate,
          is_gst_inclusive: false,
        })),
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (json.success && json.data) {
        const invId = json.data.id
        const invNum = json.data.invoice_number || 'POS-BILL'
        toast.success(`Invoice ${invNum} generated!`)

        setCompletedInvoice({ id: invId, number: invNum })

        if (printTemplate === 'thermal_pos') {
          // Open thermal popup directly
          window.open(`/api/invoices/${invId}/pdf?template=thermal_pos`, '_blank')
        } else {
          setPreviewOpen(true)
        }

        // Reset cart for next customer
        setCart([])
        setCashTendered('')
        barcodeInputRef.current?.focus()
      } else {
        toast.error(json.error || 'Failed to complete POS invoice')
      }
    } catch (err) {
      console.error('POS Checkout error:', err)
      toast.error('Network error creating bill')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'All' ||
      (p.product_categories?.name || 'General') === selectedCategory
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCat && matchesSearch
  })

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col gap-2 overflow-hidden -mx-4 -my-6 p-4">
      {/* Top POS Action & Keyboard Bar */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-600 text-white rounded-lg">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-gray-900 uppercase">
              VANIRA Fast POS Counter Billing
            </h1>
            <p className="text-[10px] text-gray-500">
              High-Speed Barcode & Retail POS • Auto GST & Thermal Print
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-600">
          <span>
            <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-2xs font-bold text-gray-900">F1</kbd> New
          </span>
          <span>•</span>
          <span>
            <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-2xs font-bold text-gray-900">F2</kbd> Barcode
          </span>
          <span>•</span>
          <span>
            <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-2xs font-bold text-gray-900">F8</kbd> Hold
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {heldBills.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg text-xs">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-bold text-amber-800">Held ({heldBills.length}):</span>
              {heldBills.map((b) => (
                <button
                  key={b.id}
                  onClick={() => recallBill(b)}
                  className="bg-white hover:bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[10px] border shadow-2xs"
                  title={`Restore ${b.id} - ₹${b.totalAmount}`}
                >
                  {b.id} (₹{b.totalAmount})
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
          >
            <PauseCircle className="h-3.5 w-3.5 inline mr-1" /> Hold (F8)
          </button>

          <button
            onClick={handleNewBill}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 inline mr-1" /> New Bill (F1)
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Barcode + Catalog (7 cols) / Right = Cart & Checkout (5 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left: Search & Catalog Grid */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          {/* Top Inputs: Barcode Scanner & Search */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center gap-2">
            {/* Barcode scanner form */}
            <form onSubmit={handleBarcodeSubmit} className="relative w-full sm:w-1/2">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-600" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan / Type Barcode or SKU (F2)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </form>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name / HSN..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white font-bold shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 p-3 overflow-y-auto min-h-0">
            {loadingProducts ? (
              <div className="text-center py-20 text-xs text-gray-400">Loading catalog items...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-xs text-gray-400">
                No products found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredProducts.map((p) => {
                  const inCart = cart.find((it) => it.product_id === p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs relative ${
                        inCart
                          ? 'border-red-600 bg-red-50/20 ring-1 ring-red-500'
                          : 'border-gray-200 bg-white hover:border-red-300'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 h-5 w-5 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                      <div>
                        <div className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                          SKU: {p.sku || 'N/A'} • HSN: {p.hsn_sac_code || '8466'}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 font-mono">
                          ₹{Number(p.sale_price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-semibold bg-gray-100 text-gray-600 px-1 py-0.2 rounded">
                          GST {p.gst_rate}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Bill Cart & Tender Checkout */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          {/* Customer Selection Strip */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0 text-xs">
            <User className="h-4 w-4 text-gray-500 shrink-0" />
            <input
              type="text"
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              placeholder="Customer Name (e.g. Cash Walk-in)"
              className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium"
            />
            <input
              type="tel"
              value={customerPhoneInput}
              onChange={(e) => setCustomerPhoneInput(e.target.value)}
              placeholder="Mobile No."
              className="w-28 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-mono"
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 text-xs">
                <ShoppingCart className="h-10 w-10 text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Cart is empty</p>
                <p className="text-[11px] mt-1">
                  Scan barcode, search by SKU, or click items on the left catalog.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-1.5">Item</th>
                    <th className="p-1.5 text-center">Qty</th>
                    <th className="p-1.5 text-right">Price</th>
                    <th className="p-1.5 text-right">Total</th>
                    <th className="p-1.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((item, idx) => {
                    const gross = item.quantity * item.unit_price
                    const disc = (gross * item.discount_percent) / 100
                    const itemTaxable = gross - disc
                    const itemTotal = itemTaxable + (itemTaxable * item.gst_rate) / 100
                    return (
                      <tr key={idx} className="hover:bg-gray-50/70">
                        <td className="p-1.5">
                          <div className="font-semibold text-gray-900 leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[9px] text-gray-400 font-mono">
                            GST {item.gst_rate}% • Disc {item.discount_percent}%
                          </div>
                        </td>

                        {/* Qty Stepper */}
                        <td className="p-1.5 text-center">
                          <div className="inline-flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden">
                            <button
                              onClick={() => updateQty(idx, -1)}
                              className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 font-mono font-bold text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(idx, 1)}
                              className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="p-1.5 text-right font-mono text-gray-700">
                          ₹{item.unit_price}
                        </td>

                        {/* Item Total */}
                        <td className="p-1.5 text-right font-mono font-bold text-gray-900">
                          ₹{Math.round(itemTotal).toLocaleString('en-IN')}
                        </td>

                        {/* Remove */}
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart Bottom Summary & Checkout Box */}
          <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2 shrink-0">
            {/* Quick Totals */}
            <div className="text-[11px] font-mono space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Items ({cart.length}) • Qty ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST (CGST + SGST)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Round-off</span>
                  <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                </div>
              )}
            </div>

            {/* Prominent Grand Total Banner */}
            <div className="bg-red-600 text-white p-2.5 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">
                  Net Amount Payable
                </span>
                <span className="text-xl font-black font-mono">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/20 uppercase">
                {paymentMode}
              </span>
            </div>

            {/* Payment Mode Selector Pills */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                onClick={() => setPaymentMode('cash')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" /> Cash
              </button>
              <button
                onClick={() => setPaymentMode('upi')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  paymentMode === 'upi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" /> UPI QR
              </button>
              <button
                onClick={() => setPaymentMode('card')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  paymentMode === 'card'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" /> Card
              </button>
              <button
                onClick={() => setPaymentMode('credit')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  paymentMode === 'credit'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Khata
              </button>
            </div>

            {/* Cash Tendered & Change Return helper */}
            {paymentMode === 'cash' && (
              <div className="p-2 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">Tendered:</span>
                  <input
                    type="number"
                    placeholder="₹ Received"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value ? Number(e.target.value) : '')}
                    className="w-24 bg-gray-50 border border-gray-300 rounded px-2 py-0.5 font-mono font-bold text-xs"
                  />
                </div>
                {changeReturn > 0 && (
                  <div className="font-bold text-emerald-700 font-mono">
                    Return: ₹{changeReturn.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            )}

            {/* 1-Click Print & Save Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleCheckout('thermal_pos')}
                disabled={submitting || cart.length === 0}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Receipt className="h-4 w-4" /> Save & Thermal (80mm)
              </button>
              <button
                onClick={() => handleCheckout('standard')}
                disabled={submitting || cart.length === 0}
                className="py-2.5 px-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" /> Save & Print A4
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice PDF Preview Modal */}
      {completedInvoice && (
        <InvoicePDFPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          invoiceId={completedInvoice.id}
          invoiceNumber={completedInvoice.number}
          initialTemplate="standard"
          customerPhone={customerPhoneInput}
          customerName={customerNameInput}
          totalAmount={grandTotal}
        />
      )}
    </div>
  )
}
