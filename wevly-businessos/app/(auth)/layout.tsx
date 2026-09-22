import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Wevly BusinessOS account.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left Panel: Form ─────────────────────────────── */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="font-semibold text-base text-gray-900">
                Wevly BusinessOS
              </span>
            </div>
          </div>
          {children}
        </div>
      </div>

      {/* ── Right Panel: Brand ───────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top content */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-white/80 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Production-ready for Indian businesses
          </div>
        </div>

        {/* Center content */}
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Everything your business<br />needs in one place.
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            GST-ready invoicing, inventory tracking, supplier management,
            payment collection, and financial reports — built for India.
          </p>

          {/* Feature list */}
          <div className="space-y-3 pt-2">
            {[
              'GST-compliant invoices in seconds',
              'Real-time inventory & stock alerts',
              'Customer & supplier ledgers',
              'Expense tracking with receipts',
              'Reports: P&L, GSTR-1, cash flow',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="h-3 w-3 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom content */}
        <div className="relative text-gray-600 text-xs">
          © {new Date().getFullYear()} Wevly. All rights reserved.
        </div>
      </div>
    </div>
  )
}
