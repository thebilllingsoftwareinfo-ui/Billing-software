import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { can } from '@/lib/auth/permissions'
import { salesReturnSchema } from '@/lib/validators/return.schema'
import { SalesReturnService } from '@/lib/services/sales-return.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'sales_returns.view')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions to view sales returns' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('q') || undefined

    const result = await SalesReturnService.getSalesReturns(session.organization_id, {
      page,
      limit,
      search,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[Sales Returns GET API] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch sales returns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'sales_returns.create')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions to create sales returns' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = salesReturnSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      return NextResponse.json({ success: false, error: `Validation error: ${fieldErrors}` }, { status: 400 })
    }

    const result = await SalesReturnService.createSalesReturn(session, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    console.error('[Sales Returns POST API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process sales return' },
      { status: err.message?.includes('exceeds remaining') ? 422 : 500 }
    )
  }
}
