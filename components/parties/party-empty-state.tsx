'use client'

import { Plus, Users, ArrowRight } from 'lucide-react'

interface PartyEmptyStateProps {
  onAddParty: () => void
  onViewSampleData?: () => void
}

export function PartyEmptyState({ onAddParty, onViewSampleData }: PartyEmptyStateProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 space-y-6">
      {/* Mascot / Window Illustration matching Screenshot 4 */}
      <div className="relative mx-auto w-64 h-48 flex items-center justify-center">
        {/* Yellow Window Mockup */}
        <div className="w-56 h-36 bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center gap-1.5 border-b border-amber-200 pb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-24 h-2 bg-amber-200 rounded-full ml-2" />
          </div>

          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-900">
                👤
              </div>
              <div className="w-32 h-2.5 bg-amber-200 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-900">
                👤
              </div>
              <div className="w-24 h-2.5 bg-amber-200 rounded-full" />
            </div>
          </div>

          <div className="h-2 w-full bg-amber-200 rounded-full" />
        </div>

        {/* Mascot Circular Badge with Plus Icon */}
        <div className="absolute right-0 bottom-2 w-20 h-20 rounded-full bg-amber-400 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
          <div className="text-3xl">🧑‍💼</div>
        </div>
        <div className="absolute right-14 bottom-1 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
          +
        </div>
      </div>

      {/* Headings matching Screenshot 4 */}
      <div className="space-y-2 max-w-lg mx-auto">
        <h3 className="text-2xl font-bold text-gray-900">Party Details</h3>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">
          Add your customers and suppliers to manage your business easily. Track payments and grow your business without any hassle!
        </p>
      </div>

      {/* Action Button: Red Pill Button matching Screenshot 4 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onAddParty}
          className="px-6 py-3 bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold text-xs rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Your First Party</span>
        </button>

        {onViewSampleData && (
          <button
            type="button"
            onClick={onViewSampleData}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Active Ledger</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
