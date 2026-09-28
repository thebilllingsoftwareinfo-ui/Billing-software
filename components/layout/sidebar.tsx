'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/helpers'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  ShoppingCart,
  TrendingUp,
  Landmark,
  BarChart3,
  RefreshCw,
  Wrench,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Crown,
  Sparkles,
  Zap,
  Award,
  BookOpen,
  Store,
  Layers,
  Building2,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import type { BusinessCategory } from '@/types/app.types'
import { useCategoryConfig } from '@/lib/hooks/useCategoryConfig'

interface NavSubItem {
  label: string
  href: string
  plusHref?: string
  badge?: string
}

interface NavMenuItem {
  id: string
  label: string
  href?: string
  icon: React.ElementType
  hasPlusShortcut?: boolean
  plusActionHref?: string
  badge?: string
  subItems?: NavSubItem[]
}

const NAV_MENU_ITEMS: NavMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'sale',
    label: 'Sales',
    icon: FileText,
    hasPlusShortcut: true,
    plusActionHref: '/sales/invoices/new',
    subItems: [
      { label: 'New Sale', href: '/sales/invoices/new' },
      { label: 'Invoices', href: '/sales/invoices', plusHref: '/sales/invoices/new' },
      { label: 'Quotations', href: '/sales/quotations', plusHref: '/sales/quotations/new' },
      { label: 'Sales Orders', href: '/sales/orders' },
      { label: 'Proforma', href: '/sales/proforma-invoices' },
      { label: 'Delivery Challan', href: '/sales/challans' },
      { label: 'Sales Return', href: '/sales/credit-notes' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: ShoppingCart,
    hasPlusShortcut: true,
    plusActionHref: '/purchases/bills/new',
    subItems: [
      { label: 'New Purchase', href: '/purchases/bills/new' },
      { label: 'Purchase Bills', href: '/purchases/bills', plusHref: '/purchases/bills/new' },
      { label: 'Purchase Orders', href: '/purchases/orders' },
      { label: 'Purchase Return', href: '/purchases/debit-notes' },
      { label: 'Debit Notes', href: '/purchases/debit-notes' },
    ],
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: Users,
    hasPlusShortcut: true,
    plusActionHref: '/parties?action=new',
    subItems: [
      { label: 'Customers', href: '/parties?tab=customers', plusHref: '/parties?tab=customers&action=new' },
      { label: 'Suppliers', href: '/parties?tab=suppliers', plusHref: '/parties?tab=suppliers&action=new' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: ShoppingBag,
    hasPlusShortcut: true,
    plusActionHref: '/products?action=new',
    subItems: [
      { label: 'Products', href: '/products', plusHref: '/products?action=new' },
      { label: 'Stock', href: '/inventory' },
      { label: 'Stock Ledger', href: '/inventory' },
      { label: 'Warehouses', href: '/inventory/warehouses' },
      { label: 'Stock Transfer', href: '/inventory/transfers' },
      { label: 'Stock Adjustment', href: '/inventory/adjustments' },
      { label: 'Barcode', href: '/inventory/barcodes' },
      { label: 'Batches', href: '/inventory/batches' },
      { label: 'Serial Numbers', href: '/inventory/serials' },
    ],
  },
  {
    id: 'finance',
    label: 'Money',
    icon: Landmark,
    subItems: [
      { label: 'Payment In', href: '/sales/payments' },
      { label: 'Payment Out', href: '/purchases/payments' },
      { label: 'Expenses', href: '/expenses' },
      { label: 'Cash / Bank', href: '/cash-bank' },
      { label: 'Receivables', href: '/outstanding?type=receivables' },
      { label: 'Payables', href: '/outstanding?type=payables' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: BookOpen,
    subItems: [
      { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
      { label: 'Journal Entries', href: '/accounting/journal-entries' },
      { label: 'General Ledger', href: '/accounting/general-ledger' },
      { label: 'Financial Periods', href: '/accounting/periods' },
      { label: 'Cost Centers', href: '/accounting/cost-centers' },
      { label: 'Bank Reconciliation', href: '/accounting/reconciliation' },
      { label: 'Trial Balance', href: '/accounting/trial-balance' },
      { label: 'Profit & Loss', href: '/accounting/profit-and-loss' },
      { label: 'Balance Sheet', href: '/accounting/balance-sheet' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    subItems: [
      { label: 'Business Profile', href: '/settings/business-profile' },
      { label: 'General Settings', href: '/settings' },
      { label: 'Taxes & GST', href: '/settings/tax' },
    ],
  },
]

interface SidebarProps {
  orgName: string
  orgInitials: string
  businessCategory: BusinessCategory
  onCloseMobile?: () => void
}

export function Sidebar({ orgName, orgInitials, businessCategory, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const categoryConfig = useCategoryConfig()
  const [isPremium, setIsPremium] = useState(false)

  // Expandable group states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    sale: pathname.startsWith('/sales') || pathname.startsWith('/pos'),
    purchase: pathname.startsWith('/purchases') || pathname.startsWith('/expenses'),
    parties: pathname.startsWith('/parties') || pathname.startsWith('/customers') || pathname.startsWith('/suppliers'),
    inventory: pathname.startsWith('/products') || pathname.startsWith('/inventory'),
    finance: pathname.startsWith('/cash-bank') || pathname.startsWith('/outstanding'),
    accounting: pathname.startsWith('/accounting'),
    reports: pathname.startsWith('/reports'),
    settings: pathname.startsWith('/settings') || pathname.startsWith('/staff') || pathname.startsWith('/invoice-themes'),
  })

  // Check if premium is active
  useEffect(() => {
    try {
      const active = localStorage.getItem('vanira_premium_active') === 'true'
      setIsPremium(active)
    } catch {}
  }, [])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const isRouteActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="flex flex-col h-full w-60 bg-[#0d131f] text-slate-300 flex-shrink-0 select-none border-r border-slate-800 font-sans min-h-0 overflow-hidden shadow-sm">
      {/* Brand Identity Header */}
      <div className="h-12 px-3.5 flex items-center justify-between border-b border-slate-800/80 bg-[#090d16] shrink-0">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-2 group cursor-pointer"
        >
          {/* Original Geometric Emblem: Modern Indigo & Emerald Hex-Prism */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 p-0.5 shadow-xs flex items-center justify-center">
            <div className="w-full h-full bg-[#0d131f] rounded-[6px] flex items-center justify-center group-hover:bg-transparent transition-colors">
              <span className="font-black text-white text-[12px] tracking-tighter">VB</span>
            </div>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-white text-[13px] tracking-wide group-hover:text-indigo-400 transition-colors">
              VANIRA
            </span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
              BusinessOS
            </span>
          </div>
        </Link>

        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          v2.5
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-2.5 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
        {NAV_MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const hasSub = Boolean(item.subItems && item.subItems.length > 0)
          const isGroupExpanded = Boolean(openGroups[item.id])
          const isSelfActive = isRouteActive(item.href)
          const isChildActive = hasSub && item.subItems?.some((sub) => isRouteActive(sub.href))
          const isActive = isSelfActive || isChildActive

          if (hasSub) {
            return (
              <div key={item.id} className="space-y-0.5">
                <div
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all group',
                    isActive
                      ? 'text-white bg-slate-800/80 shadow-2xs'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  )}
                  onClick={() => toggleGroup(item.id)}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors',
                        isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span className="text-[12px] truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.hasPlusShortcut && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.plusActionHref) router.push(item.plusActionHref)
                        }}
                        className="h-4.5 w-4.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={`Quick Add in ${item.label}`}
                      >
                        <Plus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                    )}
                    {isGroupExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Submenu with refined active pill */}
                {isGroupExpanded && (
                  <div className="pl-3.5 ml-2.5 border-l border-slate-800 space-y-0.5 py-1">
                    {item.subItems?.map((sub) => {
                      const subActive = isRouteActive(sub.href)
                      return (
                        <div
                          key={sub.label}
                          className={cn(
                            'group/sub flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                            subActive
                              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                          )}
                        >
                          <Link
                            href={sub.href}
                            onClick={onCloseMobile}
                            className="flex-1 truncate"
                          >
                            {sub.label}
                          </Link>

                          <div className="flex items-center gap-1">
                            {sub.plusHref && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.push(sub.plusHref!)
                                }}
                                className="h-4 w-4 rounded hover:bg-slate-700/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title={`Add new ${sub.label}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            )}
                            {subActive && !sub.plusHref && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer',
                  isSelfActive
                    ? 'text-white bg-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-colors',
                      isSelfActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span className="text-[12px] truncate">{item.label}</span>
                </div>

                {item.hasPlusShortcut && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (item.plusActionHref) router.push(item.plusActionHref)
                    }}
                    className="h-4.5 w-4.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title={`Quick Add in ${item.label}`}
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                  </button>
                )}
              </Link>
            )
          }

          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.href) router.push(item.href)
                onCloseMobile?.()
              }}
              className={cn(
                'flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer',
                isSelfActive
                  ? 'text-white bg-indigo-600 font-semibold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0 transition-colors',
                    isSelfActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                <span className="text-[12px] truncate">{item.label}</span>
              </div>

              {item.hasPlusShortcut && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.plusActionHref) router.push(item.plusActionHref)
                  }}
                  className="h-4.5 w-4.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={`Quick Add in ${item.label}`}
                >
                  <Plus className="h-3 w-3 stroke-[2.5]" />
                </button>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom Subscription & Firm Status Card */}
      <div className="p-2.5 border-t border-slate-800/90 space-y-2 shrink-0 bg-[#090d16] z-10">
        {!isPremium ? (
          <div className="bg-[#121927] rounded-xl p-2.5 border border-slate-800 space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 font-medium mb-1">
                <span>Free Edition Active</span>
                <span className="text-[10px] text-emerald-400 font-bold">PRO READY</span>
              </div>
              <div className="w-full h-1 bg-slate-700/60 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-full" />
              </div>
            </div>

            <Link
              href="/pricing"
              className="w-full h-7 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Crown className="h-3.5 w-3.5 fill-white" />
              <span>Explore Pro Features</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="bg-[#121927] rounded-xl p-2.5 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[11px] font-bold text-white">VANIRA Pro</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
            </div>
            <p className="text-[10px] text-slate-400">All Modules & Cloud Sync Active</p>
          </div>
        )}

        {/* Firm Profile Link */}
        <Link
          href="/settings"
          className="w-full flex items-center justify-between p-2 rounded-xl bg-[#0f1523] hover:bg-[#151c2e] border border-slate-800 text-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-2xs">
              {orgInitials || 'B'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {orgName || 'My Business'}
              </span>
              <span className="text-[9px] text-slate-500 truncate">
                {categoryConfig.name}
              </span>
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  )
}

