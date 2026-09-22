'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  FileText,
  Sparkles,
  Receipt,
  Gem,
  Minimize2,
  Layers,
  Palette,
  Send,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PDFTemplateType,
  TEMPLATE_OPTIONS,
  TEMPLATE_COLORS,
  TemplateColorTheme,
} from '@/lib/constants/invoice-templates'

export { TEMPLATE_OPTIONS, TEMPLATE_COLORS }
export type { PDFTemplateType }

interface InvoicePDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  invoiceNumber: string
  initialTemplate?: PDFTemplateType
  customerPhone?: string | null
  customerName?: string | null
  totalAmount?: number | null
  organizationName?: string | null
}

export function InvoicePDFPreviewModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  initialTemplate,
  customerPhone,
  customerName,
  totalAmount,
  organizationName,
}: InvoicePDFPreviewModalProps) {
  const [template, setTemplate] = useState<PDFTemplateType>('standard')
  const [activeColor, setActiveColor] = useState<string>('vyapar_red')
  const [copied, setCopied] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [showWhatsAppBox, setShowWhatsAppBox] = useState(false)

  // Initialize and remember chosen template & color
  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate)
    } else {
      try {
        const saved = localStorage.getItem('wevly_default_invoice_template') as PDFTemplateType
        if (
          saved &&
          [
            'standard',
            'vyapar_classic',
            'modern',
            'vyapar_modern',
            'compact_a5',
            'thermal_pos',
            'jewelry_gold',
            'minimal',
          ].includes(saved)
        ) {
          setTemplate(saved)
        }
      } catch {
        // ignore
      }
    }

    try {
      const savedColor = localStorage.getItem('wevly_invoice_theme_color')
      if (savedColor) setActiveColor(savedColor)
    } catch {
      // ignore
    }

    if (customerPhone) {
      setPhoneInput(customerPhone.replace(/\D/g, ''))
    }
  }, [isOpen, initialTemplate, customerPhone])

  const handleSelectTemplate = (selected: PDFTemplateType) => {
    setTemplate(selected)
    try {
      localStorage.setItem('wevly_default_invoice_template', selected)
    } catch {
      // ignore
    }
  }

  const handleSelectColor = (colorId: string) => {
    setActiveColor(colorId)
    try {
      localStorage.setItem('wevly_invoice_theme_color', colorId)
      const colorObj = TEMPLATE_COLORS.find((c) => c.id === colorId)
      toast.success(`Theme palette set to: ${colorObj?.name || colorId}`)
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null

  const pdfUrl = `/api/invoices/${invoiceId}/pdf?template=${template}`
  const downloadUrl = `/api/invoices/${invoiceId}/pdf?template=${template}&download=true`

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${pdfUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    toast.success('Invoice PDF link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const fullUrl = `${window.location.origin}${pdfUrl}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tax Invoice ${invoiceNumber}`,
          text: `Tax Invoice ${invoiceNumber} from ${organizationName || 'Our Store'}`,
          url: fullUrl,
        })
        toast.success('Invoice link shared successfully!')
      } catch (err) {
        console.error('Share cancelled or failed:', err)
      }
    } else {
      handleCopyLink()
    }
  }

  const handleSendWhatsApp = () => {
    const cleanPhone = phoneInput.replace(/\D/g, '')
    const fullUrl = `${window.location.origin}${pdfUrl}`
    const amtStr = totalAmount ? `₹${Number(totalAmount).toLocaleString('en-IN')}` : ''
    
    const message = [
      `*Tax Invoice from ${organizationName || 'Our Business'}*`,
      `Invoice No: *${invoiceNumber}*`,
      amtStr ? `Total Amount: *${amtStr}*` : '',
      `Dear ${customerName || 'Customer'}, thank you for doing business with us!`,
      ``,
      `View or download your digital invoice here:`,
      fullUrl,
    ]
      .filter(Boolean)
      .join('\n')

    const encoded = encodeURIComponent(message)
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`

    window.open(waUrl, '_blank')
    toast.success('Opening WhatsApp...')
    setShowWhatsAppBox(false)
  }

  const currentTmpl = TEMPLATE_OPTIONS.find((t) => t.id === template) || TEMPLATE_OPTIONS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/90 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  {invoiceNumber} — VANIRA Print & PDF Preview
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {currentTmpl.paperSize}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {currentTmpl.badge}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Choose from VANIRA standard formats & brand colors below
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color Palette Selector */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <Palette className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500 mr-1">Palette:</span>
              {TEMPLATE_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleSelectColor(col.id)}
                  title={col.name}
                  className={`h-4 w-4 rounded-full transition-transform ${
                    activeColor === col.id ? 'scale-125 ring-2 ring-offset-1 ring-gray-600' : 'hover:scale-110 opacity-80'
                  }`}
                  style={{ backgroundColor: col.primary }}
                />
              ))}
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Vyapar 6-Template Selector Strip */}
        <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
            Templates:
          </span>
          {TEMPLATE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = template === opt.id || (template === 'vyapar_classic' && opt.id === 'standard')
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectTemplate(opt.id)}
                title={opt.desc}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-red-600 text-white font-bold shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{opt.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-red-700 text-red-100' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {opt.paperSize}
                </span>
              </button>
            )
          })}
        </div>

        {/* Live PDF Preview Iframe */}
        <div className="flex-1 bg-gray-100 p-2 sm:p-3 relative">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-xl border border-gray-200 bg-white shadow-xs"
            title={`PDF Preview ${invoiceNumber}`}
          />
        </div>

        {/* WhatsApp Quick Send Popover / Inline Box */}
        {showWhatsAppBox && (
          <div className="px-5 py-2.5 bg-emerald-50 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-emerald-900">Send Bill via WhatsApp:</span>
              <div className="flex items-center bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs">
                <span className="text-gray-400 font-semibold mr-1">+91</span>
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-36 outline-none text-gray-900 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                <Send className="h-3.5 w-3.5" /> Send Now
              </button>
              <button
                onClick={() => setShowWhatsAppBox(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bottom Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-gray-100 bg-white gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowWhatsAppBox(!showWhatsAppBox)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp Bill
            </button>
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                handleSelectTemplate('thermal_pos')
                setTimeout(() => window.open(`/api/invoices/${invoiceId}/pdf?template=thermal_pos`, '_blank'), 150)
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors"
            >
              <Receipt className="h-4 w-4 text-amber-400" /> Print Thermal (80mm)
            </button>
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
            >
              <Printer className="h-4 w-4" /> Direct Print ({template.toUpperCase()})
            </button>
            <a
              href={downloadUrl}
              download={`Invoice_${invoiceNumber}.pdf`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

