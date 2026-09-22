import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateInventoryValuation } from '@/lib/services/inventory.service'
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
    const q = searchParams.get('q')?.trim() || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // Query inventory tracked products
    let query = supabase
      .from('products')
      .select('*, product_categories(name), product_units(name, abbreviation)', { count: 'exact' })
      .eq('organization_id', session.organization_id)
      .eq('track_inventory', true)
      .eq('is_active', true)

    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`)
    }

    query = query.order('name', { ascending: true }).range(offset, offset + limit - 1)

    const { data: items, count, error } = await query

    if (error) {
      if (session.user_id.includes('demo')) {
        return NextResponse.json({
          success: true,
          data: [
            {
              id: 'prod-demo-1',
              name: 'Industrial Valve 2-inch',
              sku: 'SKU-682844',
              current_stock: 15,
              min_stock_level: 5,
              sale_price: 600,
              purchase_price: 410,
              product_units: { name: 'Piece', abbreviation: 'PCS' },
              product_categories: { name: 'Hardware' },
            },
          ],
          pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
          summary: {
            totalTrackedItems: 1,
            totalValuation: 6150,
            retailValuation: 9000,
            lowStockCount: 0,
          },
        })
      }
      console.error('[Inventory API] Fetch error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 500 })
    }

    // Valuation foundation
    let totalCostVal = 0
    let totalRetailVal = 0
    try {
      const valuation = await calculateInventoryValuation(session.organization_id)
      totalCostVal = valuation.totalCostValuation
      totalRetailVal = valuation.totalRetailValuation
    } catch {
      // Ignore if demo
    }

    // Low stock count
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', session.organization_id)
      .eq('track_inventory', true)
      .eq('is_active', true)
      .lte('current_stock', 5)

    return NextResponse.json({
      success: true,
      data: items || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        totalTrackedItems: count || 0,
        totalValuation: totalCostVal,
        retailValuation: totalRetailVal,
        lowStockCount: lowStockProducts?.length || 0,
      },
    })
  } catch (err) {
    console.error('[Inventory GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
