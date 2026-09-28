// ============================================================
// lib/services/discount-engine.service.ts — Phase 9 Discount Engine
// ============================================================

export interface DiscountCalculationItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_discount_percent?: number;
  line_discount_amount?: number;
  promo_discount_amount?: number;
}

export interface DiscountCalculationResult {
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    gross_amount: number;
    line_discount: number;
    promo_discount: number;
    net_taxable_amount: number;
  }>;
  gross_subtotal: number;
  total_line_discount: number;
  invoice_discount: number;
  net_subtotal: number;
  total_discount: number;
}

export class DiscountEngineService {
  /**
   * Evaluates line discounts, promotional discounts and invoice-level discounts deterministically.
   * Invariants:
   * 1. Line net amount can never be negative.
   * 2. Total discount can never exceed gross subtotal.
   * 3. Percentages outside [0, 100] are strictly rejected.
   */
  static calculateDiscounts(
    items: DiscountCalculationItem[],
    invoiceDiscount?: { percent?: number; amount?: number }
  ): DiscountCalculationResult {
    let grossSubtotal = 0;
    let totalLineDiscount = 0;

    const evaluatedItems = items.map((it) => {
      const qty = Math.max(0, Number(it.quantity) || 0);
      const rate = Math.max(0, Number(it.unit_price) || 0);
      const gross = Math.round(qty * rate * 100) / 100;

      // Validate percentage
      const discPct = Number(it.line_discount_percent || 0);
      if (discPct < 0 || discPct > 100) {
        throw new Error(`Invalid line discount percentage ${discPct}%. Must be between 0 and 100.`);
      }

      // Calculate Line Discount
      let lineDisc = 0;
      if (discPct > 0) {
        lineDisc = Math.round((gross * (discPct / 100)) * 100) / 100;
      } else if (it.line_discount_amount && it.line_discount_amount > 0) {
        lineDisc = Math.min(gross, Number(it.line_discount_amount));
      }

      // Calculate Promo Discount
      let promoDisc = Math.min(Math.max(0, gross - lineDisc), Number(it.promo_discount_amount || 0));

      // Line Net Taxable Amount (Invariant: cannot be negative)
      const netTaxable = Math.max(0, Math.round((gross - lineDisc - promoDisc) * 100) / 100);

      grossSubtotal += gross;
      totalLineDiscount += (lineDisc + promoDisc);

      return {
        product_id: it.product_id,
        quantity: qty,
        unit_price: rate,
        gross_amount: gross,
        line_discount: lineDisc,
        promo_discount: promoDisc,
        net_taxable_amount: netTaxable,
      };
    });

    grossSubtotal = Math.round(grossSubtotal * 100) / 100;
    totalLineDiscount = Math.round(totalLineDiscount * 100) / 100;
    const subtotalAfterLines = Math.max(0, grossSubtotal - totalLineDiscount);

    // Calculate Document / Invoice Level Discount
    let invDisc = 0;
    if (invoiceDiscount) {
      const invPct = Number(invoiceDiscount.percent || 0);
      if (invPct < 0 || invPct > 100) {
        throw new Error(`Invalid invoice discount percentage ${invPct}%. Must be between 0 and 100.`);
      }

      if (invPct > 0) {
        invDisc = Math.round((subtotalAfterLines * (invPct / 100)) * 100) / 100;
      } else if (invoiceDiscount.amount && invoiceDiscount.amount > 0) {
        invDisc = Math.min(subtotalAfterLines, Number(invoiceDiscount.amount));
      }
    }

    const netSubtotal = Math.max(0, Math.round((subtotalAfterLines - invDisc) * 100) / 100);
    const totalDiscount = Math.round((totalLineDiscount + invDisc) * 100) / 100;

    return {
      items: evaluatedItems,
      gross_subtotal: grossSubtotal,
      total_line_discount: totalLineDiscount,
      invoice_discount: invDisc,
      net_subtotal: netSubtotal,
      total_discount: totalDiscount,
    };
  }
}
