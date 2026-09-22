import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import { NotificationItem, NotificationType } from '@/types/app.types'

// In-memory fallback store for development and automated test environments
const inMemoryNotificationsStore: NotificationItem[] = [
  {
    id: 'notif_welcome',
    organization_id: '11111111-1111-1111-1111-111111111111',
    user_id: 'usr-owner-demo-1111',
    type: 'SYSTEM_EVENT',
    title: 'Welcome to Wevly BusinessOS',
    message: 'Your workspace is ready. You can start creating invoices, adding products, and tracking expenses.',
    read: false,
    entity_type: null,
    entity_id: null,
    action_url: '/dashboard',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

const getOrgId = (session: AppSession): string => {
  return session.organization?.id || (session as any).organization_id || ''
}

const isDemoSession = (session: AppSession): boolean => {
  const uid = (session as any).user_id || session.user?.id || ''
  const orgId = getOrgId(session)
  return uid.includes('demo') || orgId === '11111111-1111-1111-1111-111111111111'
}

export class NotificationService {
  /**
   * Clear in-memory notification store (primarily for unit testing)
   */
  static _clearInMemoryStore(): void {
    inMemoryNotificationsStore.length = 0
  }

  /**
   * Retrieves all notifications for the organization session, ordered by newest first.
   * Multi-tenant isolated by session.organization_id.
   */
  static async getNotifications(
    session: AppSession,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<NotificationItem[]> {
    const orgId = getOrgId(session)
    const limit = options?.limit || 50

    if (!isDemoSession(session)) {
      try {
        const supabase = createAdminClient()
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (options?.unreadOnly) {
          query = query.eq('read', false)
        }

        const { data, error } = await query

        if (!error && data) {
          return data as NotificationItem[]
        }
      } catch {
        // Fall through to in-memory fallback
      }
    }

    // Filter in-memory fallback store
    let filtered = inMemoryNotificationsStore.filter(
      (n) => n.organization_id === orgId
    )

    if (options?.unreadOnly) {
      filtered = filtered.filter((n) => !n.read)
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return filtered.slice(0, limit)
  }

  /**
   * Returns count of unread notifications for the session organization.
   */
  static async getUnreadCount(session: AppSession): Promise<number> {
    const orgId = getOrgId(session)

    if (!isDemoSession(session)) {
      try {
        const supabase = createAdminClient()
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('read', false)

        if (!error && count !== null) {
          return count
        }
      } catch {
        // Fall through to in-memory fallback
      }
    }

    return inMemoryNotificationsStore.filter(
      (n) => n.organization_id === orgId && !n.read
    ).length
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(session: AppSession, notificationId: string): Promise<NotificationItem | null> {
    const orgId = getOrgId(session)

    if (!isDemoSession(session)) {
      try {
        const supabase = createAdminClient()
        const { data, error } = await (supabase.from('notifications') as any)
          .update({ read: true })
          .eq('id', notificationId)
          .eq('organization_id', orgId)
          .select('*')
          .single()

        if (!error && data) {
          return data as NotificationItem
        }
      } catch {
        // Fall through
      }
    }

    const item = inMemoryNotificationsStore.find(
      (n) => n.id === notificationId && n.organization_id === orgId
    )

    if (item) {
      item.read = true
      return item
    }

    return null
  }

  /**
   * Marks all unread notifications for current organization as read.
   */
  static async markAllAsRead(session: AppSession): Promise<{ count: number }> {
    const orgId = getOrgId(session)
    let updatedCount = 0

    if (!isDemoSession(session)) {
      try {
        const supabase = createAdminClient()
        const { data, error } = await (supabase.from('notifications') as any)
          .update({ read: true })
          .eq('organization_id', orgId)
          .eq('read', false)
          .select('id')

        if (!error && data) {
          return { count: data.length }
        }
      } catch {
        // Fall through
      }
    }

    inMemoryNotificationsStore.forEach((n) => {
      if (n.organization_id === orgId && !n.read) {
        n.read = true
        updatedCount++
      }
    })

    return { count: updatedCount }
  }

  /**
   * Creates a new notification record strictly isolated to session.organization_id.
   */
  static async createNotification(
    session: AppSession,
    data: {
      user_id?: string | null
      type: NotificationType
      title: string
      message: string
      entity_type?: string | null
      entity_id?: string | null
      action_url?: string | null
      read?: boolean
    }
  ): Promise<NotificationItem> {
    const orgId = getOrgId(session)
    const newNotification: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organization_id: orgId,
      user_id: data.user_id || null,
      type: data.type,
      title: data.title,
      message: data.message,
      read: data.read ?? false,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      action_url: data.action_url || null,
      created_at: new Date().toISOString(),
    }

    if (!isDemoSession(session)) {
      try {
        const supabase = createAdminClient()
        const { data: dbData, error } = await (supabase.from('notifications') as any)
          .insert({
            organization_id: orgId,
            user_id: newNotification.user_id,
            type: newNotification.type,
            title: newNotification.title,
            message: newNotification.message,
            read: newNotification.read,
            entity_type: newNotification.entity_type,
            entity_id: newNotification.entity_id,
            action_url: newNotification.action_url,
          })
          .select('*')
          .single()

        if (!error && dbData) {
          return dbData as NotificationItem
        }
      } catch {
        // Fall through to in-memory store
      }
    }

    inMemoryNotificationsStore.unshift(newNotification)
    return newNotification
  }

  /**
   * Dynamic evaluator that checks for low stock, overdue invoices, and expiring quotes,
   * generating notification entries if not already present.
   */
  static async generateSystemAlerts(session: AppSession): Promise<{ generated: number }> {
    if (isDemoSession(session)) {
      return { generated: 0 }
    }

    const orgId = getOrgId(session)
    let generatedCount = 0
    const existing = await this.getNotifications(session, { limit: 100 })

    const hasRecentEntityNotification = (type: NotificationType, entityId?: string | null) => {
      return existing.some(
        (n) => n.type === type && (entityId ? n.entity_id === entityId : true)
      )
    }

    try {
      const supabase = createAdminClient()
      const todayIso = new Date().toISOString().split('T')[0]

      // 1. Check Low Stock Products
      const { data: rawProducts } = await supabase
        .from('products')
        .select('id, name, current_stock, min_stock')
        .eq('organization_id', orgId)

      const products = (rawProducts || []) as any[]
      for (const p of products) {
        if (p.current_stock <= p.min_stock && !hasRecentEntityNotification('LOW_STOCK', p.id)) {
          await this.createNotification(session, {
            type: 'LOW_STOCK',
            title: `Low Stock Alert: ${p.name}`,
            message: `Stock level for ${p.name} is ${p.current_stock} (Min: ${p.min_stock}). Please reorder.`,
            entity_type: 'product',
            entity_id: p.id,
            action_url: `/dashboard/inventory/adjustments`,
          })
          generatedCount++
        }
      }

      // 2. Check Overdue Invoices
      const { data: rawInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, customer_name, due_date, status, total_amount_paise')
        .eq('organization_id', orgId)
        .in('status', ['ISSUED', 'UNPAID', 'PARTIALLY_PAID'])

      const invoices = (rawInvoices || []) as any[]
      for (const inv of invoices) {
        if (inv.due_date && inv.due_date < todayIso && !hasRecentEntityNotification('INVOICE_OVERDUE', inv.id)) {
          await this.createNotification(session, {
            type: 'INVOICE_OVERDUE',
            title: `Invoice Overdue: ${inv.invoice_number}`,
            message: `Invoice ${inv.invoice_number} for ${inv.customer_name || 'Customer'} is overdue (Due: ${inv.due_date}).`,
            entity_type: 'invoice',
            entity_id: inv.id,
            action_url: `/dashboard/sales/invoices/${inv.id}`,
          })
          generatedCount++
        }
      }

      // 3. Check Expiring Quotations
      const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      const { data: rawQuotations } = await supabase
        .from('quotations')
        .select('id, quotation_number, customer_name, valid_until, status')
        .eq('organization_id', orgId)
        .in('status', ['DRAFT', 'SENT'])

      const quotations = (rawQuotations || []) as any[]
      for (const q of quotations) {
        if (q.valid_until && q.valid_until <= threeDaysLater && !hasRecentEntityNotification('QUOTATION_EXPIRING', q.id)) {
          await this.createNotification(session, {
            type: 'QUOTATION_EXPIRING',
            title: `Quotation Expiring Soon: ${q.quotation_number}`,
            message: `Quotation ${q.quotation_number} for ${q.customer_name || 'Customer'} valid until ${q.valid_until}.`,
            entity_type: 'quotation',
            entity_id: q.id,
            action_url: `/dashboard/quotations/${q.id}`,
          })
          generatedCount++
        }
      }
    } catch {
      // Graceful error fallback
    }

    return { generated: generatedCount }
  }
}
