'use client'

import { useState } from 'react'
import {
  MessageCircle,
  QrCode,
  Smartphone,
  CheckCircle2,
  Send,
  Paperclip,
  Check,
  RefreshCw,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'

export function WhatsAppConnectView() {
  const [agreedTerms, setAgreedTerms] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  const handleSimulateLink = () => {
    if (!agreedTerms) {
      toast.error('Please accept standard usage terms to continue')
      return
    }
    setIsLinking(true)
    setTimeout(() => {
      setIsLinking(false)
      setIsConnected(true)
      toast.success('🎉 WhatsApp Connected Successfully! You can now send invoices directly to customer WhatsApp.')
    }, 1500)
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Heading with YouTube Guide matching Screenshot 5 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>WhatsApp Connect</span>
        </h2>

        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noreferrer"
          className="text-red-600 hover:text-red-700 flex items-center gap-1 text-xs font-semibold"
          title="Watch Tutorial Video"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden p-6 sm:p-8">
        {/* Left Side: WhatsApp as Usual Phone Mockup */}
        <div className="md:col-span-6 flex flex-col items-center justify-between space-y-6 border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
          {/* Chat Mockup Container */}
          <div className="w-full max-w-sm bg-slate-50 border border-gray-200 rounded-2xl p-3 shadow-inner space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                💬
              </div>
              <div>
                <p className="font-bold text-gray-800 text-[11px] leading-tight">Sunil Enterprises</p>
                <p className="text-[9px] text-emerald-600 font-medium">Online</p>
              </div>
            </div>

            {/* Chat Bubble 1: Incoming message */}
            <div className="bg-white p-2.5 rounded-xl rounded-tl-xs shadow-2xs border border-gray-100 max-w-[85%] space-y-1">
              <p className="text-xs text-gray-800">Hi, Can you send me my last invoice?</p>
              <span className="text-[9px] text-gray-400 block text-right">10:14 AM</span>
            </div>

            {/* Chat Bubble 2: Outgoing invoice attachment */}
            <div className="ml-auto bg-emerald-100/70 p-2.5 rounded-xl rounded-tr-xs shadow-2xs border border-emerald-200 max-w-[90%] space-y-2">
              <p className="text-xs text-emerald-950 font-medium">
                Here is your requested GST Tax Invoice:
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-emerald-300 text-[10px] font-bold text-emerald-900">
                  <span className="text-red-500 font-mono">PDF</span>
                  <span className="truncate">Invoice_2026_01.pdf (₹1,000.00)</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-emerald-300 text-[10px] font-bold text-emerald-900">
                  <span className="text-red-500 font-mono">PDF</span>
                  <span className="truncate">Party Statement_Sep.pdf</span>
                </div>
              </div>
              <div className="flex justify-end items-center gap-1 text-[9px] text-emerald-700">
                <span>10:15 AM</span>
                <Check className="h-3 w-3 text-blue-500" />
              </div>
            </div>

            {/* Simulated Input */}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
              <input
                type="text"
                disabled
                placeholder="Type a message"
                className="w-full h-8 px-3 bg-white border border-gray-200 rounded-full text-xs text-gray-400 outline-none"
              />
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Subheading & Slide Dots matching Screenshot 5 */}
          <div className="text-center space-y-2">
            <h4 className="text-base font-bold text-gray-900">WhatsApp as Usual</h4>
            <p className="text-xs text-gray-500 max-w-sm">
              Keep using WhatsApp's core features just fetch and chat with your business contacts, no new app needed.
            </p>
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button
                onClick={() => setActiveSlide(0)}
                className={`w-2 h-2 rounded-full transition-all ${activeSlide === 0 ? 'bg-blue-600 w-4' : 'bg-gray-300'}`}
              />
              <button
                onClick={() => setActiveSlide(1)}
                className={`w-2 h-2 rounded-full transition-all ${activeSlide === 1 ? 'bg-blue-600 w-4' : 'bg-gray-300'}`}
              />
              <button
                onClick={() => setActiveSlide(2)}
                className={`w-2 h-2 rounded-full transition-all ${activeSlide === 2 ? 'bg-blue-600 w-4' : 'bg-gray-300'}`}
              />
            </div>
          </div>
        </div>

        {/* Right Side: QR Code & 3 Steps Instructions matching Screenshot 5 */}
        <div className="md:col-span-6 flex flex-col items-center justify-center space-y-5 text-center sm:text-left">
          <h3 className="text-lg font-bold text-gray-900">Scan this QR code</h3>

          {/* QR Code Container */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-md relative group">
            {isConnected ? (
              <div className="w-48 h-48 bg-emerald-50 rounded-xl flex flex-col items-center justify-center space-y-2 text-emerald-700">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                <span className="text-xs font-bold">WhatsApp Linked</span>
                <button
                  onClick={() => setIsConnected(false)}
                  className="text-[10px] text-red-600 hover:underline pt-1"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="w-48 h-48 bg-gray-900 text-white rounded-xl flex flex-col items-center justify-center p-3 relative overflow-hidden">
                {/* Visual SVG QR Code Matrix */}
                <QrCode className="h-40 w-40 text-white" />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-white font-bold">
                    Scan with WhatsApp
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3 Numbered Steps matching Screenshot 5 */}
          <div className="space-y-2.5 text-xs text-gray-700 max-w-sm">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                1
              </span>
              <p>
                Open WhatsApp on your mobile, <span className="font-bold text-gray-900">&quot;tap on ⋮ icon&quot;</span>
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                2
              </span>
              <p>
                Tap <span className="font-bold text-gray-900">&quot;Linked devices&quot;</span> to open the QR scanner
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                3
              </span>
              <p>
                <span className="font-bold text-gray-900">&quot;Scan the QR code&quot;</span> on the right side using your phone
              </p>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-center gap-2 text-xs text-gray-600 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="terms" className="cursor-pointer">
              Proceed with <span className="text-blue-600 hover:underline">Standard Usage Terms</span>
            </label>
          </div>

          {/* Simulate Connect Button */}
          {!isConnected && (
            <button
              type="button"
              onClick={handleSimulateLink}
              disabled={isLinking}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLinking ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Linking Device...</span>
                </>
              ) : (
                <>
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Simulate Device Linking</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
