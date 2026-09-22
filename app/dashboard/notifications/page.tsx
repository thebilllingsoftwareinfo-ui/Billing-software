'use client'

import { useState, useEffect } from 'react'
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
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { NotificationItem, NotificationType } from '@/types/app.types'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD'>('ALL')

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=100')
      const json = await res.json()
      if (json.success && json.data) {
        setNotifications(json.data.notifications || [])
        setUnreadCount(json.data.unread_count || 0)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
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
        toast.success('Notification marked as read')
      }
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
        toast.success('All notifications marked as read')
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.read) {
      fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' }).catch(() => {})
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    if (notif.action_url) {
      router.push(notif.action_url)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'INVOICE_OVERDUE':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'PAYMENT_RECEIVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'LOW_STOCK':
        return <PackageX className="w-5 h-5 text-amber-500" />
      case 'QUOTATION_EXPIRING':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'SYSTEM_EVENT':
      default:
        return <Info className="w-5 h-5 text-purple-500" />
    }
  }

  const getTypeBadgeClass = (type: NotificationType) => {
    switch (type) {
      case 'INVOICE_OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'PAYMENT_RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'LOW_STOCK':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'QUOTATION_EXPIRING':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'SYSTEM_EVENT':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200'
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    // Read status filter
    if (readFilter === 'UNREAD' && n.read) return false
    // Type filter
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = n.title.toLowerCase().includes(q)
      const matchMsg = n.message.toLowerCase().includes(q)
      return matchTitle || matchMsg
    }
    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Real-time business updates, payment receipts, low stock alerts, and invoice payment reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchNotifications}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter notifications..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Read / Unread */}
          <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReadFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                readFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setReadFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                readFilter === 'UNREAD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Type Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="ALL">All Event Types</option>
              <option value="INVOICE_OVERDUE">Invoice Overdue</option>
              <option value="PAYMENT_RECEIVED">Payment Received</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="QUOTATION_EXPIRING">Quotation Expiring</option>
              <option value="SYSTEM_EVENT">System Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
            Loading notification records...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no notifications matching your selected search query or filter criteria.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex items-start gap-4 group ${
                !notif.read ? 'border-indigo-200 bg-indigo-50/20 shadow-2xs' : 'border-slate-200/80'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${!notif.read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTypeBadgeClass(notif.type)}`}>
                      {notif.type.replace('_', ' ')}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(notif.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {notif.message}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  {notif.action_url ? (
                    <span className="font-semibold text-indigo-600 group-hover:text-indigo-700 inline-flex items-center gap-1">
                      View record details
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  ) : (
                    <span />
                  )}

                  {!notif.read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="text-xs font-medium text-slate-400 hover:text-indigo-600 hover:underline transition-colors"
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
    </div>
  )
}
