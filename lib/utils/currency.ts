// ============================================================
// lib/utils/currency.ts — INR money formatting utilities
//
// All monetary values are stored as INTEGER PAISE in the DB.
// These helpers convert between paise and display strings.
// ============================================================

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const INR_COMPACT_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/**
 * Converts paise (integer) to rupees (float).
 * Example: 150000 → 1500.00
 */
export function paiseToRupees(paise: number): number {
  return paise / 100
}

/**
 * Converts rupees (float) to paise (integer).
 * Example: 1500.5 → 150050
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/**
 * Formats paise as a localized INR currency string.
 * Example: 150050 → "₹1,500.50"
 */
export function formatCurrency(paise: number): string {
  return INR_FORMATTER.format(paiseToRupees(paise))
}

/**
 * Formats rupees directly as a localized INR currency string.
 * Example: 1500.5 → "₹1,500.50"
 */
export function formatRupees(rupees: number): string {
  return INR_FORMATTER.format(Number(rupees) || 0)
}

/**
 * Formats paise as a compact INR string for dashboards.
 * Example: 1500050 → "₹15K"
 */
export function formatCurrencyCompact(paise: number): string {
  return INR_COMPACT_FORMATTER.format(paiseToRupees(paise))
}

/**
 * Parses a user-input rupee string to paise.
 * Strips currency symbols, commas, whitespace.
 * Returns NaN if the input cannot be parsed.
 */
export function parseRupeesToPaise(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, '')
  const rupees = parseFloat(cleaned)
  if (isNaN(rupees)) return NaN
  return rupeesToPaise(rupees)
}
