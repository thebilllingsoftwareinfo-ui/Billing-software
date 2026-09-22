import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'inventory.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')
    const movement_type = searchParams.get('movement_type')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let query = supabase
      .from('inventory_movements')
      .select('*, products(name, sku)', { count: 'exact' })
      .eq('organization_id', session.organization_id)

    if (product_id) query = query.eq('product_id', product_id)
    if (movement_type) query = query.eq('movement_type', movement_type)

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: movements, count, error } = await query

    if (error) {
      if (session.user_id.includes('demo')) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
        })
      }
      return NextResponse.json({ success: false, error: 'Failed to fetch stock movements' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: movements || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error('[Inventory Movements GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
