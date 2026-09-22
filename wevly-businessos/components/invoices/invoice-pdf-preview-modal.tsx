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
  Layers,
  Sparkles,
  Receipt,
  FileSpreadsheet,
  Minimize2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PDFTemplateType, TEMPLATE_OPTIONS } from '@/lib/constants/invoice-templates'

export { TEMPLATE_OPTIONS }
export type { PDFTemplateType }

interface InvoicePDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  invoiceNumber: string
  initialTemplate?: PDFTemplateType
}

export function InvoicePDFPreviewModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  initialTemplate,
}: InvoicePDFPreviewModalProps) {
  const [template, setTemplate] = useState<PDFTemplateType>('standard')
  const [copied, setCopied] = useState(false)

  // Initialize and remember chosen template
  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate)
    } else {
      try {
        const saved = localStorage.getItem('wevly_default_invoice_template') as PDFTemplateType
        if (saved && ['standard', 'modern', 'compact_a5', 'thermal_pos', 'minimal'].includes(saved)) {
          setTemplate(saved)
        }
      } catch (e) {
        // ignore
      }
    }
  }, [isOpen, initialTemplate])

  const handleSelectTemplate = (selected: PDFTemplateType) => {
    setTemplate(selected)
    try {
      localStorage.setItem('wevly_default_invoice_template', selected)
    } catch (e) {
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
          text: `Tax Invoice ${invoiceNumber} from Wevly BusinessOS`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/70 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">{invoiceNumber} — Print & PDF Preview</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {TEMPLATE_OPTIONS.find((t) => t.id === template)?.paperSize || 'A4'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Select your printer format below (saved for future invoices)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* 5 Template Selector Pills */}
            <div className="inline-flex p-1 bg-gray-200/80 rounded-xl text-xs font-medium text-gray-600 gap-1 overflow-x-auto shrink-0">
              {TEMPLATE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isActive = template === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectTemplate(opt.id)}
                    title={opt.desc}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-2xs font-bold ring-1 ring-indigo-500/20'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <span>{opt.name}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {opt.paperSize}
                    </span>
                  </button>
                )
              })}
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

        {/* Live PDF Preview Iframe */}
        <div className="flex-1 bg-gray-100 p-2 sm:p-3 relative">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-xl border border-gray-200 bg-white shadow-xs"
            title={`PDF Preview ${invoiceNumber}`}
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-gray-100 bg-white gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
            >
              <Printer className="h-4 w-4" /> Direct Print ({template.toUpperCase()})
            </button>
            <a
              href={downloadUrl}
              download={`Invoice_${invoiceNumber}.pdf`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
