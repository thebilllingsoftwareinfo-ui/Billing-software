import { WhatsAppTemplateType, WhatsAppMessageStatus } from '@/types/app.types'

export interface SendWhatsAppPayload {
  recipient_phone: string
  template_type: WhatsAppTemplateType
  language_code?: string
  parameters: Record<string, string>
}

export interface SendWhatsAppResult {
  success: boolean
  status: WhatsAppMessageStatus
  provider_message_id?: string
  error?: string
}

export interface IWhatsAppProvider {
  /**
   * Send a template message using approved WhatsApp Business API
   */
  sendMessage(payload: SendWhatsAppPayload): Promise<SendWhatsAppResult>

  /**
   * Returns interpolated message template text for preview purposes
   */
  formatTemplatePreview(templateType: WhatsAppTemplateType, params: Record<string, string>): string
}
