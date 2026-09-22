// ============================================================
// lib/constants/gst-rates.ts
// ============================================================

export const GST_RATES = [0, 5, 12, 18, 28] as const
export type GstRateValue = (typeof GST_RATES)[number]

export const GST_RATE_LABELS: Record<GstRateValue, string> = {
  0: 'Exempt (0%)',
  5: '5% GST',
  12: '12% GST',
  18: '18% GST',
  28: '28% GST',
}

// Common HSN codes for reference
export const COMMON_HSN_CODES = [
  { code: '9954', description: 'Construction services' },
  { code: '9983', description: 'IT / software services' },
  { code: '9984', description: 'Telecom services' },
  { code: '9985', description: 'Consulting / professional services' },
  { code: '9997', description: 'Maintenance / repair services' },
  { code: '0101', description: 'Live animals' },
  { code: '8471', description: 'Computers and peripherals' },
  { code: '8517', description: 'Mobile phones' },
  { code: '6101', description: 'Clothing / apparel' },
  { code: '3304', description: 'Beauty / skincare products' },
] as const
