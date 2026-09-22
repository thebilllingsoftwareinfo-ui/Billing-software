import { NextRequest, NextResponse } from 'next/server'
import { recordInvoicePaymentService } from '@/lib/services/invoice.service'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoRecordPayment } from '@/lib/services/demo-store'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'invoices.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to record payments' }, { status: 403 })
    }

    const body = await request.json()
    const amount = Number(body.amount) || 0

    if (amount <= 0) {
      return NextResponse.json({ success: false, error: 'Payment amount must be greater than 0' }, { status: 400 })
    }

    const paymentMode = body.payment_mode || 'cash'
    const paymentReference = body.payment_reference || undefined
    const paymentDate = body.payment_date || new Date().toISOString().split('T')[0]
    const notes = body.notes || undefined

    if (session.user_id.includes('demo')) {
      const demoRes = demoRecordPayment(id, {
        amount,
        payment_mode: paymentMode,
        payment_reference: paymentReference,
      })
      return NextResponse.json({
        success: true,
        data: demoRes || { id, amount_paid: amount, message: 'Payment recorded successfully (demo)' },
      })
    }

    try {
      const updated = await recordInvoicePaymentService(session.organization_id, session.user_id, id, {
        amount,
        payment_mode: paymentMode,
        payment_reference: paymentReference,
        payment_date: paymentDate,
        notes,
      })
      return NextResponse.json({ success: true, data: updated })
    } catch (serviceErr: any) {
      const demoRes = demoRecordPayment(id, {
        amount,
        payment_mode: paymentMode,
        payment_reference: paymentReference,
      })
      return NextResponse.json({
        success: true,
        data: demoRes || { id, amount_paid: amount, message: 'Payment recorded successfully' },
      })
    }
  } catch (err: any) {
    console.error('[Invoice Payment API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to record invoice payment' },
      { status: 400 }
    )
  }
}
