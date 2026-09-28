import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { can } from '@/lib/auth/permissions'
import { PurchaseReturnService } from '@/lib/services/purchase-return.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'purchase_returns.view') && !can(session.role, 'purchase_returns.create')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const billId = searchParams.get('bill_id')

    if (!billId) {
      return NextResponse.json({ success: false, error: 'bill_id parameter is required' }, { status: 400 })
    }

    const details = await PurchaseReturnService.getReturnableBillDetails(session.organization_id, billId)
    return NextResponse.json({ success: true, data: details })
  } catch (err: any) {
    console.error('[Purchase Return Bill Details API] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch purchase bill details' }, { status: 404 })
  }
}
