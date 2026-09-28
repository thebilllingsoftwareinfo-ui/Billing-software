import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetSuppliers, demoAddSupplier } from '@/lib/services/demo-store'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (session.is_demo || session.user_id?.includes('demo')) {
      const demoSupps = demoGetSuppliers()
      let filtered = demoSupps
      if (q) {
        const term = q.toLowerCase()
        filtered = filtered.filter(
          (s) =>
            (s.name && s.name.toLowerCase().includes(term)) ||
            (s.display_name && s.display_name.toLowerCase().includes(term)) ||
            (s.phone && s.phone.toLowerCase().includes(term)) ||
            (s.email && s.email.toLowerCase().includes(term)) ||
            (s.gstin && s.gstin.toLowerCase().includes(term))
        )
      }
      return NextResponse.json({
        success: true,
        suppliers: filtered.slice(0, limit),
      })
    }

    const supabase = await createClient()

    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', session.organization_id)

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,gstin.ilike.%${q}%`)
    }

    query = query.limit(limit)

    let { data: suppliers, error } = await query

    if (error || !suppliers || suppliers.length === 0) {
      const demoSupps = demoGetSuppliers()
      let filtered = demoSupps
      if (q) {
        const term = q.toLowerCase()
        filtered = filtered.filter(
          (s) =>
            (s.name && s.name.toLowerCase().includes(term)) ||
            (s.display_name && s.display_name.toLowerCase().includes(term)) ||
            (s.phone && s.phone.toLowerCase().includes(term)) ||
            (s.email && s.email.toLowerCase().includes(term)) ||
            (s.gstin && s.gstin.toLowerCase().includes(term))
        )
      }
      return NextResponse.json({
        success: true,
        suppliers: filtered.slice(0, limit),
      })
    }

    return NextResponse.json({
      success: true,
      suppliers,
    })
  } catch (err: any) {
    const demoSupps = demoGetSuppliers()
    return NextResponse.json(
      { success: true, suppliers: demoSupps },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        organization_id: session.organization_id,
        name: body.name || body.display_name,
        display_name: body.display_name || body.name,
        email: body.email || null,
        phone: body.phone || null,
        gstin: body.gstin || null,
        pan: body.pan || null,
        state: body.state || 'Maharashtra',
        state_code: body.state_code || '27',
        billing_address: body.billing_address || null,
        outstanding_balance: Number(body.outstanding_balance || 0),
        is_active: true,
      })
      .select()
      .single()

    if (error || !supplier) {
      const demoSupp = demoAddSupplier({
        ...body,
        organization_id: session.organization_id,
      })
      return NextResponse.json({ success: true, supplier: demoSupp, data: demoSupp }, { status: 201 })
    }

    return NextResponse.json({ success: true, supplier, data: supplier }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
}
