'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Calculator,
  Percent,
  CheckCircle2,
  Building2,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  STANDARD_GST_RATES,
  UTGST_STATE_CODES,
  isUtgstTerritory,
  calculateCentralGst,
} from '@/lib/services/tax.service'

export default function GstSettingsPage() {
  const [isGstRegistered, setIsGstRegistered] = useState(true)
  const [gstin, setGstin] = useState('27AABCU9603R1ZM')
  const [stateCode, setStateCode] = useState('27')
  const [isComposition, setIsComposition] = useState(false)
  const [isRcmEnabled, setIsRcmEnabled] = useState(false)
  const [defaultRate, setDefaultRate] = useState(18)
  const [isInclusiveDefault, setIsInclusiveDefault] = useState(false)

  // Interactive GST Test Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(1000)
  const [calcRate, setCalcRate] = useState<number>(18)
  const [calcPlaceOfSupply, setCalcPlaceOfSupply] = useState<string>('27') // Maharashtra (Intrastate)
  const [calcInclusive, setCalcInclusive] = useState<boolean>(false)

  const isUtgst = isUtgstTerritory(stateCode)

  // Run central tax calculation for test widget
  const testCalculation = calculateCentralGst({
    seller: { state_code: stateCode, is_gst_registered: isGstRegistered },
    buyer: { state_code: calcPlaceOfSupply, is_gst_registered: true },
    items: [
      {
        description: 'Test Item',
        quantity: 1,
        unit_price: calcAmount || 0,
        gst_rate: calcRate,
        is_gst_inclusive: calcInclusive,
      },
    ],
  })

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto bg-slate-50/50 min-h-screen">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">GST & Tax Master Configuration</h1>
            <p className="text-xs text-gray-500">
              Manage GSTIN registration, standard tax slabs (0%–28%), UTGST rules, and live tax breakdown formulas.
            </p>
          </div>
        </div>

        <Link
          href="/gst"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <span>Open GST Filing Portal (GSTR-1 / 3B)</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── GST PROFILE CARD ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>Business GST Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">Business GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold uppercase text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">State Code / Place of Registration</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-center text-gray-900"
                />
                <span className="text-xs text-gray-500">
                  {isUtgst ? (
                    <span className="text-purple-700 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-200">
                      Union Territory (UTGST Active)
                    </span>
                  ) : (
                    <span className="text-gray-700 font-medium">State GST (CGST + SGST)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none p-3 border border-gray-200 rounded-lg bg-slate-50 text-xs">
              <input
                type="checkbox"
                checked={isGstRegistered}
                onChange={(e) => setIsGstRegistered(e.target.checked)}
                className="rounded text-blue-600 border-gray-300 focus:ring-0"
              />
              <span className="font-semibold text-gray-800">GST Registered</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none p-3 border border-gray-200 rounded-lg bg-slate-50 text-xs">
              <input
                type="checkbox"
                checked={isComposition}
                onChange={(e) => setIsComposition(e.target.checked)}
                className="rounded text-blue-600 border-gray-300 focus:ring-0"
              />
              <span className="font-semibold text-gray-800">Composition Scheme</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none p-3 border border-gray-200 rounded-lg bg-slate-50 text-xs">
              <input
                type="checkbox"
                checked={isInclusiveDefault}
                onChange={(e) => setIsInclusiveDefault(e.target.checked)}
                className="rounded text-blue-600 border-gray-300 focus:ring-0"
              />
              <span className="font-semibold text-gray-800">Tax Inclusive Rates</span>
            </label>
          </div>
        </div>

        {/* STATUTORY SLABS CARD */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
            <Percent className="h-4 w-4 text-purple-600" />
            <span>Statutory GST Slabs</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { rate: 0, label: '0% (Exempt)' },
              { rate: 0.25, label: '0.25% (Cut Diamonds)' },
              { rate: 3, label: '3% (Jewellery / Bullion)' },
              { rate: 5, label: '5% (Essential Goods)' },
              { rate: 12, label: '12% (Processed / Apparel)' },
              { rate: 18, label: '18% (Standard / Services)' },
              { rate: 28, label: '28% (Automobile / Luxury)' },
            ].map((s) => (
              <span
                key={s.rate}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                  defaultRate === s.rate
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 pt-2">
            All rates are handled by the centralized tax service with mathematical rounding.
          </p>
        </div>
      </div>

      {/* ── INTERACTIVE GST VERIFICATION CALCULATOR ──────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Interactive GST Tax Calculator & Split Verification</h2>
          </div>
          <span className="text-[11px] font-semibold text-gray-500">Live Formula Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-gray-600 font-bold mb-1">Item / Invoice Amount (₹)</label>
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1">GST Slab Rate</label>
            <select
              value={calcRate}
              onChange={(e) => setCalcRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
            >
              <option value={0}>0% (Exempt)</option>
              <option value={0.25}>0.25% (Diamonds)</option>
              <option value={3}>3% (Jewellery / Bullion)</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18% (Standard)</option>
              <option value={28}>28% (Luxury)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1">Buyer State Code (Place of Supply)</label>
            <select
              value={calcPlaceOfSupply}
              onChange={(e) => setCalcPlaceOfSupply(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
            >
              <option value="27">27 — Maharashtra (Intrastate)</option>
              <option value="07">07 — Delhi (Interstate / IGST)</option>
              <option value="29">29 — Karnataka (Interstate / IGST)</option>
              <option value="04">04 — Chandigarh (UTGST Territory)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1">Tax Treatment</label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCalcInclusive(false)}
                className={`flex-1 py-1.5 rounded text-xs font-bold cursor-pointer border ${
                  !calcInclusive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Exclusive
              </button>
              <button
                type="button"
                onClick={() => setCalcInclusive(true)}
                className={`flex-1 py-1.5 rounded text-xs font-bold cursor-pointer border ${
                  calcInclusive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Inclusive
              </button>
            </div>
          </div>
        </div>

        {/* CALCULATION RESULTS BREAKDOWN */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Taxable Base Amount</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block">
              ₹{testCalculation.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">
              {testCalculation.is_inter_state ? 'IGST (Integrated)' : isUtgst ? 'CGST + UTGST' : 'CGST + SGST'}
            </span>
            <span className="text-base font-black text-blue-600 mt-0.5 block">
              ₹{testCalculation.total_tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-500 block">
              {testCalculation.is_inter_state
                ? `IGST: ₹${testCalculation.igst_amount}`
                : `CGST: ₹${testCalculation.cgst_amount} | SGST/UT: ₹${testCalculation.sgst_amount + testCalculation.utgst_amount}`}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Effective Tax Rate</span>
            <span className="text-base font-black text-purple-600 mt-0.5 block">
              {calcRate}%
            </span>
            <span className="text-[10px] text-gray-500 block">
              {testCalculation.is_inter_state ? 'Inter-state' : 'Intra-state'} Supply
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Invoice Value</span>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">
              ₹{testCalculation.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
