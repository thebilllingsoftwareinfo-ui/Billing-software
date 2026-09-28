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

    const accounts = await CashBankService.getAccounts(session)
    return NextResponse.json({ success: true, data: accounts })
  } catch (err: any) {
    console.error('[Cash/Bank Accounts GET] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'settings.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to create account' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.account_name || !body.account_type) {
      return NextResponse.json(
        { success: false, error: 'Account name and account type are required' },
        { status: 400 }
      )
    }

    const account = await CashBankService.createAccount(session, body)
    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (err: any) {
    console.error('[Cash/Bank Accounts POST] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Failed to create account' }, { status: 400 })
  }
}
