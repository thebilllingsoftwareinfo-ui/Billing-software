'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  Edit2,
  Play,
  Check,
  ChevronDown,
  Info,
  Globe,
  Sliders,
  FileText,
  Printer,
  BadgePercent,
  MessageSquare,
  Users,
  Package,
  Bell,
  Landmark,
  Coins,
  ShieldCheck,
  Save,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { TEMPLATE_OPTIONS, TEMPLATE_COLORS } from '@/lib/constants/invoice-templates'
import { FONT_OPTIONS, applyAppFont, applyAppFontSize } from '@/components/layout/font-settings-provider'

type SettingsTab =
  | 'GENERAL'
  | 'TRANSACTION'
  | 'PRINT'
  | 'TAXES & GST'
  | 'TRANSACTION MESSAGE'
  | 'PARTY'
  | 'ITEM'
  | 'SERVICE REMINDERS'
  | 'ACCOUNTING'
  | 'MULTI CURRENCY'

const SETTINGS_TABS: SettingsTab[] = [
  'GENERAL',
  'TRANSACTION',
  'PRINT',
  'TAXES & GST',
  'TRANSACTION MESSAGE',
  'PARTY',
  'ITEM',
  'SERVICE REMINDERS',
  'ACCOUNTING',
  'MULTI CURRENCY',
]

export default function VaniraSettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // 1. GENERAL TAB STATES (Screenshot 1)
  // ─────────────────────────────────────────────────────────────
  const [enablePasscode, setEnablePasscode] = useState(false)
  const [businessCurrency, setBusinessCurrency] = useState('₹')
  const [decimalPlaces, setDecimalPlaces] = useState(2)
  const [enableGstinNumber, setEnableGstinNumber] = useState(true)
  const [stopSaleOnNegativeStock, setStopSaleOnNegativeStock] = useState(false)
  const [blockNewItemsFromTxn, setBlockNewItemsFromTxn] = useState(false)
  const [blockNewPartiesFromTxn, setBlockNewPartiesFromTxn] = useState(false)

  // More Transactions
  const [enableEstimate, setEnableEstimate] = useState(true)
  const [enableProforma, setEnableProforma] = useState(true)
  const [enableOrders, setEnableOrders] = useState(true)
  const [enableOtherIncome, setEnableOtherIncome] = useState(false)
  const [enableFixedAssets, setEnableFixedAssets] = useState(false)
  const [enableDeliveryChallan, setEnableDeliveryChallan] = useState(true)
  const [goodsReturnOnChallan, setGoodsReturnOnChallan] = useState(true)
  const [printAmountInChallan, setPrintAmountInChallan] = useState(false)

  // Multi Firm & Godown
  const [multiFirmEnabled, setMultiFirmEnabled] = useState(false)
  const [companyName, setCompanyName] = useState('company name')
  const [godownTransferEnabled, setGodownTransferEnabled] = useState(false)

  // Backup & History
  const [autoBackup, setAutoBackup] = useState(false)
  const [auditTrail, setAuditTrail] = useState(true)

  // Zoom / Scale & Font
  const [screenScale, setScreenScale] = useState<number>(100)
  const ZOOM_STOPS = [
    { value: 70, label: '70%' },
    { value: 80, label: '80%' },
    { value: 90, label: '90%' },
    { value: 100, label: '100% (Default)' },
    { value: 110, label: '110%' },
    { value: 120, label: '120%' },
    { value: 130, label: '130%' },
  ]
  const [selectedFont, setSelectedFont] = useState<string>('lato')

  // ─────────────────────────────────────────────────────────────
  // 2. TRANSACTION TAB STATES (Screenshot 2)
  // ─────────────────────────────────────────────────────────────
  const [invoiceBillNo, setInvoiceBillNo] = useState(true)
  const [addTimeOnTxn, setAddTimeOnTxn] = useState(false)
  const [cashSaleByDefault, setCashSaleByDefault] = useState(false)
  const [billingNameOfParties, setBillingNameOfParties] = useState(false)
  const [customersPoDetails, setCustomersPoDetails] = useState(false)

  // More Transaction Features
  const [eWayBillNo, setEWayBillNo] = useState(false)
  const [quickEntry, setQuickEntry] = useState(false)
  const [doNotShowPreview, setDoNotShowPreview] = useState(false)
  const [repeatInvoices, setRepeatInvoices] = useState(false)
  const [passcodeForEditDelete, setPasscodeForEditDelete] = useState(false)
  const [discountDuringPayments, setDiscountDuringPayments] = useState(false)
  const [linkPaymentsToInvoices, setLinkPaymentsToInvoices] = useState(false)
  const [dueDatesAndTerms, setDueDatesAndTerms] = useState(false)
  const [showProfitOnSale, setShowProfitOnSale] = useState(false)
  const [termsAndConditions, setTermsAndConditions] = useState(true)
  const [termsText, setTermsText] = useState(
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. charged if payment delayed beyond due date.\n3. Subject to local jurisdiction.'
  )
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)

  // Items Table
  const [taxInclusiveRate, setTaxInclusiveRate] = useState(true)
  const [displayPurchasePrice, setDisplayPurchasePrice] = useState(true)
  const [showLast5SalePrice, setShowLast5SalePrice] = useState(false)
  const [showLast5PurchasePrice, setShowLast5PurchasePrice] = useState(false)
  const [freeItemQuantity, setFreeItemQuantity] = useState(false)
  const [countEnabled, setCountEnabled] = useState(false)
  const [countLabel, setCountLabel] = useState('Count')

  // Prefixes
  const [selectedFirmForPrefix, setSelectedFirmForPrefix] = useState('company name')
  const [prefixes, setPrefixes] = useState({
    sale: 'None',
    creditNote: 'None',
    saleOrder: 'None',
    purchaseOrder: 'None',
    estimate: 'None',
    proformaInvoice: 'None',
    deliveryChallan: 'None',
    paymentIn: 'None',
  })

  // Taxes, Discount & Totals
  const [transactionWiseTax, setTransactionWiseTax] = useState(false)
  const [transactionWiseDiscount, setTransactionWiseDiscount] = useState(false)
  const [roundOffTotal, setRoundOffTotal] = useState(true)
  const [roundOffMode, setRoundOffMode] = useState<'Nearest' | 'Upward' | 'Downward'>('Nearest')
  const [roundOffValue, setRoundOffValue] = useState(1)

  // Billing Type
  const [billingType, setBillingType] = useState<'Lite Sale' | 'Full Sale'>('Full Sale')

  // ─────────────────────────────────────────────────────────────
  // 3. OTHER TABS STATES (Print, Taxes, Party, Item, etc.)
  // ─────────────────────────────────────────────────────────────
  const [paperSize, setPaperSize] = useState<'A4' | 'A5' | '80mm' | '58mm'>('A4')
  const [printCopies, setPrintCopies] = useState<'original' | 'duplicate' | 'triplicate'>('original')
  const [defaultTemplate, setDefaultTemplate] = useState('standard')
  const [themeColor, setThemeColor] = useState('vyapar_red')
  const [printLogo, setPrintLogo] = useState(true)
  const [printSignature, setPrintSignature] = useState(true)
  const [printUpiQr, setPrintUpiQr] = useState(true)

  // Taxes & GST
  const [isGstRegistered, setIsGstRegistered] = useState(true)
  const [gstin, setGstin] = useState('27AABCU9603R1ZM')
  const [defaultGstRate, setDefaultGstRate] = useState(18)
  const [compositionScheme, setCompositionScheme] = useState(false)
  const [rcmEnabled, setRcmEnabled] = useState(false)

  // Messages
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)

  // Party
  const [partyGroupsEnabled, setPartyGroupsEnabled] = useState(true)
  const [partyCreditLimitEnabled, setPartyCreditLimitEnabled] = useState(true)
  const [partyShippingAddress, setPartyShippingAddress] = useState(true)

  // Item
  const [barcodeScanEnabled, setBarcodeScanEnabled] = useState(true)
  const [batchTrackingEnabled, setBatchTrackingEnabled] = useState(true)
  const [serialTrackingEnabled, setSerialTrackingEnabled] = useState(false)
  const [lowStockAlertCount, setLowStockAlertCount] = useState(5)

  // Service Reminders
  const [serviceRemindersEnabled, setServiceRemindersEnabled] = useState(true)
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3)

  // Accounting
  const [financialYear, setFinancialYear] = useState('2026-2027')
  const [lockFinancialPeriod, setLockFinancialPeriod] = useState(false)

  // Multi Currency
  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(false)
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(86.5)

  // Load from LocalStorage
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('vanira_full_settings') || '{}')
      if (s.companyName) setCompanyName(s.companyName)
      if (s.businessCurrency) setBusinessCurrency(s.businessCurrency)
      if (s.decimalPlaces !== undefined) setDecimalPlaces(s.decimalPlaces)
      if (s.gstin) setGstin(s.gstin)
      if (s.defaultGstRate !== undefined) setDefaultGstRate(s.defaultGstRate)
      if (s.paperSize) setPaperSize(s.paperSize)
      if (s.defaultTemplate) setDefaultTemplate(s.defaultTemplate)
      if (s.themeColor) setThemeColor(s.themeColor)
      const scale = typeof s.screenScale === 'number' ? s.screenScale : 100
      setScreenScale(scale)
      const effectiveZoom = Math.round((scale / 100) * 120)
      document.documentElement.style.zoom = `${effectiveZoom}%`

      const savedFont = localStorage.getItem('vanira_app_font') || 'lato'
      setSelectedFont(savedFont)
    } catch {}
  }, [])

  // Handle Font Change
  const handleSelectFont = (fontId: string) => {
    setSelectedFont(fontId)
    applyAppFont(fontId)
    const fontObj = FONT_OPTIONS.find((f) => f.id === fontId)
    toast.success(`Application font changed to ${fontObj?.name || fontId}`)
  }

  // Save changes
  const saveCurrentSettings = () => {
    try {
      const payload = {
        companyName,
        businessCurrency,
        decimalPlaces,
        enableGstinNumber,
        stopSaleOnNegativeStock,
        blockNewItemsFromTxn,
        blockNewPartiesFromTxn,
        enableEstimate,
        enableProforma,
        enableOrders,
        enableDeliveryChallan,
        gstin,
        defaultGstRate,
        paperSize,
        defaultTemplate,
        themeColor,
        screenScale,
        selectedFont,
        roundOffTotal,
        billingType,
      }
      localStorage.setItem('vanira_full_settings', JSON.stringify(payload))
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  // Handle Zoom Apply
  const handleApplyZoom = () => {
    try {
      const s = JSON.parse(localStorage.getItem('vanira_full_settings') || '{}')
      s.screenScale = screenScale
      localStorage.setItem('vanira_full_settings', JSON.stringify(s))
      // Scale baseline: 100% in UI maps to 120% visual zoom
      const effectiveZoom = Math.round((screenScale / 100) * 120)
      document.documentElement.style.zoom = `${effectiveZoom}%`
      toast.success(
        `Screen scale applied: ${screenScale === 100 ? '100% (Default)' : `${screenScale}%`}`
      )
    } catch {
      toast.success(`Scale set to ${screenScale}%`)
    }
  }

  // Tooltip Helper Component
  const Tip = ({ text }: { text?: string }) => (
    <span
      className="inline-flex items-center text-gray-400 hover:text-gray-600 cursor-pointer ml-1 select-none"
      title={text || 'Click to view configuration guidance'}
    >
      <Info className="h-3 w-3" />
    </span>
  )

  // Filter tabs by search
  const displayedTabs = SETTINGS_TABS.filter((t) =>
    t.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  return (
    <div className="w-full h-full bg-white flex flex-col md:flex-row font-sans overflow-hidden">
      {/* ── LEFT DARK SIDEBAR ─────────────────────────────────── */}
      <div className="w-full md:w-60 bg-[#161928] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none h-full min-h-0">
        {/* Top Header with Search Icon */}
        <div className="p-4 pb-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-white tracking-wide">Settings</h2>
          <button
            type="button"
            onClick={() => setIsSearchActive((prev) => !prev)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Search settings"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input Bar (Expandable) */}
        {isSearchActive && (
          <div className="px-3 pt-2.5 pb-1 animate-in fade-in duration-100 shrink-0">
            <input
              type="text"
              placeholder="Search setting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#1f243a] border border-slate-700 rounded text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
        )}

        {/* Tab Navigation List */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
          {displayedTabs.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-white text-[#161928] rounded-l-md shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── MAIN WHITE CONTENT AREA ────────────────────────────── */}
      <div className="flex-1 h-full bg-white text-gray-800 overflow-y-auto relative flex flex-col justify-between min-w-0 min-h-0">
        {/* Circular Close Button on Top Right (✖) */}
        <button
          type="button"
          onClick={() => {
            saveCurrentSettings()
            router.push('/dashboard')
          }}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-300/80 hover:bg-gray-400 text-gray-700 flex items-center justify-center transition-colors cursor-pointer z-20 shadow-2xs"
          title="Close Settings"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>

        <div className="w-full max-w-6xl pr-6 p-6 md:p-8 flex-1">
          {/* ═══════════════════════════════════════════════════════
              TAB 1: GENERAL (Pixel-matched with Screenshot 1)
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'GENERAL' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs text-gray-800">
              {/* ── COLUMN 1: Application & More Transactions ── */}
              <div className="space-y-6">
                {/* Application Section */}
                <div className="space-y-3.5">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Application
                  </h3>

                  {/* Enable Passcode */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enablePasscode}
                      onChange={(e) => setEnablePasscode(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Enable Passcode</span>
                    <Tip text="Require security passcode to launch or make edits" />
                  </label>

                  {/* Business Currency */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="font-medium text-gray-800 whitespace-nowrap">Business Currency</span>
                    <Tip text="Standard currency symbol used across ledger and invoices" />
                    <div className="relative inline-block ml-auto">
                      <select
                        value={businessCurrency}
                        onChange={(e) => setBusinessCurrency(e.target.value)}
                        className="px-3 py-1 pr-7 bg-white border border-gray-300 rounded text-xs font-bold text-gray-900 focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="₹">₹</option>
                        <option value="$">$</option>
                        <option value="€">€</option>
                        <option value="£">£</option>
                        <option value="AED">AED</option>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Amount (upto Decimal Places) */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="leading-tight">
                      <span className="font-medium text-gray-800 block">Amount</span>
                      <span className="text-[10px] text-gray-400 block">(upto Decimal Places)</span>
                    </div>
                    <Tip text="Number of decimal digits in currency values" />
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={decimalPlaces}
                        onChange={(e) => setDecimalPlaces(Number(e.target.value))}
                        className="w-10 px-1 py-1 border border-gray-300 rounded text-xs font-bold text-center"
                      />
                      <span className="text-[11px] text-gray-400 font-mono">e.g. 0.00</span>
                    </div>
                  </div>

                  {/* GSTIN Number */}
                  <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={enableGstinNumber}
                      onChange={(e) => setEnableGstinNumber(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">GSTIN Number</span>
                    <Tip text="Display GSTIN identification on documents and forms" />
                  </label>

                  {/* Stop Sale on Negative Stock */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stopSaleOnNegativeStock}
                      onChange={(e) => setStopSaleOnNegativeStock(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Stop Sale on Negative Stock</span>
                    <Tip text="Prevent billing when stock level drops below 0" />
                  </label>

                  {/* Block New Items from Txn Form */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={blockNewItemsFromTxn}
                      onChange={(e) => setBlockNewItemsFromTxn(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Block New Items from Txn Form</span>
                    <Tip text="Restrict operators from creating unregistered items inside invoice" />
                  </label>

                  {/* Block New Parties from Txn Form */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={blockNewPartiesFromTxn}
                      onChange={(e) => setBlockNewPartiesFromTxn(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Block New Parties from Txn Form</span>
                    <Tip text="Restrict operators from creating new customers/vendors in invoice" />
                  </label>
                </div>

                {/* More Transactions Section */}
                <div className="space-y-3.5 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    More Transactions
                  </h3>

                  {/* Estimate/Quotation */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableEstimate}
                      onChange={(e) => setEnableEstimate(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Estimate/Quotation</span>
                    <Tip text="Enable creation and tracking of customer estimates" />
                  </label>

                  {/* Proforma Invoice */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableProforma}
                      onChange={(e) => setEnableProforma(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Proforma Invoice</span>
                    <Tip text="Enable proforma invoices prior to final sale" />
                  </label>

                  {/* Sale/Purchase Order */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableOrders}
                      onChange={(e) => setEnableOrders(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Sale/Purchase Order</span>
                    <Tip text="Order booking before shipment and billing" />
                  </label>

                  {/* Other Income */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableOtherIncome}
                      onChange={(e) => setEnableOtherIncome(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Other Income</span>
                    <Tip text="Record interest, dividends, discounts received, etc." />
                  </label>

                  {/* Fixed Assets (FA) */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableFixedAssets}
                      onChange={(e) => setEnableFixedAssets(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Fixed Assets (FA)</span>
                    <Tip text="Track company machinery, vehicles, and furniture" />
                  </label>

                  {/* Delivery Challan */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableDeliveryChallan}
                        onChange={(e) => setEnableDeliveryChallan(e.target.checked)}
                        className="rounded text-blue-600 border-gray-300 focus:ring-0"
                      />
                      <span className="font-medium text-gray-800">Delivery Challan</span>
                      <Tip text="Dispatch goods with transport delivery challans" />
                    </label>

                    {/* Sub-checkboxes indented */}
                    {enableDeliveryChallan && (
                      <div className="pl-6 space-y-2 pt-1 animate-in fade-in duration-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={goodsReturnOnChallan}
                            onChange={(e) => setGoodsReturnOnChallan(e.target.checked)}
                            className="rounded text-blue-600 border-gray-300 focus:ring-0"
                          />
                          <span className="text-gray-700">Goods return on Delivery Challan</span>
                          <Tip />
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={printAmountInChallan}
                            onChange={(e) => setPrintAmountInChallan(e.target.checked)}
                            className="rounded text-blue-600 border-gray-300 focus:ring-0"
                          />
                          <span className="text-gray-700">Print amount in Delivery Challan</span>
                          <Tip />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── COLUMN 2: Multi Firm & Godowns ── */}
              <div className="space-y-8">
                {/* Multi Firm Section */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={multiFirmEnabled}
                      onChange={(e) => setMultiFirmEnabled(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                      Multi Firm
                    </h3>
                  </label>

                  {/* Selected Company Card */}
                  <div className="p-3 bg-white border-2 border-blue-400 rounded-lg shadow-2xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>
                      <span className="font-bold text-gray-900 text-xs truncate max-w-[120px]">
                        {companyName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        DEFAULT
                      </span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" /> ALL DEVICES
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newName = prompt('Enter Company / Firm Name:', companyName)
                          if (newName && newName.trim()) setCompanyName(newName.trim())
                        }}
                        className="text-gray-400 hover:text-gray-800 p-0.5 cursor-pointer"
                        title="Edit Firm Name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stock Transfer Between Godowns Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                    Stock Transfer Between Godowns
                  </h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Manage all your stores/godowns and transfer stock seamlessly between them. Using this feature, you can transfer stock between stores/godowns and manage your inventory more efficiently.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={godownTransferEnabled}
                        onChange={(e) => setGodownTransferEnabled(e.target.checked)}
                        className="rounded text-blue-600 border-gray-300 focus:ring-0"
                      />
                      <span className="font-medium text-gray-800">Godown management & Stock transfer</span>
                      <Tip />
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info('Godown transfer guide available')}
                      className="text-red-500 hover:text-red-600 cursor-pointer"
                      title="Watch tutorial video"
                    >
                      <Play className="h-3.5 w-3.5 fill-red-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── COLUMN 3: Backup & History, Customize View ── */}
              <div className="space-y-8">
                {/* Backup & History Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Backup & History
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoBackup}
                      onChange={(e) => setAutoBackup(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Auto Backup</span>
                    <Tip text="Regular automatic backups saved to your Google Drive or local hard disk" />
                  </label>

                  <div className="pl-6 text-[11px] text-gray-500 flex items-center gap-1">
                    <span>Last Backup 18/09/2026 | 11:09 PM</span>
                    <Tip text="Most recent data snapshot" />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none pt-2">
                    <input
                      type="checkbox"
                      checked={auditTrail}
                      onChange={(e) => setAuditTrail(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Audit Trail</span>
                    <Tip text="Track all user modifications, deletions, and additions for compliance" />
                  </label>
                </div>

                {/* Customize Your View (Zoom Slider & 5 Font Options) */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                    Customize Your View
                  </h3>

                  <div className="space-y-1">
                    <span className="font-bold text-gray-800 block">Choose Your Screen Zoom/Scale</span>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      You can use this setting to resize the VANIRA screen, making it larger or smaller to fit your preferences.
                    </p>
                  </div>

                  {/* Zoom Slider Track & Stops */}
                  <div className="pt-3 pb-2">
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="70"
                        max="130"
                        step="5"
                        value={screenScale}
                        onChange={(e) => setScreenScale(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-gray-200 rounded"
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-medium text-gray-500 mt-2">
                      {ZOOM_STOPS.map((stop) => (
                        <button
                          key={stop.value}
                          type="button"
                          onClick={() => setScreenScale(stop.value)}
                          className={`cursor-pointer transition-colors ${
                            screenScale === stop.value
                              ? 'text-blue-600 font-bold underline underline-offset-4'
                              : 'hover:text-gray-800'
                          }`}
                        >
                          {stop.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleApplyZoom}
                      className="px-4 py-1.5 bg-[#e8f3fc] hover:bg-[#d5e9f8] text-[#0284c7] font-bold text-xs rounded border border-[#bce0f8] transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* ── 5 FONT OPTIONS (Below Given Reference) ── */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="space-y-0.5">
                      <span className="font-bold text-gray-900 block text-xs uppercase tracking-wider">
                        Choose Application Font
                      </span>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Select from 5 fonts for the entire software interface:
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {FONT_OPTIONS.map((font) => {
                        const isSelected = selectedFont === font.id
                        return (
                          <div
                            key={font.id}
                            onClick={() => handleSelectFont(font.id)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between group ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 shadow-2xs'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="font-bold text-xs text-gray-900"
                                    style={{ fontFamily: font.family }}
                                  >
                                    {font.name}
                                  </span>
                                  {font.id === 'lato' && (
                                    <span className="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-500 block truncate">
                                  {font.subtitle}
                                </span>
                              </div>
                            </div>

                            <div
                              className="text-[11px] font-semibold px-2 py-0.5 bg-white rounded border border-gray-200 text-gray-700 shrink-0 shadow-2xs"
                              style={{ fontFamily: font.family }}
                            >
                              Aa ₹1,250
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 2: TRANSACTION (Pixel-matched with Screenshot 2)
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'TRANSACTION' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs text-gray-800">
              {/* ── COLUMN 1: Transaction Header & More Features ── */}
              <div className="space-y-6">
                {/* Transaction Header Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Transaction Header
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={invoiceBillNo}
                      onChange={(e) => setInvoiceBillNo(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Invoice/Bill No.</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addTimeOnTxn}
                      onChange={(e) => setAddTimeOnTxn(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Add Time on Transactions</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cashSaleByDefault}
                      onChange={(e) => setCashSaleByDefault(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Cash Sale by default</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={billingNameOfParties}
                      onChange={(e) => setBillingNameOfParties(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Billing Name of Parties</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={customersPoDetails}
                      onChange={(e) => setCustomersPoDetails(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Customers P.O. Details on Transactions</span>
                    <Tip />
                  </label>
                </div>

                {/* More Transaction Features Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    More Transaction Features
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eWayBillNo}
                      onChange={(e) => setEWayBillNo(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">E way bill no</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={quickEntry}
                      onChange={(e) => setQuickEntry(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Quick Entry</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={doNotShowPreview}
                      onChange={(e) => setDoNotShowPreview(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Do not Show Invoice Preview</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={repeatInvoices}
                      onChange={(e) => setRepeatInvoices(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Repeat Invoices</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={passcodeForEditDelete}
                      onChange={(e) => setPasscodeForEditDelete(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Enable Passcode for transaction edit/delete</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={discountDuringPayments}
                      onChange={(e) => setDiscountDuringPayments(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Discount During Payments</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={linkPaymentsToInvoices}
                      onChange={(e) => setLinkPaymentsToInvoices(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Link Payments to Invoices</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dueDatesAndTerms}
                      onChange={(e) => setDueDatesAndTerms(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Due Dates and Payment Terms</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showProfitOnSale}
                      onChange={(e) => setShowProfitOnSale(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Show Profit while making Sale Invoice</span>
                    <Tip />
                  </label>

                  {/* Terms & Conditions with Modal trigger */}
                  <div className="space-y-1 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={termsAndConditions}
                        onChange={(e) => setTermsAndConditions(e.target.checked)}
                        className="rounded text-blue-600 border-gray-300 focus:ring-0"
                      />
                      <span className="font-medium text-gray-800">Terms and Conditions</span>
                      <Tip />
                    </label>

                    {termsAndConditions && (
                      <div className="pl-6">
                        <button
                          type="button"
                          onClick={() => setIsTermsModalOpen(true)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer text-xs"
                        >
                          Set Terms and Conditions
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub-Actions Buttons */}
                  <div className="pt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => toast.info('Custom invoice fields configuration ready')}
                      className="px-3 py-1.5 bg-[#edf5fb] hover:bg-[#dfeef8] text-[#0284c7] font-semibold text-xs rounded border border-[#d2e7f8] transition-colors cursor-pointer"
                    >
                      Additional Fields &gt;
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => toast.info('Transportation vehicle & e-way logistics ready')}
                        className="px-3 py-1.5 bg-[#edf5fb] hover:bg-[#dfeef8] text-[#0284c7] font-semibold text-xs rounded border border-[#d2e7f8] transition-colors cursor-pointer"
                      >
                        Transportation Details &gt;
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => toast.info('Freight, packaging & additional charges ready')}
                        className="px-3 py-1.5 bg-[#edf5fb] hover:bg-[#dfeef8] text-[#0284c7] font-semibold text-xs rounded border border-[#d2e7f8] transition-colors cursor-pointer"
                      >
                        Additional Charges &gt;
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COLUMN 2: Items Table & Transaction Prefixes ── */}
              <div className="space-y-6">
                {/* Items Table Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Items Table
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={taxInclusiveRate}
                      onChange={(e) => setTaxInclusiveRate(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Inclusive/Exclusive Tax on Rate(Price/Unit)</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={displayPurchasePrice}
                      onChange={(e) => setDisplayPurchasePrice(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Display Purchase Price of Items</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showLast5SalePrice}
                      onChange={(e) => setShowLast5SalePrice(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Show last 5 Sale Price of Items</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showLast5PurchasePrice}
                      onChange={(e) => setShowLast5PurchasePrice(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Show last 5 Purchase Price of Items</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={freeItemQuantity}
                      onChange={(e) => setFreeItemQuantity(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Free Item Quantity</span>
                    <Tip />
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={countEnabled}
                        onChange={(e) => setCountEnabled(e.target.checked)}
                        className="rounded text-blue-600 border-gray-300 focus:ring-0"
                      />
                      <span className="font-medium text-gray-800">{countLabel}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newText = prompt('Enter custom text for Count:', countLabel)
                        if (newText && newText.trim()) setCountLabel(newText.trim())
                      }}
                      className="text-gray-400 hover:text-blue-600 text-[11px] underline cursor-pointer"
                    >
                      Change Text
                    </button>
                    <Tip />
                  </div>
                </div>

                {/* Transaction Prefixes Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Transaction Prefixes
                  </h3>

                  {/* Firm Select Box */}
                  <div className="border border-gray-300 rounded p-2 relative">
                    <span className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-500">
                      Firm
                    </span>
                    <select
                      value={selectedFirmForPrefix}
                      onChange={(e) => setSelectedFirmForPrefix(e.target.value)}
                      className="w-full bg-white text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                    >
                      <option value={companyName}>{companyName}</option>
                    </select>
                  </div>

                  {/* Prefixes 2-Column Grid */}
                  <div className="border border-gray-300 rounded p-3 relative pt-4 space-y-2.5">
                    <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[10px] font-bold text-gray-500">
                      Prefixes
                    </span>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Row 1: Sale & Credit Note */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Sale</span>
                        <div className="relative">
                          <select
                            value={prefixes.sale}
                            onChange={(e) => setPrefixes({ ...prefixes, sale: e.target.value })}
                            className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                          >
                            <option value="None">None</option>
                            <option value="INV-">INV-</option>
                            <option value="SL-">SL-</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Credit Note</span>
                        <div className="relative">
                          <select
                            value={prefixes.creditNote}
                            onChange={(e) => setPrefixes({ ...prefixes, creditNote: e.target.value })}
                            className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                          >
                            <option value="None">None</option>
                            <option value="CRN-">CRN-</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Sale Order & Purchase Order */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Sale Order</span>
                        <select
                          value={prefixes.saleOrder}
                          onChange={(e) => setPrefixes({ ...prefixes, saleOrder: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                        >
                          <option value="None">None</option>
                          <option value="SO-">SO-</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Purchase Order</span>
                        <select
                          value={prefixes.purchaseOrder}
                          onChange={(e) => setPrefixes({ ...prefixes, purchaseOrder: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                        >
                          <option value="None">None</option>
                          <option value="PO-">PO-</option>
                        </select>
                      </div>

                      {/* Row 3: Estimate & Proforma */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Estimate</span>
                        <select
                          value={prefixes.estimate}
                          onChange={(e) => setPrefixes({ ...prefixes, estimate: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                        >
                          <option value="None">None</option>
                          <option value="EST-">EST-</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Proforma Invoice</span>
                        <select
                          value={prefixes.proformaInvoice}
                          onChange={(e) => setPrefixes({ ...prefixes, proformaInvoice: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                        >
                          <option value="None">None</option>
                          <option value="PI-">PI-</option>
                        </select>
                      </div>

                      {/* Row 4: Delivery Challan & Payment In */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Delivery Challan</span>
                        <select
                          value={prefixes.deliveryChallan}
                          onChange={(e) => setPrefixes({ ...prefixes, deliveryChallan: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                        >
                          <option value="None">None</option>
                          <option value="DC-">DC-</option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 font-medium block">Payment In</span>
                        <select
                          value={prefixes.paymentIn}
                          onChange={(e) => setPrefixes({ ...prefixes, paymentIn: e.target.value })}
                          className="w-full p-1 border border-gray-300 rounded text-xs bg-white text-gray-700"
                        >
                          <option value="None">None</option>
                          <option value="REC-">REC-</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COLUMN 3: Taxes, Discount & Totals, Billing Type ── */}
              <div className="space-y-8">
                {/* Taxes, Discount & Totals Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Taxes, Discount & Totals
                  </h3>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={transactionWiseTax}
                      onChange={(e) => setTransactionWiseTax(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Transaction wise Tax</span>
                    <Tip />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={transactionWiseDiscount}
                      onChange={(e) => setTransactionWiseDiscount(e.target.checked)}
                      className="rounded text-blue-600 border-gray-300 focus:ring-0"
                    />
                    <span className="font-medium text-gray-800">Transaction wise Discount</span>
                    <Tip />
                  </label>

                  {/* Round Off Total */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={roundOffTotal}
                        onChange={(e) => setRoundOffTotal(e.target.checked)}
                        className="rounded text-blue-600 border-gray-300 focus:ring-0"
                      />
                      <span className="font-medium text-gray-800">Round Off Total</span>
                      <Tip />
                    </label>

                    {roundOffTotal && (
                      <div className="pl-6 flex items-center gap-2 text-xs">
                        <select
                          value={roundOffMode}
                          onChange={(e: any) => setRoundOffMode(e.target.value)}
                          className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-800"
                        >
                          <option value="Nearest">Nearest</option>
                          <option value="Upward">Upward</option>
                          <option value="Downward">Downward</option>
                        </select>
                        <span className="text-gray-500 font-medium">To</span>
                        <select
                          value={roundOffValue}
                          onChange={(e) => setRoundOffValue(Number(e.target.value))}
                          className="px-2 py-1 bg-white border border-gray-300 rounded font-semibold text-gray-800"
                        >
                          <option value={1}>1</option>
                          <option value={10}>10</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Billing Type Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-xs text-gray-900 pb-1.5 border-b border-gray-100 uppercase tracking-wider">
                    Billing Type
                  </h3>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                      <input
                        type="radio"
                        name="billing_type"
                        checked={billingType === 'Lite Sale'}
                        onChange={() => setBillingType('Lite Sale')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Lite Sale</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                      <input
                        type="radio"
                        name="billing_type"
                        checked={billingType === 'Full Sale'}
                        onChange={() => setBillingType('Full Sale')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Full Sale</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 3: PRINT
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'PRINT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-800">
              <div className="space-y-4">
                <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                  Paper Size & Print Copies
                </h3>
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">Paper Format</label>
                  <select
                    value={paperSize}
                    onChange={(e: any) => setPaperSize(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-semibold text-gray-800"
                  >
                    <option value="A4">A4 (Standard Laser / Inkjet)</option>
                    <option value="A5">A5 (Compact Ledger)</option>
                    <option value="80mm">Thermal 3&quot; (80mm POS Receipt)</option>
                    <option value="58mm">Thermal 2&quot; (58mm POS Receipt)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">Print Copies Title</label>
                  <select
                    value={printCopies}
                    onChange={(e: any) => setPrintCopies(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-semibold text-gray-800"
                  >
                    <option value="original">Original for Recipient</option>
                    <option value="duplicate">Duplicate for Transporter</option>
                    <option value="triplicate">Triplicate for Supplier</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                  Invoice Print Options
                </h3>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printLogo}
                    onChange={(e) => setPrintLogo(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Print Company Logo on Invoices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printSignature}
                    onChange={(e) => setPrintSignature(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Print Authorized Signature & Stamp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printUpiQr}
                    onChange={(e) => setPrintUpiQr(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Print Dynamic UPI Payment QR Code on Bills</span>
                </label>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 4: TAXES & GST
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'TAXES & GST' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-800">
              <div className="space-y-4">
                <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                  GST Registration & Rates
                </h3>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isGstRegistered}
                    onChange={(e) => setIsGstRegistered(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>My Business is GST Registered</span>
                </label>

                {isGstRegistered && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Business GSTIN</label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Default GST Rate</label>
                      <select
                        value={defaultGstRate}
                        onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded font-bold"
                      >
                        <option value={0}>GST @ 0% (Exempt)</option>
                        <option value={3}>GST @ 3% (Jewellery)</option>
                        <option value={5}>GST @ 5%</option>
                        <option value={12}>GST @ 12%</option>
                        <option value={18}>GST @ 18% (Standard)</option>
                        <option value={28}>GST @ 28% (Luxury)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                  Tax Schemes & RCM
                </h3>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={compositionScheme}
                    onChange={(e) => setCompositionScheme(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Enable Composition Scheme</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rcmEnabled}
                    onChange={(e) => setRcmEnabled(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Reverse Charge Mechanism (RCM)</span>
                </label>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 5: TRANSACTION MESSAGE
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'TRANSACTION MESSAGE' && (
            <div className="space-y-5 text-xs text-gray-800 max-w-2xl">
              <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                Automated Transaction Alerts
              </h3>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Send WhatsApp Invoice upon Save</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <span>Send SMS Transaction Alert</span>
                </label>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">WhatsApp Message Template</label>
                <textarea
                  rows={3}
                  defaultValue="Dear Customer, thank you for doing business with us. Please find your invoice copy attached. For queries, call our helpline."
                  className="w-full p-2.5 border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 6: PARTY
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'PARTY' && (
            <div className="space-y-4 text-xs text-gray-800 max-w-xl">
              <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                Party & Customer Master Preferences
              </h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyGroupsEnabled}
                  onChange={(e) => setPartyGroupsEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Enable Party Groups (Retail, Wholesale, Distributors)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyCreditLimitEnabled}
                  onChange={(e) => setPartyCreditLimitEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Party-wise Credit Limits & Warning on Billing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={partyShippingAddress}
                  onChange={(e) => setPartyShippingAddress(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Separate Shipping & Billing Addresses</span>
              </label>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 7: ITEM
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'ITEM' && (
            <div className="space-y-4 text-xs text-gray-800 max-w-xl">
              <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                Inventory & Item Master Preferences
              </h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={barcodeScanEnabled}
                  onChange={(e) => setBarcodeScanEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Enable Barcode Scanning & Label Printing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={batchTrackingEnabled}
                  onChange={(e) => setBatchTrackingEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Batch Tracking, Manufacturing & Expiry Dates</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={serialTrackingEnabled}
                  onChange={(e) => setSerialTrackingEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Serial Number / IMEI Tracking</span>
              </label>
              <div className="flex items-center gap-3 pt-1">
                <span className="font-medium text-gray-800">Default Low Stock Alert Threshold:</span>
                <input
                  type="number"
                  min="0"
                  value={lowStockAlertCount}
                  onChange={(e) => setLowStockAlertCount(Number(e.target.value))}
                  className="w-14 px-2 py-1 border border-gray-300 rounded font-bold text-center"
                />
                <span className="text-gray-400">units</span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 8: SERVICE REMINDERS
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'SERVICE REMINDERS' && (
            <div className="space-y-4 text-xs text-gray-800 max-w-xl">
              <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                Periodic Service & Warranty Due Reminders
              </h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={serviceRemindersEnabled}
                  onChange={(e) => setServiceRemindersEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Enable Customer Service & Renewal Reminders</span>
              </label>
              <div className="flex items-center gap-3 pt-1">
                <span className="font-medium text-gray-800">Send reminder:</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                  className="w-12 px-2 py-1 border border-gray-300 rounded font-bold text-center"
                />
                <span className="text-gray-500">days prior to due date</span>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 9: ACCOUNTING
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'ACCOUNTING' && (
            <div className="space-y-4 text-xs text-gray-800 max-w-xl">
              <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                Bookkeeping & Fiscal Year
              </h3>
              <div className="space-y-1">
                <label className="block font-medium text-gray-700">Financial Year</label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded font-bold text-gray-800"
                >
                  <option value="2026-2027">2026-2027 (Current)</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none pt-2">
                <input
                  type="checkbox"
                  checked={lockFinancialPeriod}
                  onChange={(e) => setLockFinancialPeriod(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Lock Financial Period (Prevent retroactive bill modifications)</span>
              </label>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 10: MULTI CURRENCY
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'MULTI CURRENCY' && (
            <div className="space-y-4 text-xs text-gray-800 max-w-xl">
              <h3 className="font-bold text-xs text-gray-900 pb-1 border-b border-gray-100 uppercase tracking-wider">
                Multi-Currency & International Trade
              </h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={multiCurrencyEnabled}
                  onChange={(e) => setMultiCurrencyEnabled(e.target.checked)}
                  className="rounded text-blue-600 border-gray-300 focus:ring-0"
                />
                <span>Enable Multi-Currency Invoicing</span>
              </label>

              {multiCurrencyEnabled && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Secondary Currency</label>
                    <select
                      value={secondaryCurrency}
                      onChange={(e) => setSecondaryCurrency(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded font-bold"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Exchange Rate to Base (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded font-bold text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM GLOBAL SAVE BAR ───────────────────────────── */}
        <div className="shrink-0 p-3.5 px-8 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs w-full z-10">
          <div className="flex items-center gap-2 text-gray-500 text-[11px]">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Changes save automatically to local business environment</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset all settings on this screen to factory default?')) {
                  localStorage.removeItem('vanira_full_settings')
                  toast.success('Settings reset to factory defaults')
                  window.location.reload()
                }
              }}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded text-xs transition-colors cursor-pointer"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={saveCurrentSettings}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs shadow-xs transition-colors cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: SET TERMS AND CONDITIONS ─────────────────────── */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Set Terms and Conditions</span>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <label className="block text-gray-700 font-medium">
                Standard Terms & Conditions printed at invoice footer:
              </label>
              <textarea
                rows={6}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs text-gray-900 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(false)}
                  className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTermsModalOpen(false)
                    toast.success('Terms and conditions updated!')
                  }}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold cursor-pointer"
                >
                  Save Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
