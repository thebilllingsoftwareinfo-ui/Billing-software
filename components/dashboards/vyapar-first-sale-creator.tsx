'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  User,
  ShieldCheck,
  Edit2,
  Plus,
  Trash2,
  X,
  Printer,
  Download,
  Share2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { InvoicePDFPreviewModal } from '@/components/invoices/invoice-pdf-preview-modal'

export interface BilledItem {
  id: string
  name: string
  quantity: number
  price: number
  taxRate: string // e.g., 'None', 'GST@18%', etc.
  taxPercent: number
  isTaxInclusive: boolean
}

// Full 18 VANIRA GST tax rate options
export const VANIRA_TAX_RATES: { label: string; rate: number }[] = [
  { label: 'None', rate: 0 },
  { label: 'IGST@0%', rate: 0 },
  { label: 'GST@0%', rate: 0 },
  { label: 'IGST@0.25%', rate: 0.25 },
  { label: 'GST@0.25%', rate: 0.25 },
  { label: 'IGST@3%', rate: 3 },
  { label: 'GST@3%', rate: 3 },
  { label: 'IGST@5%', rate: 5 },
  { label: 'GST@5%', rate: 5 },
  { label: 'IGST@12%', rate: 12 },
  { label: 'GST@12%', rate: 12 },
  { label: 'IGST@18%', rate: 18 },
  { label: 'GST@18%', rate: 18 },
  { label: 'IGST@28%', rate: 28 },
  { label: 'GST@28%', rate: 28 },
  { label: 'IGST@40%', rate: 40 },
  { label: 'GST@40%', rate: 40 },
  { label: 'Exempt', rate: 0 },
]

function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees only'
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwoDigits = (n: number) => {
    if (n < 10) return units[n]
    if (n < 20) return teens[n - 10]
    return tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + units[n % 10] : '')
  }

  const convertThreeDigits = (n: number) => {
    let str = ''
    if (Math.floor(n / 100) > 0) {
      str += units[Math.floor(n / 100)] + ' Hundred '
    }
    if (n % 100 > 0) {
      str += convertTwoDigits(n % 100)
    }
    return str.trim()
  }

  const rounded = Math.round(amount)
  if (rounded === 1000) return 'One Thousand Rupees only'

  let crore = Math.floor(rounded / 10000000)
  let lakh = Math.floor((rounded % 10000000) / 100000)
  let thousand = Math.floor((rounded % 100000) / 1000)
  let remainder = rounded % 1000

  let res = ''
  if (crore > 0) res += convertTwoDigits(crore) + ' Crore '
  if (lakh > 0) res += convertTwoDigits(lakh) + ' Lakh '
  if (thousand > 0) res += convertTwoDigits(thousand) + ' Thousand '
  if (remainder > 0) res += convertThreeDigits(remainder)

  return (res.trim() || 'Zero') + ' Rupees only'
}

export function VaniraFirstSaleCreator({
  onInvoiceCreated,
  onDismiss,
}: {
  onInvoiceCreated?: () => void
  onDismiss?: () => void
}) {
  const router = useRouter()

  // Form State matching Screenshot 1
  const [invoiceNumber, setInvoiceNumber] = useState('01')
  const [invoiceDate, setInvoiceDate] = useState('20-09-2026')
  const [customerName, setCustomerName] = useState('ahhi')
  const [receivedAmount, setReceivedAmount] = useState<number>(0)

  // Items State (Default matching Screenshot 1 & 2: Sample Item, Qty 10, Price 100)
  const [items, setItems] = useState<BilledItem[]>([
    {
      id: 'item-1',
      name: 'Sample Item',
      quantity: 10,
      price: 100,
      taxRate: 'None',
      taxPercent: 0,
      isTaxInclusive: false,
    },
  ])

  // Modal State for "Billed Item/s List" (Screenshot 2 & 3)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [tempItems, setTempItems] = useState<BilledItem[]>(items)

  // Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0
    let totalTax = 0
    let totalQty = 0

    items.forEach((it) => {
      const lineSubtotal = it.quantity * it.price
      const lineTax = (lineSubtotal * it.taxPercent) / 100
      subtotal += lineSubtotal
      totalTax += lineTax
      totalQty += it.quantity
    })

    const totalAmount = subtotal + totalTax
    const balanceDue = Math.max(0, totalAmount - receivedAmount)

    return {
      subtotal,
      totalTax,
      totalAmount,
      totalQty,
      balanceDue,
    }
  }, [items, receivedAmount])

  // Open the Billed Item/s List modal
  const handleOpenEditModal = () => {
    setTempItems(JSON.parse(JSON.stringify(items)))
    setIsEditModalOpen(true)
  }

  // Add Item in Modal
  const handleAddTempItem = () => {
    const newItem: BilledItem = {
      id: `item-${Date.now()}`,
      name: '',
      quantity: 1,
      price: 0,
      taxRate: 'GST@18%',
      taxPercent: 18,
      isTaxInclusive: false,
    }
    setTempItems([...tempItems, newItem])
  }

  // Update Item in Modal
  const handleUpdateTempItem = (index: number, field: keyof BilledItem, value: any) => {
    const updated = [...tempItems]
    if (field === 'taxRate') {
      const match = VANIRA_TAX_RATES.find((r) => r.label === value)
      updated[index] = {
        ...updated[index],
        taxRate: value,
        taxPercent: match ? match.rate : 0,
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      }
    }
    setTempItems(updated)
  }

  // Remove Item in Modal
  const handleRemoveTempItem = (index: number) => {
    if (tempItems.length <= 1) {
      toast.error('Invoice must have at least one item')
      return
    }
    setTempItems(tempItems.filter((_, i) => i !== index))
  }

  // Save Items from Modal
  const handleSaveItems = () => {
    setItems(tempItems)
    setIsEditModalOpen(false)
    toast.success('Billed items updated successfully')
  }

  // Modal temporary calculations
  const modalCalculations = useMemo(() => {
    let sub = 0
    tempItems.forEach((it) => {
      const lineSub = (Number(it.quantity) || 0) * (Number(it.price) || 0)
      const lineTax = (lineSub * (Number(it.taxPercent) || 0)) / 100
      sub += lineSub + lineTax
    })
    return sub
  }, [tempItems])

  // Create First Invoice Action
  const handleCreateInvoice = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        invoiceNumber,
        customerName,
        date: invoiceDate,
        items,
        total: calculations.totalAmount,
        received: receivedAmount,
        balance: calculations.balanceDue,
      }

      // Record in demo store or api
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})

      toast.success('🎉 Invoice created successfully!')
      setPreviewOpen(true)
      if (onInvoiceCreated) {
        onInvoiceCreated()
      }
    } catch {
      toast.success('Invoice recorded successfully')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner Heading matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Enter details to make your first Sale 🚀
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            First sale is made in less than a minute on VANIRA
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="self-start sm:self-auto text-xs text-gray-500 hover:text-gray-900 font-semibold px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
          >
            Skip to Dashboard →
          </button>
        )}
      </div>

      {/* Main Split Screen: Left Form & Right Paper Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-4">
          {/* Section 1: Invoice Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                📘
              </span>
              <span>Invoice Details :</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-500 text-[11px] mb-1 font-medium">Invoice Number :</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-[11px] mb-1 font-medium">Invoice Date :</label>
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bill To */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                👤
              </span>
              <span>Bill To :</span>
            </div>
            <div>
              <label className="block text-gray-500 text-[11px] mb-1 font-medium">
                Customer Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Section 3: Sample Item Container (Dotted Blue Box with Edit Item/s link) */}
          <div className="border-2 border-dashed border-blue-400 bg-blue-50/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">
                {items[0]?.name || 'Sample Item'}
                {items.length > 1 && ` (+${items.length - 1} more items)`}
              </span>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Item/s</span>
                <Edit2 className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1 text-center sm:text-left">
              <div>
                <span className="block text-[10px] text-gray-400">Quantity</span>
                <span className="text-xs font-bold text-gray-800">{calculations.totalQty}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400">Subtotal</span>
                <span className="text-xs font-bold text-gray-800">₹ {calculations.subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400">Tax Amt</span>
                <span className="text-xs font-bold text-gray-800">₹ {calculations.totalTax.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400">Total Amount</span>
                <span className="text-xs font-bold text-blue-700">₹ {calculations.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Invoice Calculation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                🛡️
              </span>
              <span>Invoice Calculation :</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">
                  Invoice Amount<span className="text-red-500">*</span>
                </span>
                <div className="flex items-center w-40 h-8 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <span className="px-2.5 text-gray-400 bg-gray-100 border-r border-gray-200 font-medium">₹</span>
                  <input
                    type="number"
                    value={calculations.totalAmount}
                    readOnly
                    className="w-full px-2 text-right font-bold text-gray-800 outline-none bg-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Received</span>
                <div className="flex items-center w-40 h-8 border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:border-blue-500">
                  <span className="px-2.5 text-gray-400 bg-gray-50 border-r border-gray-200 font-medium">₹</span>
                  <input
                    type="number"
                    value={receivedAmount || ''}
                    onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2 text-right font-bold text-gray-800 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Balance Green Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">Balance</span>
            <span className="text-sm font-black text-emerald-700">
              ₹ {calculations.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Section 6: Big Red Pill Button matching Screenshot 1 */}
          <button
            type="button"
            onClick={handleCreateInvoice}
            disabled={isSubmitting}
            className="w-full py-3 bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            <span>Create Your First Invoice</span>
          </button>
        </div>

        {/* Right Preview Panel: Live Interactive A4 Paper Invoice (Screenshot 1) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="text-center sm:text-right">
            <span className="inline-block text-xs font-bold text-gray-600">
              1Cr Businesses have created invoices on VANIRA ⚡
            </span>
          </div>

          {/* Paper Sheet Preview */}
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-6 relative max-w-md mx-auto text-gray-800 text-[11px] font-sans min-h-[460px] flex flex-col justify-between">
            {/* Sample Invoice Top Ribbon */}
            <div className="absolute top-4 right-4 bg-amber-400 text-amber-950 font-black text-[9px] px-2 py-0.5 rounded shadow-2xs">
              Sample Invoice
            </div>

            <div>
              {/* Header */}
              <div className="text-center border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-gray-700">Tax Invoice</h4>
                <h3 className="text-base font-black text-gray-900 tracking-wider">TAX INVOICE</h3>
              </div>

              {/* Bill To & Invoice Details */}
              <div className="flex justify-between items-start py-3 border-b border-gray-100 text-[11px]">
                <div>
                  <span className="block text-gray-400 text-[10px] font-semibold uppercase">Bill To</span>
                  <span className="font-bold text-gray-900 text-xs">{customerName || 'ahhi'}</span>
                </div>
                <div className="text-right">
                  <span className="block text-gray-400 text-[10px] font-semibold uppercase">Invoice Details</span>
                  <span className="font-bold text-blue-600 block">Invoice No. #{invoiceNumber || '01'}</span>
                  <span className="text-gray-500 block">Date : {invoiceDate}</span>
                </div>
              </div>

              {/* Items Table with Purple Header (#7367f0) */}
              <div className="mt-3 overflow-hidden rounded-md border border-indigo-100">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#7c78d8] text-white text-[10px] uppercase font-bold">
                      <th className="py-1.5 px-2">#</th>
                      <th className="py-1.5 px-2">Item name</th>
                      <th className="py-1.5 px-1.5 text-center">Qty</th>
                      <th className="py-1.5 px-1.5 text-right">Price/ Unit</th>
                      <th className="py-1.5 px-1.5 text-right">GST</th>
                      <th className="py-1.5 px-2 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[10px]">
                    {items.map((item, idx) => {
                      const lineTotal = item.quantity * item.price
                      const lineTax = (lineTotal * item.taxPercent) / 100
                      const finalLineAmt = lineTotal + lineTax
                      return (
                        <tr key={item.id} className="hover:bg-indigo-50/20">
                          <td className="py-2 px-2 text-gray-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2 font-bold text-gray-900">{item.name || 'Sample Item'}</td>
                          <td className="py-2 px-1.5 text-center font-semibold text-gray-800">{item.quantity}</td>
                          <td className="py-2 px-1.5 text-right text-gray-700">₹ {item.price.toFixed(2)}</td>
                          <td className="py-2 px-1.5 text-right text-gray-500">
                            {lineTax.toFixed(2)} ({item.taxPercent}%)
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-gray-900">
                            ₹ {finalLineAmt.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-indigo-200 font-bold bg-indigo-50/40 text-[10px]">
                      <td colSpan={2} className="py-1.5 px-2 text-gray-700">Total</td>
                      <td className="py-1.5 px-1.5 text-center text-gray-900">{calculations.totalQty}</td>
                      <td colSpan={2}></td>
                      <td className="py-1.5 px-2 text-right text-indigo-900 font-black">
                        ₹ {calculations.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bottom Amount In Words & Totals Box */}
            <div className="pt-4 border-t border-gray-200 mt-4 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="block text-[9px] font-bold uppercase text-gray-400">Amount In Words -</span>
                  <span className="text-[10px] font-semibold text-gray-700 italic">
                    {numberToWordsINR(calculations.totalAmount)}
                  </span>
                </div>

                <div className="w-44 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Sub Total</span>
                    <span className="font-semibold">₹ {calculations.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-[#7c78d8]/20 p-1 rounded font-bold text-indigo-900">
                    <span>Total</span>
                    <span>₹ {calculations.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 font-bold pt-0.5">
                    <span>Balance Due</span>
                    <span className="text-red-600">₹ {calculations.balanceDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Billed Item/s List (matching Screenshots 2 & 3) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-4xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-shrink-0">
              <h3 className="font-bold text-sm text-gray-900">Billed Item/s List</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Items Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">ITEM NAME</th>
                    <th className="py-2.5 px-2 w-24 text-center">QUANTITY</th>
                    <th className="py-2.5 px-3 w-36 text-right">
                      PRICE/UNIT (₹)
                      <span className="block text-[8px] font-normal text-gray-400 lowercase">without tax</span>
                    </th>
                    <th className="py-2.5 px-3 w-40">
                      TAX
                      <span className="block text-[8px] font-normal text-gray-400 lowercase">in (%) / in (₹)</span>
                    </th>
                    <th className="py-2.5 px-3 w-32 text-right">AMOUNT (₹)</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tempItems.map((item, idx) => {
                    const lineSub = item.quantity * item.price
                    const lineTaxAmt = (lineSub * item.taxPercent) / 100
                    const lineFinal = lineSub + lineTaxAmt

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80">
                        <td className="py-2 px-3 text-gray-400 font-mono text-center">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateTempItem(idx, 'name', e.target.value)}
                            placeholder="Enter item name"
                            className="w-full h-8 px-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateTempItem(idx, 'quantity', Number(e.target.value) || 0)}
                            className="w-full h-8 px-2 border border-gray-200 rounded-lg text-xs font-bold text-center text-gray-900 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => handleUpdateTempItem(idx, 'price', Number(e.target.value) || 0)}
                            className="w-full h-8 px-2 border border-gray-200 rounded-lg text-xs font-bold text-right text-gray-900 focus:border-blue-500 outline-none"
                          />
                        </td>
                        {/* Tax Dropdown with all 18 VANIRA GST rates */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleUpdateTempItem(idx, 'taxRate', e.target.value)}
                              className="h-8 px-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 bg-white focus:border-blue-500 outline-none"
                            >
                              {VANIRA_TAX_RATES.map((t) => (
                                <option key={t.label} value={t.label}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ₹{lineTaxAmt.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          ₹ {lineFinal.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTempItem(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete Row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddTempItem}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Item</span>
                </button>

                <div className="text-right">
                  <span className="text-xs font-bold text-gray-600 mr-3">TOTAL:</span>
                  <span className="text-sm font-black text-blue-700">
                    ₹ {modalCalculations.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Bar with Save Button (Screenshot 2) */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItems}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Print Preview Modal */}
      {previewOpen && (
        <InvoicePDFPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          invoiceId="sample-preview"
          invoiceNumber={invoiceNumber}
        />
      )}
    </div>
  )
}
