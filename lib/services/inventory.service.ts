// ============================================================
// lib/services/inventory.service.ts — Production Inventory Engine
//
// Source of truth for inventory is the immutable inventory_movements table.
// Stock quantities must NEVER be directly updated via crude manual set.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/services/audit.service'
import { toBaseQuantity, normalizeUnitCode } from '@/lib/services/unit.service'
import { getCategoryConfig } from '@/lib/config/business-categories.config'

export type MovementTypeInput =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE'
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'return_in'
  | 'return_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'transfer_in'
  | 'transfer_out'
  | 'damage'

export interface PostMovementParams {
  organization_id: string
  product_id: string
  movement_type: MovementTypeInput
  quantity: number // Positive or Negative
  unit_cost?: number
  reference_type?: 'invoice' | 'purchase_bill' | 'stock_adjustment' | 'credit_note' | 'debit_note' | 'manual'
  reference_id?: string
  reference_number?: string
  notes?: string
  user_id?: string
  allow_negative_stock?: boolean
}

export interface ProcessAdjustmentItem {
  product_id: string
  direction?: 'IN' | 'OUT' | 'in' | 'out'
  quantity?: number
  unit?: string
  new_quantity?: number
  notes?: string
}

export interface ProcessAdjustmentParams {
  organization_id: string
  user_id: string
  reason: 'stocktake' | 'damage' | 'expiry' | 'theft' | 'production' | 'opening' | 'correction' | 'other'
  notes?: string
  items: ProcessAdjustmentItem[]
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface StockStatusResult {
  status: StockStatus
  label: 'In Stock' | 'Low Stock' | 'Out of Stock'
  color: 'green' | 'amber' | 'red'
}

/**
 * Computes deterministic stock status based on current stock and reorder level.
 * Handles zero threshold, decimal stock values, and negative stocks.
 */
export function computeStockStatus(
  currentStock: number,
  reorderLevel?: number | null,
  minStockLevel?: number | null
): StockStatusResult {
  const stock = Number(currentStock) || 0
  const threshold = (reorderLevel !== undefined && reorderLevel !== null)
    ? Number(reorderLevel)
    : (minStockLevel !== undefined && minStockLevel !== null ? Number(minStockLevel) : 0)

  if (stock <= 0) {
    return { status: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'red' }
  }
  if (stock <= threshold) {
    return { status: 'LOW_STOCK', label: 'Low Stock', color: 'amber' }
  }
  return { status: 'IN_STOCK', label: 'In Stock', color: 'green' }
}

/**
 * Normalizes input movement type to database text enum.
 */
export function normalizeMovementType(type: MovementTypeInput): {
  dbType: 'opening' | 'purchase' | 'sale' | 'return_in' | 'return_out' | 'adjustment_in' | 'adjustment_out' | 'transfer_in' | 'transfer_out' | 'damage'
  isDecrease: boolean
} {
  const upper = type.toUpperCase()
  switch (upper) {
    case 'OPENING':
      return { dbType: 'opening', isDecrease: false }
    case 'PURCHASE':
      return { dbType: 'purchase', isDecrease: false }
    case 'SALE':
      return { dbType: 'sale', isDecrease: true }
    case 'SALE_RETURN':
    case 'RETURN_IN':
      return { dbType: 'return_in', isDecrease: false }
    case 'PURCHASE_RETURN':
    case 'RETURN_OUT':
      return { dbType: 'return_out', isDecrease: true }
    case 'ADJUSTMENT_IN':
      return { dbType: 'adjustment_in', isDecrease: false }
    case 'ADJUSTMENT_OUT':
      return { dbType: 'adjustment_out', isDecrease: true }
    case 'TRANSFER_IN':
      return { dbType: 'transfer_in', isDecrease: false }
    case 'TRANSFER_OUT':
      return { dbType: 'transfer_out', isDecrease: true }
    case 'DAMAGE':
      return { dbType: 'damage', isDecrease: true }
    default:
      // Lowercase fallbacks
      if (type === 'sale' || type === 'return_out' || type === 'adjustment_out' || type === 'transfer_out' || type === 'damage') {
        return { dbType: type as any, isDecrease: true }
      }
      return { dbType: type.toLowerCase() as any, isDecrease: false }
  }
}

/**
 * Posts an immutable inventory movement record and updates denormalized current_stock.
 * Throws INSUFFICIENT_STOCK error if negative movement exceeds current available stock and negative stock is not allowed.
 */
export async function postInventoryMovement(params: PostMovementParams) {
  const supabase = createAdminClient()

  // 1. Fetch product record
  const { data: rawProduct, error: productError } = await (supabase.from('products') as any)
    .select('id, name, sku, track_inventory, current_stock, purchase_price, allow_negative_stock, custom_fields')
    .eq('id', params.product_id)
    .eq('organization_id', params.organization_id)
    .single()

  const product = rawProduct as any

  if (productError || !product) {
    throw new Error(`Product with ID '${params.product_id}' not found in organization.`)
  }

  // If inventory tracking is disabled for services, skip movement
  if (!product.track_inventory) {
    return null
  }

  const currentStock = Number(product.current_stock) || 0
  const { dbType, isDecrease } = normalizeMovementType(params.movement_type)

  // Determine final signed quantity
  let signedQuantity = params.quantity
  if (isDecrease && signedQuantity > 0) {
    signedQuantity = -signedQuantity
  } else if (!isDecrease && signedQuantity < 0) {
    signedQuantity = Math.abs(signedQuantity)
  }

  // Check if negative stock is allowed (product setting, custom fields, or business category)
  let allowNegative = Boolean(
    params.allow_negative_stock ??
    product.allow_negative_stock ??
    product.custom_fields?.allow_negative_stock
  )

  if (!allowNegative && params.organization_id) {
    const { data: org } = await (supabase.from('organizations') as any)
      .select('business_category')
      .eq('id', params.organization_id)
      .single()
    if (org?.business_category) {
      const catConfig = getCategoryConfig(org.business_category)
      if (catConfig?.features?.inventoryBehavior?.allowNegativeStock) {
        allowNegative = true
      }
    }
  }

  // 2. Insufficient Stock Guard: Check if negative movement exceeds available stock
  if (!allowNegative && signedQuantity < 0) {
    const requiredOut = Math.abs(signedQuantity)
    if (currentStock < requiredOut) {
      throw new Error(
        `INSUFFICIENT_STOCK: Product '${product.name}' (SKU: ${product.sku || 'N/A'}) has current available stock of ${currentStock}, but ${requiredOut} is required.`
      )
    }
  }

  const newStockBalance = currentStock + signedQuantity
  const unitCost = params.unit_cost ?? (Number(product.purchase_price) || 0)
  const totalCost = Math.abs(signedQuantity) * unitCost

  // 3. Insert immutable inventory_movements record
  const { data: rawMovement, error: insertError } = await (supabase.from('inventory_movements') as any)
    .insert({
      organization_id: params.organization_id,
      product_id: params.product_id,
      movement_type: dbType,
      reference_type: params.reference_type || 'manual',
      reference_id: params.reference_id || null,
      reference_number: params.reference_number || null,
      quantity: signedQuantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      running_balance: newStockBalance,
      notes: params.notes || null,
      created_by: params.user_id || null,
    })
    .select()
    .single()

  const movement = rawMovement as any

  if (insertError || !movement) {
    console.error('[Inventory Engine] Insert movement error:', insertError)
    throw new Error(`Failed to post inventory movement: ${insertError?.message}`)
  }

  // Database trigger `inventory_movements_update_stock` automatically updates products.current_stock

  // 4. Audit Log
  if (params.user_id) {
    await logAudit({
      organization_id: params.organization_id,
      user_id: params.user_id,
      action: 'created',
      resource_type: 'stock_movement',
      resource_id: movement.id,
      new_values: {
        product: product.name,
        type: dbType,
        qty: signedQuantity,
        new_balance: newStockBalance,
      },
    })
  }

  return movement
}

/**
 * Creates a stock adjustment record and posts adjustment_in / adjustment_out movements.
 */
export async function processStockAdjustment(params: ProcessAdjustmentParams) {
  const supabase = createAdminClient()

  if (!params.reason) {
    throw new Error('Adjustment reason is required.')
  }

  if (!params.items || params.items.length === 0) {
    throw new Error('At least one item is required for stock adjustment.')
  }

  // 1. Generate sequential adjustment number (ADJ-0001, ADJ-0002...)
  const { count } = await (supabase.from('stock_adjustments') as any)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', params.organization_id)

  const seq = (count || 0) + 1
  const adjNumber = `ADJ-${seq.toString().padStart(4, '0')}`

  // 2. Create stock adjustment header
  const { data: rawAdjHeader, error: headerError } = await (supabase.from('stock_adjustments') as any)
    .insert({
      organization_id: params.organization_id,
      adjustment_number: adjNumber,
      reason: params.reason,
      notes: params.notes || null,
      status: 'approved',
      approved_by: params.user_id,
      approved_at: new Date().toISOString(),
      created_by: params.user_id,
    })
    .select()
    .single()

  const adjHeader = rawAdjHeader as any

  if (headerError || !adjHeader) {
    throw new Error(`Failed to create stock adjustment header: ${headerError?.message}`)
  }

  // 3. Process each line item
  const postedMovements = []

  for (const item of params.items) {
    if (!item.product_id) {
      throw new Error('Product ID is required for stock adjustment item.')
    }

    const { data: rawProduct, error: prodErr } = await (supabase.from('products') as any)
      .select('id, name, sku, track_inventory, current_stock, purchase_price, primary_unit, secondary_unit, conversion_rate, allow_negative_stock, custom_fields')
      .eq('id', item.product_id)
      .eq('organization_id', params.organization_id)
      .single()

    const product = rawProduct as any

    if (prodErr || !product) {
      throw new Error(`Product with ID '${item.product_id}' not found in organization.`)
    }

    if (!product.track_inventory) {
      continue
    }

    const currentStock = Number(product.current_stock) || 0
    const primaryUnit = product.primary_unit || 'Pcs'
    const secondaryUnit = product.secondary_unit || null
    const conversionRate = Number(product.conversion_rate) || 0

    let baseQty = 0
    let signedMovementQty = 0
    let afterQuantity = currentStock
    let movementType: MovementTypeInput = 'ADJUSTMENT_IN'
    let dir: 'IN' | 'OUT' = 'IN'
    let selectedUnit = item.unit || primaryUnit

    if (item.direction) {
      const normalizedDir = item.direction.toUpperCase()
      if (normalizedDir !== 'IN' && normalizedDir !== 'OUT') {
        throw new Error(`Invalid adjustment direction '${item.direction}'. Must be 'IN' or 'OUT'.`)
      }
      dir = normalizedDir as 'IN' | 'OUT'

      if (item.quantity === undefined || item.quantity === null || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        throw new Error('Adjustment quantity must be greater than 0.')
      }

      const inputQty = Number(item.quantity)

      // Unit validation and conversion
      if (item.unit) {
        const u = item.unit.trim().toLowerCase()
        const normCode = normalizeUnitCode(item.unit).toLowerCase()
        const normPrimCode = normalizeUnitCode(primaryUnit).toLowerCase()
        const normSecCode = secondaryUnit ? normalizeUnitCode(secondaryUnit).toLowerCase() : ''

        if (secondaryUnit && (u === secondaryUnit.trim().toLowerCase() || normCode === normSecCode)) {
          if (!conversionRate || conversionRate <= 0) {
            throw new Error(`Invalid unit conversion: Secondary unit '${item.unit}' has no valid conversion rate configured for product '${product.name}'.`)
          }
          const conv = toBaseQuantity(inputQty, item.unit, {
            primary_unit: primaryUnit,
            secondary_unit: secondaryUnit,
            conversion_rate: conversionRate,
          })
          baseQty = typeof conv === 'object' ? conv.baseQuantity : conv
        } else if (u === primaryUnit.trim().toLowerCase() || normCode === normPrimCode || !secondaryUnit) {
          baseQty = inputQty
        } else {
          throw new Error(`Invalid unit '${item.unit}' for product '${product.name}'. Allowed units: ${primaryUnit}${secondaryUnit ? ', ' + secondaryUnit : ''}.`)
        }
      } else {
        baseQty = inputQty
      }

      if (dir === 'IN') {
        movementType = 'ADJUSTMENT_IN'
        signedMovementQty = baseQty
        afterQuantity = currentStock + baseQty
      } else {
        movementType = params.reason === 'damage' ? 'DAMAGE' : 'ADJUSTMENT_OUT'
        signedMovementQty = -baseQty
        afterQuantity = currentStock - baseQty
      }
    } else if (item.new_quantity !== undefined && item.new_quantity !== null) {
      const targetCount = Number(item.new_quantity)
      if (isNaN(targetCount) || targetCount < 0) {
        throw new Error('New physical count quantity must be >= 0.')
      }
      const diff = targetCount - currentStock
      if (diff === 0) continue

      dir = diff > 0 ? 'IN' : 'OUT'
      baseQty = Math.abs(diff)
      signedMovementQty = diff
      movementType = diff > 0 ? 'ADJUSTMENT_IN' : (params.reason === 'damage' ? 'DAMAGE' : 'ADJUSTMENT_OUT')
      afterQuantity = targetCount
    } else {
      throw new Error('Adjustment item must specify either direction + quantity, or new_quantity.')
    }

    // Check negative stock allowance
    let allowNegative = Boolean(
      product.allow_negative_stock ??
      product.custom_fields?.allow_negative_stock
    )
    if (!allowNegative && params.organization_id) {
      const { data: org } = await (supabase.from('organizations') as any)
        .select('business_category')
        .eq('id', params.organization_id)
        .single()
      if (org?.business_category) {
        const catConfig = getCategoryConfig(org.business_category)
        if (catConfig?.features?.inventoryBehavior?.allowNegativeStock) {
          allowNegative = true
        }
      }
    }

    if (!allowNegative && signedMovementQty < 0) {
      const requiredOut = Math.abs(signedMovementQty)
      if (currentStock < requiredOut) {
        throw new Error(
          `INSUFFICIENT_STOCK: Product '${product.name}' (SKU: ${product.sku || 'N/A'}) has current available stock of ${currentStock}, but ${requiredOut} is required for adjustment OUT.`
        )
      }
    }

    // Post authoritative movement
    const m = await postInventoryMovement({
      organization_id: params.organization_id,
      product_id: item.product_id,
      movement_type: movementType,
      quantity: signedMovementQty,
      unit_cost: Number(product.purchase_price) || 0,
      reference_type: 'stock_adjustment',
      reference_id: adjHeader.id,
      reference_number: adjNumber,
      notes: item.notes || `Stock adjustment (${dir}): ${params.reason}`,
      user_id: params.user_id,
      allow_negative_stock: allowNegative,
    })

    // Insert into stock_adjustment_items
    await (supabase.from('stock_adjustment_items') as any).insert({
      organization_id: params.organization_id,
      adjustment_id: adjHeader.id,
      product_id: item.product_id,
      expected_quantity: currentStock,
      actual_quantity: afterQuantity,
      unit_cost: Number(product.purchase_price) || 0,
      notes: item.notes || null,
    })

    postedMovements.push({
      ...m,
      product_id: item.product_id,
      direction: dir,
      quantity: item.quantity ?? baseQty,
      base_quantity: baseQty,
      unit: selectedUnit,
      before_quantity: currentStock,
      after_quantity: afterQuantity,
    })
  }

  return { adjustment: adjHeader, movements: postedMovements }
}


/**
 * Calculates current stock valuation foundation for tenant.
 */
export async function calculateInventoryValuation(organization_id: string) {
  const supabase = createAdminClient()

  const { data: rawProducts } = await (supabase.from('products') as any)
    .select('id, name, sku, current_stock, purchase_price, sale_price')
    .eq('organization_id', organization_id)
    .eq('is_active', true)
    .eq('track_inventory', true)

  const products = (rawProducts || []) as any[]
  let totalCostValuation = 0
  let totalRetailValuation = 0

  products.forEach((p: any) => {
    const stock = Number(p.current_stock) || 0
    const purchase = Number(p.purchase_price) || 0
    const sale = Number(p.sale_price) || 0

    totalCostValuation += stock * purchase
    totalRetailValuation += stock * sale
  })

  return {
    totalItems: products.length,
    totalCostValuation,
    totalRetailValuation,
  }
}

/**
 * Fetches stock history log for a specific product.
 */
export async function getProductStockHistory(organization_id: string, product_id: string) {
  const supabase = createAdminClient()

  const { data: movements, error } = await (supabase.from('inventory_movements') as any)
    .select('*')
    .eq('organization_id', organization_id)
    .eq('product_id', product_id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch stock history: ${error.message}`)
  }

  return (movements || []) as any[]
}

/**
 * Detects low-stock products where current_stock <= min_stock_level.
 */
export async function getLowStockProducts(organization_id: string) {
  const supabase = createAdminClient()

  const { data: products, error } = await (supabase.from('products') as any)
    .select('id, name, sku, current_stock, min_stock_level, purchase_price, sale_price, product_units(abbreviation)')
    .eq('organization_id', organization_id)
    .eq('is_active', true)
    .eq('track_inventory', true)

  if (error) {
    throw new Error(`Failed to query low stock products: ${error.message}`)
  }

  const lowStock = ((products || []) as any[]).filter((p: any) => Number(p.current_stock) <= Number(p.min_stock_level))

  return lowStock
}

/**
 * Calculates current stock directly by summing historical inventory movements (source of truth check).
 */
export async function calculateCurrentStockFromLedger(organization_id: string, product_id: string) {
  const supabase = createAdminClient()

  const { data: movements, error } = await (supabase.from('inventory_movements') as any)
    .select('quantity')
    .eq('organization_id', organization_id)
    .eq('product_id', product_id)

  if (error) {
    throw new Error(`Failed to calculate stock from ledger: ${error.message}`)
  }

  const calculatedStock = ((movements || []) as any[]).reduce((acc: number, m: any) => acc + Number(m.quantity), 0)
  return calculatedStock
}

export class InventoryService {
  static async postMovement(session: any, params: any) {
    const orgId = session?.organization_id || session?.organization?.id || '';
    const userId = session?.user_id || session?.user?.id || '';
    return postInventoryMovement({
      organization_id: orgId,
      product_id: params.product_id,
      movement_type: params.movement_type,
      quantity: params.quantity,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      notes: params.notes,
      user_id: userId,
    });
  }

  static async recordMovement(session: any, params: any) {
    return this.postMovement(session, params);
  }
}
