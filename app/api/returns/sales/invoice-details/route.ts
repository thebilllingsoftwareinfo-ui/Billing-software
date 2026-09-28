import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { can } from '@/lib/auth/permissions'
import { SalesReturnService } from '@/lib/services/sales-return.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'sales_returns.view') && !can(session.role, 'sales_returns.create')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoice_id')

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'invoice_id parameter is required' }, { status: 400 })
    }

    const details = await SalesReturnService.getReturnableInvoiceDetails(session.organization_id, invoiceId)
    return NextResponse.json({ success: true, data: details })
  } catch (err: any) {
    console.error('[Sales Return Invoice Details API] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch invoice details' }, { status: 404 })
  }
}
