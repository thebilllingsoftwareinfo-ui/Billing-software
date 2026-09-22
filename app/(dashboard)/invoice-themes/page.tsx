'use client'

import { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  Sparkles,
  Receipt,
  Gem,
  Minimize2,
  Layers,
  Palette,
  Check,
  Printer,
  Eye,
  Sliders,
  QrCode,
  Landmark,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  PDFTemplateType,
  TEMPLATE_OPTIONS,
  TEMPLATE_COLORS,
  TemplateColorTheme,
} from '@/lib/constants/invoice-templates'

export default function InvoiceThemesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplateType>('standard')
  const [selectedColor, setSelectedColor] = useState<string>('vyapar_red')

  // Invoice custom toggles
  const [showUpiQr, setShowUpiQr] = useState(true)
  const [showBankDetails, setShowBankDetails] = useState(true)
  const [showTerms, setShowTerms] = useState(true)
  const [showSignature, setShowSignature] = useState(true)
  const [showHsnSummary, setShowHsnSummary] = useState(true)

  useEffect(() => {
    try {
      const savedTmpl = localStorage.getItem('wevly_default_invoice_template') as PDFTemplateType
      if (savedTmpl) setSelectedTemplate(savedTmpl)

      const savedColor = localStorage.getItem('wevly_invoice_theme_color')
      if (savedColor) setSelectedColor(savedColor)

      const savedSettings = localStorage.getItem('wevly_invoice_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed.showUpiQr !== undefined) setShowUpiQr(parsed.showUpiQr)
        if (parsed.showBankDetails !== undefined) setShowBankDetails(parsed.showBankDetails)
        if (parsed.showTerms !== undefined) setShowTerms(parsed.showTerms)
        if (parsed.showSignature !== undefined) setShowSignature(parsed.showSignature)
        if (parsed.showHsnSummary !== undefined) setShowHsnSummary(parsed.showHsnSummary)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('wevly_default_invoice_template', selectedTemplate)
      localStorage.setItem('wevly_invoice_theme_color', selectedColor)
      localStorage.setItem(
        'wevly_invoice_settings',
        JSON.stringify({
          showUpiQr,
          showBankDetails,
          showTerms,
          showSignature,
          showHsnSummary,
        })
      )
      toast.success('Invoice theme and print preferences saved successfully!')
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const currentColor = TEMPLATE_COLORS.find((c) => c.id === selectedColor) || TEMPLATE_COLORS[0]
  const currentConfig = TEMPLATE_OPTIONS.find((t) => t.id === selectedTemplate) || TEMPLATE_OPTIONS[0]

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">VANIRA Invoice Themes & Formats</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              6 Formats Available
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Choose your business&apos;s default bill printing style, brand accent color, and layout details.
          </p>
        </div>

        <button
          onClick={handleSavePreferences}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Check className="h-4 w-4" /> Save Default Theme
        </button>
      </div>

      {/* Brand Color Theme Palette Selector */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-bold text-gray-900">VANIRA Signature Color Palettes</h2>
        </div>
        <p className="text-xs text-gray-500">
          Selected accent color will tint invoice header banners, table titles, and highlight total badges.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {TEMPLATE_COLORS.map((col) => {
            const isSelected = selectedColor === col.id
            return (
              <button
                key={col.id}
                onClick={() => setSelectedColor(col.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-gray-900 bg-gray-50/80 shadow-xs ring-1 ring-gray-900'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div
                  className="h-6 w-6 rounded-full shrink-0 shadow-inner flex items-center justify-center"
                  style={{ backgroundColor: col.primary }}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{col.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{col.primary}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Template Gallery (Left Column: 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Select Bill / Invoice Format</h2>
            <span className="text-xs text-gray-500">Click any card to select</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATE_OPTIONS.map((tmpl) => {
              const Icon = tmpl.icon
              const isSelected = selectedTemplate === tmpl.id
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`relative p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-red-600 bg-red-50/20 shadow-md ring-2 ring-red-600/30'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 p-1 bg-red-600 text-white rounded-full">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          isSelected ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900">{tmpl.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded">
                            {tmpl.paperSize}
                          </span>
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                            {tmpl.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                      {tmpl.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-400 font-medium capitalize">
                      Category: {tmpl.category}
                    </span>
                    <button
                      type="button"
                      className={`text-xs font-bold inline-flex items-center gap-1 ${
                        isSelected ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      {isSelected ? 'Default Active' : 'Set as Default'}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Toggle Switches */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3 mt-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-gray-700" />
              <h3 className="text-xs font-bold text-gray-900">Print Content Customizations</h3>
            </div>
            <p className="text-xs text-gray-500">
              Control which sections appear on generated bills and thermal printouts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showUpiQr}
                  onChange={(e) => setShowUpiQr(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5 text-gray-500" /> Instant UPI QR Code
                  </div>
                  <div className="text-[10px] text-gray-500">GPay, PhonePe & Paytm scan & pay</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showBankDetails}
                  onChange={(e) => setShowBankDetails(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5 text-gray-500" /> Bank Account & IFSC
                  </div>
                  <div className="text-[10px] text-gray-500">For NEFT / RTGS / IMPS wire transfers</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showHsnSummary}
                  onChange={(e) => setShowHsnSummary(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    <FileCheck className="h-3.5 w-3.5 text-gray-500" /> HSN / SAC Summary Box
                  </div>
                  <div className="text-[10px] text-gray-500">Mandatory for GST compliant B2B bills</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showSignature}
                  onChange={(e) => setShowSignature(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-gray-500" /> Authorized Signatory
                  </div>
                  <div className="text-[10px] text-gray-500">Signature stamp or designated area</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Live Mock Invoice Preview (Right Column: 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Interactive Bill Preview</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {currentConfig.name}
            </span>
          </div>

          {/* Render Mock Invoice Layout */}
          <div className="bg-white p-5 rounded-2xl border border-gray-300 shadow-md font-sans text-gray-900 text-xs space-y-3">
            {/* Header */}
            <div
              className="p-3 rounded-xl text-white flex items-start justify-between"
              style={{ backgroundColor: currentColor.primary }}
            >
              <div>
                <div className="text-base font-black tracking-wide uppercase">
                  Acme Industrial Systems
                </div>
                <div className="text-[10px] text-white/90">
                  GSTIN: 27AABCU9603R1ZM • Maharashtra (27)
                </div>
                <div className="text-[10px] text-white/80">
                  Plot 42, Wagle Industrial Estate, Thane West
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                  TAX INVOICE
                </div>
                <div className="text-[10px] font-mono mt-1 text-white/90">#INV-2026-0042</div>
                <div className="text-[10px] text-white/80">Date: 20-Sep-2026</div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px]">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Bill To (Customer)
                </span>
                <span className="font-bold text-gray-900">Reliance Retail & Logistics Ltd</span>
                <div className="text-gray-600 text-[10px]">GSTIN: 27AAACR5055K1Z8</div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Payment Mode
                </span>
                <span className="font-semibold text-emerald-700">Online UPI / Bank</span>
                <div className="text-[10px] text-gray-500">State: Maharashtra (27)</div>
              </div>
            </div>

            {/* If Jewelry Special: Show Hallmarking Alert */}
            {selectedTemplate === 'jewelry_gold' && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 text-[11px]">
                <div className="flex items-center gap-2">
                  <Gem className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-bold">BIS Hallmark Guarantee (HUID Certified)</span>
                </div>
                <span className="text-[9px] font-mono bg-amber-200 px-1.5 py-0.5 rounded font-bold">
                  HUID: 7X89Q1
                </span>
              </div>
            )}

            {/* Items Table Mock */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead
                  className="text-white font-bold"
                  style={{ backgroundColor: currentColor.secondary }}
                >
                  <tr>
                    <th className="p-1.5">#</th>
                    <th className="p-1.5">Item Description</th>
                    <th className="p-1.5 text-right">Qty</th>
                    <th className="p-1.5 text-right">Rate</th>
                    <th className="p-1.5 text-right">GST</th>
                    <th className="p-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-1.5 text-gray-400">1</td>
                    <td className="p-1.5 font-medium">
                      {selectedTemplate === 'jewelry_gold'
                        ? '22K Gold Antique Ring (Net: 8.42g)'
                        : 'Precision Carbide Milling End Mill'}
                    </td>
                    <td className="p-1.5 text-right">10</td>
                    <td className="p-1.5 text-right font-mono">₹4,200</td>
                    <td className="p-1.5 text-right font-mono text-gray-500">18%</td>
                    <td className="p-1.5 text-right font-bold font-mono">₹42,000</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 text-gray-400">2</td>
                    <td className="p-1.5 font-medium">
                      {selectedTemplate === 'jewelry_gold'
                        ? '18K Diamond Studded Bracelet (Net: 14.10g)'
                        : 'Heavy Duty CNC Lathe Insert Tooling'}
                    </td>
                    <td className="p-1.5 text-right">5</td>
                    <td className="p-1.5 text-right font-mono">₹3,500</td>
                    <td className="p-1.5 text-right font-mono text-gray-500">18%</td>
                    <td className="p-1.5 text-right font-bold font-mono">₹17,500</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom calculation */}
            <div className="flex justify-between items-start pt-1 text-[11px]">
              <div className="w-1/2 space-y-1">
                {showUpiQr && (
                  <div className="inline-flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <QrCode className="h-6 w-6 text-gray-700" />
                    <div>
                      <div className="text-[9px] font-bold text-gray-700">Scan & Pay via UPI</div>
                      <div className="text-[8px] text-gray-500 font-mono">acme@icici</div>
                    </div>
                  </div>
                )}
                {showBankDetails && (
                  <div className="text-[9px] text-gray-500">
                    <div>Bank: HDFC Bank Ltd • A/C: 50200049281726</div>
                    <div>IFSC: HDFC0000123 • Thane Branch</div>
                  </div>
                )}
              </div>

              <div className="w-1/2 text-right space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹59,500.00</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%):</span>
                  <span>₹10,710.00</span>
                </div>
                <div
                  className="flex justify-between text-xs font-black p-1.5 rounded text-white mt-1"
                  style={{ backgroundColor: currentColor.primary }}
                >
                  <span>Grand Total:</span>
                  <span>₹70,210.00</span>
                </div>
              </div>
            </div>

            {/* Signatory */}
            {showSignature && (
              <div className="pt-2 border-t border-gray-100 flex justify-between items-end text-[9px] text-gray-500">
                <span>Thank you for your business!</span>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">For Acme Industrial Systems</div>
                  <div className="mt-4 border-t border-gray-400 pt-0.5 text-gray-500">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
