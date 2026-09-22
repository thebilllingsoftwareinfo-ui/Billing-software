'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info, 
  PackageX, 
  FileText, 
  CreditCard,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { NotificationItem, NotificationType } from '@/types/app.types'

export function NotificationCenter() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/notifications', { signal })
      if (!res.ok) return

      const json = await res.json()
      if (json && json.success) {
        const notifList = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.notifications)
          ? json.notifications
          : Array.isArray(json.data?.notifications)
          ? json.data.notifications
          : []
        setNotifications(notifList)
        setUnreadCount(
          typeof json.unread_count === 'number'
            ? json.unread_count
            : typeof json.data?.unread_count === 'number'
            ? json.data.unread_count
            : notifList.filter((n: any) => !n.read).length
        )
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      // Graceful fallback on network glitch or background polling
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchNotifications(controller.signal)
    const interval = setInterval(() => fetchNotifications(controller.signal), 60000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      const json = await res.json()
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' }).catch(() => {})
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    setIsOpen(false)
    if (notif.action_url) {
      router.push(notif.action_url)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'INVOICE_OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'PAYMENT_RECEIVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'LOW_STOCK':
        return <PackageX className="w-4 h-4 text-amber-500" />
      case 'QUOTATION_EXPIRING':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'SYSTEM_EVENT':
      default:
        return <Info className="w-4 h-4 text-purple-500" />
    }
  }

  const getNotificationBadgeClass = (type: NotificationType) => {
    switch (type) {
      case 'INVOICE_OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400'
      case 'PAYMENT_RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
      case 'LOW_STOCK':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
      case 'QUOTATION_EXPIRING':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
      case 'SYSTEM_EVENT':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400'
    }
  }

  const safeNotifications = Array.isArray(notifications) ? notifications : []
  const displayedNotifications = safeNotifications.filter((n) =>
    activeTab === 'unread' ? !n.read : true
  )

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notification Center"
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'unread'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No notifications matching this filter.</p>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative group ${
                    !notif.read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className={`text-xs font-semibold truncate ${!notif.read ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1.5">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {new Date(notif.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-indigo-600 hover:underline dark:text-indigo-400 font-medium transition-opacity"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
            >
              View all notifications
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
