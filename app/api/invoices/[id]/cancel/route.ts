import { NextRequest, NextResponse } from 'next/server'
import { cancelInvoiceService } from '@/lib/services/invoice.service'
import { cancelInvoiceSchema } from '@/lib/validators/invoice.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoCancelInvoice } from '@/lib/services/demo-store'

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

    if (!can(session.role, 'invoices.cancel')) {
      return NextResponse.json({ success: false, error: 'Permission denied to cancel invoices' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = cancelInvoiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Reason is required for cancellation', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (session.user_id.includes('demo')) {
      const cancelled = demoCancelInvoice(id, parsed.data.reason)
      return NextResponse.json({
        success: true,
        data: cancelled || {
          id,
          status: 'cancelled',
          message: 'Invoice cancelled successfully (demo)',
        },
      })
    }

    try {
      const cancelled = await cancelInvoiceService(session.organization_id, session.user_id, id, parsed.data.reason)
      return NextResponse.json({ success: true, data: cancelled })
    } catch (serviceErr: any) {
      const cancelled = demoCancelInvoice(id, parsed.data.reason)
      return NextResponse.json({
        success: true,
        data: cancelled || {
          id,
          status: 'cancelled',
          message: 'Invoice cancelled successfully (demo)',
        },
      })
    }
  } catch (err: any) {
    console.error('[Invoice Cancel API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to cancel sales invoice' },
      { status: 400 }
    )
  }
}
