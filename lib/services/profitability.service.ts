// ============================================================
// lib/services/profitability.service.ts — Phase 9 Profit & Margin Analytics Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import {
  demoInvoices,
  demoProducts,
  demoCustomers,
  demoSalespersons,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface ProfitabilitySummary {
  gross_sales: number;
  discounts: number;
  net_revenue: number;
  tax_collected: number;
  cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  total_invoices_count: number;
}

export interface EntityProfitability {
  entity_id: string;
  entity_name: string;
  code?: string;
  sales_volume: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_percent: number;
}

function checkIsSupabase(session: { org_id?: string; organization_id?: string; user_id?: string }): boolean {
  const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
    orgId !== DEMO_ORG_ID &&
    !session.user_id?.includes('demo')
  );
}

export class ProfitabilityService {
  /**
   * Computes overall organization profitability.
   * Crucial Accounting Invariant:
   * Tax is collected on behalf of the government and is NOT revenue!
   * Net Revenue = Gross Sales - Discounts
   * Gross Profit = Net Revenue - COGS
   * Margin % = (Gross Profit / Net Revenue) * 100
   */
  static async getProfitabilitySummary(
    session: AppSession,
    dateRange?: { from?: string; to?: string }
  ): Promise<ProfitabilitySummary> {
    requirePermission(session.role, 'profitability.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    let grossSales = 0;
    let discounts = 0;
    let netRevenue = 0;
    let taxCollected = 0;
    let totalCOGS = 0;
    let invoiceCount = 0;

    if (isSupabase) {
      const supabase = createAdminClient();
      let query = supabase
        .from('invoices')
        .select(`
          id,
          subtotal,
          tax_amount,
          discount_amount,
          total_amount,
          invoice_date,
          invoice_items (product_id, quantity, unit_price, total_price, products (purchase_price))
        `)
        .eq('organization_id', orgId)
        .neq('status', 'cancelled');

      if (dateRange?.from) query = query.gte('invoice_date', dateRange.from);
      if (dateRange?.to) query = query.lte('invoice_date', dateRange.to);

      const { data: invRows, error } = await query;
      if (error) throw new Error(error.message);

      for (const inv of invRows || []) {
        invoiceCount++;
        const sub = Number(inv.subtotal || 0);
        const tax = Number(inv.tax_amount || 0);
        const disc = Number(inv.discount_amount || 0);

        grossSales += (sub + disc);
        discounts += disc;
        netRevenue += sub;
        taxCollected += tax;

        for (const it of (inv.invoice_items || []) as any[]) {
          const qty = Number(it.quantity || 0);
          const cost = Number(it.products?.purchase_price || 0);
          totalCOGS += (qty * cost);
        }
      }
    } else {
      let filtered = demoInvoices.filter(
        (i) => i.organization_id === orgId && (i.status as string) !== 'cancelled'
      );
      if (dateRange?.from) filtered = filtered.filter((i) => i.invoice_date >= dateRange.from!);
      if (dateRange?.to) filtered = filtered.filter((i) => i.invoice_date <= dateRange.to!);

      for (const inv of filtered as any[]) {
        invoiceCount++;
        const sub = Number(inv.subtotal || 0);
        const tax = Number(inv.tax_amount ?? inv.total_tax ?? 0);
        const disc = Number(inv.discount_amount || 0);

        grossSales += (sub + disc);
        discounts += disc;
        netRevenue += sub;
        taxCollected += tax;

        for (const it of (inv.items || inv.invoice_items || []) as any[]) {
          const prod = demoProducts.find((p) => p.id === it.product_id);
          const cost = Number(prod?.purchase_price || 0);
          totalCOGS += (Number(it.quantity || 0) * cost);
        }
      }
    }

    grossSales = Math.round(grossSales * 100) / 100;
    discounts = Math.round(discounts * 100) / 100;
    netRevenue = Math.round(netRevenue * 100) / 100;
    taxCollected = Math.round(taxCollected * 100) / 100;
    totalCOGS = Math.round(totalCOGS * 100) / 100;

    const grossProfit = Math.round((netRevenue - totalCOGS) * 100) / 100;
    const marginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 10000) / 100 : 0;

    return {
      gross_sales: grossSales,
      discounts,
      net_revenue: netRevenue,
      tax_collected: taxCollected,
      cogs: totalCOGS,
      gross_profit: grossProfit,
      gross_margin_percent: marginPercent,
      total_invoices_count: invoiceCount,
    };
  }

  /**
   * Product-level profitability breakdown.
   */
  static async getProductProfitability(session: AppSession): Promise<EntityProfitability[]> {
    requirePermission(session.role, 'profitability.view');
    const orgId = session.org_id || DEMO_ORG_ID;

    const map = new Map<string, { name: string; sku: string; qty: number; rev: number; cost: number }>();

    for (const inv of demoInvoices.filter((i) => i.organization_id === orgId && (i.status as string) !== 'cancelled') as any[]) {
      for (const it of (inv.items || inv.invoice_items || []) as any[]) {
        const prod = demoProducts.find((p) => p.id === it.product_id);
        const name = prod?.name || 'Item';
        const sku = prod?.sku || '';
        const qty = Number(it.quantity || 0);
        const rev = Number(it.total_price || 0);
        const cost = qty * Number(prod?.purchase_price || 0);

        const current = map.get(it.product_id) || { name, sku, qty: 0, rev: 0, cost: 0 };
        current.qty += qty;
        current.rev += rev;
        current.cost += cost;
        map.set(it.product_id, current);
      }
    }

    const results: EntityProfitability[] = [];
    for (const [id, data] of map.entries()) {
      const profit = Math.round((data.rev - data.cost) * 100) / 100;
      const margin = data.rev > 0 ? Math.round((profit / data.rev) * 10000) / 100 : 0;
      results.push({
        entity_id: id,
        entity_name: data.name,
        code: data.sku,
        sales_volume: data.qty,
        revenue: Math.round(data.rev * 100) / 100,
        cogs: Math.round(data.cost * 100) / 100,
        gross_profit: profit,
        margin_percent: margin,
      });
    }

    return results.sort((a, b) => b.gross_profit - a.gross_profit);
  }

  /**
   * Customer-level profitability breakdown.
   */
  static async getCustomerProfitability(session: AppSession): Promise<EntityProfitability[]> {
    requirePermission(session.role, 'profitability.view');
    const orgId = session.org_id || DEMO_ORG_ID;

    const map = new Map<string, { name: string; count: number; rev: number; cogs: number }>();

    for (const inv of demoInvoices.filter((i) => i.organization_id === orgId && (i.status as string) !== 'cancelled') as any[]) {
      const cust = demoCustomers.find((c) => c.id === inv.customer_id);
      const name = (cust as any)?.name || cust?.display_name || 'Customer';
      const rev = Number(inv.subtotal || 0);
      let invCogs = 0;

      for (const it of (inv.items || inv.invoice_items || []) as any[]) {
        const prod = demoProducts.find((p) => p.id === it.product_id);
        invCogs += Number(it.quantity || 0) * Number(prod?.purchase_price || 0);
      }

      const current = map.get(inv.customer_id) || { name, count: 0, rev: 0, cogs: 0 };
      current.count += 1;
      current.rev += rev;
      current.cogs += invCogs;
      map.set(inv.customer_id, current);
    }

    const results: EntityProfitability[] = [];
    for (const [id, data] of map.entries()) {
      const profit = Math.round((data.rev - data.cogs) * 100) / 100;
      const margin = data.rev > 0 ? Math.round((profit / data.rev) * 10000) / 100 : 0;
      results.push({
        entity_id: id,
        entity_name: data.name,
        sales_volume: data.count,
        revenue: Math.round(data.rev * 100) / 100,
        cogs: Math.round(data.cogs * 100) / 100,
        gross_profit: profit,
        margin_percent: margin,
      });
    }

    return results.sort((a, b) => b.gross_profit - a.gross_profit);
  }

  /**
   * Salesperson profitability breakdown.
   */
  static async getSalespersonProfitability(session: AppSession): Promise<EntityProfitability[]> {
    requirePermission(session.role, 'profitability.view');
    const orgId = session.org_id || DEMO_ORG_ID;

    const map = new Map<string, { name: string; count: number; rev: number; cogs: number }>();

    for (const sp of demoSalespersons.filter((s) => s.organization_id === orgId)) {
      map.set(sp.id, { name: sp.name, count: 0, rev: 0, cogs: 0 });
    }

    for (const inv of demoInvoices.filter((i) => i.organization_id === orgId && (i.status as string) !== 'cancelled') as any[]) {
      const spId = (inv as any).salesperson_id || 'sp-demo-1';
      let entry = map.get(spId);
      if (!entry) {
        entry = { name: 'Direct Sales', count: 0, rev: 0, cogs: 0 };
        map.set(spId, entry);
      }

      const rev = Number(inv.subtotal || 0);
      let invCogs = 0;
      for (const it of (inv.items || inv.invoice_items || []) as any[]) {
        const prod = demoProducts.find((p) => p.id === it.product_id);
        invCogs += Number(it.quantity || 0) * Number(prod?.purchase_price || 0);
      }

      entry.count += 1;
      entry.rev += rev;
      entry.cogs += invCogs;
    }

    const results: EntityProfitability[] = [];
    for (const [id, data] of map.entries()) {
      const profit = Math.round((data.rev - data.cogs) * 100) / 100;
      const margin = data.rev > 0 ? Math.round((profit / data.rev) * 10000) / 100 : 0;
      results.push({
        entity_id: id,
        entity_name: data.name,
        sales_volume: data.count,
        revenue: Math.round(data.rev * 100) / 100,
        cogs: Math.round(data.cogs * 100) / 100,
        gross_profit: profit,
        margin_percent: margin,
      });
    }

    return results.sort((a, b) => b.gross_profit - a.gross_profit);
  }
}
