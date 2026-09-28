'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  LogOut,
  Settings,
  Building2,
  Menu,
  Check,
  Plus,
  Edit2,
  Printer,
  MoreVertical,
  Bell,
  Keyboard,
  HelpCircle,
  Phone,
  Sparkles,
  X,
  Store,
  Layers,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/helpers'
import { GlobalSearchModal } from '@/components/common/global-search-modal'
import { QuickCreateModal } from '@/components/common/quick-create-modal'
import { useCategoryConfig } from '@/lib/hooks/useCategoryConfig'

interface HeaderProps {
  title: string
  userName: string | null
  userEmail: string
  orgName: string
  onToggleMobileSidebar?: () => void
}

export function Header({
  title,
  userName,
  userEmail,
  orgName,
  onToggleMobileSidebar,
}: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const categoryConfig = useCategoryConfig()
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const displayName = userName ?? userEmail.split('@')[0]
  const initials = getInitials(displayName)

  // Global Keyboard Shortcuts for Indian Billing Ergonomics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (e.key === 'F2') {
        e.preventDefault()
        router.push('/sales/invoices/new')
      } else if (e.key === 'F3') {
        e.preventDefault()
        router.push('/purchases/bills/new')
      } else if (e.key === 'F4') {
        e.preventDefault()
        router.push('/pos')
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i' && !isInput) {
        e.preventDefault()
        router.push('/sales/payments')
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o' && !isInput) {
        e.preventDefault()
        router.push('/purchases/payments')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore sign out network errors for demo mode
    } finally {
      document.cookie = 'demo_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.href = '/login'
    }
  }

  return (
    <>
      <header className="h-12 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-20 select-none shadow-2xs">
        {/* Left Section: Mobile Menu + Original Brand & Business Profile */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Business Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-xs font-semibold text-slate-800 group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                {orgName ? orgName[0].toUpperCase() : 'B'}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[12px] font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {orgName || 'My Business'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">FY 2026-27</span>
              </div>
              <Edit2 className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors ml-0.5" />
            </button>

            {orgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOrgDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 py-2 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Active Firm & GSTIN</span>
                    <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  <div className="px-3.5 py-2.5 bg-indigo-50/50 flex items-center justify-between border-y border-indigo-100/60 my-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {orgName ? orgName[0].toUpperCase() : 'B'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{orgName || 'My Business'}</p>
                        <p className="text-[10px] text-indigo-700 font-medium mt-0.5">
                          Category: {categoryConfig.name}
                        </p>
                      </div>
                    </div>
                    <Check className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false)
                        router.push('/settings/business-profile')
                      }}
                      className="w-full text-left px-3.5 py-2 text-indigo-600 hover:bg-indigo-50 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Edit Business Profile, GST & Firm Info</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Business Category Pill (Category-Aware UI) */}
          <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Store className="h-3 w-3 text-slate-500" />
            <span>{categoryConfig.name}</span>
          </span>
        </div>

        {/* Middle Section: Long Search Bar (Open Anything: Ctrl + F) */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 min-w-[160px]">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-8.5 px-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-400 flex items-center justify-between transition-all group cursor-pointer shadow-2xs"
            title="Search transactions, customers, items, bills (Ctrl + F)"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
              <span className="text-slate-400 group-hover:text-slate-700 text-xs font-medium truncate">
                Search invoices, parties, items...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs flex-shrink-0">
              Ctrl+F
            </kbd>
          </button>
        </div>

        {/* Right Section: Add Sale, Add Purchase, Quick Create (+), Shortcuts & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Action Buttons: Add Sale (F2) & Add Purchase (F3) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => router.push('/sales/invoices/new')}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Create GST Sale Invoice (F2)"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Sale</span>
              <kbd className="hidden md:inline text-[9px] font-mono opacity-80 bg-emerald-700/60 px-1 py-0.5 rounded">F2</kbd>
            </button>

            <button
              onClick={() => router.push('/purchases/bills/new')}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Record Purchase Bill (F3)"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Purchase</span>
              <kbd className="hidden md:inline text-[9px] font-mono opacity-80 bg-blue-700/60 px-1 py-0.5 rounded">F3</kbd>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Quick Create Popover (+) */}
          <QuickCreateModal />

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="hidden sm:flex items-center justify-center h-8 w-8 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
            title="Keyboard Shortcuts (F2, F3, F4, Ctrl+I, Ctrl+O)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Print Icon */}
          <button
            onClick={() => window.print()}
            className="hidden md:flex items-center justify-center h-8 w-8 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
            title="Print Current View"
          >
            <Printer className="h-4 w-4" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => router.push('/dashboard/notifications')}
            className="flex items-center justify-center h-8 w-8 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 cursor-pointer relative"
            title="Notifications & Alerts"
          >
            <Bell className="h-4 w-4" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5" />
          </button>

          {/* User Profile & More Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center justify-center h-8 w-8 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer"
              aria-label="User Menu"
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                {initials || 'U'}
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 py-2 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{userEmail}</p>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push('/settings/business-profile')
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                  >
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>Business Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push('/settings')
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Business Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push('/staff')
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                  >
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>Staff & Roles</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      setShortcutsModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                  >
                    <Keyboard className="h-4 w-4 text-slate-400" />
                    <span>Keyboard Shortcuts</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      setSupportModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                  >
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                    <span>Help & Instant Support</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      handleSignOut()
                    }}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer disabled:opacity-50 font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Billing Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Add Sale Invoice</span>
                <kbd className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 font-mono font-bold">
                  F2
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Add Purchase Bill</span>
                <kbd className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-700 font-mono font-bold">
                  F3
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Quick POS Counter</span>
                <kbd className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-mono font-bold">
                  F4
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Open Search (Invoices, Parties, Items)</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-mono font-bold">
                  Ctrl + F
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Payment-In (Receipt)</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-mono font-bold">
                  Ctrl + I
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-600 font-medium">Payment-Out (Payment)</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-mono font-bold">
                  Ctrl + O
                </kbd>
              </div>
            </div>
            <button
              onClick={() => setShortcutsModalOpen(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Customer Support Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                Customer Support & Assistance
              </h3>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Need help with billing, GST filing, stock transfers, or printer setup?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Live Support Desk:</span>
                  <span className="font-bold text-slate-800">Monday - Saturday (9 AM - 8 PM)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">WhatsApp Helpdesk:</span>
                  <span className="font-bold text-emerald-600">Instant Online Support</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.open('https://wa.me/?text=Hi%2C%20I%20need%20assistance%20with%20billing', '_blank')
                  setSupportModalOpen(false)
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Open WhatsApp Support
              </button>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

