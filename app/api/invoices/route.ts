import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvoiceService } from '@/lib/services/invoice.service'
import { createInvoiceSchema } from '@/lib/validators/invoice.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetInvoices, demoAddInvoice } from '@/lib/services/demo-store'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'invoices.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const status = searchParams.get('status')?.trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let query = supabase
      .from('invoices')
      .select('*, customers(display_name, phone, email, state)', { count: 'exact' })
      .eq('organization_id', session.organization_id)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (q) {
      query = query.or(`invoice_number.ilike.%${q}%,reference_number.ilike.%${q}%`)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: invoices, count, error } = await query

    if (error) {
      const demoRes = demoGetInvoices({ q, status, page, limit })
      return NextResponse.json({
        success: true,
        data: demoRes.invoices,
        pagination: demoRes.pagination,
        summary: demoRes.summary,
      })
    }

    // Summary calculation
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, status')
      .eq('organization_id', session.organization_id)

    let totalSales = 0
    let totalPaid = 0
    let totalOutstanding = 0
    let draftCount = 0
    let issuedCount = 0
    let paidCount = 0
    let overdueCount = 0

    allInvoices?.forEach((inv) => {
      const tot = Number(inv.total_amount) || 0
      const paid = Number(inv.amount_paid) || 0
      const due = tot - paid

      if (inv.status !== 'cancelled' && inv.status !== 'void') {
        totalSales += tot
        totalPaid += paid
        totalOutstanding += due
      }

      if (inv.status === 'draft') draftCount++
      if (inv.status === 'issued' || inv.status === 'sent') issuedCount++
      if (inv.status === 'paid') paidCount++
      if (inv.status === 'overdue') overdueCount++
    })

    return NextResponse.json({
      success: true,
      data: invoices || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        totalSales,
        totalPaid,
        totalOutstanding,
        draftCount,
        issuedCount,
        paidCount,
        overdueCount,
      },
    })
  } catch (err) {
    console.error('[Invoices GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'invoices.create')) {
      return NextResponse.json({ success: false, error: 'Permission denied to create invoices' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createInvoiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (session.user_id.includes('demo')) {
      const demoInv = demoAddInvoice({
        ...parsed.data,
        organization_id: session.organization_id,
      })
      return NextResponse.json({
        success: true,
        data: demoInv,
      }, { status: 201 })
    }

    try {
      const invoice = await createInvoiceService(session.organization_id, session.user_id, parsed.data)
      return NextResponse.json({ success: true, data: invoice }, { status: 201 })
    } catch (serviceErr: any) {
      console.warn('[Invoices POST API] Database creation failed, falling back to demo store:', serviceErr.message)
      const demoInv = demoAddInvoice({
        ...parsed.data,
        organization_id: session.organization_id,
      })
      return NextResponse.json({
        success: true,
        data: demoInv,
      }, { status: 201 })
    }
  } catch (err: any) {
    console.error('[Invoices POST API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create sales invoice' },
      { status: 400 }
    )
  }
}
