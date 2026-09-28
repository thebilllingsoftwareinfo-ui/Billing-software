import { NextRequest, NextResponse } from 'next/server'
import { postInventoryMovement } from '@/lib/services/inventory.service'
import { inventoryMovementRequestSchema } from '@/lib/validators/inventory.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { toBaseQuantity, normalizeUnitCode } from '@/lib/services/unit.service'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'inventory.adjust')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    if (typeof body.quantity === 'number' && body.quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Opening stock quantity must be greater than 0' }, { status: 400 })
    }

    const parsed = inventoryMovementRequestSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstErr = fieldErrors.quantity?.[0] || fieldErrors.product_id?.[0] || parsed.error.issues[0]?.message || 'Invalid opening stock data'
      return NextResponse.json({ success: false, error: firstErr, details: parsed.error.flatten() }, { status: 400 })
    }

    if (parsed.data.quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Opening stock quantity must be greater than 0' }, { status: 400 })
    }



    // Force movement type to opening
    const data = { ...parsed.data, movement_type: 'opening' as const }

    // Fetch product for conversion details and current stock with tenant isolation
    const supabase = createAdminClient()
    const { data: product, error: prodErr } = await (supabase.from('products') as any)
      .select('current_stock, primary_unit, secondary_unit, conversion_rate, name')
      .eq('id', data.product_id)
      .eq('organization_id', session.organization_id)
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ success: false, error: 'Product not found in organization' }, { status: 404 })
    }

    const beforeQty = Number(product.current_stock) || 0
    let finalQty = data.quantity

    // Convert secondary unit to base if provided
    if (data.unit) {
      const u = data.unit.trim().toLowerCase()
      const primary = (product.primary_unit || 'Pcs').trim().toLowerCase()
      const secondary = product.secondary_unit ? product.secondary_unit.trim().toLowerCase() : ''
      const normInput = normalizeUnitCode(data.unit).toLowerCase()
      const normPrimary = normalizeUnitCode(product.primary_unit || 'Pcs').toLowerCase()
      const normSecondary = product.secondary_unit ? normalizeUnitCode(product.secondary_unit).toLowerCase() : ''

      if (secondary && (u === secondary || normInput === normSecondary)) {
        if (!product.conversion_rate || product.conversion_rate <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid conversion rate for secondary unit' }, { status: 400 })
        }
        const conv = toBaseQuantity(data.quantity, data.unit, {
          primary_unit: product.primary_unit,
          secondary_unit: product.secondary_unit,
          conversion_rate: product.conversion_rate,
        })
        finalQty = typeof conv === 'object' ? conv.baseQuantity : conv
      } else if (u !== primary && normInput !== normPrimary && secondary) {
        return NextResponse.json({ success: false, error: `Invalid unit '${data.unit}' for product '${product.name}'` }, { status: 400 })
      }
    }

    // Check for existing opening movement for this product within tenant
    const { data: existingOpening, error: dupErr } = await (supabase.from('inventory_movements') as any)
      .select('id')
      .eq('product_id', data.product_id)
      .eq('organization_id', session.organization_id)
      .eq('movement_type', 'opening')
      .limit(1)
      .single()

    if (dupErr && dupErr.code !== 'PGRST116') {
      console.error('Error checking duplicate opening movement:', dupErr)
    }
    if (existingOpening) {
      return NextResponse.json({ success: false, error: 'Opening stock already recorded for this product' }, { status: 409 })
    }

    const movement = await postInventoryMovement({
      organization_id: session.organization_id,
      product_id: data.product_id,
      movement_type: data.movement_type,
      quantity: finalQty,
      unit_cost: data.unit_cost,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      reference_number: data.reference_number,
      notes: data.notes,
      user_id: session.user_id,
    })

    const afterQty = movement?.running_balance ?? beforeQty + finalQty

    return NextResponse.json({
      success: true,
      data: { movement, before_quantity: beforeQty, after_quantity: afterQty },
    })
  } catch (err: any) {
    console.error('[Opening Stock POST API] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 })
  }
}

