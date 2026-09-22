'use client'

import { useState } from 'react'
import {
  Share2,
  Building2,
  Search,
  CheckCircle2,
  Send,
  Zap,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

export function VaniraNetworkView() {
  const [search, setSearch] = useState('')
  const [connectedCount, setConnectedCount] = useState(3)

  const sampleBusinesses = [
    {
      id: 'biz-1',
      name: 'Radhe Shyam Jewellers Pvt Ltd',
      gstin: '27AABCU9603R1ZN',
      city: 'Zaveri Bazaar, Mumbai',
      category: 'Jewellery & Gold',
      connected: true,
    },
    {
      id: 'biz-2',
      name: 'Gujarat Bullion Refineries',
      gstin: '24AAACR5501P1ZW',
      city: 'Ahmedabad, Gujarat',
      category: 'Bullion & Metals',
      connected: true,
    },
    {
      id: 'biz-3',
      name: 'Arihant Gems & Diamonds',
      gstin: '27AADCA1204K1ZU',
      city: 'Surat, Gujarat',
      category: 'Diamond Trading',
      connected: false,
    },
    {
      id: 'biz-4',
      name: 'Apex Industrial Logistics',
      gstin: '27AABCA4589B1ZQ',
      city: 'Thane, Maharashtra',
      category: 'Wholesale & Logistics',
      connected: true,
    },
  ]

  const handleToggleConnect = (id: string, name: string, current: boolean) => {
    if (current) {
      toast.info(`Disconnected from ${name}`)
      setConnectedCount((c) => Math.max(0, c - 1))
    } else {
      toast.success(`Connected with ${name}! E-invoices will now auto-sync.`)
      setConnectedCount((c) => c + 1)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span>VANIRA B2B Network</span>
          </h2>
          <p className="text-xs text-gray-500">
            Direct party network. Connect with suppliers & customers to auto-sync invoices without manual entry.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{connectedCount} Active Network Peers</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses by GSTIN, Trade Name, or City..."
          className="w-full h-10 pl-9 pr-4 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:border-red-500 outline-none shadow-2xs"
        />
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleBusinesses.map((biz) => (
          <div
            key={biz.id}
            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-xs truncate">{biz.name}</span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold flex-shrink-0">
                  {biz.category}
                </span>
              </div>
              <p className="text-[11px] font-mono text-gray-500">{biz.gstin}</p>
              <p className="text-[10px] text-gray-400">{biz.city}</p>
            </div>

            <button
              onClick={() => handleToggleConnect(biz.id, biz.name, biz.connected)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                biz.connected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {biz.connected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Linked</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Connect</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
