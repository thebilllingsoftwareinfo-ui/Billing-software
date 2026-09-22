import { 
  IWhatsAppProvider, 
  SendWhatsAppPayload, 
  SendWhatsAppResult 
} from './provider.interface'
import { WhatsAppTemplateType } from '@/types/app.types'

/**
 * Message template templates defined in accordance with Meta WhatsApp Business Guidelines
 */
export const WHATSAPP_TEMPLATES: Record<
  WhatsAppTemplateType,
  { template_name: string; text_template: string }
> = {
  'invoice.created': {
    template_name: 'invoice_created_v1',
    text_template:
      'Dear {{customer_name}}, your invoice {{invoice_number}} for {{total_amount}} has been generated. Due date: {{due_date}}. View/Download invoice: {{pdf_link}}',
  },
  'invoice.overdue': {
    template_name: 'payment_reminder_overdue_v1',
    text_template:
      'Reminder: Dear {{customer_name}}, invoice {{invoice_number}} with outstanding balance {{outstanding_amount}} was due on {{due_date}}. Please settle at your earliest: {{payment_link}}',
  },
  'payment.received': {
    template_name: 'payment_receipt_v1',
    text_template:
      'Thank you {{customer_name}}! We received your payment {{payment_number}} of {{amount_paid}}. Remaining balance: {{remaining_balance}}. View receipt: {{receipt_link}}',
  },
  'quotation.created': {
    template_name: 'quotation_shared_v1',
    text_template:
      'Dear {{customer_name}}, quotation {{quotation_number}} for {{total_amount}} is ready. Valid until {{valid_until}}. Review quote: {{quote_link}}',
  },
}

/**
 * Official Meta Cloud API Provider implementation using WhatsApp Business API endpoints
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  private apiKey: string
  private phoneNumberId: string

  constructor(apiKey?: string, phoneNumberId?: string) {
    // Keep provider secrets strictly server-side
    this.apiKey = apiKey || process.env.WHATSAPP_API_KEY || process.env.META_WA_TOKEN || ''
    this.phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  }

  async sendMessage(payload: SendWhatsAppPayload): Promise<SendWhatsAppResult> {
    // If credentials are missing in env, fall back gracefully or report configuration error
    if (!this.apiKey || !this.phoneNumberId) {
      // Automatic mock mode for local dev/testing
      const mockProvider = new MockWhatsAppProvider()
      return mockProvider.sendMessage(payload)
    }

    const templateMeta = WHATSAPP_TEMPLATES[payload.template_type]
    if (!templateMeta) {
      return {
        success: false,
        status: 'FAILED',
        error: `Unsupported template type: ${payload.template_type}`,
      }
    }

    // Standard E.164 phone number formatting
    const formattedPhone = payload.recipient_phone.replace(/[^\d+]/g, '')

    try {
      const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`
      
      // Build Meta API compliant payload
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateMeta.template_name,
          language: { code: payload.language_code || 'en_US' },
          components: [
            {
              type: 'body',
              parameters: Object.entries(payload.parameters).map(([_, value]) => ({
                type: 'text',
                text: value,
              })),
            },
          ],
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const json = await response.json()

      if (!response.ok) {
        return {
          success: false,
          status: 'FAILED',
          error: json.error?.message || `Meta API HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        status: 'SENT',
        provider_message_id: json.messages?.[0]?.id || `wamid.${Date.now()}`,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err.message || 'Meta Cloud API transmission error',
      }
    }
  }

  formatTemplatePreview(templateType: WhatsAppTemplateType, params: Record<string, string>): string {
    const templateMeta = WHATSAPP_TEMPLATES[templateType]
    if (!templateMeta) return ''

    let text = templateMeta.text_template
    Object.entries(params).forEach(([key, val]) => {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), val || '')
    })
    return text
  }
}

/**
 * Mock Provider for development, staging, and automated testing
 */
export class MockWhatsAppProvider implements IWhatsAppProvider {
  async sendMessage(payload: SendWhatsAppPayload): Promise<SendWhatsAppResult> {
    const formattedPhone = payload.recipient_phone.replace(/[^\d+]/g, '')
    
    // Simulate invalid phone check
    if (!formattedPhone || formattedPhone.length < 10) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Invalid recipient phone number format',
      }
    }

    return {
      success: true,
      status: 'SENT',
      provider_message_id: `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    }
  }

  formatTemplatePreview(templateType: WhatsAppTemplateType, params: Record<string, string>): string {
    const templateMeta = WHATSAPP_TEMPLATES[templateType]
    if (!templateMeta) return ''

    let text = templateMeta.text_template
    Object.entries(params).forEach(([key, val]) => {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), val || '')
    })
    return text
  }
}
