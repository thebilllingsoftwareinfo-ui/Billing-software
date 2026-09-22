'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Phone, Globe, Minus, Square, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function TopWindowBar() {
  const router = useRouter()
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)

  const handleRefresh = () => {
    toast.info('Reloading data from VANIRA Cloud...')
    window.location.reload()
  }

  return (
    <>
      <div className="h-7 bg-[#0f121d] text-slate-300 text-[11px] px-3 flex items-center justify-between border-b border-slate-800/80 select-none z-30 flex-shrink-0">
        {/* Left: App Logo & Menus */}
        <div className="flex items-center gap-3">
          {/* Vyapar Red 'V' Emblem */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
            <div className="w-4 h-4 rounded bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-[10px] font-black text-white shadow-xs">
              V
            </div>
            <span className="font-bold text-white tracking-wide text-[11px]">VANIRA</span>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <button
              onClick={() => router.push('/settings')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Company
            </button>
            <button
              onClick={() => setSupportModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Help
            </button>
            <span className="text-slate-500 cursor-default">Versions</span>
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Shortcuts
            </button>
            <button
              onClick={handleRefresh}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Refresh Application"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Center: Vyapar Customer Helpline Contacts */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-300">
          <span className="text-slate-400">Customer Support :</span>
          <a
            href="tel:+917795687633"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            <Phone className="h-3 w-3" />
            <span>+91 77956 87633</span>
          </a>
          <span className="text-slate-600">,</span>
          <a
            href="tel:+916364444752"
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            +91 63644 44752
          </a>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => {
              window.open('https://wa.me/917795687633?text=Hi%20VANIRA%20Support%2C%20I%20need%20assistance', '_blank')
            }}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline transition-colors cursor-pointer"
          >
            <Globe className="h-3 w-3" />
            <span>Get Instant Online Support</span>
          </button>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toast.info('Window minimized')}
            className="h-6 w-7 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen()
              } else {
                document.documentElement.requestFullscreen().catch(() => {})
              }
            }}
            className="h-6 w-7 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title="Maximize / Fullscreen"
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={() => toast.info('Close application')}
            className="h-6 w-7 flex items-center justify-center hover:bg-red-600 text-slate-400 hover:text-white rounded transition-colors"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181c2e] border border-slate-700 text-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                VANIRA Desktop Shortcuts
              </h3>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Open Anything (Global Search)</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono">
                  Ctrl + F
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Add Sale Invoice</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-red-400 font-mono">
                  F2
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Add Purchase Bill</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-blue-400 font-mono">
                  F3
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Quick POS Counter</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-emerald-400 font-mono">
                  F4
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Payment In</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-400 font-mono">
                  Ctrl + I
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-300">Payment Out</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-orange-400 font-mono">
                  Ctrl + O
                </kbd>
              </div>
            </div>
            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Customer Support Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181c2e] border border-slate-700 text-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-red-500" />
                VANIRA Customer Helpline & Support
              </h3>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Dedicated business support available 9 AM to 8 PM (Monday to Saturday):
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone Support 1:</span>
                  <a href="tel:+917795687633" className="font-bold text-blue-400 hover:underline">
                    +91 77956 87633
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone Support 2:</span>
                  <a href="tel:+916364444752" className="font-bold text-blue-400 hover:underline">
                    +91 63644 44752
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">WhatsApp Desk:</span>
                  <span className="font-bold text-emerald-400">Available 24x7</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.open('https://wa.me/917795687633?text=Hi%20VANIRA%20Support%2C%20I%20need%20help', '_blank')
                  setSupportModalOpen(false)
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Chat on WhatsApp
              </button>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
