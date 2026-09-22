// ============================================================
// lib/services/barcode.service.ts — Centralized Barcode Engine
//
// Features:
// • Standard EAN-13 & Code-128 barcode generation with valid check digits
// • Multi-barcode mapping (multiple barcodes linked to a single product)
// • Duplicate validation & conflict prevention
// • Fast barcode / SKU lookup indexing
// • SVG barcode visual generator for crisp label printing (zero external deps)
// • Bulk barcode generation for catalog batches
// ============================================================

export type BarcodeSymbology = 'CODE128' | 'EAN13' | 'UPCA' | 'QR'

export interface ProductBarcodeEntry {
  barcode: string
  product_id: string
  product_name: string
  sku: string
  symbology: BarcodeSymbology
  is_primary: boolean
  is_active: boolean
  unit?: string
}

export interface BarcodeLabelConfig {
  product_name: string
  barcode: string
  sku: string
  price: number
  mrp?: number
  unit?: string
  business_name?: string
  show_price: boolean
  show_sku: boolean
  show_unit: boolean
  show_business_name: boolean
}

/**
 * Calculates modulo-10 checksum digit for an EAN-13 barcode.
 * Expects a 12-digit string and returns the 13th check digit.
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  if (twelveDigits.length !== 12 || !/^\d+$/.test(twelveDigits)) {
    throw new Error('EAN-13 check digit requires exactly 12 numeric digits.')
  }

  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10)
    // Even indexed positions (0, 2, 4...) weight 1; Odd indexed (1, 3, 5...) weight 3
    sum += i % 2 === 0 ? digit : digit * 3
  }

  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}

/**
 * Generates a valid 13-digit EAN-13 barcode string with verified checksum.
 * Uses business country/internal prefix (890 for India or 200 for internal store).
 */
export function generateEan13Barcode(prefix = '890'): string {
  // 3-digit prefix + 9 random digits = 12 digits
  let digits = prefix
  while (digits.length < 12) {
    digits += Math.floor(Math.random() * 10).toString()
  }
  const checkDigit = calculateEan13CheckDigit(digits)
  return `${digits}${checkDigit}`
}

/**
 * Generates an alphanumeric Code-128 barcode string.
 * Example: "BC-6829104"
 */
export function generateCode128Barcode(prefix = 'BC'): string {
  const randomNum = Math.floor(1000000 + Math.random() * 9000000)
  return `${prefix}-${randomNum}`
}

/**
 * Validates whether a barcode string is well-formed.
 */
export function validateBarcode(barcode: string): { valid: boolean; symbology: BarcodeSymbology; error?: string } {
  const cleaned = barcode?.trim()
  if (!cleaned) {
    return { valid: false, symbology: 'CODE128', error: 'Barcode value cannot be empty.' }
  }

  // Check if standard EAN-13 (13 digits)
  if (/^\d{13}$/.test(cleaned)) {
    const twelve = cleaned.slice(0, 12)
    const expectedCheck = calculateEan13CheckDigit(twelve)
    const actualCheck = parseInt(cleaned[12], 10)
    if (expectedCheck !== actualCheck) {
      return { valid: false, symbology: 'EAN13', error: `Invalid EAN-13 check digit. Expected ${expectedCheck}, got ${actualCheck}.` }
    }
    return { valid: true, symbology: 'EAN13' }
  }

  // Alphanumeric Code-128 format (up to 40 characters)
  if (/^[A-Za-z0-9\-\_\.\/]+$/.test(cleaned) && cleaned.length >= 3 && cleaned.length <= 40) {
    return { valid: true, symbology: 'CODE128' }
  }

  return { valid: false, symbology: 'CODE128', error: 'Barcode contains invalid characters or length.' }
}

/**
 * Finds a matching product by scanning barcode or SKU across catalog.
 * Supports primary barcode, secondary barcode aliases, and SKU.
 */
export function lookupProductByBarcode<T extends { id: string; sku?: string | null; barcode?: string | null; barcodes?: string[] | null; name: string }>(
  scannedCode: string,
  productsList: T[]
): T | null {
  if (!scannedCode || !scannedCode.trim()) return null
  const code = scannedCode.trim().toLowerCase()

  return (
    productsList.find((p) => {
      // 1. Primary barcode match
      if (p.barcode && p.barcode.trim().toLowerCase() === code) return true

      // 2. Secondary barcode aliases match
      if (Array.isArray(p.barcodes) && p.barcodes.some((b) => b && b.trim().toLowerCase() === code)) {
        return true
      }

      // 3. SKU match fallback
      if (p.sku && p.sku.trim().toLowerCase() === code) return true

      return false
    }) || null
  )
}

/**
 * Generates an inline SVG representation of a barcode pattern (Code 128 pseudo-pattern)
 * for crisp rendering in labels without external font/canvas dependencies.
 */
export function generateBarcodeSvg(
  barcodeValue: string,
  widthOrOptions: number | { width?: number; height?: number; showText?: boolean; fontSize?: number } = 180,
  heightArg = 48
): string {
  let width = 180
  let height = 48
  let showText = false
  let fontSize = 10

  if (typeof widthOrOptions === 'object' && widthOrOptions !== null) {
    width = widthOrOptions.width || 180
    height = widthOrOptions.height || 48
    showText = widthOrOptions.showText ?? false
    fontSize = widthOrOptions.fontSize || 10
  } else if (typeof widthOrOptions === 'number') {
    width = widthOrOptions
    height = heightArg
  }

  const cleanVal = barcodeValue || '00000000'
  // Deterministic bar widths based on char codes
  let pattern = '1101' // Start pattern
  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i)
    const bin = (code % 16).toString(2).padStart(4, '0')
    pattern += bin.split('').map((b) => (b === '1' ? '11' : '0')).join('')
  }
  pattern += '1100111' // Stop pattern

  const barHeight = showText ? Math.max(16, height - fontSize - 4) : height
  const barWidth = width / pattern.length
  let rects = ''
  let currentX = 0

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects += `<rect x="${currentX.toFixed(1)}" y="0" width="${barWidth.toFixed(1)}" height="${barHeight}" fill="#000000" />`
    }
    currentX += barWidth
  }

  const textElement = showText
    ? `<text x="${(width / 2).toFixed(1)}" y="${height - 2}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" font-weight="600" fill="#000000">${cleanVal}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width: 100%; height: auto;">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    ${rects}
    ${textElement}
  </svg>`
}

/**
 * Generates a batch of unique EAN-13 or Code-128 barcodes for multiple products.
 */
export function bulkGenerateBarcodes(
  products: Array<{ id: string; name: string; sku?: string; barcode?: string | null }>,
  symbology: BarcodeSymbology = 'EAN13'
): Array<{ product_id: string; barcode: string; symbology: BarcodeSymbology }> {
  const existingSet = new Set<string>()
  products.forEach((p) => {
    if (p.barcode) existingSet.add(p.barcode)
  })

  return products.map((p) => {
    if (p.barcode) {
      return { product_id: p.id, barcode: p.barcode, symbology }
    }

    let candidate = ''
    do {
      candidate = symbology === 'EAN13' ? generateEan13Barcode() : generateCode128Barcode()
    } while (existingSet.has(candidate))

    existingSet.add(candidate)
    return {
      product_id: p.id,
      barcode: candidate,
      symbology,
    }
  })
}
