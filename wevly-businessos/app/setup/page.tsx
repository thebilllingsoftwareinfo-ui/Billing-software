'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Building2, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, FileText, Receipt, Tag } from 'lucide-react'
import { organizationSetupSchema, BUSINESS_CATEGORIES } from '@/lib/validators/organization.schema'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

type OrganizationSetupFormValues = z.input<typeof organizationSetupSchema>

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli / Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
]

export default function SetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<OrganizationSetupFormValues>({
    resolver: zodResolver(organizationSetupSchema),
    defaultValues: {
      business_category: undefined,
      name: '',
      invoice_prefix: 'INV',
      financial_year_start: '04-01',
    },
  })

  const selectedCategory = watch('business_category')
  const gstin = watch('gstin', '')

  const handleNextStep = async () => {
    let isValid = false
    if (currentStep === 1) {
      isValid = await trigger(['business_category'])
    } else if (currentStep === 2) {
      isValid = await trigger(['name'])
    } else if (currentStep === 3) {
      isValid = await trigger(['state_code'])
    } else if (currentStep === 4) {
      isValid = await trigger(['gstin', 'pan'])
    } else {
      isValid = true
    }

    if (isValid && currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5)
    }
  }

  const onSubmit = async (values: OrganizationSetupFormValues) => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Session expired. Please sign in again.')
        router.push('/login')
        return
      }

      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create organization.')
        return
      }

      toast.success('Business setup complete! Welcome to Wevly.')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const STEPS = [
    { step: 1, label: 'Category', icon: Tag },
    { step: 2, label: 'Business', icon: Building2 },
    { step: 3, label: 'Location', icon: ShieldCheck },
    { step: 4, label: 'GST / Tax', icon: Receipt },
    { step: 5, label: 'Invoicing', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600/90 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Onboard Your Business</h1>
          <p className="text-sm text-indigo-200/70 mt-2">
            Step {currentStep} of 5 — Setup your workspace in less than 2 minutes
          </p>
        </div>

        {/* Multi-step progress indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s) => {
            const Icon = s.icon
            const isCompleted = currentStep > s.step
            const isCurrent = currentStep === s.step
            return (
              <div key={s.step} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isCurrent ? 'text-indigo-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

            {/* ── Step 1: Business Category ── */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white">1. What kind of business do you run?</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    We'll personalise your dashboard with metrics and tools that matter most to your business.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BUSINESS_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.value
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setValue('business_category', cat.value as OrganizationSetupFormValues['business_category'], { shouldValidate: true })}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all cursor-pointer group ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600/20 shadow-lg shadow-indigo-500/10'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">{cat.description}</span>
                      </button>
                    )
                  })}
                </div>

                {errors.business_category && (
                  <p className="text-xs text-red-400">{errors.business_category.message}</p>
                )}

                {selectedCategory && (
                  <div className="flex items-center gap-2 bg-indigo-950/50 border border-indigo-800/50 rounded-xl px-4 py-2.5 text-xs text-indigo-300">
                    <span className="text-base">{BUSINESS_CATEGORIES.find(c => c.value === selectedCategory)?.emoji}</span>
                    <span>
                      <strong>{BUSINESS_CATEGORIES.find(c => c.value === selectedCategory)?.label}</strong> selected —
                      your dashboard will be customised for this business type.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Business Name ── */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white">2. Create Business</h2>
                  <p className="text-xs text-slate-400">Enter your business identity details.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-300">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoFocus
                    placeholder="Apex Traders & Electronics"
                    {...register('name')}
                    className={`w-full h-11 px-4 text-sm rounded-xl border bg-slate-950 text-white placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.name ? 'border-red-500' : 'border-slate-800'
                      }`}
                  />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                </div>
              </div>
            )}

            {/* ── Step 3: Business Location ── */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white">3. Business Location</h2>
                  <p className="text-xs text-slate-400">Select your registered Indian state for tax compliance.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="state_code" className="block text-xs font-semibold text-slate-300">
                    State / Union Territory <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="state_code"
                    {...register('state_code')}
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-800 bg-slate-950 text-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.state_code && <p className="text-xs text-red-400">{errors.state_code.message}</p>}
                </div>
              </div>
            )}

            {/* ── Step 4: GST Configuration ── */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white">4. GST & Tax Setup</h2>
                  <p className="text-xs text-slate-400">Configure optional GSTIN for auto-calculating tax.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="gstin" className="block text-xs font-semibold text-slate-300">
                    GSTIN <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="gstin"
                    type="text"
                    placeholder="27AAACA12341Z5"
                    maxLength={15}
                    {...register('gstin', {
                      setValueAs: (v: string) => v?.toUpperCase() ?? '',
                    })}
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-800 bg-slate-950 text-white font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.gstin ? (
                    <p className="text-xs text-red-400">{errors.gstin.message}</p>
                  ) : gstin && gstin.length === 15 ? (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valid 15-digit GSTIN format
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="pan" className="block text-xs font-semibold text-slate-300">
                    PAN Number <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="pan"
                    type="text"
                    placeholder="AAACA1234F"
                    maxLength={10}
                    {...register('pan', {
                      setValueAs: (v: string) => v?.toUpperCase() ?? '',
                    })}
                    className="w-full h-11 px-4 text-sm rounded-xl border border-slate-800 bg-slate-950 text-white font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.pan && <p className="text-xs text-red-400">{errors.pan.message}</p>}
                </div>
              </div>
            )}

            {/* ── Step 5: Invoice Configuration ── */}
            {currentStep === 5 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white">5. Invoice Configuration</h2>
                  <p className="text-xs text-slate-400">Set up custom invoice prefixes and parameters.</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="invoice_prefix" className="block text-xs font-semibold text-slate-300">
                    Invoice Number Prefix
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="invoice_prefix"
                      type="text"
                      placeholder="INV"
                      maxLength={10}
                      {...register('invoice_prefix', {
                        setValueAs: (v: string) => v?.toUpperCase() ?? '',
                      })}
                      className="w-32 h-11 px-4 text-sm rounded-xl border border-slate-800 bg-slate-950 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400">
                      Format preview: <strong className="text-indigo-400 font-mono">INV-0001</strong>
                    </span>
                  </div>
                  {errors.invoice_prefix && <p className="text-xs text-red-400">{errors.invoice_prefix.message}</p>}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="h-10 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Completing...
                    </>
                  ) : (
                    <>
                      Finish Onboarding <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
