'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/helpers'
import {
  Home,
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
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Crown,
  Sparkles,
  Zap,
  Award,
} from 'lucide-react'
import type { BusinessCategory } from '@/types/app.types'
import { GlobalSearchModal } from '@/components/common/global-search-modal'

interface NavSubItem {
  label: string
  href: string
  plusHref?: string
}

interface NavMenuItem {
  id: string
  label: string
  href?: string
  icon: React.ElementType
  hasPlusShortcut?: boolean
  plusActionHref?: string
  subItems?: NavSubItem[]
}

const VYAPAR_NAV_ITEMS: NavMenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/dashboard',
    icon: Home,
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: Users,
    hasPlusShortcut: true,
    plusActionHref: '/parties?action=new',
    subItems: [
      { label: 'Party Details', href: '/parties', plusHref: '/parties?action=new' },
      { label: 'Whatsapp Connect', href: '/parties?tab=whatsapp' },
      { label: 'VANIRA Network', href: '/parties?tab=network' },
    ],
  },
  {
    id: 'items',
    label: 'Items',
    href: '/products',
    icon: ShoppingBag,
    hasPlusShortcut: true,
    plusActionHref: '/products?action=new',
  },
  {
    id: 'sale',
    label: 'Sale',
    icon: FileText,
    hasPlusShortcut: true,
    plusActionHref: '/sales/invoices/new',
    subItems: [
      { label: 'Sale Invoices', href: '/sales/invoices' },
      { label: 'Estimate / Quotation', href: '/sales/quotations' },
      { label: 'Payment-In', href: '/sales/payments' },
      { label: 'Sale Order', href: '/sales/orders' },
      { label: 'Delivery Challan', href: '/sales/challans' },
      { label: 'Sale Return / Cr. Note', href: '/sales/credit-notes' },
    ],
  },
  {
    id: 'purchase_expense',
    label: 'Purchase & Expense',
    icon: ShoppingCart,
    hasPlusShortcut: true,
    plusActionHref: '/purchases/bills/new',
    subItems: [
      { label: 'Purchase Bills', href: '/purchases/bills' },
      { label: 'Payment-Out', href: '/purchases/payments' },
      { label: 'Purchase Order', href: '/purchases/orders' },
      { label: 'Purchase Return / Dr. Note', href: '/purchases/debit-notes' },
      { label: 'Expenses', href: '/expenses' },
    ],
  },
  {
    id: 'grow_business',
    label: 'Grow Your Business',
    icon: TrendingUp,
    subItems: [
      { label: 'My Online Store', href: '/store' },
      { label: 'Business Cards', href: '/cards' },
      { label: 'Greetings', href: '/greetings' },
      { label: 'Bulk SMS Marketing', href: '/sms' },
    ],
  },
  {
    id: 'cash_bank',
    label: 'Cash & Bank',
    icon: Landmark,
    subItems: [
      { label: 'Bank Accounts', href: '/cash-bank' },
      { label: 'Cash in Hand', href: '/cash-bank?tab=cash' },
      { label: 'Cheques', href: '/cash-bank?tab=cheques' },
      { label: 'Loan Accounts', href: '/cash-bank?tab=loans' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    id: 'sync_backup',
    label: 'Sync, Share & Backup',
    icon: RefreshCw,
    subItems: [
      { label: 'Auto Backup', href: '/settings?tab=backup' },
      { label: 'Backup to Computer', href: '/settings?tab=backup' },
      { label: 'Restore Backup', href: '/settings?tab=backup' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: Wrench,
    subItems: [
      { label: 'Import Items', href: '/settings?tab=items' },
      { label: 'Import Parties', href: '/parties' },
      { label: 'Invoice Themes', href: '/invoice-themes' },
      { label: 'Staff & Roles', href: '/staff' },
      { label: 'GST Filing Portal', href: '/gst' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    id: 'pricing',
    label: 'Plans & Pricing',
    href: '/pricing',
    icon: Award,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  // Expandable group states (Parties, Sale, Purchase open by default if matched)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    parties: pathname.startsWith('/parties'),
    sale: pathname.startsWith('/sales') || pathname.startsWith('/pos'),
    purchase_expense: pathname.startsWith('/purchases') || pathname.startsWith('/expenses'),
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
    return pathname.startsWith(href)
  }

  return (
    <>
      <aside className="flex flex-col h-full w-60 bg-[#161928] text-slate-300 flex-shrink-0 select-none border-r border-slate-800/80 font-sans min-h-0 overflow-hidden">
        {/* Top Search Input: Open Anything (Ctrl+F) */}
        <div className="p-3 border-b border-slate-800/60 shrink-0">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full h-8.5 px-3 bg-[#1d2237] hover:bg-[#232942] border border-slate-700/60 rounded-lg flex items-center justify-between text-xs text-slate-400 transition-colors shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-200" />
              <span className="text-slate-300 text-[11px] font-medium">Open Anything</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[#161928] text-slate-400 border border-slate-700 rounded">
              Ctrl+F
            </kbd>
          </button>
        </div>

        {/* Vyapar Core Navigation List */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
          {VYAPAR_NAV_ITEMS.map((item) => {
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
                      'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors group',
                      isActive
                        ? 'text-white bg-[#22283f]'
                        : 'text-slate-300 hover:bg-[#1e2338] hover:text-white'
                    )}
                    onClick={() => toggleGroup(item.id)}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-200'
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
                          className="h-4.5 w-4.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title={`Quick Add in ${item.label}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                      {isGroupExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Submenu with red active indicator line */}
                  {isGroupExpanded && (
                    <div className="pl-4 ml-3 border-l border-slate-700/60 space-y-0.5 py-1">
                      {item.subItems?.map((sub) => {
                        const subActive = isRouteActive(sub.href)
                        return (
                          <div
                            key={sub.label}
                            className={cn(
                              'group/sub flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                              subActive
                                ? 'bg-red-600/90 text-white font-bold shadow-xs'
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
                                  className="h-4 w-4 rounded hover:bg-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.href) router.push(item.href)
                  onCloseMobile?.()
                }}
                className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors group cursor-pointer',
                  isSelfActive
                    ? 'text-white bg-[#22283f] font-bold'
                    : 'text-slate-300 hover:bg-[#1e2338] hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isSelfActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-200'
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
                    className="h-4.5 w-4.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title={`Quick Add in ${item.label}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom Vyapar Pricing & Free Trial Card (Always pinned & visible) */}
        <div className="p-2 pt-1 border-t border-slate-800/80 space-y-1.5 shrink-0 bg-[#161928] z-10">
          {!isPremium ? (
            <div className="bg-[#1b2034] rounded-xl p-2.5 border border-slate-700/60 space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 font-medium mb-1">
                  <span>4 days Free Trial left</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-4/6" />
                </div>
              </div>

              {/* Gold Premium Button */}
              <Link
                href="/pricing"
                className="w-full h-7 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-[11px] rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Crown className="h-3.5 w-3.5 fill-slate-950" />
                <span>Get VANIRA Premium</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="bg-[#1b2034] rounded-xl p-2.5 border border-amber-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-bold text-white">VANIRA Premium</span>
                </div>
                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
              </div>
              <p className="text-[10px] text-slate-400">All Desktop Features Unlocked</p>
            </div>
          )}

          {/* User / My Company Bottom Pill */}
          <Link
            href="/settings"
            className="w-full flex items-center justify-between p-2 rounded-xl bg-[#141724] hover:bg-[#1b2034] border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {orgInitials || 'M'}
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate">
                {orgName || 'My Company'}
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
          </Link>
        </div>
      </aside>

      {/* Global Search Modal (Ctrl+F) */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Premium Upgrade Modal */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181c2e] border border-amber-500/40 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <Crown className="h-6 w-6 fill-amber-400" />
              </div>
              <h3 className="text-lg font-black text-white">Upgrade to VANIRA Premium</h3>
              <p className="text-xs text-slate-400">
                Unlimited Invoicing, Multi-device Desktop Sync, Thermal POS, Tally Export & 24x7 Priority Support.
              </p>
            </div>

            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">1 Year Desktop License</span>
                <span className="font-bold text-amber-400">₹2,499 / yr</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">3 Years Super Saver (Best Value)</span>
                <span className="font-bold text-emerald-400">₹4,999 / 3 yrs</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.open('https://wa.me/917795687633?text=I%20want%20to%20activate%20VANIRA%20Premium%20Plan', '_blank')
                  setPremiumModalOpen(false)
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:brightness-105"
              >
                Activate Premium Now ⚡
              </button>
              <button
                onClick={() => setPremiumModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
