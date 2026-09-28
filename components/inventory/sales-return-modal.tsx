'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Search,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Package,
  User,
  Calendar,
  FileText,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface SalesReturnModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  initialInvoiceId?: string
}

interface InvoiceSummary {
  id: string
  invoice_number: string
  invoice_date: string
  total_amount: number
  customers?: { display_name?: string; name?: string }
}

interface ReturnableItem {
  product_id: string
  product_name: string
  sku?: string | null
  original_quantity: number
  already_returned_quantity: number
  remaining_quantity: number
  unit: string
  unit_price: number
  gst_rate: number
  track_inventory: boolean
  primary_unit?: string | null
  secondary_unit?: string | null
  conversion_rate?: number | null
}

interface InvoiceDetails {
  invoice_id: string
  invoice_number: string
  invoice_date: string
  customer_id: string
  customer_name: string
  status: string
  total_amount: number
  items: ReturnableItem[]
}

const RETURN_REASONS = [
  { value: 'damaged', label: 'Damaged Goods' },
  { value: 'defective', label: 'Defective / Faulty Item' },
  { value: 'wrong_item', label: 'Wrong Item Sent / Ordered' },
  { value: 'customer_dissatisfied', label: 'Customer Dissatisfied' },
  { value: 'expired', label: 'Expired Product' },
  { value: 'excess_stock', label: 'Excess Stock Return' },
  { value: 'quality_issue', label: 'Quality / Specification Issue' },
  { value: 'other', label: 'Other Reason' },
]

export function SalesReturnModal({
  open,
  onClose,
  onSuccess,
  initialInvoiceId,
}: SalesReturnModalProps) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoiceId || '')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null)

  // Line item return quantities and units
  const [returnItems, setReturnItems] = useState<
    Record<
      string,
      {
        return_quantity: number
        unit: string
        unit_price: number
        gst_rate: number
      }
    >
  >({})

  const [reason, setReason] = useState<string>('customer_dissatisfied')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch available invoices on open
  useEffect(() => {
    if (!open) return
    async function loadInvoices() {
      setLoadingInvoices(true)
      try {
        const res = await fetch('/api/invoices?limit=50')
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setInvoices(json.data.filter((inv: any) => inv.status !== 'cancelled'))
        }
      } catch (err) {
        console.error('Failed to load invoices:', err)
      } finally {
        setLoadingInvoices(false)
      }
    }
    loadInvoices()
  }, [open])

  // Fetch invoice returnable details when selected
  useEffect(() => {
    if (!selectedInvoiceId) {
      setInvoiceDetails(null)
      setReturnItems({})
      return
    }

    async function loadDetails() {
      setLoadingDetails(true)
      try {
        const res = await fetch(`/api/returns/sales/invoice-details?invoice_id=${selectedInvoiceId}`)
        const json = await res.json()
        if (json.success && json.data) {
          setInvoiceDetails(json.data)
          // Initialize return items map with 0 return quantities
          const initialMap: Record<string, any> = {}
          for (const item of json.data.items) {
            initialMap[item.product_id] = {
              return_quantity: 0,
              unit: item.unit,
              unit_price: item.unit_price,
              gst_rate: item.gst_rate,
            }
          }
          setReturnItems(initialMap)
        } else {
          toast.error(json.error || 'Failed to load invoice details')
        }
      } catch (err) {
        console.error('Error fetching invoice details:', err)
        toast.error('Network error loading invoice details')
      } finally {
        setLoadingDetails(false)
      }
    }
    loadDetails()
  }, [selectedInvoiceId])

  // Compute calculated return totals
  const summary = useMemo(() => {
    let subtotal = 0
    let tax = 0
    let totalStockUnits = 0
    let activeItemsCount = 0

    if (!invoiceDetails) return { subtotal: 0, tax: 0, total: 0, totalStockUnits: 0, activeItemsCount: 0 }

    for (const item of invoiceDetails.items) {
      const state = returnItems[item.product_id]
      if (state && state.return_quantity > 0) {
        activeItemsCount++
        const lineSubtotal = state.return_quantity * state.unit_price
        const lineTax = lineSubtotal * (state.gst_rate / 100)
        subtotal += lineSubtotal
        tax += lineTax
        if (item.track_inventory) {
          totalStockUnits += state.return_quantity
        }
      }
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100,
      totalStockUnits,
      activeItemsCount,
    }
  }, [invoiceDetails, returnItems])

  const handleQuantityChange = (productId: string, val: number, maxQty: number) => {
    const qty = Math.max(0, Number(val) || 0)
    if (qty > maxQty) {
      toast.warning(`Quantity cannot exceed remaining returnable quantity (${maxQty})`)
      return
    }
    setReturnItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        return_quantity: qty,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceDetails) {
      toast.error('Please select an invoice first')
      return
    }

    // Collect returned items
    const itemsToSubmit: Array<{
      product_id: string
      return_quantity: number
      unit: string
      unit_price: number
      gst_rate: number
    }> = []

    for (const item of invoiceDetails.items) {
      const state = returnItems[item.product_id]
      if (state && state.return_quantity > 0) {
        itemsToSubmit.push({
          product_id: item.product_id,
          return_quantity: state.return_quantity,
          unit: state.unit,
          unit_price: state.unit_price,
          gst_rate: state.gst_rate,
        })
      }
    }

    if (itemsToSubmit.length === 0) {
      toast.error('Please specify a return quantity > 0 for at least one item')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/returns/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceDetails.invoice_id,
          reason,
          notes,
          items: itemsToSubmit,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`Sales Return created successfully! Credit Note #${json.credit_note_number}`)
        onSuccess?.()
        onClose()
      } else {
        toast.error(json.error || 'Failed to create sales return')
      }
    } catch (err: any) {
      console.error('Submission error:', err)
      toast.error('Network error creating sales return')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const filteredInvoices = invoices.filter((inv) => {
    if (!invoiceSearch) return true
    const q = invoiceSearch.toLowerCase()
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customers?.display_name?.toLowerCase().includes(q) ||
      inv.customers?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create Sales Return (Credit Note)</h2>
              <p className="text-xs text-gray-500">
                Returns items to stock, reverses GST, and updates customer receivable ledger.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Select Invoice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Select Original Sales Invoice
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoice number or customer..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                />
              </div>

              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                disabled={loadingInvoices}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-gray-800"
              >
                <option value="">-- Choose Sales Invoice ({filteredInvoices.length} available) --</option>
                {filteredInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.customers?.display_name || inv.customers?.name || 'Customer'} (₹{Number(inv.total_amount).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Invoice Details Header Card */}
          {loadingDetails && (
            <div className="py-8 flex items-center justify-center text-xs text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-rose-500 mr-2" />
              Loading invoice items and return limits...
            </div>
          )}

          {invoiceDetails && (
            <>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Customer</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                    <User className="h-3.5 w-3.5 text-gray-500" />
                    {invoiceDetails.customer_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Invoice Date</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {invoiceDetails.invoice_date}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Invoice #</span>
                  <span className="font-semibold text-gray-900 font-mono flex items-center gap-1 mt-0.5">
                    <FileText className="h-3.5 w-3.5 text-gray-500" />
                    {invoiceDetails.invoice_number}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Original Total</span>
                  <span className="font-bold text-gray-900 font-mono mt-0.5 block">
                    ₹{invoiceDetails.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Step 3: Sold Items & Return Quantity Input Table */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>2. Specify Return Quantities</span>
                  <span className="text-[11px] font-normal text-gray-500">
                    Max quantity is limited to remaining unreturned items.
                  </span>
                </label>

                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 text-[11px] font-semibold uppercase">
                        <th className="py-3 px-3">Item / Product</th>
                        <th className="py-3 px-2 text-right">Sold Qty</th>
                        <th className="py-3 px-2 text-right">Prior Returned</th>
                        <th className="py-3 px-2 text-right">Remaining</th>
                        <th className="py-3 px-3 text-center w-36">Return Qty</th>
                        <th className="py-3 px-2 text-right">Unit Price</th>
                        <th className="py-3 px-2 text-right">GST %</th>
                        <th className="py-3 px-3 text-right">Line Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {invoiceDetails.items.map((item) => {
                        const itemState = returnItems[item.product_id] || {
                          return_quantity: 0,
                          unit: item.unit,
                          unit_price: item.unit_price,
                          gst_rate: item.gst_rate,
                        }

                        const lineSub = itemState.return_quantity * itemState.unit_price
                        const lineTax = lineSub * (itemState.gst_rate / 100)
                        const lineTotal = lineSub + lineTax
                        const isExhausted = item.remaining_quantity <= 0

                        return (
                          <tr
                            key={item.product_id}
                            className={`transition-colors ${
                              itemState.return_quantity > 0 ? 'bg-rose-50/40 font-medium' : 'hover:bg-gray-50/50'
                            }`}
                          >
                            <td className="py-3 px-3 font-semibold text-gray-900">
                              {item.product_name}
                              {item.sku && <span className="block text-[10px] font-mono text-gray-400">SKU: {item.sku}</span>}
                              {item.track_inventory && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-normal">
                                  <Package className="h-3 w-3" /> Restocks inventory
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-mono">
                              {item.original_quantity} {item.unit}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-gray-500">
                              {item.already_returned_quantity} {item.unit}
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-gray-800">
                              {item.remaining_quantity} {item.unit}
                            </td>
                            <td className="py-3 px-3">
                              {isExhausted ? (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md block text-center">
                                  Fully Returned
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.remaining_quantity}
                                    step="any"
                                    value={itemState.return_quantity || ''}
                                    onChange={(e) =>
                                      handleQuantityChange(item.product_id, parseFloat(e.target.value) || 0, item.remaining_quantity)
                                    }
                                    placeholder="0"
                                    className="w-20 px-2.5 py-1.5 text-center text-xs font-bold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                                  />
                                  <span className="text-[11px] text-gray-500 font-semibold">{item.unit}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-mono">₹{item.unit_price}</td>
                            <td className="py-3 px-2 text-right font-mono">{item.gst_rate}%</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                              ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 4: Reason & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Return Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  >
                    {RETURN_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Internal Notes / Remarks</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Broken packaging upon delivery, refunded to store credit"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Step 5: Return Financial & Inventory Impact Preview */}
              <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 text-[11px] font-bold">
                      {summary.activeItemsCount} items selected
                    </span>
                    <span className="text-xs text-rose-900 font-medium">
                      +{summary.totalStockUnits} stock units returning to inventory
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Subtotal: ₹{summary.subtotal.toFixed(2)} | GST Reversed: ₹{summary.tax.toFixed(2)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Credit Note Amount</span>
                  <span className="text-xl font-black text-rose-950 font-mono">
                    ₹{summary.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !invoiceDetails || summary.activeItemsCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing Return...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Issue Credit Note & Restock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
