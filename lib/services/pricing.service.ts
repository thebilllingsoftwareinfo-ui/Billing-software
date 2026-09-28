// ============================================================
// lib/services/pricing.service.ts — Phase 9 Advanced Pricing Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission, can } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  PriceListInput,
  priceListSchema,
  CustomerSpecialPriceInput,
  customerSpecialPriceSchema,
  PromotionalRuleInput,
  promotionalRuleSchema,
} from '@/lib/validators/pricing.schema';
import {
  demoPriceLists,
  demoPriceListItems,
  demoCustomerSpecialPrices,
  demoPromotions,
  demoProducts,
  demoCustomers,
  DemoPriceList,
  DemoPriceListItem,
  DemoCustomerSpecialPrice,
  DemoPromotionalRule,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface PricingResolutionResult {
  product_id: string;
  quantity: number;
  base_rate: number;
  resolved_rate: number;
  discount_percent: number;
  discount_amount: number;
  final_rate: number;
  hierarchy_level: 'customer_special_price' | 'customer_price_list' | 'group_price_list' | 'product_default';
  price_list_id?: string | null;
  price_list_name?: string | null;
  promotions: Array<{
    id: string;
    name: string;
    promo_type: string;
    benefit_description: string;
    free_quantity?: number;
    discount_amount?: number;
  }>;
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

export class PricingService {
  /**
   * Deterministic Price Hierarchy:
   * 1. Customer-Specific Product Price (customer_special_prices)
   * 2. Customer-Assigned Price List (price_list_items matching customer.default_price_list_id & quantity slab)
   * 3. Customer Group / Global Price List (matching customer.category/group)
   * 4. Product Default Selling Price (products.selling_price)
   */
  static async resolvePrice(
    session: AppSession,
    params: {
      product_id: string;
      customer_id?: string | null;
      quantity: number;
      unit?: string;
      date?: string;
    }
  ): Promise<PricingResolutionResult> {
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);
    const qty = Math.max(0.0001, Number(params.quantity) || 1);
    const currentDate = params.date || new Date().toISOString().split('T')[0];

    // Find Product Base
    let defaultSellingPrice = 0;
    let customerGroupId: string | null = null;
    let customerPriceListId: string | null = null;

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: prod } = await supabase
        .from('products')
        .select('selling_price')
        .eq('id', params.product_id)
        .eq('organization_id', orgId)
        .single();
      defaultSellingPrice = Number(prod?.selling_price) || 0;

      if (params.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('default_price_list_id, customer_group')
          .eq('id', params.customer_id)
          .eq('organization_id', orgId)
          .single();
        customerPriceListId = cust?.default_price_list_id || null;
        customerGroupId = cust?.customer_group || null;
      }
    } else {
      const prod = demoProducts.find((p) => p.id === params.product_id && p.organization_id === orgId) as any;
      defaultSellingPrice = Number(prod?.selling_price ?? prod?.sale_price) || 0;

      if (params.customer_id) {
        const cust = demoCustomers.find((c) => c.id === params.customer_id && c.organization_id === orgId) as any;
        customerPriceListId = cust?.default_price_list_id || null;
        customerGroupId = cust?.customer_group || null;
      }
    }

    let resolvedRate = defaultSellingPrice;
    let hierarchyLevel: PricingResolutionResult['hierarchy_level'] = 'product_default';
    let appliedPriceListId: string | null = null;
    let appliedPriceListName: string | null = null;
    let discountPercent = 0;
    let discountAmount = 0;

    // STEP 1: Check Customer-Specific Special Price
    if (params.customer_id) {
      if (isSupabase) {
        const supabase = createAdminClient();
        const { data: special } = await supabase
          .from('customer_special_prices')
          .select('*')
          .eq('organization_id', orgId)
          .eq('customer_id', params.customer_id)
          .eq('product_id', params.product_id)
          .lte('min_quantity', qty)
          .order('min_quantity', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (special) {
          const effectiveOk =
            (!special.effective_from || special.effective_from <= currentDate) &&
            (!special.effective_to || special.effective_to >= currentDate);
          if (effectiveOk) {
            resolvedRate = Number(special.custom_rate);
            discountPercent = Number(special.discount_percent || 0);
            hierarchyLevel = 'customer_special_price';
          }
        }
      } else {
        const matchingSpecial = demoCustomerSpecialPrices
          .filter(
            (sp) =>
              sp.organization_id === orgId &&
              sp.customer_id === params.customer_id &&
              sp.product_id === params.product_id &&
              sp.min_quantity <= qty &&
              (!sp.effective_from || sp.effective_from <= currentDate) &&
              (!sp.effective_to || sp.effective_to >= currentDate)
          )
          .sort((a, b) => b.min_quantity - a.min_quantity)[0];

        if (matchingSpecial) {
          resolvedRate = Number(matchingSpecial.custom_rate);
          discountPercent = Number(matchingSpecial.discount_percent || 0);
          hierarchyLevel = 'customer_special_price';
        }
      }
    }

    // STEP 2: Customer-Assigned Price List
    if (hierarchyLevel === 'product_default' && customerPriceListId) {
      const match = await this.matchPriceList(orgId, customerPriceListId, params.product_id, qty, currentDate, isSupabase);
      if (match) {
        resolvedRate = match.rate;
        discountPercent = match.discountPercent;
        discountAmount = match.discountAmount;
        hierarchyLevel = 'customer_price_list';
        appliedPriceListId = match.priceListId;
        appliedPriceListName = match.priceListName;
      }
    }

    // STEP 3: Customer Group / Global Price List
    if (hierarchyLevel === 'product_default' && customerGroupId) {
      let groupPriceListId: string | null = null;
      if (isSupabase) {
        const supabase = createAdminClient();
        const { data: gpl } = await supabase
          .from('price_lists')
          .select('id')
          .eq('organization_id', orgId)
          .eq('customer_group', customerGroupId)
          .eq('is_active', true)
          .maybeSingle();
        groupPriceListId = gpl?.id || null;
      } else {
        const gpl = demoPriceLists.find(
          (pl) => pl.organization_id === orgId && pl.customer_group === customerGroupId && pl.is_active
        );
        groupPriceListId = gpl?.id || null;
      }

      if (groupPriceListId) {
        const match = await this.matchPriceList(orgId, groupPriceListId, params.product_id, qty, currentDate, isSupabase);
        if (match) {
          resolvedRate = match.rate;
          discountPercent = match.discountPercent;
          discountAmount = match.discountAmount;
          hierarchyLevel = 'group_price_list';
          appliedPriceListId = match.priceListId;
          appliedPriceListName = match.priceListName;
        }
      }
    }

    // STEP 4: Check Active Promotions
    const activePromotions: PricingResolutionResult['promotions'] = [];
    const promos = isSupabase
      ? (
          await createAdminClient()
            .from('promotional_rules')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .lte('start_date', currentDate)
            .gte('end_date', currentDate)
        ).data || []
      : demoPromotions.filter(
          (p) =>
            p.organization_id === orgId &&
            p.is_active &&
            p.start_date <= currentDate &&
            p.end_date >= currentDate &&
            (!p.max_usage_count || p.current_usage_count < p.max_usage_count)
        );

    for (const promo of promos) {
      if (promo.promo_type === 'buy_x_get_y' && promo.buy_product_id === params.product_id) {
        if (qty >= Number(promo.buy_quantity)) {
          const sets = Math.floor(qty / Number(promo.buy_quantity));
          const freeQty = sets * Number(promo.get_quantity || 1);
          activePromotions.push({
            id: promo.id,
            name: promo.name,
            promo_type: 'buy_x_get_y',
            benefit_description: `Buy ${promo.buy_quantity} Get ${promo.get_quantity} Free (${freeQty} complimentary)`,
            free_quantity: freeQty,
          });
        }
      } else if (promo.promo_type === 'percentage_discount' && promo.buy_product_id === params.product_id) {
        const promoDisc = Number(promo.discount_value || 0);
        if (promoDisc > discountPercent) {
          discountPercent = promoDisc;
        }
        activePromotions.push({
          id: promo.id,
          name: promo.name,
          promo_type: 'percentage_discount',
          benefit_description: `${promoDisc}% Promotional Discount`,
        });
      } else if (promo.promo_type === 'fixed_discount' && promo.buy_product_id === params.product_id) {
        const promoDiscAmount = Number(promo.discount_value || 0);
        discountAmount += promoDiscAmount;
        activePromotions.push({
          id: promo.id,
          name: promo.name,
          promo_type: 'fixed_discount',
          benefit_description: `₹${promoDiscAmount} Promotional Discount`,
          discount_amount: promoDiscAmount,
        });
      }
    }

    // Compute final line rate
    let finalRate = resolvedRate;
    if (discountPercent > 0) {
      finalRate = finalRate * (1 - discountPercent / 100);
    }
    if (discountAmount > 0) {
      finalRate = Math.max(0, finalRate - discountAmount);
    }

    return {
      product_id: params.product_id,
      quantity: qty,
      base_rate: defaultSellingPrice,
      resolved_rate: resolvedRate,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      final_rate: Math.round(finalRate * 100) / 100,
      hierarchy_level: hierarchyLevel,
      price_list_id: appliedPriceListId,
      price_list_name: appliedPriceListName,
      promotions: activePromotions,
    };
  }

  private static async matchPriceList(
    orgId: string,
    priceListId: string,
    productId: string,
    quantity: number,
    currentDate: string,
    isSupabase: boolean
  ): Promise<{
    rate: number;
    discountPercent: number;
    discountAmount: number;
    priceListId: string;
    priceListName: string;
  } | null> {
    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: pl } = await supabase
        .from('price_lists')
        .select('name, is_active, effective_from, effective_to')
        .eq('id', priceListId)
        .eq('organization_id', orgId)
        .single();

      if (!pl || !pl.is_active) return null;
      if (pl.effective_from && pl.effective_from > currentDate) return null;
      if (pl.effective_to && pl.effective_to < currentDate) return null;

      const { data: items } = await supabase
        .from('price_list_items')
        .select('*')
        .eq('organization_id', orgId)
        .eq('price_list_id', priceListId)
        .eq('product_id', productId)
        .eq('is_active', true)
        .lte('min_quantity', quantity)
        .order('min_quantity', { ascending: false });

      if (!items || items.length === 0) return null;

      // Filter upper bound if defined
      const item = (items as any[]).find((it: any) => it.max_quantity === null || it.max_quantity === undefined || Number(it.max_quantity) >= quantity);
      if (!item) return null;

      return {
        rate: item.fixed_price !== null && item.fixed_price !== undefined ? Number(item.fixed_price) : 0,
        discountPercent: Number(item.discount_percent || 0),
        discountAmount: Number(item.discount_amount || 0),
        priceListId,
        priceListName: pl.name,
      };
    } else {
      const pl = demoPriceLists.find((p) => p.id === priceListId && p.organization_id === orgId && p.is_active);
      if (!pl) return null;
      if (pl.effective_from && pl.effective_from > currentDate) return null;
      if (pl.effective_to && pl.effective_to < currentDate) return null;

      const matchingItems = demoPriceListItems
        .filter(
          (it) =>
            it.organization_id === orgId &&
            it.price_list_id === priceListId &&
            it.product_id === productId &&
            it.is_active &&
            it.min_quantity <= quantity &&
            (it.max_quantity === null || it.max_quantity === undefined || it.max_quantity >= quantity)
        )
        .sort((a, b) => b.min_quantity - a.min_quantity);

      if (matchingItems.length === 0) return null;
      const item = matchingItems[0];

      return {
        rate: item.fixed_price !== null && item.fixed_price !== undefined ? Number(item.fixed_price) : 0,
        discountPercent: Number(item.discount_percent || 0),
        discountAmount: Number(item.discount_amount || 0),
        priceListId,
        priceListName: pl.name,
      };
    }
  }

  // ============================================================
  // Price Override Authorization
  // ============================================================
  static validatePriceOverride(
    session: AppSession,
    params: {
      product_id: string;
      original_rate: number;
      override_rate: number;
      reason: string;
    }
  ): { authorized: boolean; reason: string } {
    if (params.override_rate === params.original_rate) {
      return { authorized: true, reason: 'No price change' };
    }

    if (!can(session.role, 'pricing.override')) {
      throw new Error(`FORBIDDEN: User with role '${session.role}' is not authorized to override prices manually`);
    }

    if (!params.reason || params.reason.trim().length === 0) {
      throw new Error('Override reason is required for manual price modification');
    }

    return {
      authorized: true,
      reason: params.reason,
    };
  }

  // ============================================================
  // Price Lists CRUD
  // ============================================================
  static async getPriceLists(session: AppSession): Promise<DemoPriceList[]> {
    requirePermission(session.role, 'pricing.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoPriceLists.filter((pl) => pl.organization_id === orgId);
  }

  static async getPriceListById(session: AppSession, id: string): Promise<{ priceList: DemoPriceList; items: DemoPriceListItem[] }> {
    requirePermission(session.role, 'pricing.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: pl, error: plErr } = await supabase
        .from('price_lists')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();
      if (plErr) throw new Error(plErr.message);

      const { data: items, error: itemsErr } = await supabase
        .from('price_list_items')
        .select('*')
        .eq('price_list_id', id)
        .eq('organization_id', orgId);
      if (itemsErr) throw new Error(itemsErr.message);

      return { priceList: pl, items: items || [] };
    }

    const pl = demoPriceLists.find((p) => p.id === id && p.organization_id === orgId);
    if (!pl) throw new Error('Price list not found');
    const items = demoPriceListItems.filter((it) => it.price_list_id === id && it.organization_id === orgId);
    return { priceList: pl, items };
  }

  static async createPriceList(session: AppSession, input: PriceListInput): Promise<DemoPriceList> {
    requirePermission(session.role, 'pricing.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const validated = priceListSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data: pl, error: plErr } = await supabase
        .from('price_lists')
        .insert({
          organization_id: orgId,
          name: validated.name,
          code: validated.code,
          description: validated.description || null,
          currency: validated.currency,
          is_active: validated.is_active,
          customer_group: validated.customer_group || null,
          effective_from: validated.effective_from || null,
          effective_to: validated.effective_to || null,
        })
        .select()
        .single();
      if (plErr) throw new Error(plErr.message);

      if (validated.items && validated.items.length > 0) {
        const itemRows = validated.items.map((it) => ({
          organization_id: orgId,
          price_list_id: pl.id,
          product_id: it.product_id,
          unit: it.unit,
          min_quantity: it.min_quantity,
          max_quantity: it.max_quantity ?? null,
          fixed_price: it.fixed_price ?? null,
          discount_percent: it.discount_percent ?? 0,
          discount_amount: it.discount_amount ?? 0,
          is_active: it.is_active,
        }));
        await supabase.from('price_list_items').insert(itemRows);
      }

      await logAudit(session, 'price_list.created', 'price_lists', pl.id, { code: validated.code, name: validated.name });
      return pl;
    }

    // Check duplicate code
    const existing = demoPriceLists.find((p) => p.organization_id === orgId && p.code.toUpperCase() === validated.code.toUpperCase());
    if (existing) throw new Error(`Price list code '${validated.code}' already exists`);

    const newPl: DemoPriceList = {
      id: `pl-${Date.now()}`,
      organization_id: orgId,
      name: validated.name,
      code: validated.code,
      description: validated.description || null,
      currency: validated.currency,
      is_active: validated.is_active,
      customer_group: validated.customer_group || null,
      effective_from: validated.effective_from || null,
      effective_to: validated.effective_to || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoPriceLists.push(newPl);

    if (validated.items && validated.items.length > 0) {
      for (const it of validated.items) {
        demoPriceListItems.push({
          id: `pli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          organization_id: orgId,
          price_list_id: newPl.id,
          product_id: it.product_id,
          unit: it.unit,
          min_quantity: it.min_quantity,
          max_quantity: it.max_quantity ?? null,
          fixed_price: it.fixed_price ?? null,
          discount_percent: it.discount_percent ?? 0,
          discount_amount: it.discount_amount ?? 0,
          is_active: it.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    await logAudit(session, 'price_list.created', 'price_lists', newPl.id, { code: validated.code, name: validated.name });
    return newPl;
  }

  static async updatePriceList(session: AppSession, id: string, input: Partial<PriceListInput>): Promise<DemoPriceList> {
    requirePermission(session.role, 'pricing.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('price_lists')
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.is_active !== undefined && { is_active: input.is_active }),
          ...(input.customer_group !== undefined && { customer_group: input.customer_group }),
          ...(input.effective_from !== undefined && { effective_from: input.effective_from }),
          ...(input.effective_to !== undefined && { effective_to: input.effective_to }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const pl = demoPriceLists.find((p) => p.id === id && p.organization_id === orgId);
    if (!pl) throw new Error('Price list not found');

    if (input.name !== undefined) pl.name = input.name;
    if (input.description !== undefined) pl.description = input.description;
    if (input.is_active !== undefined) pl.is_active = input.is_active;
    if (input.customer_group !== undefined) pl.customer_group = input.customer_group;
    if (input.effective_from !== undefined) pl.effective_from = input.effective_from;
    if (input.effective_to !== undefined) pl.effective_to = input.effective_to;
    pl.updated_at = new Date().toISOString();

    return pl;
  }

  // ============================================================
  // Customer Special Pricing
  // ============================================================
  static async setCustomerSpecialPrice(session: AppSession, input: CustomerSpecialPriceInput): Promise<DemoCustomerSpecialPrice> {
    requirePermission(session.role, 'pricing.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const validated = customerSpecialPriceSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('customer_special_prices')
        .upsert(
          {
            organization_id: orgId,
            customer_id: validated.customer_id,
            product_id: validated.product_id,
            custom_rate: validated.custom_rate,
            discount_percent: validated.discount_percent ?? 0,
            min_quantity: validated.min_quantity,
            effective_from: validated.effective_from || null,
            effective_to: validated.effective_to || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,customer_id,product_id,min_quantity' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const existingIndex = demoCustomerSpecialPrices.findIndex(
      (sp) =>
        sp.organization_id === orgId &&
        sp.customer_id === validated.customer_id &&
        sp.product_id === validated.product_id &&
        sp.min_quantity === validated.min_quantity
    );

    const record: DemoCustomerSpecialPrice = {
      id: existingIndex >= 0 ? demoCustomerSpecialPrices[existingIndex].id : `csp-${Date.now()}`,
      organization_id: orgId,
      customer_id: validated.customer_id,
      product_id: validated.product_id,
      custom_rate: validated.custom_rate,
      discount_percent: validated.discount_percent ?? 0,
      min_quantity: validated.min_quantity,
      effective_from: validated.effective_from || null,
      effective_to: validated.effective_to || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      demoCustomerSpecialPrices[existingIndex] = record;
    } else {
      demoCustomerSpecialPrices.push(record);
    }

    return record;
  }

  static async getCustomerSpecialPrices(session: AppSession, customerId: string): Promise<DemoCustomerSpecialPrice[]> {
    requirePermission(session.role, 'pricing.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('customer_special_prices')
        .select('*')
        .eq('customer_id', customerId)
        .eq('organization_id', orgId);
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoCustomerSpecialPrices.filter((sp) => sp.customer_id === customerId && sp.organization_id === orgId);
  }

  // ============================================================
  // Promotions CRUD
  // ============================================================
  static async createPromotion(session: AppSession, input: PromotionalRuleInput): Promise<DemoPromotionalRule> {
    requirePermission(session.role, 'pricing.manage');
    const orgId = session.org_id || DEMO_ORG_ID;
    const validated = promotionalRuleSchema.parse(input);
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('promotional_rules')
        .insert({
          organization_id: orgId,
          ...validated,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const promo: DemoPromotionalRule = {
      id: `promo-${Date.now()}`,
      organization_id: orgId,
      name: validated.name,
      code: validated.code,
      promo_type: validated.promo_type,
      buy_product_id: validated.buy_product_id || null,
      buy_quantity: validated.buy_quantity,
      get_product_id: validated.get_product_id || null,
      get_quantity: validated.get_quantity,
      discount_value: validated.discount_value,
      min_order_amount: validated.min_order_amount,
      start_date: validated.start_date,
      end_date: validated.end_date,
      max_usage_count: validated.max_usage_count || null,
      current_usage_count: 0,
      is_active: validated.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoPromotions.push(promo);
    return promo;
  }

  static async getPromotions(session: AppSession): Promise<DemoPromotionalRule[]> {
    requirePermission(session.role, 'pricing.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    if (isSupabase) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('promotional_rules')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    return demoPromotions.filter((p) => p.organization_id === orgId);
  }
}
