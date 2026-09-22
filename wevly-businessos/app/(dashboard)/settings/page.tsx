'use client'

import Link from 'next/link'
import {
  Building2,
  FileText,
  Landmark,
  Settings,
  ShieldCheck,
  Upload,
  QrCode,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Organization & Business Settings</h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure your business profile, upload logo for bills, set up bank & UPI details, and invoice preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Business Profile Settings */}
        <Link
          href="/settings/business-profile"
          className="group bg-white border border-gray-200 hover:border-indigo-500 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg uppercase">
                Primary
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
              Business Profile & Logo
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Set business name, official logo for bills, GSTIN, PAN, registered office address, and contact numbers.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
            <span>Manage Profile & Logo</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 2. Bank Accounts & UPI */}
        <Link
          href="/settings/business-profile"
          className="group bg-white border border-gray-200 hover:border-indigo-500 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform">
                <Landmark className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg uppercase">
                Payments
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
              Bank Accounts & UPI ID
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Configure beneficiary bank account, IFSC code, and UPI VPA printed on invoices for direct customer payments.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>Configure Bank & UPI</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 3. Invoice Defaults */}
        <Link
          href="/settings/business-profile"
          className="group bg-white border border-gray-200 hover:border-indigo-500 rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-105 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg uppercase">
                Templates
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
              Bill & Invoice Defaults
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Customize invoice numbering prefixes, standard terms and conditions, and default customer thank-you notes.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-purple-600">
            <span>Edit Invoice Defaults</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
