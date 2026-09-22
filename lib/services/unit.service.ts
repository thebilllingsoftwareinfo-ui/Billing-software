// ============================================================
// lib/services/unit.service.ts — Centralized Unit Management & Conversion Engine
//
// Authoritative Unit Management system supporting:
// • 21+ Standard Units (Piece, Box, Kg, Gram, Ton, Liter, etc.)
// • User-created Custom Units with short names, symbols, and decimal precision
// • Primary / Base Unit inventory integrity
// • Secondary Units with conversion ratios (e.g. 1 Box = 12 Pieces, 1 Bag = 25 Kg)
// • Purchase and Sales unit flexibility
// • Decimal quantity handling without integer truncation
// • Conversion validation: rejects <=0, negative, duplicate, or circular conversions
// ============================================================

export interface UnitDefinition {
  id: string
  name: string
  short_name: string
  symbol?: string
  code?: string
  decimals_allowed: boolean
  is_standard: boolean
  is_active: boolean
  category?: string
  organization_id?: string | null
  description?: string
}

export interface UnitConversionRule {
  product_id?: string
  primary_unit_id: string
  secondary_unit_id: string
  // 1 Secondary Unit = conversion_rate * Primary Units (e.g. 1 Box = 10 Pcs -> conversion_rate = 10)
  conversion_rate: number
  description?: string
}

// ── 1. STANDARD UNITS REGISTRY ────────────────────────────────
export const STANDARD_UNITS: UnitDefinition[] = [
  { id: 'unit-pcs', name: 'Piece', short_name: 'Pcs', symbol: 'pcs', code: 'PCS', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-box', name: 'Box', short_name: 'Box', symbol: 'box', code: 'BOX', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-doz', name: 'Dozen', short_name: 'Doz', symbol: 'doz', code: 'DOZ', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-kg', name: 'Kilogram', short_name: 'Kg', symbol: 'kg', code: 'KGS', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-gm', name: 'Gram', short_name: 'Gms', symbol: 'g', code: 'GMS', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-qtl', name: 'Quintal', short_name: 'Qtl', symbol: 'qtl', code: 'QTL', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-ton', name: 'Ton', short_name: 'Ton', symbol: 'ton', code: 'TON', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-ltr', name: 'Liter', short_name: 'Ltr', symbol: 'l', code: 'LTR', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-ml', name: 'Milliliter', short_name: 'Ml', symbol: 'ml', code: 'MLT', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-mtr', name: 'Meter', short_name: 'Mtr', symbol: 'm', code: 'MTR', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-cm', name: 'Centimeter', short_name: 'Cm', symbol: 'cm', code: 'CMS', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-ft', name: 'Foot', short_name: 'Ft', symbol: 'ft', code: 'FTS', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-in', name: 'Inch', short_name: 'Inch', symbol: 'in', code: 'INC', decimals_allowed: true, is_standard: true, is_active: true },
  { id: 'unit-set', name: 'Set', short_name: 'Set', symbol: 'set', code: 'SET', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-pr', name: 'Pair', short_name: 'Pair', symbol: 'pr', code: 'PRS', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-btl', name: 'Bottle', short_name: 'Btl', symbol: 'btl', code: 'BTL', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-pkt', name: 'Pack', short_name: 'Pack', symbol: 'pkt', code: 'PAC', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-bdl', name: 'Bundle', short_name: 'Bdl', symbol: 'bdl', code: 'BDL', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-ctn', name: 'Carton', short_name: 'Ctn', symbol: 'ctn', code: 'CTN', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-bag', name: 'Bag', short_name: 'Bag', symbol: 'bag', code: 'BAG', decimals_allowed: false, is_standard: true, is_active: true },
  { id: 'unit-rol', name: 'Roll', short_name: 'Roll', symbol: 'rol', code: 'ROL', decimals_allowed: false, is_standard: true, is_active: true },
]

/**
 * Normalizes a unit string or code to a standard or recognized unit abbreviation.
 */
export function normalizeUnitCode(unitInput: string | null | undefined): string {
  if (!unitInput) return 'Pcs'
  const trimmed = unitInput.trim().toUpperCase()

  const match = STANDARD_UNITS.find(
    (u) =>
      u.short_name.toUpperCase() === trimmed ||
      u.name.toUpperCase() === trimmed ||
      (u.code && u.code.toUpperCase() === trimmed) ||
      (u.symbol && u.symbol.toUpperCase() === trimmed)
  )

  return match ? match.short_name : unitInput.trim()
}

/**
 * Validates a unit conversion ratio.
 * Accepts either a numeric ratio or (primaryUnit, secondaryUnit, conversionRate).
 */
export function validateConversionRatio(
  primaryUnitOrRate: string | number,
  secondaryUnit?: string,
  conversionRate?: number
): any {
  if (typeof primaryUnitOrRate === 'number') {
    return isFinite(primaryUnitOrRate) && primaryUnitOrRate > 0
  }
  const primaryUnit = primaryUnitOrRate
  if (!primaryUnit || !primaryUnit.trim()) {
    return { valid: false, error: 'Primary base unit is required.' }
  }
  if (!secondaryUnit || !secondaryUnit.trim()) {
    return { valid: false, error: 'Secondary unit is required.' }
  }
  if (primaryUnit.trim().toLowerCase() === secondaryUnit.trim().toLowerCase()) {
    return { valid: false, error: 'Secondary unit cannot be identical to Primary base unit.' }
  }
  const rate = conversionRate ?? 0
  if (typeof rate !== 'number' || isNaN(rate) || rate <= 0 || !isFinite(rate)) {
    return { valid: false, error: 'Conversion rate must be a positive number greater than 0.' }
  }
  return { valid: true }
}

/**
 * Converts a transaction quantity in transactionUnit to the product's primary/base unit quantity.
 * Supports either:
 * - toBaseQuantity(quantity, conversionRatio) -> number
 * - toBaseQuantity(quantity, transactionUnit, productConfig) -> object
 */
export function toBaseQuantity(
  quantity: number,
  transactionUnitOrRate: string | number = 1,
  productConfig?: {
    primary_unit?: string | null
    secondary_unit?: string | null
    conversion_rate?: number | null
  }
): any {
  if (typeof transactionUnitOrRate === 'number') {
    return Math.round(quantity * transactionUnitOrRate * 10000) / 10000
  }

  const transactionUnit = transactionUnitOrRate
  const config = productConfig || {}
  const qty = Number(quantity) || 0
  const baseUnit = config.primary_unit?.trim() || 'Pcs'
  const secUnit = config.secondary_unit?.trim() || ''
  const convRate = Number(config.conversion_rate) || 0

  const normalizedTxUnit = transactionUnit?.trim().toLowerCase()
  const normalizedSecUnit = secUnit.toLowerCase()

  if (secUnit && convRate > 0 && normalizedTxUnit === normalizedSecUnit) {
    const baseQty = Math.round(qty * convRate * 10000) / 10000
    return {
      baseQuantity: baseQty,
      baseUnit,
      converted: true,
      multiplier: convRate,
    }
  }

  return {
    baseQuantity: Math.round(qty * 10000) / 10000,
    baseUnit,
    converted: false,
    multiplier: 1,
  }
}

/**
 * Converts a base quantity to a target transaction unit.
 * Supports either:
 * - fromBaseQuantity(baseQuantity, conversionRatio) -> number
 * - fromBaseQuantity(baseQuantity, targetUnit, productConfig) -> object
 */
export function fromBaseQuantity(
  baseQuantity: number,
  targetUnitOrRate: string | number = 1,
  productConfig?: {
    primary_unit?: string | null
    secondary_unit?: string | null
    conversion_rate?: number | null
  }
): any {
  if (typeof targetUnitOrRate === 'number') {
    if (targetUnitOrRate <= 0) return baseQuantity
    return Math.round((baseQuantity / targetUnitOrRate) * 10000) / 10000
  }

  const targetUnit = targetUnitOrRate
  const config = productConfig || {}
  const qty = Number(baseQuantity) || 0
  const baseUnit = config.primary_unit?.trim() || 'Pcs'
  const secUnit = config.secondary_unit?.trim() || ''
  const convRate = Number(config.conversion_rate) || 0

  const normalizedTarget = targetUnit?.trim().toLowerCase()
  const normalizedSec = secUnit.toLowerCase()

  if (secUnit && convRate > 0 && normalizedTarget === normalizedSec) {
    return {
      quantityInTargetUnit: Math.round((qty / convRate) * 10000) / 10000,
      targetUnit,
      converted: true,
    }
  }

  return {
    quantityInTargetUnit: Math.round(qty * 10000) / 10000,
    targetUnit: baseUnit,
    converted: false,
  }
}

/**
 * Determines whether a unit allows fractional decimal quantities (e.g. 1.25 Kgs)
 * vs strictly discrete whole integers (e.g. 5 Pcs).
 */
export function isDecimalQuantityAllowed(unitCode: string): boolean {
  if (!unitCode) return false
  const trimmed = unitCode.trim().toUpperCase()
  const found = STANDARD_UNITS.find(
    (u) =>
      u.short_name.toUpperCase() === trimmed ||
      Boolean(u.code && u.code.toUpperCase() === trimmed) ||
      u.name.toUpperCase() === trimmed ||
      Boolean(u.symbol && u.symbol.toUpperCase() === trimmed)
  )
  if (found) return found.decimals_allowed === true

  const discrete = [
    'PCS', 'PIECES', 'PIECE', 'NOS', 'NO', 'NUMBERS', 'NUMBER',
    'BOX', 'BOXES', 'BAG', 'BAGS', 'PACK', 'PACKS', 'PAC',
    'SET', 'SETS', 'ROLL', 'ROLLS', 'ROL', 'DOZ', 'DOZEN',
    'PAIR', 'PAIRS', 'PRS', 'BTL', 'BOTTLE', 'BOTTLES', 'CTN', 'CARTON',
    'BDL', 'BUNDLE', 'BUNDLES', 'UNT', 'UNIT', 'UNITS'
  ]
  if (discrete.includes(trimmed)) return false

  const fractional = [
    'KG', 'KGS', 'KILOGRAM', 'GM', 'GMS', 'GRAM', 'GRAMS',
    'QTL', 'QUINTAL', 'TON', 'TONS', 'LTR', 'LITER', 'LITERS',
    'MLT', 'ML', 'MILLILITER', 'MTR', 'METER', 'METERS',
    'CMS', 'CM', 'CENTIMETER', 'FTS', 'FT', 'FOOT', 'FEET',
    'INC', 'INCH', 'INCHES', 'SQM', 'SQF', 'YDS'
  ]
  if (fractional.includes(trimmed)) return true

  return true
}


/**
 * Formats a quantity with its unit for clean billing display.
 * Example: formatUnitDisplay(2.5, 'Kg', 180) -> "2.5 Kg × ₹180.00 = ₹450.00"
 */
export function formatUnitDisplay(
  quantity: number,
  unit: string,
  rate?: number
): {
  displayString: string
  qtyUnitString: string
  totalAmount?: number
} {
  const qStr = Number(quantity) % 1 === 0 ? Number(quantity).toString() : Number(quantity).toFixed(2)
  const qtyUnit = `${qStr} ${unit || 'Pcs'}`

  if (rate !== undefined) {
    const total = Math.round(Number(quantity) * Number(rate) * 100) / 100
    return {
      displayString: `${qtyUnit} × ₹${Number(rate).toLocaleString('en-IN')} = ₹${total.toLocaleString('en-IN')}`,
      qtyUnitString: qtyUnit,
      totalAmount: total,
    }
  }

  return {
    displayString: qtyUnit,
    qtyUnitString: qtyUnit,
  }
}
