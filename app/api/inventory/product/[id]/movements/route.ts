import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { can } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeStockStatus } from '@/lib/services/inventory.service'
import { demoProducts, DEMO_ORG_ID } from '@/lib/services/demo-store'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'inventory.view')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { id: productId } = await params
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const movementType = searchParams.get('movement_type')
    const direction = searchParams.get('direction')?.toUpperCase() // 'IN' | 'OUT' | 'ALL'
    const reference = searchParams.get('reference')?.trim()
    const reason = searchParams.get('reason')?.trim()
    const format = searchParams.get('format') // 'csv'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    // 1. Fetch product details & verify tenant isolation
    const { data: dbProduct, error: prodErr } = await (supabase.from('products') as any)
      .select('*, product_categories(name), product_units(name, abbreviation)')
      .eq('id', productId)
      .eq('organization_id', session.organization_id)
      .single()

    let product = dbProduct

    if (!product || prodErr) {
      const demoProd = demoProducts.find(
        (p) => p.id === productId && (p.organization_id === session.organization_id || session.organization_id === DEMO_ORG_ID)
      )
      if (demoProd) {
        product = {
          ...demoProd,
          product_units: { name: demoProd.primary_unit || 'Piece', abbreviation: demoProd.primary_unit || 'PCS' },
        }
      }
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or does not belong to your organization' },
        { status: 404 }
      )
    }

    // 2. Build movement query
    let query = (supabase.from('inventory_movements') as any)
      .select('*', { count: 'exact' })
      .eq('organization_id', session.organization_id)
      .eq('product_id', productId)

    if (dateFrom) {
      query = query.gte('movement_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('movement_date', dateTo)
    }
    if (movementType && movementType !== 'ALL') {
      query = query.eq('movement_type', movementType.toLowerCase())
    }
    if (direction === 'IN') {
      query = query.gt('quantity', 0)
    } else if (direction === 'OUT') {
      query = query.lt('quantity', 0)
    }
    if (reference) {
      query = query.or(`reference_number.ilike.%${reference}%,reference_type.ilike.%${reference}%`)
    }
    if (reason) {
      query = query.ilike('notes', `%${reason}%`)
    }

    query = query.order('created_at', { ascending: false })

    if (format !== 'csv') {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: movements, count, error: movErr } = await query

    const finalMovements = movements || []
    const totalCount = count || finalMovements.length

    // Compute stock status
    const stockStatus = computeStockStatus(
      Number(product.current_stock) || 0,
      product.reorder_level !== undefined ? product.reorder_level : product.min_stock_level
    )

    // Handle CSV export
    if (format === 'csv') {
      const csvRows = [
        ['Date', 'Movement Type', 'Direction', 'Quantity', 'Unit Cost', 'Total Cost', 'Running Balance', 'Reference Type', 'Reference Number', 'Notes'].join(','),
      ]

      for (const m of finalMovements) {
        const qty = Number(m.quantity) || 0
        const dir = qty >= 0 ? 'IN' : 'OUT'
        const cleanNotes = (m.notes || '').replace(/"/g, '""')
        csvRows.push([
          m.movement_date || '',
          m.movement_type || '',
          dir,
          Math.abs(qty),
          m.unit_cost || 0,
          m.total_cost || 0,
          m.running_balance || '',
          m.reference_type || '',
          m.reference_number || '',
          `"${cleanNotes}"`,
        ].join(','))
      }

      const csvContent = csvRows.join('\n')
      const filename = `stock-ledger-${(product.sku || product.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        current_stock: Number(product.current_stock) || 0,
        reorder_level: product.reorder_level ?? product.min_stock_level ?? 0,
        primary_unit: product.primary_unit || product.product_units?.abbreviation || 'PCS',
        secondary_unit: product.secondary_unit || null,
        conversion_rate: product.conversion_rate || null,
        stock_status: stockStatus,
      },
      data: finalMovements,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    })
  } catch (err: any) {
    console.error('[Product Movements API] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch stock movements' }, { status: 500 })
  }
}
