import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { requirePermission } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const sessionObj = {
      user: { id: session.user_id, email: 'demo@acmeindustrial.com' },
      organization: { id: session.organization_id },
      member: { role: session.role },
    } as any

    const body = await request.json()
    const { action_type, entity_data } = body

    if (!action_type || !entity_data || !entity_data.id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: action_type, entity_data' },
        { status: 400 }
      )
    }

    if (session.user_id.includes('demo')) {
      return NextResponse.json({
        success: true,
        data: {
          id: `wa-demo-${Date.now()}`,
          status: 'SENT',
          recipient_phone: entity_data.customer_phone || '+91 98765 43210',
          message_type: action_type,
          sent_at: new Date().toISOString(),
        },
      })
    }

    let resultLog

    switch (action_type) {
      case 'invoice.created':
        requirePermission(session.role, 'invoice.view')
        resultLog = await WhatsAppService.sendInvoiceCreated(sessionObj, entity_data)
        break

      case 'invoice.overdue':
        requirePermission(session.role, 'invoice.view')
        resultLog = await WhatsAppService.sendPaymentReminder(sessionObj, entity_data)
        break

      case 'payment.received':
        requirePermission(session.role, 'payment.view')
        resultLog = await WhatsAppService.sendPaymentConfirmation(sessionObj, entity_data)
        break

      case 'quotation.created':
        requirePermission(session.role, 'invoice.view')
        resultLog = await WhatsAppService.sendQuotationCreated(sessionObj, entity_data)
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported WhatsApp action_type: ${action_type}` },
          { status: 400 }
        )
    }

    if (resultLog?.status === 'OPT_OUT_BLOCKED') {
      return NextResponse.json({
        success: false,
        error: resultLog.error_message || 'Customer has opted out of WhatsApp messaging.',
        data: resultLog,
      }, { status: 400 })
    }

    if (resultLog?.status === 'FAILED') {
      return NextResponse.json({
        success: false,
        error: resultLog.error_message || 'Failed to send WhatsApp message.',
        data: resultLog,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: resultLog,
    })
  } catch (err: any) {
    console.error('[WhatsApp Send API Error]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: err.status || 500 }
    )
  }
}
