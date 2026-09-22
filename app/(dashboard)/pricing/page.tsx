'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  X,
  Plus,
  Minus,
  QrCode,
  Zap,
  HelpCircle,
  Phone,
  MessageCircle,
  Laptop,
  Smartphone,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

type PlatformTier = 'desktop_mobile' | 'desktop' | 'mobile'

interface PlanPricing {
  originalPrice: number
  dealPrice: number
  monthlyPrice: number
}

interface TierConfig {
  id: PlatformTier
  label: string
  oneYear: PlanPricing
  threeYears: PlanPricing
  features: string[]
  moreFeatures: string[]
}

// 20% DISCOUNTED PRICING (From original Vyapar screenshot figures)
const PRICING_DATA: Record<PlatformTier, TierConfig> = {
  desktop_mobile: {
    id: 'desktop_mobile',
    label: 'Desktop + Mobile',
    oneYear: {
      originalPrice: 7279, // was ₹9,099 -> -20%
      dealPrice: 3839,     // was ₹4,799 -> -20%
      monthlyPrice: 319.92,
    },
    threeYears: {
      originalPrice: 14959, // was ₹18,699 -> -20%
      dealPrice: 7919,      // was ₹9,899 -> -20%
      monthlyPrice: 219.97,
    },
    features: [
      'Sync data across devices',
      'Create multiple companies (5 companies)',
      'Generate E-way Bills (unlimited)',
      'Restore deleted transactions (unlimited)',
      'Remove advertisement on invoices',
      'Set multiple pricing for items',
    ],
    moreFeatures: [
      'Unlimited Sales, Purchase & POS Invoices',
      'Multi-Device Real-Time Cloud Synchronization',
      'WhatsApp & SMS automated invoice delivery',
      'Multi-Godown / Warehouse Inventory Tracking',
      'Batch, Expiry Date & Serial Number Tracking',
      'Direct GST Portal JSON & GSTR-1, 2, 3B reconciliation',
      'Balance Sheet, Profit & Loss & 40+ Business Reports',
      'Bank Reconciliation & Automatic UPI QR on bills',
      'Party-wise credit limits & overdue reminders',
      'Online Store builder with product catalog links',
      'Multi-User Access with Granular Role Permissions',
      'Auto Cloud Backup to Google Drive & Local Storage',
      'Multi-Copy Printing (Original, Duplicate, Triplicate)',
      'Thermal 2" / 3" printer & standard A4/A5 laser support',
      '12+ Premium GST Invoice Templates with customization',
      'Delivery Challans, Quotations & Proforma Invoices',
      'Quotation to Invoice conversion in 1-click',
      'Bulk Item & Party Excel Import / Export',
      'Expenses & Input Tax Credit (ITC) tracking',
      'E-Invoicing integration (NIC Portal API ready)',
      '24/7 Priority Phone, WhatsApp & Remote Desk Support',
      'Lifetime Free Updates within license duration',
    ],
  },
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    oneYear: {
      originalPrice: 6159, // was ₹7,699 -> -20%
      dealPrice: 3279,     // was ₹4,099 -> -20%
      monthlyPrice: 273.25,
    },
    threeYears: {
      originalPrice: 13679, // was ₹17,099 -> -20%
      dealPrice: 7279,      // was ₹9,099 -> -20%
      monthlyPrice: 202.19,
    },
    features: [
      'Sync data across devices',
      'Create multiple companies (5 companies)',
      'Generate E-way Bills (unlimited)',
      'Restore deleted transactions (unlimited)',
      'Remove advertisement on invoices',
      'Set multiple pricing for items',
    ],
    moreFeatures: [
      'Unlimited Sales & Purchase Invoicing',
      'High-Speed Thermal POS Billing System',
      'Barcode Label Designer & Generator',
      'Multi-Godown Inventory & Stock Transfers',
      'Batch & Expiry Date Management',
      'E-Way Bill & E-Invoice generation',
      'Comprehensive GST Filing Reports',
      'P&L, Balance Sheet & Cash Flow Reports',
      'Party Ledger & Ageing Analysis',
      'Bank Accounts & Cheque Management',
      'Multi-Firm Management (Up to 5 firms)',
      'Offline Desktop App with Automatic Cloud Sync',
      'Google Drive Automatic Backup',
      'Multi-format print layouts (A4, A5, Thermal)',
      'Bulk Data Import from Excel / Tally',
      'Delivery Challans & Estimates',
      'Custom invoice headers, footers & signatures',
      'User permissions & Audit trail logs',
      'Tally XML / Excel direct export',
      'Automated Payment Reminders via SMS/WhatsApp',
      'Priority Phone & Screen-Sharing Support',
      'Free Software Updates throughout tenure',
    ],
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    oneYear: {
      originalPrice: 1119, // was ₹1,399 -> -20%
      dealPrice: 639,      // was ₹799 -> -20%
      monthlyPrice: 53.25,
    },
    threeYears: {
      originalPrice: 2639, // was ₹3,299 -> -20%
      dealPrice: 1359,     // was ₹1,699 -> -20%
      monthlyPrice: 37.75,
    },
    features: [
      'Sync data across devices',
      'Create multiple companies (5 companies)',
      'Restore deleted transactions (unlimited)',
      'Remove advertisement on invoices',
      'Set multiple pricing for items',
      'Set credit limit for parties',
    ],
    moreFeatures: [
      'Unlimited Sales & Purchase Invoices',
      'Instant WhatsApp & SMS Bill Sharing',
      'Camera Barcode Scanner for instant billing',
      'Customer & Vendor Ledger Statements',
      'Payment-In & Payment-Out tracking',
      'Inventory management with low-stock alerts',
      'GSTR-1 & GSTR-3B summary reports',
      'Bluetooth Mobile Thermal Printer support',
      'Online store setup with order collection',
      'Daily business summary via notification',
      'Multi-company support (up to 5 companies)',
      'Cloud Auto-Backup to Google Drive',
      '10+ Professional mobile invoice designs',
      'Custom Business Logo and Signature on bills',
      'Party credit limit enforcement & warnings',
      'Dedicated WhatsApp & Telephonic support',
    ],
  },
}

export default function PlansAndPricingPage() {
  const [selectedTier, setSelectedTier] = useState<PlatformTier>('desktop_mobile')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [expandedOneYear, setExpandedOneYear] = useState(false)
  const [expandedThreeYears, setExpandedThreeYears] = useState(false)

  // Modals state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [isMultiLicenseOpen, setIsMultiLicenseOpen] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<{
    tier: PlatformTier
    duration: '1 Year' | '3 Years'
    price: number
    originalPrice: number
    monthly: number
  } | null>(null)

  // Multi-license calculator state
  const [desktopLicenses, setDesktopLicenses] = useState(2)
  const [mobileLicenses, setMobileLicenses] = useState(2)

  const activeTierConfig = PRICING_DATA[selectedTier]

  const handleSelectTier = (tier: PlatformTier) => {
    setSelectedTier(tier)
    setIsDropdownOpen(false)
  }

  const handleGetPlan = (duration: '1 Year' | '3 Years') => {
    const plan = duration === '1 Year' ? activeTierConfig.oneYear : activeTierConfig.threeYears
    setCheckoutPlan({
      tier: selectedTier,
      duration,
      price: plan.dealPrice,
      originalPrice: plan.originalPrice,
      monthly: plan.monthlyPrice,
    })
  }

  // Calculate multi-license pricing
  const desktopUnitPrice = 3279 // 1 Year Desktop with 20% discount
  const mobileUnitPrice = 639   // 1 Year Mobile with 20% discount
  const grossTotal = desktopLicenses * desktopUnitPrice + mobileLicenses * mobileUnitPrice
  const volumeDiscount = grossTotal >= 10000 ? Math.round(grossTotal * 0.15) : 0
  const netMultiTotal = grossTotal - volumeDiscount

  return (
    <div className="min-h-full bg-white px-6 py-6 font-sans">
      {/* ── TOP HEADER ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Plans & Pricing
        </h1>

        <button
          type="button"
          onClick={() => setIsMultiLicenseOpen(true)}
          className="px-4 py-2 bg-[#e8f4fc] hover:bg-[#d8ecf8] text-[#0284c7] border border-[#bae6fd] rounded-full text-xs font-bold transition-colors cursor-pointer shadow-2xs"
        >
          Buy Multiple Licenses
        </button>
      </div>

      {/* ── PLATFORM SELECTOR DROPDOWN ────────────────────────── */}
      <div className="relative inline-block mb-8">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f3fc] hover:bg-[#dbebf8] text-[#1e293b] border border-[#d2e7f8] rounded-full text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <span>{activeTierConfig.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
            {(Object.keys(PRICING_DATA) as PlatformTier[]).map((tierKey) => {
              const item = PRICING_DATA[tierKey]
              const isSelected = selectedTier === tierKey
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => handleSelectTier(tierKey)}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left cursor-pointer transition-colors"
                >
                  <span>{item.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 stroke-[2.5]" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── PRICING CARDS GRID (Side by Side) ──────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch justify-start gap-6 max-w-5xl">
        {/* ── CARD 1: 1 YEAR ─────────────────────────────────── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            {/* Header: Silver Emblem + Duration Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white shadow-xs">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
                <span className="text-base font-bold text-gray-900">Silver</span>
              </div>

              <span className="px-3 py-1 bg-[#edf5fb] text-slate-700 text-xs font-bold rounded-full">
                1 Year
              </span>
            </div>

            {/* Price section */}
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-400 line-through text-lg font-bold">
                  ₹{activeTierConfig.oneYear.originalPrice}
                </span>
                <span className="text-3xl font-black text-gray-900 tracking-tight">
                  ₹{activeTierConfig.oneYear.dealPrice}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Only ₹{activeTierConfig.oneYear.monthlyPrice} per month
              </p>
            </div>

            {/* CTA Button: White with Red Outline */}
            <button
              type="button"
              onClick={() => handleGetPlan('1 Year')}
              className="w-full py-2.5 px-4 mb-6 border-2 border-[#e11d48] text-[#e11d48] hover:bg-rose-50 font-bold text-xs rounded-full transition-colors cursor-pointer text-center"
            >
              Get Vanira Silver
            </button>

            {/* Features List */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {activeTierConfig.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{feature}</span>
                </div>
              ))}

              {/* Collapsible More Features */}
              {expandedOneYear && (
                <div className="space-y-2.5 pt-2 animate-in fade-in duration-150">
                  {activeTierConfig.moreFeatures.map((mf, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{mf}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setExpandedOneYear((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-800 hover:text-blue-600 pt-1 cursor-pointer"
              >
                <span>
                  {expandedOneYear
                    ? 'Show Less Features'
                    : `+ ${activeTierConfig.moreFeatures.length} More Features`}
                </span>
                {expandedOneYear ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD 2: 3 YEARS (Most Popular) ─────────────────── */}
        <div className="flex-1 relative bg-white border-2 border-[#f43f5e] rounded-2xl p-6 sm:p-7 shadow-md flex flex-col justify-between">
          {/* Most Popular Ribbon */}
          <div className="absolute -top-3.5 right-6">
            <span className="bg-[#f43f5e] text-white text-[11px] font-bold px-3.5 py-1 rounded-t-lg uppercase tracking-wider shadow-xs">
              Most Popular
            </span>
          </div>

          <div>
            {/* Header: Gold Emblem + Duration Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-xs">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
                <span className="text-base font-bold text-gray-900">Gold</span>
              </div>

              <span className="px-3 py-1 bg-[#edf5fb] text-slate-700 text-xs font-bold rounded-full">
                3 Years
              </span>
            </div>

            {/* Price section */}
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-400 line-through text-lg font-bold">
                  ₹{activeTierConfig.threeYears.originalPrice}
                </span>
                <span className="text-3xl font-black text-gray-900 tracking-tight">
                  ₹{activeTierConfig.threeYears.dealPrice}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Only ₹{activeTierConfig.threeYears.monthlyPrice} per month
              </p>
            </div>

            {/* CTA Button: Solid Red */}
            <button
              type="button"
              onClick={() => handleGetPlan('3 Years')}
              className="w-full py-2.5 px-4 mb-6 bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-xs rounded-full shadow-md transition-colors cursor-pointer text-center"
            >
              Get Vanira Gold
            </button>

            {/* Features List */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {activeTierConfig.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{feature}</span>
                </div>
              ))}

              {/* Collapsible More Features */}
              {expandedThreeYears && (
                <div className="space-y-2.5 pt-2 animate-in fade-in duration-150">
                  {activeTierConfig.moreFeatures.map((mf, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{mf}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setExpandedThreeYears((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-800 hover:text-blue-600 pt-1 cursor-pointer"
              >
                <span>
                  {expandedThreeYears
                    ? 'Show Less Features'
                    : `+ ${activeTierConfig.moreFeatures.length} More Features`}
                </span>
                {expandedThreeYears ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPARE ALL FEATURES BUTTON ────────────────────────── */}
      <div className="flex justify-center max-w-5xl mt-8">
        <button
          type="button"
          onClick={() => setIsCompareModalOpen(true)}
          className="px-6 py-2.5 bg-[#edf5fb] hover:bg-[#e0effa] text-[#0284c7] border border-[#cfe6f7] rounded-full text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          Compare All Features
        </button>
      </div>

      {/* ── COMPARE ALL FEATURES MODAL ─────────────────────────── */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden border border-gray-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Compare All VANIRA Gold Features</h3>
                <p className="text-xs text-gray-500">Comprehensive plan breakdown across all device tiers</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Matrix Table */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70">
                    <th className="py-3 px-4 font-bold text-gray-800">Capability / Feature</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Mobile Only</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-center">Desktop Only</th>
                    <th className="py-3 px-4 font-bold text-blue-700 bg-blue-50/50 text-center">
                      Desktop + Mobile
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Invoicing & Quotations</td>
                    <td className="py-2.5 px-4 text-center">Unlimited</td>
                    <td className="py-2.5 px-4 text-center">Unlimited</td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30 font-bold text-blue-900">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Multi-Device Sync</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">—</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">—</td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">E-Way Bills & E-Invoicing</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">—</td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Thermal POS Billing</td>
                    <td className="py-2.5 px-4 text-center">Bluetooth</td>
                    <td className="py-2.5 px-4 text-center">USB / LAN / Wi-Fi</td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30 font-bold">All Printers</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Multi-Company Support</td>
                    <td className="py-2.5 px-4 text-center">Up to 5</td>
                    <td className="py-2.5 px-4 text-center">Up to 5</td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30 font-bold text-blue-900">Up to 5</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Multi-Warehouse / Godowns</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">—</td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Bulk Excel Import & Export</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">—</td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Restore Deleted Transactions</td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Remove VANIRA Branding from Invoices</td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">24/7 Priority WhatsApp & Phone Support</td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                    <td className="py-2.5 px-4 text-center bg-blue-50/30"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUY MULTIPLE LICENSES MODAL ────────────────────────── */}
      {isMultiLicenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Buy Multiple Licenses (Volume Savings)</h3>
                <p className="text-xs text-gray-500">Configure customized licenses for branch offices & sales reps</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiLicenseOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-gray-700">
              {/* Desktop Licenses Counter */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="font-bold text-gray-900 block">Desktop 1-Year Licenses</span>
                  <span className="text-[11px] text-gray-500">₹3,279 per device (20% discounted)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDesktopLicenses((prev) => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-700 font-bold cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-gray-900">{desktopLicenses}</span>
                  <button
                    type="button"
                    onClick={() => setDesktopLicenses((prev) => prev + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-700 font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile Licenses Counter */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="font-bold text-gray-900 block">Mobile 1-Year Licenses</span>
                  <span className="text-[11px] text-gray-500">₹639 per device (20% discounted)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileLicenses((prev) => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-700 font-bold cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-gray-900">{mobileLicenses}</span>
                  <button
                    type="button"
                    onClick={() => setMobileLicenses((prev) => prev + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-700 font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({desktopLicenses + mobileLicenses} devices)</span>
                  <span className="font-bold text-gray-900">₹{grossTotal.toLocaleString('en-IN')}</span>
                </div>
                {volumeDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Volume Bonus (15% off orders &gt; ₹10k)</span>
                    <span>- ₹{volumeDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-blue-200 text-sm font-black text-gray-900">
                  <span>Total Payable:</span>
                  <span className="text-blue-700">₹{netMultiTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsMultiLicenseOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(
                    `https://wa.me/917795687633?text=${encodeURIComponent(
                      `Hello VANIRA Support, I would like to purchase a multi-license package: ${desktopLicenses} Desktop Licenses & ${mobileLicenses} Mobile Licenses. Estimated total: ₹${netMultiTotal}.`
                    )}`,
                    '_blank'
                  )
                  setIsMultiLicenseOpen(false)
                }}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Proceed with Multi-Licenses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKOUT / ACTIVATION MODAL ────────────────────────── */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-rose-200">
                  Upgrade to VANIRA Gold
                </span>
                <h3 className="text-base font-bold text-white">
                  {PRICING_DATA[checkoutPlan.tier].label} ({checkoutPlan.duration})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="text-rose-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-gray-700">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 line-through font-bold mr-2 text-sm">
                    ₹{checkoutPlan.originalPrice}
                  </span>
                  <span className="text-2xl font-black text-gray-900">
                    ₹{checkoutPlan.price}
                  </span>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                    Saved ₹{checkoutPlan.originalPrice - checkoutPlan.price} (20% Instant Discount Applied)
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg text-[10px]">
                    GST Included
                  </span>
                </div>
              </div>

              {/* Instant Activation Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Instant Activation upon payment confirmation</span>
                </div>
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>Zero downtime — all existing bills & items retained</span>
                </div>
              </div>

              {/* Payment Options */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <span className="font-bold text-gray-900 block text-xs">Fast Payment via UPI / QR</span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 bg-white border border-gray-200 rounded-xl flex items-center justify-center p-1.5 shadow-2xs">
                    <QrCode className="w-full h-full text-gray-900" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-xs text-gray-800">vanira.billing@upi</span>
                    <p className="text-[11px] text-gray-500">Scan using GPay, PhonePe, Paytm or BHIM UPI</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(
                    `https://wa.me/917795687633?text=${encodeURIComponent(
                      `Hello VANIRA Billing Support, I would like to activate the ${PRICING_DATA[checkoutPlan.tier].label} (${checkoutPlan.duration}) plan for ₹${checkoutPlan.price}. Please provide invoice and payment link.`
                    )}`,
                    '_blank'
                  )
                  toast.success('Support team connected! Preparing activation...')
                  setCheckoutPlan(null)
                }}
                className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
              >
                Pay ₹{checkoutPlan.price} & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
