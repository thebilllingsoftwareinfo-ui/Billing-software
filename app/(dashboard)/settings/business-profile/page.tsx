'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, Phone, Shield, Mail, Calendar, 
  FileText, Folder, Map, MapPin, CloudUpload, 
  Lightbulb, ShieldCheck, CheckCircle2, Building,
  Camera, Check, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessCategory } from '@/types/app.types'

import { BUSINESS_STRUCTURE, normalizeBusinessClassification } from '@/lib/validators/organization.schema'
import { INDIAN_STATES } from '@/lib/constants/indian-states'

interface BusinessProfileFormState {
  name: string
  phone: string
  gstin: string
  email: string
  account_books_date: string
  business_type: string
  business_category: string
  state: string
  pincode: string
  address: string
  logo_url: string
  signature_url: string
}

export default function BusinessProfileSettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<BusinessProfileFormState>({
    name: '',
    phone: '',
    gstin: '',
    email: '',
    account_books_date: new Date().toISOString().split('T')[0],
    business_type: '',
    business_category: '',
    state: '',
    pincode: '',
    address: '',
    logo_url: '',
    signature_url: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/organizations/profile')
      const json = await res.json()
      if (json.success && json.data) {
        const normalized = normalizeBusinessClassification(
          json.data.business_type,
          json.data.business_category
        )

        setProfile((prev) => ({
          ...prev,
          name: json.data.name || '',
          phone: json.data.phone || '',
          gstin: json.data.gstin || '',
          email: json.data.email || '',
          business_type: normalized.business_type,
          business_category: normalized.business_category,
          state: json.data.state || '',
          pincode: json.data.pincode || '',
          address: json.data.address_line1 || json.data.address || '',
          logo_url: json.data.logo_url || '',
          signature_url: json.data.signature_url || '',
        }))
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
      const next = { ...prev, [field]: value }
      if (field === 'business_type') {
        const allowedCats = BUSINESS_STRUCTURE[value] || []
        if (allowedCats.length > 0 && !allowedCats.includes(next.business_category)) {
          next.business_category = allowedCats[0] || ''
        }
      } else if (field === 'business_category') {
        // Auto-detect and sync matching business type if empty or mismatched
        const currentTypeCats = next.business_type ? BUSINESS_STRUCTURE[next.business_type] : []
        if (!currentTypeCats?.includes(value)) {
          for (const [t, cats] of Object.entries(BUSINESS_STRUCTURE)) {
            if (cats.includes(value)) {
              next.business_type = t
              break
            }
          }
        }
      }
      return next
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'signature_url') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to 1.5MB
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('File size must be under 1.5 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (base64) {
        setProfile((prev) => ({ ...prev, [field]: base64 }))
        toast.success(`${field === 'logo_url' ? 'Logo' : 'Signature'} uploaded successfully!`)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    // Canonical Field Validations
    if (!profile.name.trim()) {
      toast.error('Business Name is required')
      return
    }

    if (!profile.business_type.trim()) {
      toast.error('Business Type is required')
      return
    }

    if (!profile.business_category.trim()) {
      toast.error('Business Category is required')
      return
    }

    if (!profile.state.trim()) {
      toast.error('State is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...profile,
        address_line1: profile.address,
      }

      const res = await fetch('/api/organizations/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (json.success) {
        toast.success('Business Profile saved successfully!')
        router.refresh()
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

  const calculateCompletion = () => {
    const fieldsToCheck: (keyof BusinessProfileFormState)[] = [
      'name', 'phone', 'gstin', 'email', 'business_type', 'business_category', 'state', 'pincode', 'address', 'logo_url', 'signature_url'
    ];
    let filled = 0;
    fieldsToCheck.forEach(field => {
      if (profile[field] && String(profile[field]).trim() !== '') filled++;
    });
    return Math.round((filled / fieldsToCheck.length) * 100);
  }

  const completionPercentage = calculateCompletion();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm bg-[#f8fafc]">
        Loading business profile settings...
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Edit Profile</h1>
            <p className="text-[#64748b] text-sm mt-1">Update your business information and manage your profile</p>
          </div>
          <button className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-[#9333ea]" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[#1e293b]">Need Help?</div>
              <div className="text-xs text-[#64748b]">Watch video guide</div>
            </div>
          </button>
        </div>

        {/* Top Information Cards */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col lg:flex-row gap-8 lg:items-center">
          
          {/* Logo Section */}
          <div className="flex items-center gap-6 lg:w-1/3">
            <div 
              className="w-24 h-24 rounded-full border-2 border-dashed border-[#d8b4fe] bg-[#faf5ff] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              onClick={() => logoInputRef.current?.click()}
            >
              {profile.logo_url ? (
                <>
                  <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <Camera className="w-8 h-8 text-[#a855f7]" />
              )}
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1e293b]">Add Business Logo</h3>
              <p className="text-xs text-[#64748b] mt-1 mb-3">Recommended size:<br/>512 x 512px (PNG, JPG)</p>
              <button 
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-1.5 border border-[#a855f7] text-[#a855f7] text-xs font-medium rounded-lg hover:bg-[#faf5ff] transition-colors"
              >
                Upload Logo
              </button>
              <input type="file" ref={logoInputRef} onChange={(e) => handleFileUpload(e, 'logo_url')} accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="hidden lg:block w-px h-16 bg-gray-100"></div>

          {/* Stats Cards */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#f8fafc] rounded-xl p-4 flex items-start gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Building className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[#1e293b]">Complete Your Profile</h4>
                <p className="text-[11px] text-[#64748b] mt-0.5">Let&apos;s make your business profile 100% complete</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#6366f1] rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                  </div>
                  <span className="text-xs font-medium text-[#64748b]">{completionPercentage}%</span>
                </div>
              </div>
            </div>

            <div className="bg-[#f0fdf4] rounded-xl p-4 flex items-start gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1e293b]">Your Data is Safe</h4>
                <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">We use bank-level security to protect your information</p>
              </div>
            </div>

            <div className="bg-[#f0fdfa] rounded-xl p-4 flex items-start gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1e293b]">Profile Strength</h4>
                <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">Strong profile increases trust & credibility</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Area */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
            
            {/* Column 1 */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <h2 className="text-base font-bold text-[#1e293b]">Business Details</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Business Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow placeholder-gray-400"
                    placeholder="Wevly Technology"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow placeholder-gray-400"
                    placeholder="7360815930"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569] flex items-center gap-1">
                  GSTIN 
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 text-[9px] flex items-center justify-center text-gray-400">i</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profile.gstin}
                    onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow placeholder-gray-400 uppercase"
                    placeholder="Enter GSTIN"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Email ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow placeholder-gray-400"
                    placeholder="Enter Email ID"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Account Books Beginning Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={profile.account_books_date}
                    onChange={(e) => handleFieldChange('account_books_date', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <h2 className="text-base font-bold text-[#1e293b]">More Details</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Business Type</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    value={profile.business_type}
                    onChange={(e) => handleFieldChange('business_type', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow text-gray-600 appearance-none"
                  >
                    <option value="">Select Business Type</option>
                    {Object.keys(BUSINESS_STRUCTURE).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Business Category</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Folder className="w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    value={profile.business_category}
                    onChange={(e) => handleFieldChange('business_category', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow text-gray-700 appearance-none"
                  >
                    <option value="">Select Business Category</option>
                    {profile.business_type ? (
                      BUSINESS_STRUCTURE[profile.business_type]?.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))
                    ) : (
                      Object.entries(BUSINESS_STRUCTURE).map(([type, cats]) => (
                        <optgroup key={type} label={type}>
                          {cats.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">
                  State <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Map className="w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    value={profile.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow text-gray-700 appearance-none"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state.code} value={state.name}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Pincode</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={profile.pincode}
                    onChange={(e) => handleFieldChange('pincode', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow placeholder-gray-400"
                    placeholder="Enter Pincode"
                  />
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <h2 className="text-base font-bold text-[#1e293b]">Address & Signature</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Business Address</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                  <textarea
                    rows={4}
                    value={profile.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-shadow placeholder-gray-400 resize-none"
                    placeholder="Enter Business Address"
                  />
                </div>
                <div className="text-[11px] text-gray-400 text-right">{profile.address.length} / 250</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#475569]">Add Signature</label>
                <div 
                  onClick={() => signatureInputRef.current?.click()}
                  className="w-full h-32 border border-dashed border-[#cbd5e1] bg-[#f8fafc] rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#f1f5f9] transition-colors group"
                >
                  {profile.signature_url ? (
                    <img src={profile.signature_url} alt="Signature" className="h-full object-contain p-2" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 text-[#8b5cf6] group-hover:scale-105 transition-transform">
                        <CloudUpload className="w-5 h-5" />
                      </div>
                      <span className="text-[13px] font-medium text-[#334155]">Click to upload signature</span>
                      <span className="text-[11px] text-[#94a3b8] mt-1">PNG, JPG or JPEG (Max. 1.5MB)</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={(e) => handleFileUpload(e, 'signature_url')}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />
              </div>
            </div>

          </div>

          {/* Form Footer */}
          <div className="border-t border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#fcfcfd] rounded-b-2xl">
            <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
              <div className="w-6 h-6 rounded-full bg-[#f5f3ff] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8b5cf6]" />
              </div>
              Make sure all the information is correct before saving.
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-gray-200 text-[#475569] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#6366f1] text-white font-semibold text-[13px] rounded-xl hover:bg-[#4f46e5] transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  )
}
