// ============================================================
// lib/services/tax.service.ts — Centralized GST Calculation Engine
//
// All authoritative GST calculations happen here — NEVER in UI components.
// Indian GST Rules Supported:
//   • Section 7 & 8 IGST Act 2017: Location of Supplier vs Place of Supply (Intra-state vs Inter-state)
//   • Section 16 IGST Act 2017: Zero-rated supplies (Exports & SEZ under LUT/Bond vs Payment)
//   • Section 10 CGST Act 2017: Composition Scheme rules (No tax collection by supplier)
//   • Section 9(3)/9(4) CGST Act 2017: Reverse Charge Mechanism (RCM)
//   • Notification 12/2017: Exempt, Nil-rated & Non-GST supplies
//   • Section 170 CGST Act 2017: Statutory rounding to nearest rupee
// ============================================================

export type GstScheme = 'regular' | 'composition' | 'unregistered'
export type BuyerGstType =
  | 'registered_regular'
  | 'registered_composition'
  | 'unregistered'
  | 'consumer'
  | 'sez_with_payment'
  | 'sez_without_payment'
  | 'deemed_export'

export type SupplyCategory =
  | 'taxable'
  | 'zero_rated_export'
  | 'zero_rated_sez'
  | 'nil_rated'
  | 'exempt'
  | 'non_gst'

export interface SellerTaxProfile {
  state_code: string // 2-digit state code e.g. '27'
  is_gst_registered: boolean
  gst_scheme?: GstScheme
}

export interface BuyerTaxProfile {
  state_code: string // 2-digit state code e.g. '07'
  is_gst_registered: boolean
  gst_type?: BuyerGstType
}

export interface SupplyDetails {
  supply_type?: SupplyCategory
  lut_bond_provided?: boolean // True if Letter of Undertaking provided for zero-rated export/SEZ
  reverse_charge?: boolean // True if RCM applies under Section 9(3)/9(4)
}

export interface GstLineInput {
  product_id?: string | null
  description: string
  hsn_sac_code?: string | null
  quantity: number
  unit_price: number // Base price in Rupees
  discount_percent?: number
  discount_amount?: number
  gst_rate: number // 0, 5, 12, 18, 28
  is_gst_inclusive?: boolean
  tax_category?: 'taxable' | 'nil_rated' | 'exempt' | 'non_gst'
}

export interface CalculatedGstLine {
  product_id?: string | null
  description: string
  hsn_sac_code: string | null
  quantity: number
  unit_price: number
  gross_amount: number
  discount_amount: number
  taxable_amount: number
  gst_rate: number
  cgst_rate: number
  cgst_amount: number
  sgst_rate: number
  sgst_amount: number
  igst_rate: number
  igst_amount: number
  cess_rate: number
  cess_amount: number
  total_tax: number
  line_total: number
  is_exempt: boolean
  is_zero_rated: boolean
}

export interface HsnSummaryEntry {
  hsn_sac_code: string
  taxable_amount: number
  gst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_tax: number
}

export interface CalculatedInvoiceTaxBreakdown {
  subtotal: number
  line_discounts_total: number
  invoice_discount_amount: number
  total_discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  cess_amount: number
  total_tax_amount: number
  unrounded_total: number
  round_off_amount: number
  grand_total: number
  is_inter_state: boolean
  is_reverse_charge: boolean
  is_composition_scheme: boolean
  is_zero_rated: boolean
  lines: CalculatedGstLine[]
  hsn_summary: HsnSummaryEntry[]
}

// Allowed Indian GST Rates
export const GST_RATES = [0, 5, 12, 18, 28] as const
export type GstRate = (typeof GST_RATES)[number]

/**
 * ⚠️ REGULATORY COMPLIANCE NOTE:
 * Under Section 7 and Section 8 of the IGST Act 2017:
 *   - Intra-state supply: Location of supplier and place of supply are in the SAME state/UT (CGST + SGST).
 *   - Inter-state supply: Location of supplier and place of supply are in DIFFERENT states/UTs (IGST).
 * Verify state code extraction from customer GSTIN prefix (first 2 digits) prior to audit submission.
 */
export function isInterState(sellerStateCode: string, buyerStateCode: string): boolean {
  if (!sellerStateCode || !buyerStateCode) return false
  return sellerStateCode.trim() !== buyerStateCode.trim()
}

/**
 * Main Centralized GST Calculation Engine.
 * Takes seller, buyer, supply, and line item details, and calculates authoritative GST breakdown.
 */
export function calculateCentralGst(input: {
  seller: SellerTaxProfile
  buyer: BuyerTaxProfile
  supply?: SupplyDetails
  items: GstLineInput[]
  invoice_discount_type?: 'fixed' | 'percent'
  invoice_discount_value?: number
}): CalculatedInvoiceTaxBreakdown {
  const { seller, buyer, supply = {}, items, invoice_discount_type = 'fixed', invoice_discount_value = 0 } = input

  // 1. Determine Inter-State vs Intra-State
  const interState = isInterState(seller.state_code, buyer.state_code)

  // ⚠️ REGULATORY COMPLIANCE NOTE:
  // Under Section 10 of CGST Act 2017:
  // Composition scheme dealers CANNOT collect tax from buyers. Tax rates on outgoing supplies are 0%.
  const isComposition = seller.gst_scheme === 'composition'

  // ⚠️ REGULATORY COMPLIANCE NOTE:
  // Under Section 16 of IGST Act 2017:
  // Zero-rated supplies apply to exports and SEZ units.
  // If LUT/Bond is provided (`lut_bond_provided === true` or `buyer.gst_type === 'sez_without_payment'`),
  // supply is zero-rated without payment of tax (0% GST rate).
  const isZeroRated =
    supply.supply_type === 'zero_rated_export' ||
    supply.supply_type === 'zero_rated_sez' ||
    buyer.gst_type === 'sez_without_payment' ||
    Boolean(supply.lut_bond_provided)

  const isReverseCharge = Boolean(supply.reverse_charge)

  let subtotal = 0
  let lineDiscountsTotal = 0
  let totalTaxable = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalIgst = 0
  const totalCess = 0

  const calculatedLines: CalculatedGstLine[] = items.map((item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    const discPct = Number(item.discount_percent) || 0
    const discFixed = Number(item.discount_amount) || 0

    // Gross amount before discount
    const gross = Math.round(qty * price * 100) / 100

    // Calculate line discount (percentage or fixed)
    let discAmt = 0
    if (discPct > 0) {
      discAmt = Math.round(gross * (discPct / 100) * 100) / 100
    } else if (discFixed > 0) {
      discAmt = Math.min(gross, Math.round(discFixed * 100) / 100)
    }

    const afterDisc = gross - discAmt

    // Check item-level tax exemptions or zero-rating
    const isExempt =
      item.tax_category === 'exempt' ||
      item.tax_category === 'nil_rated' ||
      item.tax_category === 'non_gst' ||
      supply.supply_type === 'exempt' ||
      supply.supply_type === 'nil_rated' ||
      supply.supply_type === 'non_gst'

    // Determine effective GST rate
    let effectiveGstRate = Number(item.gst_rate) || 0
    if (isComposition || isZeroRated || isExempt) {
      effectiveGstRate = 0
    }

    let taxable: number
    let tax: number

    if (item.is_gst_inclusive && effectiveGstRate > 0) {
      // ⚠️ REGULATORY COMPLIANCE NOTE:
      // Tax-inclusive pricing back-calculates taxable value using:
      // Taxable Value = (Gross Amount after Discount * 100) / (100 + GST Rate)
      taxable = Math.round(((afterDisc * 100) / (100 + effectiveGstRate)) * 100) / 100
      tax = Math.round((afterDisc - taxable) * 100) / 100
    } else {
      taxable = Math.round(afterDisc * 100) / 100
      tax = Math.round((taxable * (effectiveGstRate / 100)) * 100) / 100
    }

    let cgstRate = 0
    let sgstRate = 0
    let igstRate = 0
    let cgstAmt = 0
    let sgstAmt = 0
    let igstAmt = 0

    // ⚠️ REGULATORY COMPLIANCE NOTE:
    // Under Section 9(3)/9(4) of CGST Act (RCM), tax is calculated on invoice but payable by recipient.
    if (effectiveGstRate > 0) {
      if (interState || supply.supply_type === 'zero_rated_export' || (supply.supply_type as any) === 'sez_with_tax') {
        igstRate = effectiveGstRate
        igstAmt = tax
      } else {
        // Split equally between CGST & SGST (50% each)
        cgstRate = effectiveGstRate / 2
        sgstRate = effectiveGstRate / 2
        cgstAmt = Math.round((tax / 2) * 100) / 100
        sgstAmt = Math.round((tax - cgstAmt) * 100) / 100 // Remainder allocated to SGST to prevent 1-paise gaps
      }
    }

    const lineTotal = item.is_gst_inclusive
      ? Math.round(afterDisc * 100) / 100
      : Math.round((taxable + tax) * 100) / 100

    subtotal += gross
    lineDiscountsTotal += discAmt
    totalTaxable += taxable
    totalCgst += cgstAmt
    totalSgst += sgstAmt
    totalIgst += igstAmt

    return {
      product_id: item.product_id || null,
      description: item.description,
      hsn_sac_code: item.hsn_sac_code || null,
      quantity: qty,
      unit_price: price,
      gross_amount: gross,
      discount_amount: discAmt,
      taxable_amount: taxable,
      gst_rate: effectiveGstRate,
      cgst_rate: cgstRate,
      cgst_amount: cgstAmt,
      sgst_rate: sgstRate,
      sgst_amount: sgstAmt,
      igst_rate: igstRate,
      igst_amount: igstAmt,
      cess_rate: 0,
      cess_amount: 0,
      total_tax: tax,
      line_total: lineTotal,
      is_exempt: isExempt,
      is_zero_rated: isZeroRated,
    }
  })

  // Calculate invoice-level discount
  let overallDiscount = 0
  if (invoice_discount_type === 'percent' && invoice_discount_value > 0) {
    overallDiscount = Math.round((subtotal * (invoice_discount_value / 100)) * 100) / 100
  } else if (invoice_discount_value > 0) {
    overallDiscount = Math.round(invoice_discount_value * 100) / 100
  }

  const totalDiscountAmount = Math.round((lineDiscountsTotal + overallDiscount) * 100) / 100
  const totalTaxAmount = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100
  const unroundedTotal = Math.round((totalTaxable + totalTaxAmount) * 100) / 100

  // ⚠️ REGULATORY COMPLIANCE NOTE:
  // Under Section 170 of CGST Act 2017:
  // Amount of tax, interest, penalty, fine or any other sum payable shall be rounded off to the nearest rupee.
  const grandTotal = Math.round(unroundedTotal)
  const roundOffAmount = Math.round((grandTotal - unroundedTotal) * 100) / 100

  // Group HSN/SAC Tax Summary for GSTR-1 Reporting
  const hsnMap = new Map<string, HsnSummaryEntry>()
  for (const line of calculatedLines) {
    const key = `${line.hsn_sac_code || 'UNSPECIFIED'}_${line.gst_rate}`
    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsn_sac_code: line.hsn_sac_code || 'UNSPECIFIED',
        taxable_amount: 0,
        gst_rate: line.gst_rate,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_tax: 0,
      })
    }
    const entry = hsnMap.get(key)!
    entry.taxable_amount = Math.round((entry.taxable_amount + line.taxable_amount) * 100) / 100
    entry.cgst_amount = Math.round((entry.cgst_amount + line.cgst_amount) * 100) / 100
    entry.sgst_amount = Math.round((entry.sgst_amount + line.sgst_amount) * 100) / 100
    entry.igst_amount = Math.round((entry.igst_amount + line.igst_amount) * 100) / 100
    entry.total_tax = Math.round((entry.total_tax + line.total_tax) * 100) / 100
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    line_discounts_total: Math.round(lineDiscountsTotal * 100) / 100,
    invoice_discount_amount: overallDiscount,
    total_discount_amount: totalDiscountAmount,
    taxable_amount: Math.round(totalTaxable * 100) / 100,
    cgst_amount: Math.round(totalCgst * 100) / 100,
    sgst_amount: Math.round(totalSgst * 100) / 100,
    igst_amount: Math.round(totalIgst * 100) / 100,
    cess_amount: totalCess,
    total_tax_amount: totalTaxAmount,
    unrounded_total: unroundedTotal,
    round_off_amount: roundOffAmount,
    grand_total: grandTotal,
    is_inter_state: interState,
    is_reverse_charge: isReverseCharge,
    is_composition_scheme: isComposition,
    is_zero_rated: isZeroRated,
    lines: calculatedLines,
    hsn_summary: Array.from(hsnMap.values()),
  }
}

/**
 * Legacy compatibility functions for existing callers
 */
export function calculateLineTax(item: any) {
  const calc = calculateCentralGst({
    seller: { state_code: '27', is_gst_registered: true },
    buyer: { state_code: item.is_inter_state ? '07' : '27', is_gst_registered: true },
    items: [
      {
        description: 'Item',
        quantity: item.quantity,
        unit_price: (item.unit_price_paise || 0) / 100,
        discount_percent: item.discount_pct || 0,
        gst_rate: item.gst_rate || 0,
        is_gst_inclusive: item.gst_type === 'inclusive',
      },
    ],
  })

  const l = calc.lines[0]
  return {
    line_subtotal_paise: Math.round(l.gross_amount * 100),
    discount_paise: Math.round(l.discount_amount * 100),
    taxable_paise: Math.round(l.taxable_amount * 100),
    cgst_paise: Math.round(l.cgst_amount * 100),
    sgst_paise: Math.round(l.sgst_amount * 100),
    igst_paise: Math.round(l.igst_amount * 100),
    line_total_paise: Math.round(l.line_total * 100),
  }
}

export function calculateInvoiceTotals(lineItems: any[], invoiceDiscountPaise: number = 0) {
  const calc = calculateCentralGst({
    seller: { state_code: '27', is_gst_registered: true },
    buyer: { state_code: lineItems[0]?.is_inter_state ? '07' : '27', is_gst_registered: true },
    items: lineItems.map((it) => ({
      description: 'Item',
      quantity: it.quantity,
      unit_price: (it.unit_price_paise || 0) / 100,
      discount_percent: it.discount_pct || 0,
      gst_rate: it.gst_rate || 0,
      is_gst_inclusive: it.gst_type === 'inclusive',
    })),
    invoice_discount_value: invoiceDiscountPaise / 100,
  })

  return {
    subtotal_paise: Math.round(calc.subtotal * 100),
    discount_paise: Math.round(calc.total_discount_amount * 100),
    taxable_paise: Math.round(calc.taxable_amount * 100),
    cgst_paise: Math.round(calc.cgst_amount * 100),
    sgst_paise: Math.round(calc.sgst_amount * 100),
    igst_paise: Math.round(calc.igst_amount * 100),
    cess_paise: 0,
    total_paise: Math.round(calc.grand_total * 100),
  }
}

export function formatGstRate(rate: number): string {
  return `${rate}%`
}

export class TaxService {
  static calculateLineItemsTax(input: {
    sellerStateCode: string;
    buyerStateCode: string;
    sellerGstin?: string;
    buyerGstin?: string;
    items: Array<{
      productId?: string;
      description: string;
      quantity: number;
      unitPricePaise: number;
      discountPct?: number;
      hsnSac?: string;
      gstRate: number;
      gstType?: 'exclusive' | 'inclusive';
    }>;
  }) {
    const calc = calculateCentralGst({
      seller: { state_code: input.sellerStateCode, is_gst_registered: true },
      buyer: { state_code: input.buyerStateCode, is_gst_registered: true },
      items: input.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit_price: (it.unitPricePaise || 0) / 100,
        discount_percent: it.discountPct || 0,
        gst_rate: it.gstRate || 0,
        hsn_code: it.hsnSac,
        is_gst_inclusive: it.gstType === 'inclusive',
      })),
    });

    return {
      subtotalPaise: Math.round(calc.subtotal * 100),
      discountPaise: Math.round(calc.total_discount_amount * 100),
      taxablePaise: Math.round(calc.taxable_amount * 100),
      cgstPaise: Math.round(calc.cgst_amount * 100),
      sgstPaise: Math.round(calc.sgst_amount * 100),
      igstPaise: Math.round(calc.igst_amount * 100),
      totalPaise: Math.round(calc.grand_total * 100),
      isInterState: calc.is_inter_state,
      items: calc.lines.map((l, i) => ({
        productId: input.items[i]?.productId,
        description: l.description,
        quantity: l.quantity,
        unitPricePaise: input.items[i]?.unitPricePaise || 0,
        discountPct: input.items[i]?.discountPct || 0,
        subtotalPaise: Math.round(l.gross_amount * 100),
        hsnSac: l.hsn_sac_code || input.items[i]?.hsnSac,
        gstRate: l.gst_rate,
        gstType: input.items[i]?.gstType || 'exclusive',
        cgstPaise: Math.round(l.cgst_amount * 100),
        sgstPaise: Math.round(l.sgst_amount * 100),
        igstPaise: Math.round(l.igst_amount * 100),
        totalPaise: Math.round(l.line_total * 100),
      })),
    };
  }
}

