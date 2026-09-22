'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/helpers'
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  FileCheck,
  CreditCard,
  Building2,
  Truck,
  Boxes,
  Package,
  Bell,
  SlidersHorizontal,
  Users,
  Receipt,
  BarChart3,
  Calculator,
  UserCog,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { BusinessCategory } from '@/types/app.types'

interface NavSubItem {
  label: string
  href: string
}

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  subItems?: NavSubItem[]
  /** categories that should hide this item — undefined means show always */
  hideFor?: BusinessCategory[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const ALL_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Core Business',
    items: [
      {
        label: 'Sales',
        icon: FileText,
        subItems: [
          { label: 'Invoices', href: '/sales/invoices' },
          { label: 'Quotations', href: '/sales/quotations' },
          { label: 'Payments', href: '/sales/payments' },
        ],
      },
      {
        label: 'Purchases',
        icon: ShoppingCart,
        hideFor: ['freelancer'],
        subItems: [
          { label: 'Purchase Bills', href: '/purchases/bills' },
          { label: 'Suppliers', href: '/suppliers' },
        ],
      },
      {
        label: 'Inventory',
        icon: Boxes,
        hideFor: ['freelancer', 'services'],
        subItems: [
          { label: 'Products', href: '/products' },
          { label: 'Stock', href: '/inventory' },
          { label: 'Stock Adjustments', href: '/inventory/adjustments' },
        ],
      },
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Expenses', href: '/expenses', icon: Receipt },
    ],
  },
  {
    title: 'Finance & Compliance',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'GST', href: '/gst', icon: Calculator },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
      {
        label: 'Staff',
        href: '/staff',
        icon: UserCog,
        hideFor: ['freelancer'],
      },
      {
        label: 'Settings',
        icon: Settings,
        subItems: [
          { label: 'Business Profile', href: '/settings/business-profile' },
          { label: 'All Settings', href: '/settings' },
        ],
      },
    ],
  },
]

/** Category labels & emoji for the sidebar badge */
const CATEGORY_META: Record<BusinessCategory, { label: string; emoji: string; color: string }> = {
  retail:        { label: 'Retail',        emoji: '🛒', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  wholesale:     { label: 'Wholesale',     emoji: '🏭', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  services:      { label: 'Services',      emoji: '💼', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  manufacturing: { label: 'Manufacturing', emoji: '⚙️', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  restaurant:    { label: 'Restaurant',    emoji: '🍽️', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  freelancer:    { label: 'Freelancer',    emoji: '🧑‍💻', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  jewelry:       { label: 'Jewellery',     emoji: '💍', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  medical:       { label: 'Medical',       emoji: '💊', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
}

interface SidebarProps {
  orgName: string
  orgInitials: string
  businessCategory: BusinessCategory
  onCloseMobile?: () => void
}

export function Sidebar({ orgName, orgInitials, businessCategory, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Sales: true,
    Purchases: true,
    Inventory: true,
    Settings: true,
  })

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const isItemActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const isGroupActive = (item: NavItem) => {
    if (item.subItems) {
      return item.subItems.some((sub) => pathname.startsWith(sub.href))
    }
    return false
  }

  // Filter nav items based on current business category
  const filteredSections = ALL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.hideFor || !item.hideFor.includes(businessCategory)
    ),
  })).filter((section) => section.items.length > 0)

  const categoryMeta = CATEGORY_META[businessCategory]

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 font-bold text-white shadow-md shadow-indigo-500/20 text-xs">
            {orgInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{orgName}</p>
            <p className="text-[10px] text-indigo-400 font-medium tracking-wide">WEVLY BUSINESSOS</p>
          </div>
        </div>
      </div>

      {/* Category Badge */}
      <div className="px-4 pt-3 pb-1">
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold w-fit',
          categoryMeta.color
        )}>
          <span className="text-sm">{categoryMeta.emoji}</span>
          <span>{categoryMeta.label}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {filteredSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
            )}

            {section.items.map((item) => {
              const Icon = item.icon
              const hasSubItems = Boolean(item.subItems && item.subItems.length > 0)
              const groupActive = isGroupActive(item)
              const isOpen = openGroups[item.label] ?? groupActive

              if (hasSubItems) {
                return (
                  <div key={item.label} className="space-y-0.5">
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors group',
                        groupActive
                          ? 'text-indigo-400 bg-indigo-950/40'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4', groupActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200')} />
                        <span>{item.label}</span>
                      </div>
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>

                    {isOpen && (
                      <div className="pl-8 space-y-0.5 border-l border-slate-800/80 ml-4 py-1">
                        {item.subItems?.map((sub) => {
                          const active = isItemActive(sub.href)
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onCloseMobile}
                              className={cn(
                                'block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                active
                                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                              )}
                            >
                              {sub.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const active = isItemActive(item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  onClick={onCloseMobile}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors group',
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
        <span>Wevly v1.0 MVP</span>
        <span className="h-2 w-2 rounded-full bg-emerald-500" title="System Online" />
      </div>
    </aside>
  )
}
