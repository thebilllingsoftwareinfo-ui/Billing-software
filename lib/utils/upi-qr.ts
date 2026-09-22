// ============================================================
// lib/utils/upi-qr.ts
// Dynamic UPI Deep Link & QR Code Data URL Generator
// ============================================================

import QRCode from 'qrcode'

export interface UpiQrParams {
  pa: string // Payee UPI ID (e.g. acmesystems@okhdfcbank)
  pn: string // Payee Name (e.g. Acme Systems Pvt Ltd)
  am?: number // Amount in Rupees (e.g. 4490.00)
  tr?: string // Transaction Reference / Invoice # (e.g. INV-2026-0001)
  tn?: string // Note (e.g. Payment for Invoice INV-2026-0001)
}

/**
 * Builds standard NPCI UPI Intent URL
 * Format: upi://pay?pa=...&pn=...&am=...&tr=...&tn=...&cu=INR
 */
export function buildUpiDeepLink(params: UpiQrParams): string {
  if (!params.pa) return ''
  const cleanPa = params.pa.trim()
  const cleanPn = encodeURIComponent(params.pn.trim() || 'Merchant')
  let url = `upi://pay?pa=${cleanPa}&pn=${cleanPn}&cu=INR`

  if (params.am && params.am > 0) {
    url += `&am=${params.am.toFixed(2)}`
  }
  if (params.tr) {
    url += `&tr=${encodeURIComponent(params.tr.trim())}`
  }
  if (params.tn) {
    url += `&tn=${encodeURIComponent(params.tn.trim())}`
  }
  return url
}

/**
 * Generates Base64 PNG Data URL for a UPI payment or arbitrary text
 */
export async function generateQrDataUrl(
  text: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  if (!text) return ''
  try {
    return await QRCode.toDataURL(text, {
      margin: options?.margin !== undefined ? options.margin : 1,
      width: options?.width || 200,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('[UPI QR Generator] Error:', err)
    return ''
  }
}
