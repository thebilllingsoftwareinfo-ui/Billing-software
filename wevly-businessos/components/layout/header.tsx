'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  Building2,
  Menu,
  Check,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/helpers'
import { GlobalSearchModal } from '@/components/common/global-search-modal'
import { QuickCreateModal } from '@/components/common/quick-create-modal'
import { NotificationCenter } from '@/components/notifications/notification-center'

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
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-gray-200 flex-shrink-0 z-20">
        {/* Left Section: Mobile Menu + Title & Org Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Org Switcher Placeholder */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 h-9 px-2.5 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 text-xs font-semibold text-gray-800"
            >
              <div className="h-5 w-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                {orgName.substring(0, 1).toUpperCase()}
              </div>
              <span className="max-w-[140px] truncate hidden sm:inline">{orgName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {orgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOrgDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl z-20 py-1 text-xs">
                  <p className="px-3 py-1.5 font-bold uppercase tracking-wider text-gray-400 text-[10px]">
                    Current Business
                  </p>
                  <button className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50/60 text-indigo-950 font-semibold">
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      <span className="truncate">{orgName}</span>
                    </div>
                    <Check className="h-3.5 w-3.5 text-indigo-600" />
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false)
                        router.push('/setup')
                      }}
                      className="w-full text-left px-3 py-2 text-indigo-600 hover:bg-indigo-50/50 font-medium"
                    >
                      + Add another business
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <h1 className="text-base font-bold text-gray-900 hidden lg:block border-l border-gray-200 pl-3">
            {title}
          </h1>
        </div>

        {/* Center: Global Search Placeholder Trigger */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-9 flex items-center justify-between px-3 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-400 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <span>Search invoices, customers, products...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-gray-200 rounded shadow-2xs text-gray-500">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Right Section: Quick Create + Notifications + User Menu */}
        <div className="flex items-center gap-2.5">
          {/* Quick Create Button */}
          <QuickCreateModal />

          {/* Search Trigger for Mobile */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Global Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 h-9 px-2 rounded-xl hover:bg-gray-100 transition-colors text-xs text-gray-700"
            >
              <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {initials}
              </div>
              <span className="hidden sm:block font-semibold text-gray-800 max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl z-20 py-1 text-xs">
                  <div className="px-3.5 py-2.5 border-b border-gray-100">
                    <p className="font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      router.push('/settings')
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
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
