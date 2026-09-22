'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorBoundaryView({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-red-100 rounded-2xl p-8 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 ring-8 ring-red-50/50">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-base font-bold text-gray-900">Something went wrong</h2>
      <p className="mt-1 text-xs text-gray-500 max-w-md">
        {error.message || 'An unexpected error occurred while loading this module.'}
      </p>
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  )
}
