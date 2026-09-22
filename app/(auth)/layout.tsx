import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — VANIRA | Smart GST Billing & Accounting',
  description: 'Sign in to your VANIRA account for GST billing, inventory & accounting.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50">
      {/* ── Left Panel: Form ─────────────────────────────── */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white border-r border-gray-100">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 flex items-center justify-center shadow-md shadow-red-500/25">
                <span className="text-white font-black text-lg tracking-wider">V</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-gray-950">
                    VANIRA
                  </span>
                  <span className="text-[11px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    BusinessOS
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">Simple Billing, GST & Inventory</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Safe & Secure
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            {children}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>Trusted by 1 Crore+ Businesses across India</span>
          <span>GST & ISO 27001 Certified</span>
        </div>
      </div>

      {/* ── Right Panel: VANIRA Showcase ──────────────────── */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between bg-gradient-to-br from-red-700 via-rose-800 to-slate-950 p-12 text-white relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="relative flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 text-xs font-semibold border border-white/10 shadow-sm">
            <span className="text-amber-400">★ ★ ★ ★ ★</span>
            <span>4.8 Rating by MSMEs</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 text-xs font-semibold border border-white/10 shadow-sm">
            <span>🇮🇳 Made for Bharat</span>
          </div>
        </div>

        {/* Center Content & Feature Cards */}
        <div className="relative space-y-8 my-auto py-8 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white">
              VANIRA Business Suite for Smart Billing & Accounting
            </h2>
            <p className="text-rose-100 text-sm leading-relaxed">
              Create GST-ready bills in under 10 seconds, manage inventory, print thermal & regular invoices, and collect payments instantly.
            </p>
          </div>

          {/* Grid of VANIRA highlights */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            {[
              { title: 'GST & Regular Invoices', desc: 'Vyapar A4, A5 & Thermal themes', emoji: '🧾' },
              { title: 'Fast POS & Barcode', desc: 'Rapid billing at retail checkout', emoji: '⚡' },
              { title: 'WhatsApp Reminders', desc: 'Send bills & auto payment links', emoji: '📲' },
              { title: 'Live Inventory & Alerts', desc: 'Item-wise low stock notifications', emoji: '📦' },
              { title: 'Party Ledger & Udhar', desc: 'Track You’ll Give / You’ll Get', emoji: '👥' },
              { title: 'GST Reports & P&L', desc: '1-Click GSTR-1, GSTR-3B export', emoji: '📊' },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white/10 hover:bg-white/15 transition-colors backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-start gap-3 shadow-xs"
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{f.title}</p>
                  <p className="text-[11px] text-rose-200 mt-0.5 line-clamp-2">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Multi-Theme Badge */}
          <div className="p-4 bg-black/25 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center text-sm shadow-sm">
                PDF
              </div>
              <div>
                <p className="text-xs font-bold text-white">6+ VANIRA Invoice Print Templates</p>
                <p className="text-[11px] text-rose-200">Vyapar Classic, Modern Blue, POS Thermal, Jewelry & more</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded-md">
              Customizable
            </span>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative text-xs text-rose-200/80 flex items-center justify-between">
          <span>© {new Date().getFullYear()} VANIRA BusinessOS. All rights reserved.</span>
          <span>100% Cloud Synced & Encrypted</span>
        </div>
      </div>
    </div>
  )
}

