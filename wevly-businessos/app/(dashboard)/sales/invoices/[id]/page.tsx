'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  Send,
  Edit,
  Ban,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  Download,
  Link2,
  ExternalLink,
  Wallet,
  Sparkles,
  Receipt,
  Minimize2,
  Layers,
  FileSpreadsheet,
  QrCode as QrIcon,
  CreditCard,
  Banknote,
  Landmark,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { InvoicePDFPreviewModal } from '@/components/invoices/invoice-pdf-preview-modal'
import { PDFTemplateType, TEMPLATE_OPTIONS } from '@/lib/constants/invoice-templates'
import { numberToRupeeWords } from '@/lib/utils/number-to-words'
import { buildUpiDeepLink, generateQrDataUrl } from '@/lib/utils/upi-qr'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplateType>('standard')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  // Payment Recording Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0)
  const [paymentModeInput, setPaymentModeInput] = useState<string>('cash')
  const [paymentRefInput, setPaymentRefInput] = useState<string>('')
  const [paymentDateInput, setPaymentDateInput] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Load and auto-remember chosen template
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wevly_default_invoice_template') as PDFTemplateType
      if (saved && ['standard', 'modern', 'compact_a5', 'thermal_pos', 'minimal'].includes(saved)) {
        setSelectedTemplate(saved)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleTemplateSwitch = (tmpl: PDFTemplateType) => {
    setSelectedTemplate(tmpl)
    try {
      localStorage.setItem('wevly_default_invoice_template', tmpl)
      const found = TEMPLATE_OPTIONS.find((t) => t.id === tmpl)
      toast.success(`Active view & print template set to: ${found?.name || tmpl}`)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchInvoiceDetails()
  }, [id])

  const fetchInvoiceDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      const json = await res.json()

      if (json.success) {
        setInvoice(json.data)
        const totalAmt = Number(json.data.total_amount) || 0
        const paidAmt = Number(json.data.amount_paid) || 0
        const dueAmt = Math.max(0, totalAmt - paidAmt)
        setPaymentAmountInput(dueAmt)

        // Generate UPI QR Code for instant scan & pay
        const org = json.data.organization || {}
        const upiId = org.upi_id || 'billing@icici'
        if (upiId) {
          const upiUrl = buildUpiDeepLink({
            pa: upiId,
            pn: org.name || 'Merchant',
            am: dueAmt > 0 ? dueAmt : totalAmt,
            tr: json.data.invoice_number || 'BILL',
            tn: `Invoice ${json.data.invoice_number}`,
          })
          generateQrDataUrl(upiUrl, { width: 220, margin: 1 }).then(setQrCodeDataUrl)
        }
      } else {
        setError(json.error || 'Failed to fetch invoice details')
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err)
      setError('Network error loading invoice details')
    } finally {
      setLoading(false)
    }
  }

  const handleFinalize = async () => {
    if (
      !confirm(
        `Are you sure you want to finalize invoice '${invoice?.invoice_number}'? Stock movements will be posted and customer balance updated.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/invoices/${id}/finalize`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(`Invoice ${invoice?.invoice_number} finalized successfully!`)
        fetchInvoiceDetails()
      } else {
        toast.error(json.error || 'Failed to finalize invoice')
      }
    } catch (err) {
      toast.error('Error finalizing invoice')
    }
  }

  const handleCancel = async () => {
    const reason = prompt(`Enter reason for cancelling invoice '${invoice?.invoice_number}':`)
    if (!reason) return

    try {
      const res = await fetch(`/api/invoices/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Invoice ${invoice?.invoice_number} cancelled successfully`)
        fetchInvoiceDetails()
      } else {
        toast.error(json.error || 'Failed to cancel invoice')
      }
    } catch (err) {
      toast.error('Error cancelling invoice')
    }
  }

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentAmountInput <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    setRecordingPayment(true)
    try {
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmountInput,
          payment_mode: paymentModeInput,
          payment_reference: paymentRefInput.trim() || undefined,
          payment_date: paymentDateInput,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast.success(`Payment of ₹${paymentAmountInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded successfully!`)
        setPaymentModalOpen(false)
        fetchInvoiceDetails()
      } else {
        toast.error(json.error || 'Failed to record payment')
      }
    } catch (err) {
      toast.error('Network error recording payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
        Loading invoice document preview...
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/sales/invoices"
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Sales Invoice Details</h1>
        </div>

        <div className="p-6 bg-red-50 text-red-700 text-xs font-medium rounded-2xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || 'Invoice not found'}</span>
        </div>
      </div>
    )
  }

  const customer = invoice.customers || {}
  const org = invoice.organization || {}
  const items = invoice.invoice_items || []
  const taxes = invoice.invoice_taxes || []

  const total = Number(invoice.total_amount) || 0
  const totalInWords = numberToRupeeWords(total)
  const totalTax = Number(invoice.total_tax_amount || 0)
  const taxInWords = numberToRupeeWords(totalTax)
  const paid = Number(invoice.amount_paid) || 0
  const due = Number(invoice.balance_due !== undefined ? invoice.balance_due : Math.max(0, total - paid))
  const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0)

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Bar (hidden on print) */}
      <div className="print:hidden flex flex-col gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/sales/invoices"
              className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{invoice.invoice_number}</h1>
                <span
                  className={`px-2.5 py-0.5 font-semibold text-[10px] uppercase rounded-md ${
                    invoice.status === 'draft'
                      ? 'bg-amber-50 text-amber-700'
                      : invoice.status === 'issued'
                      ? 'bg-blue-50 text-blue-700'
                      : invoice.status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : invoice.status === 'partial'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {invoice.status === 'partial' ? 'Partially Paid' : invoice.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Issued on {invoice.invoice_date} {invoice.due_date ? `• Due ${invoice.due_date}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Record Payment Button */}
            {due > 0 && invoice.status !== 'cancelled' && invoice.status !== 'void' && (
              <button
                onClick={() => {
                  setPaymentAmountInput(due)
                  setPaymentModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl shadow-2xs transition-colors"
              >
                <Wallet className="h-4 w-4 text-emerald-600" /> + Record Payment
              </button>
            )}

            <button
              onClick={() => setPdfPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="h-4 w-4" /> PDF Preview & Print
            </button>

            {invoice.status === 'draft' && (
              <>
                <Link
                  href={`/sales/invoices/${id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
                >
                  <Edit className="h-4 w-4" /> Edit Draft
                </Link>
                <button
                  onClick={handleFinalize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <Send className="h-4 w-4" /> Finalize & Issue
                </button>
              </>
            )}

            {invoice.status !== 'cancelled' && invoice.status !== 'void' && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-semibold rounded-xl transition-colors"
              >
                <Ban className="h-4 w-4" /> Cancel Invoice
              </button>
            )}
          </div>
        </div>

        {/* 5 Template Switcher Selector Bar */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>Template & Printer Size:</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
              ✓ Auto-Remembered
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {TEMPLATE_OPTIONS.map((tmpl) => {
              const Icon = tmpl.icon
              const isActive = selectedTemplate === tmpl.id
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleTemplateSwitch(tmpl.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={tmpl.desc}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tmpl.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {tmpl.paperSize}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. STANDARD GST PRO DOCUMENT VIEW (MATCHING USER REFERENCE)  */}
      {/* ============================================================ */}
      {selectedTemplate === 'standard' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-900 shadow-sm max-w-4xl mx-auto font-sans text-gray-900 print:shadow-none print:border-gray-900 print:p-0 print:m-0">
          {/* Top Company Header Banner */}
          <div className="flex items-start justify-between border-b border-gray-900 pb-4">
            <div className="w-2/3">
              <h1 className="text-2xl font-black uppercase text-blue-900 tracking-wide">
                {org.name || 'Gujarat Freight Tools'}
              </h1>
              <div className="inline-block bg-sky-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-sm mt-1">
                {org.legal_name || 'Manufacturing & Supply of Precision Press Tool & Room Component'}
              </div>
              <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                {org.address_line1 || 'Plot No A 64, Road No 21, Wagle Indl Estate'}
                {org.address_line2 ? `, ${org.address_line2}` : ''}
                {org.city ? `, ${org.city}` : ', Mumbai'}, {org.state_code || 'Maharashtra'} - {org.postal_code || '400604'}
              </p>
            </div>

            <div className="w-1/3 flex flex-col items-end text-right text-xs text-gray-700">
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt="Logo" className="h-12 w-28 object-contain mb-1" />
              ) : (
                <div className="h-10 w-24 bg-gray-100 rounded border border-gray-300 flex items-center justify-center font-black text-gray-500 text-xs mb-1">
                  LOGOTEXT
                </div>
              )}
              <p className="text-[11px] font-medium">{org.phone ? `Tel : ${org.phone}` : 'Tel : 02225820309'}</p>
              <p className="text-[11px] text-blue-800">{org.website ? `Web : ${org.website}` : 'Web : www.gft.com'}</p>
              <p className="text-[11px] text-gray-600">{org.email ? `Email : ${org.email}` : 'Web : info@gft.com'}</p>
            </div>
          </div>

          {/* PAN & TAX INVOICE BAR */}
          <div className="flex items-center justify-between border-b border-gray-900 py-1.5 px-3 bg-gray-100 text-xs font-bold">
            <div>PAN : <span className="font-mono">{org.pan || '26CORPP3939N1'}</span></div>
            <div className="text-sm uppercase tracking-widest font-black">TAX INVOICE</div>
            <div className="text-[10px] text-gray-600 uppercase">ORIGINAL FOR RECIPIENT</div>
          </div>

          {/* 2-COLUMN METADATA BOX */}
          <div className="grid grid-cols-2 border-b border-gray-900 text-xs divide-x divide-gray-900">
            {/* Customer Details */}
            <div className="p-3 space-y-1">
              <div className="font-bold uppercase text-[11px] text-blue-900 border-b border-gray-200 pb-1 mb-1">
                Customer Detail
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">M/S:</span>
                <span className="col-span-2 font-bold text-gray-950">{customer.display_name || 'Shiv Engineering'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">Address:</span>
                <span className="col-span-2 text-gray-800 leading-snug">
                  {customer.address_line1 || 'Sumel Business Park 7, Kochi, Kerala - 380023'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">Phone:</span>
                <span className="col-span-2 text-gray-800">{customer.phone || '9878789878'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">GSTIN:</span>
                <span className="col-span-2 font-mono font-bold text-gray-950">{customer.gstin || '32AABBA7890B1ZB'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">Place of Supply:</span>
                <span className="col-span-2 font-medium text-gray-950">{invoice.place_of_supply || 'Kerala ( 32 )'}</span>
              </div>
            </div>

            {/* Invoice & Dispatch Details */}
            <div className="p-3 space-y-1">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <span className="text-gray-600 block text-[10px]">Invoice No.</span>
                  <span className="font-mono font-bold text-gray-950">{invoice.invoice_number}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[10px]">Invoice Date</span>
                  <span className="font-mono font-bold text-gray-950">{invoice.invoice_date}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[10px]">Challan / PO No</span>
                  <span className="font-mono text-gray-900">{invoice.reference_number || '33'}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[10px]">Payment Status</span>
                  <span className={`font-bold uppercase text-[11px] ${
                    invoice.status === 'paid' ? 'text-emerald-700' : (paid > 0 ? 'text-orange-700' : 'text-gray-900')
                  }`}>
                    {invoice.status === 'paid' ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID')} ({invoice.payment_mode ? invoice.payment_mode.toUpperCase() : 'CASH'})
                  </span>
                </div>
                {paid > 0 && (
                  <div>
                    <span className="text-gray-600 block text-[10px]">Amount Paid</span>
                    <span className="font-mono font-bold text-emerald-700">₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {due > 0 && (
                  <div>
                    <span className="text-gray-600 block text-[10px]">Balance Due</span>
                    <span className="font-mono font-bold text-rose-700">₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="col-span-2 pt-1 border-t border-gray-200">
                  <span className="text-gray-600 text-[10px]">Transport: </span>
                  <span className="font-medium text-gray-900">Silver Roadlines (24ABSFS0321B2ZL)</span>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCT ITEMS TABLE */}
          <div className="border-b border-gray-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-900 bg-gray-50 text-[11px] font-bold text-gray-900">
                  <th className="py-2 px-2 border-r border-gray-300 text-center w-10">Sr. No.</th>
                  <th className="py-2 px-3 border-r border-gray-300">Name of Product / Service</th>
                  <th className="py-2 px-2 border-r border-gray-300 text-center w-24">HSN / SAC</th>
                  <th className="py-2 px-2 border-r border-gray-300 text-center w-20">Qty</th>
                  <th className="py-2 px-3 border-r border-gray-300 text-right w-24">Rate</th>
                  <th className="py-2 px-3 text-right w-28">Taxable Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((it: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-gray-300 font-medium text-gray-950">{it.description}</td>
                    <td className="py-2 px-2 border-r border-gray-300 text-center font-mono">{it.hsn_sac_code || '8302'}</td>
                    <td className="py-2 px-2 border-r border-gray-300 text-center font-medium">
                      {it.quantity} {it.unit || 'NOS'}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-300 text-right font-mono">
                      {Number(it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-950">
                      {Number(it.taxable_amount || it.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}

                {/* Subtotal & Tax Row in table */}
                <tr className="bg-gray-50/70 border-t border-gray-300">
                  <td className="py-1 px-2 border-r border-gray-300"></td>
                  <td className="py-1 px-3 border-r border-gray-300 text-right italic font-medium text-gray-700">
                    {invoice.is_inter_state ? 'IGST (18.00 %)' : 'CGST (9%) + SGST (9%)'}
                  </td>
                  <td className="py-1 px-2 border-r border-gray-300"></td>
                  <td className="py-1 px-2 border-r border-gray-300"></td>
                  <td className="py-1 px-3 border-r border-gray-300"></td>
                  <td className="py-1 px-3 text-right font-mono font-bold text-gray-900">
                    {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* Table Footer Grand Total */}
                <tr className="border-t-2 border-gray-900 bg-gray-100 font-bold text-xs">
                  <td colSpan={3} className="py-2 px-3 text-right border-r border-gray-300 uppercase">
                    Total
                  </td>
                  <td className="py-2 px-2 text-center border-r border-gray-300 font-mono">
                    {totalQty} NOS
                  </td>
                  <td className="py-2 px-3 border-r border-gray-300"></td>
                  <td className="py-2 px-3 text-right font-mono text-sm font-black text-gray-950">
                    ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* Partial Payment Summary Row in table */}
                {paid > 0 && (
                  <tr className="bg-emerald-50/70 font-semibold text-xs border-t border-gray-300">
                    <td colSpan={4} className="py-1.5 px-3 text-emerald-900 text-right">
                      Amount Paid / Received ({invoice.payment_mode ? invoice.payment_mode.toUpperCase() : 'CASH'}):
                    </td>
                    <td colSpan={2} className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                      ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {due > 0 && (
                  <tr className="bg-rose-50/70 font-bold text-xs border-t border-gray-300">
                    <td colSpan={4} className="py-1.5 px-3 text-rose-900 text-right uppercase">
                      Remaining Balance Due:
                    </td>
                    <td colSpan={2} className="py-1.5 px-3 text-right font-mono font-black text-rose-700 text-sm">
                      ₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TOTAL IN WORDS ROW */}
          <div className="flex justify-between items-center border-b border-gray-900 py-1.5 px-3 bg-white text-xs">
            <div>
              <span className="text-gray-600 font-medium">Total in words: </span>
              <span className="font-bold uppercase text-gray-950">{totalInWords}</span>
            </div>
            <div className="text-gray-500 font-medium text-[11px]">(E & O.E.)</div>
          </div>

          {/* HSN/SAC TAX BREAKDOWN TABLE */}
          {taxes.length > 0 && (
            <div className="border-b border-gray-900">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-bold text-gray-700">
                    <th className="py-1.5 px-3 border-r border-gray-300 text-center">HSN / SAC</th>
                    <th className="py-1.5 px-3 border-r border-gray-300 text-right">Taxable Value</th>
                    <th className="py-1.5 px-3 border-r border-gray-300 text-right">IGST / GST Amount</th>
                    <th className="py-1.5 px-3 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-xs">
                  {taxes.map((t: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1 px-3 border-r border-gray-300 text-center font-sans">{t.hsn_sac_code || '8302'}</td>
                      <td className="py-1 px-3 border-r border-gray-300 text-right">
                        {Number(t.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-3 border-r border-gray-300 text-right">
                        {(Number(t.cgst_amount) + Number(t.sgst_amount) + Number(t.igst_amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({t.gst_rate}%)
                      </td>
                      <td className="py-1 px-3 text-right font-bold text-gray-950">
                        {(Number(t.cgst_amount) + Number(t.sgst_amount) + Number(t.igst_amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 text-[11px]">
                    <td colSpan={4} className="py-1 px-3 text-gray-700 font-sans">
                      Total Tax in words: <span className="font-bold text-gray-950 uppercase">{taxInWords}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 3-COLUMN BOTTOM BOX: BANK DETAILS + UPI QR + SIGNATORY */}
          <div className="grid grid-cols-12 border-b border-gray-900 divide-x divide-gray-900 text-xs min-h-[140px]">
            {/* 1. Bank Details */}
            <div className="col-span-5 p-3 space-y-1 bg-white">
              <div className="font-bold uppercase text-[11px] text-blue-900 border-b border-gray-200 pb-1 mb-1">
                Bank Details
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-600">Name:</span>
                <span className="col-span-2 font-bold text-gray-900">{org.bank_name || 'ICICI Bank'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-600">Branch:</span>
                <span className="col-span-2 text-gray-800">{org.bank_branch || 'Surat'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-600">Acc. Number:</span>
                <span className="col-span-2 font-mono font-bold text-gray-950">{org.bank_account_number || '2715500356'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-gray-600">IFSC:</span>
                <span className="col-span-2 font-mono text-gray-800">{org.bank_ifsc || 'ICIC045F'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-100">
                <span className="text-blue-900 font-bold">UPI ID:</span>
                <span className="col-span-2 font-mono font-bold text-blue-900">{org.upi_id || 'ifox@icici'}</span>
              </div>
            </div>

            {/* 2. UPI QR Code Box */}
            <div className="col-span-3 p-3 flex flex-col items-center justify-center bg-gray-50/50 text-center">
              {qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeDataUrl} alt="UPI QR Code" className="w-24 h-24 object-contain shadow-2xs border border-gray-200 bg-white p-1 rounded" />
              ) : (
                <div className="w-24 h-24 bg-white border border-gray-300 flex items-center justify-center rounded">
                  <QrIcon className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <span className="text-[11px] font-bold text-gray-900 mt-1">Pay using UPI</span>
            </div>

            {/* 3. Authorized Signatory */}
            <div className="col-span-4 p-3 flex flex-col justify-between text-center bg-white">
              <div>
                <p className="text-[10px] text-gray-600">Certified that the particulars given above are true and correct.</p>
                <p className="text-xs font-bold text-gray-950 mt-1">For {org.name || 'Gujarat Freight Tools'}</p>
              </div>
              <div className="my-2">
                <p className="text-[10px] text-gray-400 italic transform -rotate-6 font-mono">
                  This is a computer generated invoice no signature required.
                </p>
              </div>
              <div className="border-t border-gray-300 pt-1">
                <p className="text-[11px] font-medium text-gray-700">Authorised Signatory</p>
              </div>
            </div>
          </div>

          {/* TERMS AND CONDITIONS FOOTER */}
          <div className="p-3 text-[11px] text-gray-700 space-y-1 bg-gray-50/30">
            <div className="font-bold text-gray-900">Terms and Conditions</div>
            <p>1. Subject to Maharashtra Jurisdiction.</p>
            <p>2. Our Responsibility Ceases as soon as goods leaves our Premises.</p>
            <p>3. Goods once sold will not taken back. Delivery Ex-Premises.</p>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Customer Signature: _______________________</span>
              <span className="font-bold italic text-blue-900">Thank you for shopping with us!</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MODERN / COMPACT / THERMAL / MINIMAL DOCUMENT VIEW        */}
      {/* ============================================================ */}
      {selectedTemplate !== 'standard' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 max-w-4xl mx-auto font-sans print:shadow-none print:border-none print:p-0 print:m-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-200 pb-6">
            <div className="flex items-start gap-4">
              {org.logo_url ? (
                <div className="shrink-0 w-20 h-20 rounded-xl border border-gray-100 bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={org.logo_url} alt={org.name || 'Logo'} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="shrink-0 w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">
                  {org.name ? org.name.charAt(0).toUpperCase() : 'B'}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{org.name || 'Your Business Name'}</h2>
                {org.address_line1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {org.address_line1}{org.city ? `, ${org.city}` : ''}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1.5">
                  {org.gstin && (
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      GSTIN: {org.gstin}
                    </span>
                  )}
                  {org.pan && <span className="text-gray-600">PAN: {org.pan}</span>}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase">
                {selectedTemplate === 'thermal_pos' ? 'POS RECEIPT' : selectedTemplate === 'compact_a5' ? 'TAX INVOICE (A5)' : 'TAX INVOICE'}
              </h1>
              <p className="text-sm font-bold font-mono text-indigo-600 mt-1">{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Customer & Invoice Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/70 p-4 rounded-xl text-xs">
            <div>
              <span className="block font-semibold uppercase tracking-wider text-[10px] text-gray-400 mb-1">Billed To</span>
              <h3 className="font-bold text-gray-900 text-sm">{customer.display_name || 'Walk-in Customer'}</h3>
              {customer.gstin && <p className="text-gray-600">GSTIN: {customer.gstin}</p>}
              {customer.phone && <p className="text-gray-500">Phone: {customer.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 text-right">
              <div>
                <span className="block text-[10px] font-medium text-gray-400 uppercase">Date</span>
                <span className="font-mono font-semibold text-gray-900">{invoice.invoice_date}</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-gray-400 uppercase">Payment Mode</span>
                <span className="font-bold text-indigo-700">{invoice.payment_mode ? invoice.payment_mode.toUpperCase() : 'CASH'}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-100/70 text-[11px] font-bold text-gray-700 uppercase">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {items.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{it.description}</td>
                    <td className="py-2.5 px-3 text-right">{it.quantity} {it.unit || ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{Number(it.unit_price).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">₹{Number(it.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & UPI Settlement Box */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-gray-200 pt-4">
            <div className="w-full sm:w-1/2 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs flex items-center justify-between">
              <div>
                <div className="font-bold text-indigo-950 uppercase text-[10px] mb-1">UPI & Bank Settlement</div>
                <p className="text-gray-700">Bank: {org.bank_name || 'ICICI'}</p>
                <p className="text-gray-700">A/C: {org.bank_account_number || '—'} ({org.bank_ifsc})</p>
                <p className="text-indigo-700 font-bold mt-1">UPI: {org.upi_id || 'billing@icici'}</p>
              </div>
              {qrCodeDataUrl && (
                <div className="text-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeDataUrl} alt="UPI QR" className="w-16 h-16 object-contain bg-white p-1 rounded border border-indigo-200" />
                  <span className="text-[9px] font-bold text-indigo-900 block mt-0.5">Scan UPI</span>
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 space-y-2 text-xs border border-gray-100 p-4 rounded-xl bg-gray-50/50">
              <div className="flex justify-between font-bold text-base text-gray-900 pt-1">
                <span>Grand Total</span>
                <span className="font-mono text-indigo-600">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>Amount Paid</span>
                  <span className="font-mono font-bold">₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {due > 0 && (
                <div className="flex justify-between text-xs text-rose-700 font-bold pt-1 border-t border-gray-200">
                  <span>Balance Due</span>
                  <span className="font-mono font-black">₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
                  <p className="text-xs text-gray-500">Invoice {invoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">Invoice Total</span>
                  <span className="font-mono font-bold text-gray-900">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Currently Paid</span>
                  <span className="font-mono font-bold text-emerald-700">₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-700 font-bold text-xs">Remaining Balance Due:</span>
                  <span className="font-mono font-black text-rose-700 text-sm">₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Payment Amount to Record (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={due}
                  required
                  value={paymentAmountInput || ''}
                  onChange={(e) => setPaymentAmountInput(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'upi', label: 'UPI / QR', icon: QrIcon },
                    { id: 'bank_transfer', label: 'Bank', icon: Landmark },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'cheque', label: 'Cheque', icon: FileText },
                    { id: 'other', label: 'Other', icon: Wallet },
                  ].map((m) => {
                    const Icon = m.icon
                    const isSelected = paymentModeInput === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentModeInput(m.id)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`} />
                        <span>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDateInput}
                    onChange={(e) => setPaymentDateInput(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Transaction / Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982144"
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {recordingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice PDF Preview & Template Switcher Modal */}
      <InvoicePDFPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        invoiceId={id}
        invoiceNumber={invoice.invoice_number}
        initialTemplate={selectedTemplate}
      />
    </div>
  )
}
