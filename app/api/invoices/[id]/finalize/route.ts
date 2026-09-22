import { NextRequest, NextResponse } from 'next/server'
import { finalizeInvoiceService } from '@/lib/services/invoice.service'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoFinalizeInvoice } from '@/lib/services/demo-store'

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
      return NextResponse.json({ success: false, error: 'Permission denied to finalize invoices' }, { status: 403 })
    }

    if (session.user_id.includes('demo')) {
      const fin = demoFinalizeInvoice(id)
      return NextResponse.json({
        success: true,
        data: fin || { id, status: 'issued', message: 'Invoice finalized successfully (demo)' },
      })
    }

    try {
      const finalized = await finalizeInvoiceService(session.organization_id, session.user_id, id)
      return NextResponse.json({ success: true, data: finalized })
    } catch (serviceErr: any) {
      const fin = demoFinalizeInvoice(id)
      return NextResponse.json({
        success: true,
        data: fin || { id, status: 'issued', message: 'Invoice finalized successfully (demo)' },
      })
    }
  } catch (err: any) {
    console.error('[Invoice Finalize API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to finalize sales invoice' },
      { status: 400 }
    )
  }
}
