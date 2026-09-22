'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getInitials } from '@/lib/utils/helpers'
import { X } from 'lucide-react'
import type { BusinessCategory } from '@/types/app.types'

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const orgInitials = getInitials(orgName)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block h-full">
        <Sidebar orgName={orgName} orgInitials={orgInitials} businessCategory={businessCategory} />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 max-w-xs w-full bg-slate-900 h-full shadow-2xl z-10">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
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

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          title="Wevly BusinessOS"
          userName={userName}
          userEmail={userEmail}
          orgName={orgName}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
