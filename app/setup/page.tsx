'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Building2, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, FileText, Receipt, Tag } from 'lucide-react'
import { organizationSetupSchema, BUSINESS_STRUCTURE } from '@/lib/validators/organization.schema'
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
    clearErrors,
    formState: { errors },
  } = useForm<OrganizationSetupFormValues>({
    resolver: zodResolver(organizationSetupSchema),
    mode: 'onChange',
    defaultValues: {
      business_type: '',
      business_category: '',
      name: '',
      invoice_prefix: 'INV',
      financial_year_start: '04-01',
    },
  })

  const selectedType = watch('business_type')
  const selectedCategory = watch('business_category')
  const gstin = watch('gstin', '')

  const handleNextStep = async () => {
    let isValid = false
    if (currentStep === 1) {
      isValid = await trigger(['business_type', 'business_category'])
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
      router.push('/dashboard?first_login=true')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center py-4 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center gap-2 mb-0.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-600/90 border border-indigo-400/30 flex items-center justify-center shadow-sm">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Onboard Your Business</h1>
          </div>
          <p className="text-xs text-indigo-200/70">
            Step {currentStep} of 5 — Setup your workspace in less than 2 minutes
          </p>
        </div>

        {/* Multi-step progress indicator */}
        <div className="flex items-center justify-between mb-3 px-2">
          {STEPS.map((s) => {
            const Icon = s.icon
            const isCompleted = currentStep > s.step
            const isCurrent = currentStep === s.step
            return (
              <div key={s.step} className="flex flex-col items-center gap-0.5 flex-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3 w-3" />}
                </div>
                <span
                  className={`text-[10px] font-medium ${
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
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl p-4 sm:p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>

            {/* ── Step 1: Business Category ── */}
            {currentStep === 1 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">1. What kind of business do you run?</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    We'll personalise your dashboard with metrics and tools that matter most to your business.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Business Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      {...register('business_type')}
                      onChange={(e) => {
                        const val = e.target.value
                        setValue('business_type', val, { shouldValidate: true })
                        setValue('business_category', '', { shouldValidate: false })
                        clearErrors('business_category')
                      }}
                      className={`w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl border bg-slate-950 text-white placeholder:text-slate-500
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          errors.business_type ? 'border-red-500' : 'border-slate-800'
                        }`}
                    >
                      <option value="">Select Business Type</option>
                      {Object.keys(BUSINESS_STRUCTURE).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.business_type && <p className="text-xs text-red-400">{errors.business_type.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Business Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      {...register('business_category')}
                      onChange={(e) => {
                        const val = e.target.value
                        setValue('business_category', val, { shouldValidate: true })
                        if (val) {
                          clearErrors('business_category')
                        }
                      }}
                      className={`w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl border bg-slate-950 text-white placeholder:text-slate-500
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          errors.business_category ? 'border-red-500' : 'border-slate-800'
                        }`}
                      disabled={!selectedType}
                    >
                      <option value="">Select Business Category</option>
                      {selectedType && BUSINESS_STRUCTURE[selectedType]?.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.business_category && <p className="text-xs text-red-400">{errors.business_category.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Business Name ── */}
            {currentStep === 2 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">2. Create Business</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Enter your business identity details.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-300">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoFocus
                    placeholder="Apex Traders & Electronics"
                    {...register('name')}
                    className={`w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl border bg-slate-950 text-white placeholder:text-slate-500
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
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">3. Business Location</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Select your registered Indian state for tax compliance.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="state_code" className="block text-xs font-semibold text-slate-300">
                    State / Union Territory <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="state_code"
                    {...register('state_code')}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-800 bg-slate-950 text-white
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
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">4. GST & Tax Setup</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Configure optional GSTIN for auto-calculating tax.</p>
                </div>
                <div className="space-y-1.5">
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
                    className="w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-800 bg-slate-950 text-white font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.gstin ? (
                    <p className="text-xs text-red-400">{errors.gstin.message}</p>
                  ) : gstin && gstin.length === 15 ? (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valid 15-digit GSTIN format
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
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
                    className="w-full h-10 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-800 bg-slate-950 text-white font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.pan && <p className="text-xs text-red-400">{errors.pan.message}</p>}
                </div>
              </div>
            )}

            {/* ── Step 5: Invoice Configuration ── */}
            {currentStep === 5 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="border-b border-slate-800 pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">5. Invoice Configuration</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Set up custom invoice prefixes and parameters.</p>
                </div>
                <div className="space-y-1.5">
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
                      className="w-32 h-10 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-800 bg-slate-950 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="h-11 px-5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold transition-colors flex items-center gap-1.5"
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
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save & Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
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
