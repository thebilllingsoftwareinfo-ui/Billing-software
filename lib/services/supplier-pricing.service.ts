// ============================================================
// lib/services/supplier-pricing.service.ts — Phase 9 Supplier Purchase Pricing
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  SupplierPricingInput,
  supplierPricingSchema,
} from '@/lib/validators/pricing.schema';
import {
  demoSupplierPricing,
  demoPurchasePriceHistory,
  demoProducts,
  DemoSupplierPricing,
  DemoPurchasePriceHistory,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

function checkIsSupabase(session: { org_id?: string; organization_id?: string; user_id?: string }): boolean {
  const orgId = session.org_id || session.organization_id || DEMO_ORG_ID;
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-ref') &&
    orgId !== DEMO_ORG_ID &&
    !session.user_id?.includes('demo')
  );
}

export class SupplierPricingService {
  /**
   * Resolves the effective purchase rate for a given supplier, product, and quantity.
   */
  static async resolvePurchaseRate(
    session: AppSession,
    supplierId: string,
    productId: string,
    quantity: number = 1
  ): Promise<{ rate: number; source: 'supplier_pricing' | 'product_default'; min_quantity: number }> {
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);
    const qty = Math.max(0.0001, Number(quantity) || 1);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: rates } = await supabase
        .from('supplier_pricing')
        .select('*')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .eq('product_id', productId)
        .lte('min_quantity', qty)
        .order('min_quantity', { ascending: false });

      if (rates && rates.length > 0) {
        return {
          rate: Number(rates[0].purchase_rate),
          source: 'supplier_pricing',
          min_quantity: Number(rates[0].min_quantity),
        };
      }

      const { data: prod } = await supabase
        .from('products')
        .select('purchase_price')
        .eq('organization_id', orgId)
        .eq('id', productId)
        .single();

      return {
        rate: Number(prod?.purchase_price || 0),
        source: 'product_default',
        min_quantity: 1,
      };
    } else {
      const matching = demoSupplierPricing
        .filter(
          (sp) =>
            sp.organization_id === orgId &&
            sp.supplier_id === supplierId &&
            sp.product_id === productId &&
            sp.min_quantity <= qty
        )
        .sort((a, b) => b.min_quantity - a.min_quantity);

      if (matching.length > 0) {
        return {
          rate: Number(matching[0].purchase_rate),
          source: 'supplier_pricing',
          min_quantity: Number(matching[0].min_quantity),
        };
      }

      const prod = demoProducts.find((p) => p.id === productId && p.organization_id === orgId);
      return {
        rate: Number(prod?.purchase_price || 0),
        source: 'product_default',
        min_quantity: 1,
      };
    }
  }

  /**
   * Sets or updates supplier purchase rate and logs historical price change.
   */
  static async setSupplierRate(session: AppSession, input: SupplierPricingInput): Promise<DemoSupplierPricing> {
    requirePermission(session.role, 'purchases.create');
    const orgId = session.org_id || DEMO_ORG_ID;
    const validated = supplierPricingSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    // Check existing rate for history
    const previous = await this.resolvePurchaseRate(
      session,
      validated.supplier_id,
      validated.product_id,
      validated.min_quantity
    );

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: record, error } = await supabase
        .from('supplier_pricing')
        .upsert(
          {
            organization_id: orgId,
            supplier_id: validated.supplier_id,
            product_id: validated.product_id,
            unit: validated.unit,
            purchase_rate: validated.purchase_rate,
            min_quantity: validated.min_quantity,
            effective_from: validated.effective_from || null,
            effective_to: validated.effective_to || null,
            notes: validated.notes || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,supplier_id,product_id,min_quantity' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Record History if price changed
      if (previous.rate !== validated.purchase_rate) {
        await supabase.from('purchase_price_history').insert({
          organization_id: orgId,
          supplier_id: validated.supplier_id,
          product_id: validated.product_id,
          old_price: previous.rate,
          new_price: validated.purchase_rate,
          changed_by: session.user_id,
          reason: validated.notes || 'Updated supplier contract rate',
        });
      }

      await logAudit(session, 'supplier_rate.updated', 'supplier_pricing', record.id, {
        supplier_id: validated.supplier_id,
        product_id: validated.product_id,
        purchase_rate: validated.purchase_rate,
      });

      return record;
    } else {
      const existingIdx = demoSupplierPricing.findIndex(
        (sp) =>
          sp.organization_id === orgId &&
          sp.supplier_id === validated.supplier_id &&
          sp.product_id === validated.product_id &&
          sp.min_quantity === validated.min_quantity
      );

      const record: DemoSupplierPricing = {
        id: existingIdx >= 0 ? demoSupplierPricing[existingIdx].id : `sp-${Date.now()}`,
        organization_id: orgId,
        supplier_id: validated.supplier_id,
        product_id: validated.product_id,
        unit: validated.unit,
        purchase_rate: validated.purchase_rate,
        min_quantity: validated.min_quantity,
        effective_from: validated.effective_from || null,
        effective_to: validated.effective_to || null,
        notes: validated.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        demoSupplierPricing[existingIdx] = record;
      } else {
        demoSupplierPricing.push(record);
      }

      if (previous.rate !== validated.purchase_rate) {
        demoPurchasePriceHistory.push({
          id: `pph-${Date.now()}`,
          organization_id: orgId,
          supplier_id: validated.supplier_id,
          product_id: validated.product_id,
          old_price: previous.rate,
          new_price: validated.purchase_rate,
          changed_by: session.user_id,
          reason: validated.notes || 'Updated supplier contract rate',
          created_at: new Date().toISOString(),
        });
      }

      await logAudit(session, 'supplier_rate.updated', 'supplier_pricing', record.id, {
        supplier_id: validated.supplier_id,
        product_id: validated.product_id,
        purchase_rate: validated.purchase_rate,
      });

      return record;
    }
  }

  static async getSupplierRates(session: AppSession, supplierId?: string): Promise<DemoSupplierPricing[]> {
    requirePermission(session.role, 'purchases.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      let query = supabase.from('supplier_pricing').select('*').eq('organization_id', orgId);
      if (supplierId) query = query.eq('supplier_id', supplierId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoSupplierPricing.filter((sp) => sp.organization_id === orgId && (!supplierId || sp.supplier_id === supplierId));
  }

  static async getPriceHistory(session: AppSession, productId?: string, supplierId?: string): Promise<DemoPurchasePriceHistory[]> {
    requirePermission(session.role, 'purchases.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      let query = supabase.from('purchase_price_history').select('*').eq('organization_id', orgId);
      if (productId) query = query.eq('product_id', productId);
      if (supplierId) query = query.eq('supplier_id', supplierId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoPurchasePriceHistory.filter(
      (h) =>
        h.organization_id === orgId &&
        (!productId || h.product_id === productId) &&
        (!supplierId || h.supplier_id === supplierId)
    );
  }
}
