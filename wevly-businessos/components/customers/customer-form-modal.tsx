'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, X, Users, MapPin, Building2, CreditCard } from 'lucide-react'
import { customerSchema, CustomerFormInput, CustomerFormValues } from '@/lib/validators/customer.schema'

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

interface CustomerFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: any
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CustomerFormModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'financial'>('basic')
  const isEditing = Boolean(initialData?.id)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomerFormInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      display_name: '',
      customer_type: 'business',
      credit_limit: 0,
      opening_balance: 0,
      credit_period_days: 30,
    },
  })

  useEffect(() => {
    if (initialData) {
      const billing = initialData.customer_addresses?.find((a: any) => a.address_type === 'billing')
      const shipping = initialData.customer_addresses?.find((a: any) => a.address_type === 'shipping')

      reset({
        display_name: initialData.display_name || '',
        legal_name: initialData.legal_name || '',
        customer_type: initialData.customer_type || 'business',
        email: initialData.email || '',
        phone: initialData.phone || '',
        mobile: initialData.mobile || '',
        gstin: initialData.gstin || '',
        pan: initialData.pan || '',
        place_of_supply: initialData.place_of_supply || '',
        credit_limit: Number(initialData.credit_limit) || 0,
        opening_balance: Number(initialData.outstanding_balance) || 0,
        notes: initialData.notes || '',
        billing_address: billing ? {
          line1: billing.line1 || '',
          line2: billing.line2 || '',
          city: billing.city || '',
          state: billing.state || '',
          pincode: billing.pincode || '',
          country: billing.country || 'India',
        } : undefined,
        shipping_address: shipping ? {
          line1: shipping.line1 || '',
          line2: shipping.line2 || '',
          city: shipping.city || '',
          state: shipping.state || '',
          pincode: shipping.pincode || '',
          country: shipping.country || 'India',
        } : undefined,
      })
    } else {
      reset({
        display_name: '',
        customer_type: 'business',
        credit_limit: 0,
        opening_balance: 0,
        credit_period_days: 30,
      })
    }
  }, [initialData, reset])

  if (!isOpen) return null

  const onSubmit = async (values: CustomerFormInput) => {
    setIsLoading(true)
    try {
      const url = isEditing ? `/api/customers/${initialData.id}` : '/api/customers'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to save customer.')
        return
      }

      toast.success(isEditing ? 'Customer updated successfully' : 'Customer created successfully')
      onSuccess()
      onClose()
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p className="text-xs text-gray-500">Create client profile for invoicing & tracking ledger balances.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-white gap-6 text-xs font-semibold text-gray-500">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'basic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            <Building2 className="h-4 w-4" /> Basic Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'address'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            <MapPin className="h-4 w-4" /> Addresses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent hover:text-gray-800'
            }`}
          >
            <CreditCard className="h-4 w-4" /> Credit & Balances
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5" noValidate>
          {/* Tab 1: Basic Details */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Customer Name / Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Infosys Tech Solutions"
                    {...register('display_name')}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.display_name && <p className="text-xs text-red-500">{errors.display_name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Legal Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Infosys Technologies Private Limited"
                    {...register('legal_name')}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Customer Type</label>
                  <select
                    {...register('customer_type')}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="business">Business (B2B)</option>
                    <option value="individual">Individual (B2C)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    {...register('phone')}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="billing@infosys.com"
                    {...register('email')}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AABCU9603R1ZM"
                    maxLength={15}
                    {...register('gstin', {
                      setValueAs: (v: string) => v?.toUpperCase() ?? '',
                    })}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.gstin && <p className="text-xs text-red-500">{errors.gstin.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">PAN Number</label>
                  <input
                    type="text"
                    placeholder="AABCU9603R"
                    maxLength={10}
                    {...register('pan', {
                      setValueAs: (v: string) => v?.toUpperCase() ?? '',
                    })}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.pan && <p className="text-xs text-red-500">{errors.pan.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Addresses */}
          {activeTab === 'address' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Billing Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Address Line 1"
                      {...register('billing_address.line1')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      {...register('billing_address.city')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <select
                      {...register('billing_address.state')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="PIN Code (6 digits)"
                      maxLength={6}
                      {...register('billing_address.pincode')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Shipping Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Shipping Address Line 1"
                      {...register('shipping_address.line1')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Shipping City"
                      {...register('shipping_address.city')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <select
                      {...register('shipping_address.state')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Shipping State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Shipping PIN Code"
                      maxLength={6}
                      {...register('shipping_address.pincode')}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Financial & Notes */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isEditing}
                    placeholder="0.00"
                    {...register('opening_balance', { valueAsNumber: true })}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-gray-400">Positive = customer owes money.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Credit Limit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="50000.00"
                    {...register('credit_limit', { valueAsNumber: true })}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-gray-400">Max credit allowed before warning on new bills.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Notes & Special Terms</label>
                <textarea
                  rows={3}
                  placeholder="Payment terms, special notes, preferred shipping method..."
                  {...register('notes')}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
