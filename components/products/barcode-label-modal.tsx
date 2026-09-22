'use client'

import React, { useState } from 'react'
import {
  X,
  Printer,
  Barcode as BarcodeIcon,
  Check,
  Layers,
  Settings,
  Sliders,
  Sparkles,
  Download,
} from 'lucide-react'
import { generateBarcodeSvg } from '@/lib/services/barcode.service'
import { formatRupees } from '@/lib/utils/currency'

export interface BarcodeLabelProduct {
  id: string
  name: string
  sku: string
  barcode?: string | null
  sale_price: number
  unit?: string
}

export interface BarcodeLabelModalProps {
  products: BarcodeLabelProduct[]
  selectedProduct?: BarcodeLabelProduct | null
  onClose: () => void
}

export function BarcodeLabelModal({
  products,
  selectedProduct,
  onClose,
}: BarcodeLabelModalProps) {
  // Products selection (single product mode or all products mode)
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedProduct?.id || products[0]?.id || ''
  )
  const [isBulkMode, setIsBulkMode] = useState(!selectedProduct)

  // Label Configuration
  const [labelSize, setLabelSize] = useState<'38x25' | '50x25' | 'a4_24' | 'a4_40'>('38x25')
  const [copiesPerProduct, setCopiesPerProduct] = useState<number>(10)
  const [companyName, setCompanyName] = useState('THE BILL BOOK')
  const [showCompanyName, setShowCompanyName] = useState(true)
  const [showItemName, setShowItemName] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showUnit, setShowUnit] = useState(true)

  // Determine active products to generate
  const activeProducts = isBulkMode
    ? products.filter((p) => p.barcode || p.sku)
    : [products.find((p) => p.id === selectedProductId) || products[0]].filter(Boolean)

  // Trigger print
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Container - hide during print so only printable sheet prints */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none print:h-auto print:max-h-none print:m-0 print:p-0">
        
        {/* ── HEADER (Hidden on print) ─────────────────────────── */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <BarcodeIcon className="h-5 w-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Print Barcode Labels & Sticker Sheets</h2>
              <p className="text-[11px] text-slate-400">Generate crisp, scanner-ready barcode labels for thermal roll or A4 sticker sheets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Now</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── BODY (Controls + Preview) ────────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden print:overflow-visible">
          
          {/* LEFT: Controls Panel (Hidden on print) */}
          <div className="w-full md:w-80 p-5 bg-gray-50 border-r border-gray-200 overflow-y-auto space-y-5 text-xs text-gray-700 print:hidden">
            
            {/* Mode: Single Product vs Bulk */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-gray-900">Printing Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-200/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsBulkMode(false)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !isBulkMode ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Single Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkMode(true)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isBulkMode ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bulk Catalog
                </button>
              </div>
            </div>

            {/* Select Product if Single Mode */}
            {!isBulkMode && (
              <div>
                <label className="block text-[11px] font-bold text-gray-900 mb-1">Select Item</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.barcode || p.sku})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sheet Format / Sticker Size */}
            <div>
              <label className="block text-[11px] font-bold text-gray-900 mb-1">Label Sheet Format</label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="38x25">38mm × 25mm (Standard Thermal Roll)</option>
                <option value="50x25">50mm × 25mm (Wide Thermal Roll)</option>
                <option value="a4_24">A4 Sheet (24 labels per page: 3×8)</option>
                <option value="a4_40">A4 Sheet (40 labels per page: 4×10)</option>
              </select>
            </div>

            {/* Copies per product */}
            <div>
              <label className="block text-[11px] font-bold text-gray-900 mb-1">
                Labels per Product
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={copiesPerProduct}
                onChange={(e) => setCopiesPerProduct(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Company / Brand Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-900 mb-1">Header Text / Business Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. THE BILL BOOK"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Checkbox fields to include */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <label className="block text-[11px] font-bold text-gray-900 mb-1">Label Fields</label>
              
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={showCompanyName}
                  onChange={(e) => setShowCompanyName(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Include Company / Header</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={showItemName}
                  onChange={(e) => setShowItemName(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Include Item Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Include Selling Price (₹)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={(e) => setShowSku(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Include Item SKU / Code</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                <input
                  type="checkbox"
                  checked={showUnit}
                  onChange={(e) => setShowUnit(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Include Unit of Measurement</span>
              </label>
            </div>
          </div>

          {/* RIGHT: Live Printable Preview Sheet */}
          <div className="flex-1 p-6 bg-slate-200/60 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
            
            {/* Sheet container */}
            <div
              id="printable-barcode-sheet"
              className="bg-white mx-auto shadow-md rounded-xl p-6 print:shadow-none print:p-0 print:rounded-none min-h-[500px]"
              style={{
                maxWidth: labelSize.startsWith('a4') ? '210mm' : '100%',
              }}
            >
              {/* Grid of barcode labels */}
              <div
                className={`grid gap-2.5 print:gap-1.5 ${
                  labelSize === 'a4_40'
                    ? 'grid-cols-4'
                    : labelSize === 'a4_24'
                    ? 'grid-cols-3'
                    : labelSize === '50x25'
                    ? 'grid-cols-2 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                }`}
              >
                {activeProducts.flatMap((prod) =>
                  Array.from({ length: copiesPerProduct }).map((_, idx) => {
                    const codeToDisplay = prod.barcode || prod.sku
                    const svgString = generateBarcodeSvg(codeToDisplay, 140, 36)

                    return (
                      <div
                        key={`${prod.id}-${idx}`}
                        className="border border-dashed border-gray-300 rounded p-2 flex flex-col items-center justify-between text-center bg-white print:border-none print:p-1 page-break-inside-avoid"
                        style={{
                          height: labelSize === '38x25' ? '100px' : labelSize === '50x25' ? '110px' : '95px',
                        }}
                      >
                        {/* Company Header */}
                        {showCompanyName && companyName && (
                          <div className="text-[9px] font-bold text-gray-800 tracking-wider truncate max-w-full uppercase">
                            {companyName}
                          </div>
                        )}

                        {/* Item Name */}
                        {showItemName && (
                          <div className="text-[10px] font-bold text-gray-950 truncate max-w-full leading-tight">
                            {prod.name}
                          </div>
                        )}

                        {/* Vector SVG Barcode */}
                        <div
                          className="my-0.5 max-w-full flex items-center justify-center overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: svgString }}
                        />

                        {/* Human-Readable Code Text */}
                        <div className="text-[9px] font-mono tracking-widest text-gray-800">
                          {codeToDisplay}
                        </div>

                        {/* Price & SKU */}
                        <div className="flex items-center justify-between w-full text-[9px] font-bold text-gray-900 border-t border-gray-100 pt-0.5">
                          {showPrice && (
                            <span className="text-blue-900">
                              MRP: {formatRupees(prod.sale_price)}
                              {showUnit && prod.unit ? ` / ${prod.unit}` : ''}
                            </span>
                          )}
                          {showSku && prod.sku && (
                            <span className="text-gray-500 font-mono text-[8px]">
                              {prod.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
