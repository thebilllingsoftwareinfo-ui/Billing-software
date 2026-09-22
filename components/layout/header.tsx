'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  ChevronDown,
  LogOut,
  Settings,
  Building2,
  Menu,
  Check,
  Plus,
  Edit2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/helpers'
import { GlobalSearchModal } from '@/components/common/global-search-modal'
import { QuickCreateModal } from '@/components/common/quick-create-modal'

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const displayName = userName ?? userEmail.split('@')[0]
  const initials = getInitials(displayName)

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
      <header className="h-11 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-20 select-none">
        {/* Left Section: Mobile Menu + Business Name Bar matching Vyapar Screenshot 1 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Vyapar Red Dot + Business Name Header */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 group"
            >
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
              <span className="text-[13px] font-bold text-gray-800 tracking-tight group-hover:text-red-600 transition-colors">
                {orgName || 'Enter Business Name'}
              </span>
              <Edit2 className="h-3 w-3 text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>

            {orgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOrgDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl border border-gray-200 shadow-xl z-20 py-1.5 text-xs">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Active VANIRA Business
                  </div>
                  <div className="px-3.5 py-2 bg-red-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center font-bold text-[11px]">
                        {orgName ? orgName[0].toUpperCase() : 'V'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{orgName || 'My Business'}</p>
                        <p className="text-[10px] text-gray-500 font-mono">FY 2026-27</p>
                      </div>
                    </div>
                    <Check className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false)
                        router.push('/settings')
                      }}
                      className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50/50 font-semibold"
                    >
                      ✏️ Edit Business Profile & GSTIN
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Middle Section: Long Search Bar in middle of business name and Add Sale */}
        <div className="flex-1 max-w-lg mx-3 sm:mx-6 min-w-[180px]">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-8 px-3.5 bg-gray-50 hover:bg-gray-100/90 border border-gray-200 hover:border-gray-300 rounded-xl text-xs text-gray-400 flex items-center justify-between transition-all group cursor-pointer shadow-2xs"
            title="Search transactions, parties, items (Ctrl + F)"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Search className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
              <span className="text-gray-400 group-hover:text-gray-600 text-xs font-medium truncate">
                Search transactions, parties, items...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-2xs flex-shrink-0">
              Ctrl+F
            </kbd>
          </button>
        </div>

        {/* Right Section: Add Sale, Add Purchase, Quick Create (+) and Profile */}
        <div className="flex items-center gap-2">
          {/* Action Buttons: Add Sale (F2) & Add Purchase (F3) with single + icon */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => router.push('/sales/invoices/new')}
              className="h-7 px-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Create GST Sale Invoice (F2)"
            >
              <Plus className="h-3 w-3" />
              <span>Add Sale</span>
              <span className="text-[9px] bg-red-800/80 px-1 py-0.2 rounded font-mono font-normal">F2</span>
            </button>

            <button
              onClick={() => router.push('/purchases/bills/new')}
              className="h-7 px-2.5 bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Record Purchase Bill (F3)"
            >
              <Plus className="h-3 w-3" />
              <span>Add Purchase</span>
              <span className="text-[9px] bg-blue-900/80 px-1 py-0.2 rounded font-mono font-normal">F3</span>
            </button>
          </div>

          <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

          {/* Quick Create (+) Dropdown Modal */}
          <QuickCreateModal />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 h-7 px-1.5 rounded-lg hover:bg-gray-100 transition-colors text-xs text-gray-700"
            >
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                {initials}
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-gray-200 shadow-xl z-20 py-1 text-xs">
                  <div className="px-3.5 py-2 border-b border-gray-100">
                    <p className="font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push('/settings')
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-gray-400" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {isSigningOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
