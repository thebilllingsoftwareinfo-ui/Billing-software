import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/services/audit.service'
import { customerSchema } from '@/lib/validators/customer.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetCustomers, demoAddCustomer } from '@/lib/services/demo-store'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    if (!can(session.role, 'customers.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const status = searchParams.get('status') || 'active'
    const sort = searchParams.get('sort') || 'name_asc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let query = supabase
      .from('customers')
      .select('*, customer_addresses(*)', { count: 'exact' })
      .eq('organization_id', session.organization_id)

    // Status filter
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'archived') {
      query = query.eq('is_active', false)
    }

    // Search query filter
    if (q) {
      query = query.or(`display_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,gstin.ilike.%${q}%,legal_name.ilike.%${q}%`)
    }

    // Sorting
    if (sort === 'name_asc') query = query.order('display_name', { ascending: true })
    else if (sort === 'name_desc') query = query.order('display_name', { ascending: false })
    else if (sort === 'balance_desc') query = query.order('outstanding_balance', { ascending: false })
    else if (sort === 'created_desc') query = query.order('created_at', { ascending: false })
    else query = query.order('display_name', { ascending: true })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: customers, count, error: queryError } = await query

    if (queryError) {
      const demoResult = demoGetCustomers({ q, status, sort, page, limit })
      return NextResponse.json({
        success: true,
        data: demoResult.customers,
        pagination: demoResult.pagination,
        summary: demoResult.summary,
      })
    }

    // Overall summary metrics for header banner
    const { data: activeCustomers } = await supabase
      .from('customers')
      .select('outstanding_balance')
      .eq('organization_id', session.organization_id)
      .eq('is_active', true)

    const totalCustomers = count || 0
    const totalOutstanding = activeCustomers?.reduce((acc, c) => acc + (Number(c.outstanding_balance) || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: customers || [],
      pagination: {
        page,
        limit,
        total: totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
      },
      summary: {
        totalCustomers,
        totalOutstanding,
      },
    })
  } catch (err) {
    console.error('[Customers GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'customers.create')) {
      return NextResponse.json({ success: false, error: 'Permission denied to create customers' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = customerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const v = parsed.data
    const supabase = await createClient()

    // Insert customer row
    const { data: customer, error: insertError } = await supabase
      .from('customers')
      .insert({
        organization_id: session.organization_id,
        display_name: v.display_name,
        legal_name: v.legal_name || null,
        customer_type: v.customer_type,
        email: v.email || null,
        phone: v.phone || null,
        mobile: v.mobile || null,
        gstin: v.gstin || null,
        pan: v.pan || null,
        place_of_supply: v.place_of_supply || null,
        is_gst_registered: Boolean(v.gstin),
        credit_period_days: v.credit_period_days,
        credit_limit: v.credit_limit,
        outstanding_balance: v.opening_balance || 0,
        notes: v.notes || null,
        is_active: true,
        created_by: session.user_id,
      })
      .select()
      .single()

    if (insertError || !customer) {
      const demoCust = demoAddCustomer({ ...v, organization_id: session.organization_id })
      return NextResponse.json({
        success: true,
        data: demoCust,
      }, { status: 201 })
    }

    // Insert addresses if provided
    if (v.billing_address && v.billing_address.line1) {
      await supabase.from('customer_addresses').insert({
        organization_id: session.organization_id,
        customer_id: customer.id,
        address_type: 'billing',
        is_default: true,
        line1: v.billing_address.line1,
        line2: v.billing_address.line2 || null,
        city: v.billing_address.city,
        state: v.billing_address.state,
        state_code: v.billing_address.state_code || null,
        pincode: v.billing_address.pincode || null,
        country: v.billing_address.country || 'India',
      })
    }

    if (v.shipping_address && v.shipping_address.line1) {
      await supabase.from('customer_addresses').insert({
        organization_id: session.organization_id,
        customer_id: customer.id,
        address_type: 'shipping',
        is_default: true,
        line1: v.shipping_address.line1,
        line2: v.shipping_address.line2 || null,
        city: v.shipping_address.city,
        state: v.shipping_address.state,
        state_code: v.shipping_address.state_code || null,
        pincode: v.shipping_address.pincode || null,
        country: v.shipping_address.country || 'India',
      })
    }

    // Log opening balance transaction if > 0
    if (v.opening_balance && v.opening_balance !== 0) {
      await supabase.from('customer_transactions').insert({
        organization_id: session.organization_id,
        customer_id: customer.id,
        transaction_type: 'opening_balance',
        amount: v.opening_balance,
        balance_after: v.opening_balance,
        description: 'Opening balance setup',
      })
    }

    // Audit Log
    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: 'created',
      resource_type: 'customer',
      resource_id: customer.id,
      new_values: { name: customer.display_name, gstin: customer.gstin },
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (err) {
    console.error('[Customers POST API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
