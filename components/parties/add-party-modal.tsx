'use client'

import React, { useState } from 'react'
import {
  X,
  Settings,
  Info,
  ChevronDown,
  Eye,
  Plus,
} from 'lucide-react'

export interface PartyData {
  id?: string
  name: string
  partyType: 'customer' | 'supplier'
  phone: string
  gstin?: string
  email?: string
  gstType?: string
  state?: string
  billingAddress?: string
  shippingAddress?: string
  enableShipping?: boolean
  openingBalance?: number
  balanceType?: 'receive' | 'pay'
  asOfDate?: string
  creditLimit?: number
  creditPeriodDays?: number
  customField1?: string
  customField2?: string
  notes?: string
}

interface AddPartyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (party: PartyData, saveAndNew?: boolean) => void
  initialData?: PartyData | null
}

const INDIAN_STATES = [
  'Maharashtra',
  'Delhi',
  'Gujarat',
  'Karnataka',
  'Tamil Nadu',
  'Uttar Pradesh',
  'Rajasthan',
  'West Bengal',
  'Haryana',
  'Punjab',
  'Madhya Pradesh',
  'Kerala',
  'Telangana',
  'Andhra Pradesh',
  'Bihar',
  'Assam',
  'Goa',
]

export function AddPartyModal({ isOpen, onClose, onSave, initialData }: AddPartyModalProps) {
  const [activeTab, setActiveTab] = useState<'gst_address' | 'credit_balance' | 'additional'>('gst_address')

  const [partyName, setPartyName] = useState(initialData?.name || '')
  const [gstin, setGstin] = useState(initialData?.gstin || '')
  const [phone, setPhone] = useState(initialData?.phone || '')

  const [gstType, setGstType] = useState(initialData?.gstType || 'Unregistered/Consumer')
  const [state, setState] = useState(initialData?.state || 'Maharashtra')
  const [email, setEmail] = useState(initialData?.email || '')
  const [billingAddress, setBillingAddress] = useState(initialData?.billingAddress || '')
  const [showDetailedAddress, setShowDetailedAddress] = useState(false)
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')

  const [enableShipping, setEnableShipping] = useState(initialData?.enableShipping || false)
  const [shippingAddress, setShippingAddress] = useState(initialData?.shippingAddress || '')

  const [openingBalance, setOpeningBalance] = useState<number | ''>(
    initialData?.openingBalance !== undefined ? initialData.openingBalance : ''
  )
  const [balanceType, setBalanceType] = useState<'receive' | 'pay'>(initialData?.balanceType || 'receive')
  const [asOfDate, setAsOfDate] = useState(
    initialData?.asOfDate || new Date().toISOString().split('T')[0]
  )
  const [creditLimit, setCreditLimit] = useState<number | ''>(
    initialData?.creditLimit !== undefined ? initialData.creditLimit : ''
  )
  const [creditPeriodDays, setCreditPeriodDays] = useState<number | ''>(
    initialData?.creditPeriodDays !== undefined ? initialData.creditPeriodDays : ''
  )

  const [customField1, setCustomField1] = useState(initialData?.customField1 || '')
  const [customField2, setCustomField2] = useState(initialData?.customField2 || '')
  const [notes, setNotes] = useState(initialData?.notes || '')

  if (!isOpen) return null

  const handleSaveInternal = (saveAndNew = false) => {
    if (!partyName.trim()) {
      alert('Please enter Party Name')
      return
    }

    const compiledBillingAddress = showDetailedAddress && (streetAddress || city || pincode)
      ? `${billingAddress ? billingAddress + ', ' : ''}${streetAddress} ${city} ${pincode}`.trim()
      : billingAddress

    const newParty: PartyData = {
      id: initialData?.id || `party-${Date.now()}`,
      name: partyName.trim(),
      partyType: 'customer',
      phone: phone.trim(),
      gstin: gstin.trim().toUpperCase(),
      email: email.trim(),
      gstType,
      state,
      billingAddress: compiledBillingAddress,
      shippingAddress: enableShipping ? shippingAddress : compiledBillingAddress,
      enableShipping,
      openingBalance: openingBalance === '' ? 0 : Number(openingBalance),
      balanceType,
      asOfDate,
      creditLimit: creditLimit === '' ? undefined : Number(creditLimit),
      creditPeriodDays: creditPeriodDays === '' ? undefined : Number(creditPeriodDays),
      customField1,
      customField2,
      notes,
    }

    onSave(newParty, saveAndNew)

    if (saveAndNew) {
      setPartyName('')
      setGstin('')
      setPhone('')
      setEmail('')
      setBillingAddress('')
      setOpeningBalance('')
      setActiveTab('gst_address')
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden flex flex-col my-auto select-none">
        
        {/* Header Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800 tracking-tight">
            {initialData ? 'Edit Party' : 'Add Party'}
          </h2>
          <div className="flex items-center gap-3 text-gray-500">
            <button
              type="button"
              className="p-1 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100 cursor-pointer"
              title="Party Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100 cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top 3 Input Fields Row */}
        <div className="p-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Party Name *"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              autoFocus
              className="w-full h-10 px-3.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="GSTIN"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="w-full h-10 pl-3.5 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-help" title="Enter 15-digit GSTIN">
              <Info className="h-4 w-4" />
            </div>
          </div>

          <div>
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              className="w-full h-10 px-3.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-gray-200 flex items-center gap-8 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('gst_address')}
            className={`pb-3 relative cursor-pointer transition-colors ${
              activeTab === 'gst_address'
                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            GST & Address
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credit_balance')}
            className={`pb-3 relative cursor-pointer flex items-center gap-1.5 transition-colors ${
              activeTab === 'credit_balance'
                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Credit & Balance</span>
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded tracking-wider uppercase">
              New
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('additional')}
            className={`pb-3 relative cursor-pointer transition-colors ${
              activeTab === 'additional'
                ? 'text-blue-600 font-bold border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Additional Fields
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 min-h-[260px]">
          {activeTab === 'gst_address' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="space-y-4">
                <div className="relative border border-gray-300 rounded-lg px-3 pt-2 pb-1.5 focus-within:border-blue-500 bg-white">
                  <span className="text-[10px] text-gray-500 block font-semibold leading-tight">GST Type</span>
                  <div className="flex items-center justify-between">
                    <select
                      value={gstType}
                      onChange={(e) => setGstType(e.target.value)}
                      className="w-full bg-transparent text-xs text-gray-800 font-medium appearance-none focus:outline-none cursor-pointer pr-4"
                    >
                      <option value="Unregistered/Consumer">Unregistered/Consumer</option>
                      <option value="Registered Regular">Registered - Regular</option>
                      <option value="Registered Composite">Registered - Composition</option>
                      <option value="Consumer">Consumer</option>
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 pointer-events-none -ml-3" />
                  </div>
                </div>

                <div className="relative border border-gray-300 rounded-lg px-3 pt-2 pb-1.5 focus-within:border-blue-500 bg-white">
                  <span className="text-[10px] text-gray-500 block font-semibold leading-tight">State</span>
                  <div className="flex items-center justify-between">
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-transparent text-xs text-gray-800 font-medium appearance-none focus:outline-none cursor-pointer pr-4"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 pointer-events-none -ml-3" />
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg px-3 pt-2 pb-1.5 focus-within:border-blue-500 bg-white">
                  <span className="text-[10px] text-gray-500 block font-semibold leading-tight">Email ID</span>
                  <input
                    type="email"
                    placeholder="name@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Billing Address</label>
                <textarea
                  rows={3}
                  placeholder="Billing Address"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                />

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowDetailedAddress(!showDetailedAddress)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{showDetailedAddress ? 'Hide Detailed Address' : 'Show Detailed Address'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Shipping Address</label>
                {!enableShipping ? (
                  <button
                    type="button"
                    onClick={() => setEnableShipping(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Enable Shipping Address</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      placeholder="Enter Delivery / Shipping Address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'credit_balance' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs animate-in fade-in duration-150">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Opening Balance</label>
                <div className="flex items-center">
                  <span className="h-9 px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg flex items-center text-xs font-bold text-gray-600">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-9 px-3 bg-white border border-gray-300 rounded-r-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Credit Limit (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Credit Period (Days)</label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'additional' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs animate-in fade-in duration-150">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Salesperson / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customField1}
                  onChange={(e) => setCustomField1(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">PAN / Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={customField2}
                  onChange={(e) => setCustomField2(e.target.value.toUpperCase())}
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Internal Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any special terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleSaveInternal(true)}
            className="h-9 px-5 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => handleSaveInternal(false)}
            className="h-9 px-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  )
}
