import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import { 
  WhatsAppMessageLog, 
  WhatsAppTemplateType, 
  WhatsAppMessageStatus 
} from '@/types/app.types'
import { MetaWhatsAppProvider, MockWhatsAppProvider } from '@/lib/whatsapp/meta-provider'
import { AuditService } from '@/lib/services/audit.service'
import { formatCurrency } from '@/lib/utils/currency'

// In-memory message store for fallback & automated unit tests
const inMemoryWhatsAppLogs: WhatsAppMessageLog[] = []

// Customer opt-in consent store for in-memory testing
const inMemoryCustomerConsent: Record<string, boolean> = {}

const getOrgId = (session: AppSession): string => {
  return session.organization?.id || (session as any).organization_id || ''
}

export class WhatsAppService {
  /**
   * Reset in-memory store for unit test suites
   */
  static _clearInMemoryStore(): void {
    inMemoryWhatsAppLogs.length = 0
    Object.keys(inMemoryCustomerConsent).forEach((key) => delete inMemoryCustomerConsent[key])
  }

  /**
   * Set opt-in consent status for a customer phone number (unit testing / customer management)
   */
  static setCustomerOptIn(phone: string, optIn: boolean): void {
    const formatted = phone.replace(/[^\d+]/g, '')
    inMemoryCustomerConsent[formatted] = optIn
  }

  /**
   * Verifies customer WhatsApp opt-in consent and E.164 phone formatting.
   */
  static async checkConsent(
    session: AppSession,
    phone: string,
    customerId?: string | null
  ): Promise<{ optIn: boolean; phone: string; reason?: string }> {
    const orgId = getOrgId(session)
    const formatted = (phone || '').replace(/[^\d+]/g, '')

    if (!formatted || formatted.length < 10) {
      return { optIn: false, phone: formatted, reason: 'Invalid phone number format' }
    }

    // Check in-memory test overrides first
    if (inMemoryCustomerConsent[formatted] !== undefined) {
      return { optIn: inMemoryCustomerConsent[formatted], phone: formatted }
    }

    try {
      const supabase = createAdminClient()
      let query = supabase
        .from('customers')
        .select('id, phone, whatsapp_opt_in')
        .eq('organization_id', orgId)

      if (customerId) {
        query = query.eq('id', customerId)
      } else {
        query = query.eq('phone', formatted)
      }

      const { data } = await query.single()
      const cust = data as any

      if (cust && cust.whatsapp_opt_in === false) {
        return { optIn: false, phone: formatted, reason: 'Customer has opted out of WhatsApp messaging' }
      }
    } catch {
      // Fall through to default opt-in policy
    }

    // Default policy: customer opted-in if consent not explicitly revoked
    return { optIn: true, phone: formatted }
  }

  /**
   * Core execution method: sends template message if consent check passes.
   * Multi-tenant isolated by session.organization_id.
   */
  static async sendMessage(
    session: AppSession,
    data: {
      recipient_phone: string
      customer_id?: string | null
      template_type: WhatsAppTemplateType
      entity_type: 'invoice' | 'payment' | 'quotation'
      entity_id: string
      parameters: Record<string, string>
    }
  ): Promise<WhatsAppMessageLog> {
    const orgId = getOrgId(session)

    // 1. Consent Check Guard
    const consent = await this.checkConsent(session, data.recipient_phone, data.customer_id)

    if (!consent.optIn) {
      const blockedLog: WhatsAppMessageLog = {
        id: `wa_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organization_id: orgId,
        customer_id: data.customer_id || null,
        recipient_phone: data.recipient_phone,
        template_type: data.template_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        status: 'OPT_OUT_BLOCKED',
        error_message: consent.reason || 'Customer opt-in consent missing or blocked',
        parameters: data.parameters,
        sent_at: new Date().toISOString(),
      }

      inMemoryWhatsAppLogs.unshift(blockedLog)
      return blockedLog
    }

    // 2. Transmit via Provider (Meta Cloud API with fallback)
    const provider = new MetaWhatsAppProvider()
    const result = await provider.sendMessage({
      recipient_phone: consent.phone,
      template_type: data.template_type,
      parameters: data.parameters,
    })

    const logRecord: WhatsAppMessageLog = {
      id: `wa_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organization_id: orgId,
      customer_id: data.customer_id || null,
      recipient_phone: consent.phone,
      template_type: data.template_type,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      status: result.status,
      provider_message_id: result.provider_message_id || null,
      error_message: result.error || null,
      parameters: data.parameters,
      sent_at: new Date().toISOString(),
    }

    // Persist to database if available
    try {
      const supabase = createAdminClient()
      await supabase.from('whatsapp_message_logs').insert({
        organization_id: orgId,
        customer_id: logRecord.customer_id,
        recipient_phone: logRecord.recipient_phone,
        template_type: logRecord.template_type,
        entity_type: logRecord.entity_type,
        entity_id: logRecord.entity_id,
        status: logRecord.status,
        provider_message_id: logRecord.provider_message_id,
        error_message: logRecord.error_message,
        parameters: logRecord.parameters,
        sent_at: logRecord.sent_at,
      } as any)
    } catch {
      // Graceful fallback
    }

    inMemoryWhatsAppLogs.unshift(logRecord)

    // Audit Event
    await AuditService.log({
      organization_id: orgId,
      user_id: session.user.id,
      action: 'whatsapp.message_sent' as any,
      resource_type: 'whatsapp' as any,
      resource_id: logRecord.id,
      details: {
        template_type: data.template_type,
        recipient_phone: consent.phone,
        status: result.status,
      },
    })

    return logRecord
  }

  /**
   * Helper: Send Invoice Created Message
   */
  static async sendInvoiceCreated(
    session: AppSession,
    invoiceData: {
      id: string
      invoice_number: string
      customer_name: string
      customer_phone: string
      customer_id?: string | null
      total_amount_paise: number
      due_date?: string | null
    }
  ): Promise<WhatsAppMessageLog> {
    const params = {
      customer_name: invoiceData.customer_name || 'Valued Customer',
      invoice_number: invoiceData.invoice_number,
      total_amount: formatCurrency(invoiceData.total_amount_paise),
      due_date: invoiceData.due_date || 'On Receipt',
      pdf_link: `https://app.wevly.com/invoices/${invoiceData.id}/pdf`,
    }

    return this.sendMessage(session, {
      recipient_phone: invoiceData.customer_phone,
      customer_id: invoiceData.customer_id,
      template_type: 'invoice.created',
      entity_type: 'invoice',
      entity_id: invoiceData.id,
      parameters: params,
    })
  }

  /**
   * Helper: Send Payment Reminder Message (Overdue Invoice)
   */
  static async sendPaymentReminder(
    session: AppSession,
    invoiceData: {
      id: string
      invoice_number: string
      customer_name: string
      customer_phone: string
      customer_id?: string | null
      outstanding_amount_paise: number
      due_date?: string | null
    }
  ): Promise<WhatsAppMessageLog> {
    const params = {
      customer_name: invoiceData.customer_name || 'Valued Customer',
      invoice_number: invoiceData.invoice_number,
      outstanding_amount: formatCurrency(invoiceData.outstanding_amount_paise),
      due_date: invoiceData.due_date || 'Immediate',
      payment_link: `https://app.wevly.com/pay/${invoiceData.id}`,
    }

    return this.sendMessage(session, {
      recipient_phone: invoiceData.customer_phone,
      customer_id: invoiceData.customer_id,
      template_type: 'invoice.overdue',
      entity_type: 'invoice',
      entity_id: invoiceData.id,
      parameters: params,
    })
  }

  /**
   * Helper: Send Payment Receipt Confirmation Message
   */
  static async sendPaymentConfirmation(
    session: AppSession,
    paymentData: {
      id: string
      payment_number: string
      customer_name: string
      customer_phone: string
      customer_id?: string | null
      amount_paise: number
      remaining_balance_paise: number
    }
  ): Promise<WhatsAppMessageLog> {
    const params = {
      customer_name: paymentData.customer_name || 'Valued Customer',
      payment_number: paymentData.payment_number,
      amount_paid: formatCurrency(paymentData.amount_paise),
      remaining_balance: formatCurrency(paymentData.remaining_balance_paise),
      receipt_link: `https://app.wevly.com/payments/${paymentData.id}/receipt`,
    }

    return this.sendMessage(session, {
      recipient_phone: paymentData.customer_phone,
      customer_id: paymentData.customer_id,
      template_type: 'payment.received',
      entity_type: 'payment',
      entity_id: paymentData.id,
      parameters: params,
    })
  }

  /**
   * Helper: Send Quotation Message
   */
  static async sendQuotationCreated(
    session: AppSession,
    quotationData: {
      id: string
      quotation_number: string
      customer_name: string
      customer_phone: string
      customer_id?: string | null
      total_amount_paise: number
      valid_until?: string | null
    }
  ): Promise<WhatsAppMessageLog> {
    const params = {
      customer_name: quotationData.customer_name || 'Valued Customer',
      quotation_number: quotationData.quotation_number,
      total_amount: formatCurrency(quotationData.total_amount_paise),
      valid_until: quotationData.valid_until || '15 Days',
      quote_link: `https://app.wevly.com/quotations/${quotationData.id}`,
    }

    return this.sendMessage(session, {
      recipient_phone: quotationData.customer_phone,
      customer_id: quotationData.customer_id,
      template_type: 'quotation.created',
      entity_type: 'quotation',
      entity_id: quotationData.id,
      parameters: params,
    })
  }

  /**
   * Retrieves message logs for tenant session.
   */
  static async getMessageLogs(session: AppSession, limit: number = 50): Promise<WhatsAppMessageLog[]> {
    const orgId = getOrgId(session)

    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('whatsapp_message_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        return data as WhatsAppMessageLog[]
      }
    } catch {
      // Fall through
    }

    return inMemoryWhatsAppLogs
      .filter((log) => log.organization_id === orgId)
      .slice(0, limit)
  }
}
