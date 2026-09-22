import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/services/audit.service'
import { productSchema } from '@/lib/validators/product.schema'
import { can } from '@/lib/auth/permissions'
import { getServerSessionOptional } from '@/lib/auth/session'
import { demoGetProduct, demoUpdateProduct, demoDeleteProduct } from '@/lib/services/demo-store'

const isValidUUID = (str?: string | null) =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'products.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const supabase = await createClient()

    // Fetch product details with category & unit joins
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, product_categories(id, name), product_units(id, name, abbreviation)')
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (productError || !product) {
      if (session.user_id.includes('demo')) {
        const demoData = demoGetProduct(id)
        if (demoData) {
          return NextResponse.json({
            success: true,
            data: demoData,
          })
        }
        return NextResponse.json({
          success: true,
          data: {
            product: {
              id,
              name: 'Demo Product',
              sku: 'SKU-DEMO',
              sale_price: 699,
              purchase_price: 500,
              gst_rate: 18,
              current_stock: 10,
              min_stock_level: 5,
              is_active: true,
              organization_id: session.organization_id,
            },
            movements: [],
          },
        })
      }
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Fetch stock movement history ledger for this product
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', id)
      .eq('organization_id', session.organization_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: {
        product,
        movements: movements || [],
      },
    })
  } catch (err) {
    console.error('[Product Detail GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'products.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to edit products' }, { status: 403 })
    }

    const body = await request.json()

    // REQUIREMENT CHECK: Direct stock mutation prevention
    if (body.current_stock !== undefined || body.opening_stock !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Direct stock mutation is not allowed from the product form. Stock levels are updated automatically via Stock Adjustments, Invoices, or Purchase Bills.',
        },
        { status: 400 }
      )
    }

    const parsed = productSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid product data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const v = parsed.data
    const supabase = await createClient()

    // Check SKU uniqueness if changed
    if (v.sku) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', session.organization_id)
        .eq('sku', v.sku)
        .neq('id', id)
        .limit(1)

      if (existingSku && existingSku.length > 0) {
        return NextResponse.json(
          { success: false, error: `SKU '${v.sku}' is already in use by another product in your organization.` },
          { status: 409 }
        )
      }
    }

    // Update product fields (NO current_stock update!)
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        ...(v.name && { name: v.name }),
        ...(v.sku && { sku: v.sku }),
        ...(v.barcode !== undefined && { barcode: v.barcode || null }),
        ...(v.category_id !== undefined && { category_id: isValidUUID(v.category_id) ? v.category_id : null }),
        ...(v.unit_id !== undefined && { unit_id: isValidUUID(v.unit_id) ? v.unit_id : null }),
        ...(v.hsn_sac_code !== undefined && { hsn_sac_code: v.hsn_sac_code || null }),
        ...(v.product_type && { product_type: v.product_type }),
        ...(v.selling_price !== undefined && { sale_price: v.selling_price }),
        ...(v.purchase_price !== undefined && { purchase_price: v.purchase_price }),
        ...(v.gst_rate !== undefined && { gst_rate: v.gst_rate }),
        ...(v.min_stock_level !== undefined && { min_stock_level: v.min_stock_level }),
        ...(v.description !== undefined && { description: v.description || null }),
        ...(v.metal_type !== undefined && { metal_type: v.metal_type || null }),
        ...(v.metal_weight !== undefined && { metal_weight: v.metal_weight || null }),
        ...(v.is_live_price !== undefined && { is_live_price: v.is_live_price }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .select()
      .single()

    if (updateError || !updatedProduct) {
      if (session.user_id.includes('demo')) {
        const demoUpdated = demoUpdateProduct(id, v)
        return NextResponse.json({
          success: true,
          data: demoUpdated || {
            id,
            organization_id: session.organization_id,
            ...v,
            sale_price: v.selling_price,
            updated_at: new Date().toISOString(),
          },
        })
      }
      console.error('[Product PATCH API] Update error:', updateError)
      return NextResponse.json({ success: false, error: updateError?.message || 'Failed to update product' }, { status: 500 })
    }

    // Audit Log
    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: 'updated',
      resource_type: 'product',
      resource_id: id,
      new_values: { name: updatedProduct.name, price: updatedProduct.sale_price },
    })

    return NextResponse.json({ success: true, data: updatedProduct })
  } catch (err) {
    console.error('[Product PATCH API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'products.delete')) {
      return NextResponse.json({ success: false, error: 'Permission denied to archive products' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('products')
      .select('id, is_active, name')
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (!existing) {
      if (session.user_id.includes('demo')) {
        const res = demoDeleteProduct(id)
        return NextResponse.json({
          success: true,
          message: res?.is_active ? 'Product unarchived successfully (demo)' : 'Product archived successfully (demo)',
        })
      }
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const nextActiveState = !existing.is_active
    const { error: archiveError } = await supabase
      .from('products')
      .update({
        is_active: nextActiveState,
        archived_at: nextActiveState ? null : new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', session.organization_id)

    if (archiveError) {
      return NextResponse.json({ success: false, error: 'Failed to update product status' }, { status: 500 })
    }

    // Audit log
    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: nextActiveState ? 'updated' : 'archived',
      resource_type: 'product',
      resource_id: id,
      new_values: { is_active: nextActiveState },
    })

    return NextResponse.json({
      success: true,
      message: nextActiveState ? 'Product unarchived successfully' : 'Product archived successfully',
    })
  } catch (err) {
    console.error('[Product DELETE API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
