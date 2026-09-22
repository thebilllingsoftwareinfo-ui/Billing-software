import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/services/audit.service'
import { productSchema } from '@/lib/validators/product.schema'
import { can } from '@/lib/auth/permissions'
import { getServerSessionOptional } from '@/lib/auth/session'
import { demoGetProducts, demoAddProduct, demoUpdateProduct } from '@/lib/services/demo-store'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'products.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const category_id = searchParams.get('category_id') || ''
    const status = searchParams.get('status') || 'active'
    const stock_status = searchParams.get('stock_status') || 'all'
    const sort = searchParams.get('sort') || 'name_asc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let query = supabase
      .from('products')
      .select('*, product_categories(name), product_units(name, abbreviation)', { count: 'exact' })
      .eq('organization_id', session.organization_id)

    // Status filter
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'archived') {
      query = query.eq('is_active', false)
    }

    // Category filter
    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    // Search query filter
    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,hsn_sac_code.ilike.%${q}%`)
    }

    // Stock status filter
    if (stock_status === 'out_of_stock') {
      query = query.eq('current_stock', 0)
    } else if (stock_status === 'low_stock') {
      query = query.gt('current_stock', 0).lte('current_stock', 10)
    }

    // Sorting
    if (sort === 'name_asc') query = query.order('name', { ascending: true })
    else if (sort === 'name_desc') query = query.order('name', { ascending: false })
    else if (sort === 'price_asc') query = query.order('sale_price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('sale_price', { ascending: false })
    else if (sort === 'stock_desc') query = query.order('current_stock', { ascending: false })
    else if (sort === 'stock_asc') query = query.order('current_stock', { ascending: true })
    else query = query.order('name', { ascending: true })

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: products, count, error: queryError } = await query

    if (queryError) {
      if (session.user_id.includes('demo')) {
        const demoResult = demoGetProducts({
          q,
          category_id,
          status,
          stock_status,
          sort,
          page,
          limit,
        })
        return NextResponse.json({
          success: true,
          data: demoResult.products,
          pagination: demoResult.pagination,
          summary: demoResult.summary,
        })
      }
      console.error('[Products API] Query error:', queryError)
      return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
    }

    // Overall summary metrics for banner
    const { data: allActiveProducts } = await supabase
      .from('products')
      .select('current_stock, min_stock_level, sale_price, purchase_price')
      .eq('organization_id', session.organization_id)
      .eq('is_active', true)

    const totalProducts = count || 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalStockValue = 0

    allActiveProducts?.forEach((p) => {
      const stock = Number(p.current_stock) || 0
      const minLevel = Number(p.min_stock_level) || 0
      const purchaseVal = Number(p.purchase_price) || 0

      if (stock === 0) outOfStockCount++
      else if (minLevel > 0 && stock <= minLevel) lowStockCount++

      totalStockValue += stock * purchaseVal
    })

    return NextResponse.json({
      success: true,
      data: products || [],
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
      summary: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalStockValue,
      },
    })
  } catch (err) {
    console.error('[Products GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'products.create')) {
      return NextResponse.json({ success: false, error: 'Permission denied to create products' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid product data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const v = parsed.data
    const supabase = await createClient()

    // Check organization-scoped SKU uniqueness
    const { data: existingSku } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', session.organization_id)
      .eq('sku', v.sku)
      .limit(1)

    if (existingSku && existingSku.length > 0) {
      return NextResponse.json(
        { success: false, error: `SKU '${v.sku}' is already in use by another product in your organization.` },
        { status: 409 }
      )
    }

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    const openingStock = v.opening_stock || 0
    const openingStockValue = openingStock * (v.purchase_price || 0)

    // Insert product into Supabase
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        organization_id: session.organization_id,
        category_id: isValidUUID(v.category_id) ? v.category_id : null,
        unit_id: isValidUUID(v.unit_id) ? v.unit_id : null,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode || null,
        hsn_sac_code: v.hsn_sac_code || null,
        product_type: v.product_type,
        sale_price: v.selling_price,
        purchase_price: v.purchase_price,
        gst_rate: v.gst_rate,
        min_stock_level: v.min_stock_level,
        current_stock: openingStock,
        opening_stock: openingStock,
        opening_stock_value: openingStockValue,
        description: v.description || null,
        is_active: true,
        metal_type: v.metal_type || null,
        metal_weight: v.metal_weight || null,
        is_live_price: v.is_live_price || false,
        created_by: session.user_id,
      })
      .select()
      .single()

    if (insertError || !product) {
      if (session.user_id.includes('demo')) {
        const demoProduct = demoAddProduct({
          ...v,
          organization_id: session.organization_id,
        })
        return NextResponse.json({
          success: true,
          data: demoProduct,
        })
      }
      console.error('[Products POST API] Insert error:', insertError)
      return NextResponse.json({ success: false, error: insertError?.message || 'Failed to create product' }, { status: 500 })
    }

    if (openingStock > 0) {
      await supabase.from('inventory_movements').insert({
        organization_id: session.organization_id,
        product_id: product.id,
        movement_type: 'opening',
        quantity: openingStock,
        unit_cost: v.purchase_price || 0,
        total_cost: openingStockValue,
        description: 'Initial opening stock entry on product creation',
        created_by: session.user_id,
      })
    }

    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: 'created',
      resource_type: 'product',
      resource_id: product.id,
      new_values: { name: product.name, sku: product.sku, price: product.sale_price },
    })

    return NextResponse.json({ success: true, data: product })
  } catch (err) {
    console.error('[Products POST API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...patch } = body
    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        name: patch.name,
        sku: patch.sku,
        barcode: patch.barcode || null,
        hsn_sac_code: patch.hsn_sac_code || null,
        product_type: patch.product_type,
        sale_price: patch.selling_price || patch.sale_price,
        purchase_price: patch.purchase_price,
        gst_rate: patch.gst_rate,
        min_stock_level: patch.min_stock_level,
        description: patch.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .select()
      .single()

    if (error || !updated) {
      const demoProd = demoUpdateProduct(id, patch)
      if (demoProd) {
        return NextResponse.json({ success: true, data: demoProd })
      }
      return NextResponse.json({ success: false, error: error?.message || 'Failed to update product' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Products PUT API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
