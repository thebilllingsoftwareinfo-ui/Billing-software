'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Building2,
  Upload,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  CreditCard,
  QrCode,
  Globe,
  Phone,
  Mail,
  MapPin,
  Landmark,
  Sparkles,
  ArrowLeft,
  Eye,
  ShieldCheck,
  RefreshCw,
  ShoppingCart,
  UtensilsCrossed,
  Pill,
  Shirt,
  Wrench,
  Smartphone,
  Truck,
  Gem,
  Sun,
  Briefcase,
  Store,
  Package,
  ChevronDown,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const BUSINESS_TYPES = [
  { id: 'retail_supermarket', label: 'Retail & Supermarket', icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'restaurant_cafe', label: 'Restaurant & Cafe', icon: UtensilsCrossed, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'pharmacy_medical', label: 'Pharmacy & Medical', icon: Pill, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'textiles_fashion', label: 'Textiles & Fashion', icon: Shirt, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { id: 'hardware_sanitary', label: 'Hardware & Sanitary', icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'electronics_mobile', label: 'Electronics & Mobile', icon: Smartphone, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'wholesale_distribution', label: 'Wholesale & Distribution', icon: Truck, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { id: 'jewelry_gold', label: 'Jewelry & Gold Shop', icon: Gem, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'solar_clean_energy', label: 'Solar & Clean Energy', icon: Sun, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'service_business', label: 'Service Business', icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'general_store', label: 'General Store', icon: Store, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  { id: 'other', label: 'Other / Custom', icon: Package, color: 'text-gray-400', bg: 'bg-gray-500/10' },
]

interface BusinessProfileFormState {
  name: string
  legal_name: string
  trade_name: string
  logo_url: string
  business_type: string
  gstin: string
  pan: string
  state_code: string
  phone: string
  email: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  country: string
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  bank_ifsc: string
  bank_branch: string
  upi_id: string
  invoice_prefix: string
  terms_and_conditions: string
  notes: string
}

export default function BusinessProfileSettingsPage() {
  const [profile, setProfile] = useState<BusinessProfileFormState>({
    name: '',
    legal_name: '',
    trade_name: '',
    logo_url: '',
    business_type: '',
    gstin: '',
    pan: '',
    state_code: '27',
    phone: '',
    email: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_branch: '',
    upi_id: '',
    invoice_prefix: 'INV-',
    terms_and_conditions: '',
    notes: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'invoice_defaults' | 'preview'>('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/organizations/profile')
      const json = await res.json()
      if (json.success && json.data) {
        setProfile({
          name: json.data.name || '',
          legal_name: json.data.legal_name || '',
          trade_name: json.data.trade_name || '',
          logo_url: json.data.logo_url || '',
          business_type: json.data.business_type || '',
          gstin: json.data.gstin || '',
          pan: json.data.pan || '',
          state_code: json.data.state_code || '27',
          phone: json.data.phone || '',
          email: json.data.email || '',
          website: json.data.website || '',
          address_line1: json.data.address_line1 || '',
          address_line2: json.data.address_line2 || '',
          city: json.data.city || '',
          state: json.data.state || 'Maharashtra',
          pincode: json.data.pincode || '',
          country: json.data.country || 'India',
          bank_name: json.data.bank_name || '',
          bank_account_name: json.data.bank_account_name || '',
          bank_account_number: json.data.bank_account_number || '',
          bank_ifsc: json.data.bank_ifsc || '',
          bank_branch: json.data.bank_branch || '',
          upi_id: json.data.upi_id || '',
          invoice_prefix: json.data.invoice_prefix || 'INV-',
          terms_and_conditions:
            json.data.terms_and_conditions ||
            '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged on overdue payments.',
          notes: json.data.notes || 'Thank you for your valued business!',
        })
      }
    } catch (err) {
      console.error('Failed to load business profile:', err)
      toast.error('Failed to load business profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: keyof BusinessProfileFormState, value: string) => {
    setProfile((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-extract PAN from GSTIN if 15 chars (chars 3 to 12)
      if (field === 'gstin' && value.length >= 12) {
        const extractedPan = value.substring(2, 12).toUpperCase()
        if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan) && !prev.pan) {
          updated.pan = extractedPan
        }
        const stateCode = value.substring(0, 2)
        if (/^\d{2}$/.test(stateCode)) {
          updated.state_code = stateCode
        }
      }

      return updated
    })
  }

  // Handle Logo Upload (converts to Base64 data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image size must be under 2 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (base64) {
        setProfile((prev) => ({ ...prev, logo_url: base64 }))
        toast.success('Logo uploaded! Click "Save Changes" to apply to all bills.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setProfile((prev) => ({ ...prev, logo_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.info('Logo removed')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile.name.trim()) {
      toast.error('Business Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/organizations/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Business Profile & Billing details saved successfully!')
      } else {
        throw new Error(json.error || 'Failed to update profile')
      }
    } catch (err: any) {
      console.error('Error saving profile:', err)
      toast.error(err.message || 'Failed to save business profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
        Loading business profile settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Business Profile Settings</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage your company details, logo, GSTIN, registered address, bank details & UPI for customer bills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProfile}
            className="p-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-2xs"
            title="Reload Profile"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Profile Changes</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 p-1.5 bg-gray-100/80 rounded-2xl w-fit text-xs font-medium text-gray-600">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'profile' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-gray-900'
          }`}
        >
          <Building2 className="h-4 w-4" /> Business Info & Logo
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'bank' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-gray-900'
          }`}
        >
          <Landmark className="h-4 w-4" /> Bank Account & UPI
        </button>
        <button
          onClick={() => setActiveTab('invoice_defaults')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'invoice_defaults' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4" /> Bill & Invoice Defaults
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'preview' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-gray-900'
          }`}
        >
          <Eye className="h-4 w-4" /> Live Bill Preview
        </button>
      </div>

      {/* Main Content Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: BUSINESS IDENTITY & LOGO */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* BUSINESS LOGO CARD */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Business Logo (Prints on Invoices)</h3>
                  <p className="text-[11px] text-gray-500">
                    Upload your official company logo. This will automatically print on all GST invoices, bills, and PDF downloads.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                {/* Logo Preview Box */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                    {profile.logo_url ? (
                      <img
                        src={profile.logo_url}
                        alt="Business Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-400 font-medium">No Logo Uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload & Action Controls */}
                <div className="space-y-3 flex-1 text-xs">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload Business Logo
                    </button>

                    {profile.logo_url && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Logo
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Recommended format: <strong>PNG, SVG, or JPG</strong> (transparent background recommended, max 2MB).
                  </p>
                </div>
              </div>
            </div>

            {/* COMPANY IDENTIFICATION */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Company Identity & GST Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Business / Trade Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Industrial Systems"
                    value={profile.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Legal / Registered Entity Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Industrial Systems Pvt Ltd"
                    value={profile.legal_name}
                    onChange={(e) => handleFieldChange('legal_name', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Trade / Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Systems"
                    value={profile.trade_name}
                    onChange={(e) => handleFieldChange('trade_name', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    value={profile.gstin}
                    onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono uppercase text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company PAN (10 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AABCU9603R"
                    value={profile.pan}
                    onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono uppercase text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State GST Code (e.g. 27)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="27"
                    value={profile.state_code}
                    onChange={(e) => handleFieldChange('state_code', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono text-gray-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* BUSINESS TYPE SELECTOR */}
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Business Type / Industry</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select your industry category to tailor the experience to your business.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BUSINESS_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = profile.business_type === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleFieldChange('business_type', type.id)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all border ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/50 ring-1 ring-indigo-500/40'
                          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500/20' : type.bg} flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : type.color}`} />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {type.label}
                      </span>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-indigo-400 ml-auto flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {profile.business_type && (
                <p className="text-[11px] text-indigo-400 font-medium pt-1">
                  ✓ Selected: {BUSINESS_TYPES.find(t => t.id === profile.business_type)?.label}
                </p>
              )}
            </div>

            {/* CONTACT & REGISTERED ADDRESS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                Contact & Registered Address (Prints on Bills)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Business Phone / Mobile</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="+91 98220 12345"
                      value={profile.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Billing & Accounts Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="billing@acmesystems.in"
                      value={profile.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      placeholder="https://www.acmesystems.in"
                      value={profile.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 1 (Street / Premises)</label>
                  <input
                    type="text"
                    placeholder="Plot No. 108, Industrial Electronic Zone"
                    value={profile.address_line1}
                    onChange={(e) => handleFieldChange('address_line1', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 2 (Area / Landmark)</label>
                  <input
                    type="text"
                    placeholder="Hinjewadi Phase 1"
                    value={profile.address_line2}
                    onChange={(e) => handleFieldChange('address_line2', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Pune"
                    value={profile.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="Maharashtra"
                    value={profile.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    placeholder="411057"
                    value={profile.pincode}
                    onChange={(e) => handleFieldChange('pincode', e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono text-gray-900 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BANK ACCOUNT & UPI */}
        {activeTab === 'bank' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Bank Account & UPI Payment Details</h3>
                <p className="text-[11px] text-gray-500">
                  These payment details will be printed on all invoices so customers can pay directly via NEFT, RTGS, IMPS, or UPI.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank Ltd"
                  value={profile.bank_name}
                  onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Account Beneficiary Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Industrial Systems Pvt Ltd"
                  value={profile.bank_account_name}
                  onChange={(e) => handleFieldChange('bank_account_name', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 50200098765432"
                  value={profile.bank_account_number}
                  onChange={(e) => handleFieldChange('bank_account_number', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={profile.bank_ifsc}
                  onChange={(e) => handleFieldChange('bank_ifsc', e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono uppercase text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hinjewadi Phase 1, Pune"
                  value={profile.bank_branch}
                  onChange={(e) => handleFieldChange('bank_branch', e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  UPI ID (VPA for Instant QR & Mobile Pay)
                </label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  <input
                    type="text"
                    placeholder="e.g. acmesystems@okhdfcbank"
                    value={profile.upi_id}
                    onChange={(e) => handleFieldChange('upi_id', e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono text-gray-900 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVOICE DEFAULTS */}
        {activeTab === 'invoice_defaults' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Default Bill & Invoice Content</h3>
                <p className="text-[11px] text-gray-500">
                  Customize default terms, conditions, notes, and invoice numbering sequence.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  placeholder="INV-"
                  value={profile.invoice_prefix}
                  onChange={(e) => handleFieldChange('invoice_prefix', e.target.value)}
                  className="w-48 h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Terms & Conditions</label>
                <textarea
                  rows={4}
                  value={profile.terms_and_conditions}
                  onChange={(e) => handleFieldChange('terms_and_conditions', e.target.value)}
                  placeholder="Add default terms printed on every invoice..."
                  className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Customer Notes</label>
                <textarea
                  rows={4}
                  value={profile.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Add default notes printed on bills..."
                  className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE BILL PREVIEW */}
        {activeTab === 'preview' && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 max-w-3xl mx-auto font-sans">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-4">
                {profile.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Company Logo"
                    className="h-14 w-auto max-w-[120px] object-contain rounded-lg border border-gray-100 p-1 bg-white"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {profile.name.charAt(0) || 'B'}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-gray-900">{profile.name || 'Your Business Name'}</h2>
                  {profile.legal_name && <p className="text-xs text-gray-500">{profile.legal_name}</p>}
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {profile.address_line1}, {profile.city}, {profile.state} - {profile.pincode}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-0.5">
                    {profile.gstin && <span>GSTIN: <strong>{profile.gstin}</strong></span>}
                    {profile.pan && <span>PAN: <strong>{profile.pan}</strong></span>}
                    {profile.phone && <span>Tel: {profile.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <h1 className="text-lg font-black tracking-wider text-gray-900 uppercase">TAX INVOICE</h1>
                <p className="text-xs font-bold font-mono text-indigo-600 mt-0.5">{profile.invoice_prefix}2026-0001</p>
              </div>
            </div>

            {/* Bank Details Preview Box on Bill */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-gray-500 block mb-1">
                  Bank Details for Payment
                </span>
                <p className="font-semibold text-gray-900">Bank: {profile.bank_name || 'HDFC Bank Ltd'}</p>
                <p className="text-gray-700 font-mono">A/C: {profile.bank_account_number || '50200098765432'}</p>
                <p className="text-gray-700 font-mono">IFSC: {profile.bank_ifsc || 'HDFC0001234'}</p>
                <p className="text-gray-600">Branch: {profile.bank_branch || 'Hinjewadi, Pune'}</p>
              </div>

              {profile.upi_id && (
                <div className="sm:text-right">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 block mb-1">
                    Instant UPI Payment ID
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-mono font-bold rounded-lg border border-emerald-200 text-xs inline-block">
                    {profile.upi_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            href="/settings"
            className="px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Back to Settings
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Profile Settings</span>
          </button>
        </div>
      </form>
    </div>
  )
}
