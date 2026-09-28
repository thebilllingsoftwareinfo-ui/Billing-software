import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { can } from '@/lib/auth/permissions'
import { CashBankService } from '@/lib/services/cash-bank.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'reports.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const account_id = searchParams.get('account_id') || undefined
    const direction = (searchParams.get('direction') as 'in' | 'out') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await CashBankService.getTransactions(session, {
      account_id,
      direction,
      startDate,
      endDate,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: result.transactions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    })
  } catch (err: any) {
    console.error('[Cash/Bank Transactions GET] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'payments.create')) {
      return NextResponse.json({ success: false, error: 'Permission denied to record transaction' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.direction || !body.amount || !body.transaction_type) {
      return NextResponse.json(
        { success: false, error: 'Direction, amount, and transaction_type are required' },
        { status: 400 }
      )
    }

    const txn = await CashBankService.recordTransaction(session, body)
    return NextResponse.json({ success: true, data: txn }, { status: 201 })
  } catch (err: any) {
    console.error('[Cash/Bank Transactions POST] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Failed to record transaction' }, { status: 400 })
  }
}
