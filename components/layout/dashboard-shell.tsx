'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getInitials } from '@/lib/utils/helpers'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { BusinessCategory } from '@/types/app.types'

import { CategoryConfigProvider } from '@/lib/hooks/useCategoryConfig'

interface DashboardShellProps {
  children: React.ReactNode
  orgName: string
  userName: string | null
  userEmail: string
  businessCategory: BusinessCategory
}

export function DashboardShell({
  children,
  orgName,
  userName,
  userEmail,
  businessCategory,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const orgInitials = getInitials(orgName)
  const isSettingsPage = pathname === '/settings' || pathname.startsWith('/settings')

  return (
    <CategoryConfigProvider category={businessCategory}>
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-50 font-sans">
        {/* Main Workspace Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex flex-col h-full shrink-0 min-h-0">
            <Sidebar
              orgName={orgName}
              orgInitials={orgInitials}
              businessCategory={businessCategory}
            />
          </div>

          {/* Mobile Drawer Overlay */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="relative flex-1 max-w-xs w-full bg-[#0f172a] h-full shadow-2xl z-10">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
                <Sidebar
                  orgName={orgName}
                  orgInitials={orgInitials}
                  businessCategory={businessCategory}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Main Content View with Header & Page Content */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#f8fafc]">
            <Header
              title="VANIRA BusinessOS"
              userName={userName}
              userEmail={userEmail}
              orgName={orgName}
              onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
            />
            <main className={`flex-1 overflow-y-auto ${isSettingsPage ? 'p-0' : 'p-3 sm:p-5'}`}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </CategoryConfigProvider>
  )
}
