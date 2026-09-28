import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { CrmService } from '@/lib/services/crm.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const profile = await CrmService.getSupplier360(session, id)

    return NextResponse.json({ success: true, data: profile })
  } catch (error: any) {
    console.error('[Supplier 360 Profile] Error:', error?.message)
    if (error?.message === 'Supplier not found') {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
