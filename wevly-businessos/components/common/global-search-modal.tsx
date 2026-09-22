'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  FileText,
  Users,
  Package,
  Building2,
  FileSpreadsheet,
  CreditCard,
  ArrowRight,
  X,
  Loader2,
} from 'lucide-react'
import { SearchResultItem, SearchEntityType } from '@/types/app.types'
import { formatCurrency } from '@/lib/utils/currency'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global Ctrl/Cmd + K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        } else {
          // Open handled via state or trigger
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  // Debounced server querying
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        const json = await res.json()
        if (json.success) {
          setResults(json.data || [])
          setSelectedIndex(0)
        }
      } catch (err) {
        console.error('[Search Modal Error]:', err)
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => clearTimeout(handler)
  }, [query])

  if (!isOpen) return null

  const handleNavigate = (path: string) => {
    router.push(path)
    onClose()
  }

  // Keyboard Arrow navigation & Enter selection
  const handleKeyDownInModal = (e: React.KeyboardEvent) => {
    const totalItems = query.trim() ? results.length : quickLinks.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim() && results[selectedIndex]) {
        handleNavigate(results[selectedIndex].url)
      } else if (!query.trim() && quickLinks[selectedIndex]) {
        handleNavigate(quickLinks[selectedIndex].path)
      }
    }
  }

  const quickLinks = [
    { label: 'Create New Invoice', path: '/sales/invoices/new', icon: FileText, type: 'Action' },
    { label: 'View All Customers', path: '/customers', icon: Users, type: 'Party' },
    { label: 'View Products Catalog', path: '/products', icon: Package, type: 'Inventory' },
    { label: 'Purchase Bills', path: '/purchases/bills', icon: FileSpreadsheet, type: 'Purchase' },
  ]

  const getEntityBadge = (type: SearchEntityType) => {
    switch (type) {
      case 'customer':
        return { label: 'Customer', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users }
      case 'supplier':
        return { label: 'Supplier', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: Building2 }
      case 'product':
        return { label: 'Product', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package }
      case 'invoice':
        return { label: 'Invoice', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: FileText }
      case 'quotation':
        return { label: 'Quotation', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileSpreadsheet }
      case 'payment':
        return { label: 'Payment', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: CreditCard }
      default:
        return { label: type, bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: Search }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInModal}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-indigo-600 animate-spin flex-shrink-0" />
          ) : (
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, suppliers, products, invoices, quotations, payments..."
            className="w-full text-sm text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 border border-gray-200 rounded text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-gray-50">
          {query.trim() ? (
            results.length > 0 ? (
              <div className="space-y-1 py-1">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Search Results ({results.length})
                </p>
                {results.map((item, idx) => {
                  const badge = getEntityBadge(item.entity_type)
                  const Icon = badge.icon
                  const isSelected = idx === selectedIndex

                  return (
                    <button
                      key={item.id + idx}
                      onClick={() => handleNavigate(item.url)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected ? 'bg-indigo-50/80 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div
                          className={`p-2 rounded-xl border flex-shrink-0 ${badge.bg}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {item.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        {item.amount_paise !== undefined && item.amount_paise !== null && (
                          <span className="text-xs font-bold text-gray-900">
                            {formatCurrency(item.amount_paise)}
                          </span>
                        )}
                        {item.status && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">
                            {item.status}
                          </span>
                        )}
                        <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-gray-300'}`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : !isLoading ? (
              <div className="py-12 text-center text-gray-500">
                <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No matching records found</p>
                <p className="text-xs text-gray-400 mt-1">Try searching by name, document number, SKU, or email</p>
              </div>
            ) : null
          ) : (
            <div className="space-y-1 py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Quick Shortcuts & Actions
              </p>
              {quickLinks.map((item, idx) => {
                const Icon = item.icon
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={idx}
                    onClick={() => handleNavigate(item.path)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isSelected ? 'bg-indigo-50/80 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-400">{item.path}</p>
                      </div>
                    </div>
                    <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-gray-300'}`} />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">↑↓</kbd> to navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">↵</kbd> to select</span>
          </div>
          <span>Wevly BusinessOS Search</span>
        </div>
      </div>
    </div>
  )
}
