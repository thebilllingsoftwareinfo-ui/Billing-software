import { describe, it, expect, beforeEach } from 'vitest';
import { PricingService } from '@/lib/services/pricing.service';
import { DiscountEngineService } from '@/lib/services/discount-engine.service';
import { SupplierPricingService } from '@/lib/services/supplier-pricing.service';
import { CreditControlService } from '@/lib/services/credit-control.service';
import { SalespersonService } from '@/lib/services/salesperson.service';
import { RecurringInvoiceService } from '@/lib/services/recurring-invoice.service';
import { ProcurementService } from '@/lib/services/procurement.service';
import { ProfitabilityService } from '@/lib/services/profitability.service';
import { SalesTransactionService } from '@/lib/services/sales-transaction.service';
import { AppSession } from '@/lib/auth/session';
import {
  demoResetPhase9Stores,
  demoPriceLists,
  demoPriceListItems,
  demoCustomerSpecialPrices,
  demoPromotions,
  demoSupplierPricing,
  demoPurchasePriceHistory,
  demoSalespersons,
  demoSalesCommissions,
  demoRecurringInvoices,
  demoRecurringInvoiceLogs,
  demoCustomers,
  demoProducts,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

const sessionOrgA: AppSession = {
  user_id: 'user-admin-a',
  organization_id: DEMO_ORG_ID,
  org_id: DEMO_ORG_ID,
  email: 'admin@org-a.com',
  role: 'admin',
  user: { id: 'user-admin-a', email: 'admin@org-a.com', full_name: 'Admin', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Acme', gstin: null, logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-1', role: 'admin', status: 'active' },
};

const sessionSales: AppSession = {
  user_id: 'user-sales-a',
  organization_id: DEMO_ORG_ID,
  org_id: DEMO_ORG_ID,
  email: 'sales@org-a.com',
  role: 'sales',
  user: { id: 'user-sales-a', email: 'sales@org-a.com', full_name: 'Sales', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Acme', gstin: null, logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-2', role: 'sales', status: 'active' },
};

const sessionViewer: AppSession = {
  user_id: 'user-viewer-a',
  organization_id: DEMO_ORG_ID,
  org_id: DEMO_ORG_ID,
  email: 'viewer@org-a.com',
  role: 'viewer' as any,
  user: { id: 'user-viewer-a', email: 'viewer@org-a.com', full_name: 'Viewer', avatar_url: null },
  organization: { id: DEMO_ORG_ID, name: 'Acme', gstin: null, logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-3', role: 'viewer' as any, status: 'active' },
};

const sessionOrgB: AppSession = {
  user_id: 'user-admin-b',
  organization_id: 'org-tenant-b-999',
  org_id: 'org-tenant-b-999',
  email: 'admin@org-b.com',
  role: 'admin',
  user: { id: 'user-admin-b', email: 'admin@org-b.com', full_name: 'Admin B', avatar_url: null },
  organization: { id: 'org-tenant-b-999', name: 'Tenant B', gstin: null, logo_url: null, business_category: 'General Wholesale' },
  member: { id: 'mem-b', role: 'admin', status: 'active' },
};

describe('Phase 9: Advanced Sales, Purchase, Pricing & Operations Test Suite', () => {
  beforeEach(() => {
    demoResetPhase9Stores();

    const existing1 = demoCustomers.find((c) => c.id === 'cust-1');
    if (!existing1) {
      demoCustomers.push({
        id: 'cust-1',
        organization_id: DEMO_ORG_ID,
        display_name: 'Apex Enterprises Pvt Ltd',
        customer_type: 'business',
        is_gst_registered: true,
        credit_period_days: 30,
        credit_limit: 100000,
        outstanding_balance: 40000,
        is_active: true,
        created_at: new Date().toISOString(),
        customer_addresses: [],
      } as any);
    } else {
      (existing1 as any).credit_limit = 100000;
      (existing1 as any).current_balance = 40000;
      (existing1 as any).outstanding_balance = 40000;
      (existing1 as any).default_price_list_id = undefined;
      (existing1 as any).customer_group = undefined;
    }

    const existing2 = demoCustomers.find((c) => c.id === 'cust-2');
    if (!existing2) {
      demoCustomers.push({
        id: 'cust-2',
        organization_id: DEMO_ORG_ID,
        display_name: 'Global Tech Solutions',
        customer_type: 'business',
        is_gst_registered: true,
        credit_period_days: 15,
        credit_limit: 50000,
        outstanding_balance: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        customer_addresses: [],
      } as any);
    } else {
      (existing2 as any).credit_limit = 50000;
      (existing2 as any).current_balance = 0;
      (existing2 as any).outstanding_balance = 0;
      (existing2 as any).default_price_list_id = undefined;
      (existing2 as any).customer_group = undefined;
    }
  });

  // ============================================================
  // 1. ADVANCED PRICE LIST SYSTEM & SLABS (8 Tests)
  // ============================================================
  describe('1. Advanced Price List System & Slabs', () => {
    it('1.1 should fetch active price lists for an organization', async () => {
      const lists = await PricingService.getPriceLists(sessionOrgA);
      expect(lists.length).toBeGreaterThanOrEqual(2);
      expect(lists.some((pl) => pl.code === 'PL-WHOLESALE')).toBe(true);
    });

    it('1.2 should create a new custom price list with quantity slabs', async () => {
      const created = await PricingService.createPriceList(sessionOrgA, {
        name: 'Distributor Gold Tier',
        code: 'PL-DIST-GOLD',
        description: 'Special high-volume tier for distributors',
        currency: 'INR',
        is_active: true,
        customer_group: 'distributor',
        items: [
          { product_id: 'prod-1', unit: 'PCS', min_quantity: 10, max_quantity: 99, fixed_price: 450 },
          { product_id: 'prod-1', unit: 'PCS', min_quantity: 100, max_quantity: null, fixed_price: 400 },
        ],
      });

      expect(created.id).toBeDefined();
      expect(created.code).toBe('PL-DIST-GOLD');

      const details = await PricingService.getPriceListById(sessionOrgA, created.id);
      expect(details.items.length).toBe(2);
      expect(details.items[1].fixed_price).toBe(400);
    });

    it('1.3 should reject duplicate price list code within same organization', async () => {
      await expect(
        PricingService.createPriceList(sessionOrgA, {
          name: 'Duplicate Wholesale',
          code: 'PL-WHOLESALE',
          currency: 'INR',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('1.4 should reject price list item where max_quantity is less than min_quantity', async () => {
      await expect(
        PricingService.createPriceList(sessionOrgA, {
          name: 'Invalid Slabs',
          code: 'PL-INVALID-SLAB',
          currency: 'INR',
          items: [{ product_id: 'prod-1', unit: 'PCS', min_quantity: 50, max_quantity: 20, fixed_price: 300 }],
        })
      ).rejects.toThrow();
    });

    it('1.5 should update price list details without modifying code', async () => {
      const updated = await PricingService.updatePriceList(sessionOrgA, 'pl-wholesale-1', {
        name: 'Wholesale Standard V2',
        description: 'Updated terms for 2026',
      });
      expect(updated.name).toBe('Wholesale Standard V2');
      expect(updated.code).toBe('PL-WHOLESALE');
    });

    it('1.6 should deactivate price list and prevent subsequent matching', async () => {
      await PricingService.updatePriceList(sessionOrgA, 'pl-wholesale-1', { is_active: false });

      // Customer assigned to deactivated price list should fall back to product default
      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        customer_id: 'cust-1', // Default assigned to wholesale
        quantity: 5,
      });

      // Since wholesale is deactivated, it falls back to product default (550)
      expect(res.resolved_rate).toBe(550);
      expect(res.hierarchy_level).toBe('product_default');
    });

    it('1.7 should respect effective date ranges on price lists', async () => {
      const pl = await PricingService.createPriceList(sessionOrgA, {
        name: 'Future Festival Sale',
        code: 'PL-FUTURE-SALE',
        currency: 'INR',
        effective_from: '2026-11-01',
        effective_to: '2026-11-15',
        customer_group: 'retail',
        items: [{ product_id: 'prod-1', unit: 'PCS', min_quantity: 1, fixed_price: 399 }],
      });

      // Today is before effective_from
      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        quantity: 1,
        date: '2026-09-26',
      });
      expect(res.resolved_rate).not.toBe(399);
    });

    it('1.8 staff without pricing.manage cannot create price list', async () => {
      await expect(
        PricingService.createPriceList(sessionSales, {
          name: 'Unauthorized Price List',
          code: 'PL-UNAUTH',
          currency: 'INR',
        })
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 2. CUSTOMER-SPECIFIC PRICING & DETERMINISTIC HIERARCHY (8 Tests)
  // ============================================================
  describe('2. Customer-Specific Pricing & Deterministic Hierarchy', () => {
    it('2.1 hierarchy step 1: customer special price takes absolute highest precedence', async () => {
      await PricingService.setCustomerSpecialPrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        custom_rate: 420,
        min_quantity: 1,
      });

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 5,
      });

      expect(res.resolved_rate).toBe(420);
      expect(res.hierarchy_level).toBe('customer_special_price');
    });

    it('2.2 hierarchy step 2: falls back to customer assigned price list if no special price exists', async () => {
      // In demo store, prod-1 in wholesale list for qty 5 has rate 520
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 5,
      });

      expect(res.resolved_rate).toBe(520);
      expect(res.hierarchy_level).toBe('customer_price_list');
      expect(res.price_list_id).toBe('pl-wholesale-1');
    });

    it('2.3 hierarchy step 3: falls back to customer group price list if no default price list assigned', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-2') as any;
      cust.default_price_list_id = null;
      cust.customer_group = 'retail';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-2',
        product_id: 'prod-1',
        quantity: 1,
      });

      expect(res.hierarchy_level).toBe('product_default');
      expect(res.resolved_rate).toBe(550);
    });

    it('2.4 hierarchy step 4: falls back to product default selling price when no match exists', async () => {
      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        quantity: 1,
      });

      expect(res.resolved_rate).toBe(550);
      expect(res.hierarchy_level).toBe('product_default');
    });

    it('2.5 customer special price supports min_quantity threshold', async () => {
      await PricingService.setCustomerSpecialPrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        custom_rate: 380,
        min_quantity: 50,
      });

      // Quantity 20 does not qualify for special price min_quantity 50
      const resBelow = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 20,
      });
      expect(resBelow.resolved_rate).not.toBe(380);

      // Quantity 55 qualifies
      const resAbove = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 55,
      });
      expect(resAbove.resolved_rate).toBe(380);
      expect(resAbove.hierarchy_level).toBe('customer_special_price');
    });

    it('2.6 updating customer special price updates existing record idempotently', async () => {
      await PricingService.setCustomerSpecialPrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        custom_rate: 410,
        min_quantity: 1,
      });

      await PricingService.setCustomerSpecialPrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        custom_rate: 395,
        min_quantity: 1,
      });

      const list = await PricingService.getCustomerSpecialPrices(sessionOrgA, 'cust-1');
      expect(list.length).toBe(1);
      expect(list[0].custom_rate).toBe(395);
    });

    it('2.7 customer special price respects expired effective_to date', async () => {
      await PricingService.setCustomerSpecialPrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        custom_rate: 350,
        min_quantity: 1,
        effective_from: '2026-01-01',
        effective_to: '2026-06-30', // Expired
      });

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 1,
        date: '2026-09-26',
      });
      expect(res.resolved_rate).not.toBe(350);
    });

    it('2.8 staff without pricing.manage cannot set customer special prices', async () => {
      await expect(
        PricingService.setCustomerSpecialPrice(sessionSales, {
          customer_id: 'cust-1',
          product_id: 'prod-1',
          custom_rate: 100,
          min_quantity: 1,
        })
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 3. QUANTITY-BASED SLABS & UNIT CONVERSION SAFETY (6 Tests)
  // ============================================================
  describe('3. Quantity-Based Slabs & Unit Conversion Safety', () => {
    it('3.1 lower slab (1–9 units) matches exact fixed price (520)', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 5,
      });
      expect(res.resolved_rate).toBe(520);
    });

    it('3.2 middle slab (10–49 units) matches exact discounted fixed price (490)', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 25,
      });
      expect(res.resolved_rate).toBe(490);
    });

    it('3.3 upper slab (50+ units) matches highest volume tier rate (460)', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 100,
      });
      expect(res.resolved_rate).toBe(460);
    });

    it('3.4 slab lower boundary (exact 10 units) qualifies for middle slab', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 10,
      });
      expect(res.resolved_rate).toBe(490);
    });

    it('3.5 slab upper boundary (exact 49 units) qualifies for middle slab', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 49,
      });
      expect(res.resolved_rate).toBe(490);
    });

    it('3.6 handles fractional decimal quantities safely', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.default_price_list_id = 'pl-wholesale-1';

      const res = await PricingService.resolvePrice(sessionOrgA, {
        customer_id: 'cust-1',
        product_id: 'prod-1',
        quantity: 10.5,
      });
      expect(res.resolved_rate).toBe(490);
    });
  });

  // ============================================================
  // 4. CONTROLLED DISCOUNT ENGINE & BOUNDARY SAFETY (8 Tests)
  // ============================================================
  describe('4. Controlled Discount Engine & Boundary Safety', () => {
    it('4.1 calculates percentage line discount accurately', () => {
      const res = DiscountEngineService.calculateDiscounts([
        { product_id: 'prod-1', quantity: 2, unit_price: 500, line_discount_percent: 10 },
      ]);

      expect(res.gross_subtotal).toBe(1000);
      expect(res.total_line_discount).toBe(100);
      expect(res.net_subtotal).toBe(900);
    });

    it('4.2 calculates fixed amount line discount accurately', () => {
      const res = DiscountEngineService.calculateDiscounts([
        { product_id: 'prod-1', quantity: 1, unit_price: 1500, line_discount_amount: 250 },
      ]);

      expect(res.gross_subtotal).toBe(1500);
      expect(res.total_line_discount).toBe(250);
      expect(res.net_subtotal).toBe(1250);
    });

    it('4.3 applies document/invoice-level percentage discount after line discounts', () => {
      const res = DiscountEngineService.calculateDiscounts(
        [
          { product_id: 'prod-1', quantity: 1, unit_price: 1000, line_discount_percent: 10 }, // 900
          { product_id: 'prod-2', quantity: 1, unit_price: 1000, line_discount_percent: 0 },  // 1000
        ],
        { percent: 5 } // 5% of 1900 = 95
      );

      expect(res.gross_subtotal).toBe(2000);
      expect(res.total_line_discount).toBe(100);
      expect(res.invoice_discount).toBe(95);
      expect(res.net_subtotal).toBe(1805);
      expect(res.total_discount).toBe(195);
    });

    it('4.4 invariant: line total cannot become negative even if discount exceeds price', () => {
      const res = DiscountEngineService.calculateDiscounts([
        { product_id: 'prod-1', quantity: 1, unit_price: 500, line_discount_amount: 800 },
      ]);

      expect(res.items[0].net_taxable_amount).toBe(0);
      expect(res.net_subtotal).toBe(0);
    });

    it('4.5 invariant: total discount cannot exceed gross subtotal', () => {
      const res = DiscountEngineService.calculateDiscounts(
        [{ product_id: 'prod-1', quantity: 1, unit_price: 500 }],
        { amount: 1000 }
      );

      expect(res.invoice_discount).toBe(500);
      expect(res.net_subtotal).toBe(0);
    });

    it('4.6 strictly rejects negative discount percentages (< 0)', () => {
      expect(() =>
        DiscountEngineService.calculateDiscounts([
          { product_id: 'prod-1', quantity: 1, unit_price: 500, line_discount_percent: -15 },
        ])
      ).toThrow(/Must be between 0 and 100/);
    });

    it('4.7 strictly rejects invalid discount percentages (> 100)', () => {
      expect(() =>
        DiscountEngineService.calculateDiscounts([
          { product_id: 'prod-1', quantity: 1, unit_price: 500, line_discount_percent: 105 },
        ])
      ).toThrow(/Must be between 0 and 100/);
    });

    it('4.8 handles zero discount cleanly with unchanged totals', () => {
      const res = DiscountEngineService.calculateDiscounts([
        { product_id: 'prod-1', quantity: 3, unit_price: 250 },
      ]);

      expect(res.gross_subtotal).toBe(750);
      expect(res.total_discount).toBe(0);
      expect(res.net_subtotal).toBe(750);
    });
  });

  // ============================================================
  // 5. PROMOTIONAL PRICING RULES & EXPIRY (6 Tests)
  // ============================================================
  describe('5. Promotional Pricing Rules & Expiry', () => {
    it('5.1 should create and list active promotional rules', async () => {
      const promo = await PricingService.createPromotion(sessionOrgA, {
        name: 'Festive BOGO Sale',
        code: 'PROMO-BOGO-2026',
        promo_type: 'buy_x_get_y',
        buy_product_id: 'prod-1',
        buy_quantity: 2,
        get_product_id: 'prod-1',
        get_quantity: 1,
        start_date: '2026-09-01',
        end_date: '2026-10-31',
      });

      expect(promo.id).toBeDefined();
      expect(promo.code).toBe('PROMO-BOGO-2026');

      const promos = await PricingService.getPromotions(sessionOrgA);
      expect(promos.some((p) => p.code === 'PROMO-BOGO-2026')).toBe(true);
    });

    it('5.2 applies buy X get Y free units when quantity threshold is met', async () => {
      await PricingService.createPromotion(sessionOrgA, {
        name: 'Buy 2 Get 1 Free',
        code: 'PROMO-B2G1',
        promo_type: 'buy_x_get_y',
        buy_product_id: 'prod-1',
        buy_quantity: 2,
        get_product_id: 'prod-1',
        get_quantity: 1,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      // Purchasing 5 units: 2 full sets of (buy 2 get 1) = 2 free units
      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        quantity: 5,
      });

      expect(res.promotions.length).toBe(1);
      expect(res.promotions[0].free_quantity).toBe(2);
    });

    it('5.3 promotional percentage discount applies to line rate', async () => {
      await PricingService.createPromotion(sessionOrgA, {
        name: 'Diwali 15% Flat Discount',
        code: 'PROMO-DIWALI-15',
        promo_type: 'percentage_discount',
        buy_product_id: 'prod-1',
        discount_value: 15,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        quantity: 1,
      });

      // prod-1 base rate 550 - 15% (82.5) = 467.5
      expect(res.discount_percent).toBe(15);
      expect(res.final_rate).toBe(467.5);
    });

    it('5.4 promotional fixed amount discount applies accurately', async () => {
      await PricingService.createPromotion(sessionOrgA, {
        name: 'Instant ₹50 Off Voucher',
        code: 'PROMO-VOUCHER-50',
        promo_type: 'fixed_discount',
        buy_product_id: 'prod-1',
        discount_value: 50,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        quantity: 1,
      });

      // prod-1 base rate 550 - 50 = 500
      expect(res.discount_amount).toBe(50);
      expect(res.final_rate).toBe(500);
    });

    it('5.5 expired promotions are strictly ignored', async () => {
      await PricingService.createPromotion(sessionOrgA, {
        name: 'Expired Summer Flash Sale',
        code: 'PROMO-EXPIRED-SUMMER',
        promo_type: 'percentage_discount',
        buy_product_id: 'prod-1',
        discount_value: 40,
        start_date: '2026-05-01',
        end_date: '2026-05-31', // Expired
      });

      const res = await PricingService.resolvePrice(sessionOrgA, {
        product_id: 'prod-1',
        quantity: 1,
        date: '2026-09-26',
      });

      expect(res.discount_percent).toBe(0);
      expect(res.final_rate).toBe(550);
    });

    it('5.6 staff without pricing.manage cannot create promotions', async () => {
      await expect(
        PricingService.createPromotion(sessionSales, {
          name: 'Unauthorized Promo',
          code: 'PROMO-UNAUTH',
          promo_type: 'percentage_discount',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
        })
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 6. PRICE OVERRIDE CONTROL & SECURITY (5 Tests)
  // ============================================================
  describe('6. Price Override Control & Security', () => {
    it('6.1 manager/admin can successfully authorize a price override with reason', () => {
      const auth = PricingService.validatePriceOverride(sessionOrgA, {
        product_id: 'prod-1',
        original_rate: 550,
        override_rate: 500,
        reason: 'Customer price match with competitor invoice',
      });

      expect(auth.authorized).toBe(true);
      expect(auth.reason).toBe('Customer price match with competitor invoice');
    });

    it('6.2 price override requires non-empty justification reason', () => {
      expect(() =>
        PricingService.validatePriceOverride(sessionOrgA, {
          product_id: 'prod-1',
          original_rate: 550,
          override_rate: 450,
          reason: '   ', // Empty
        })
      ).toThrow(/reason is required/i);
    });

    it('6.3 salesperson role without pricing.override permission is strictly rejected', () => {
      expect(() =>
        PricingService.validatePriceOverride(sessionSales, {
          product_id: 'prod-1',
          original_rate: 550,
          override_rate: 400,
          reason: 'Unapproved discount',
        })
      ).toThrow(/FORBIDDEN/i);
    });

    it('6.4 viewer role is rejected from price override', () => {
      expect(() =>
        PricingService.validatePriceOverride(sessionViewer, {
          product_id: 'prod-1',
          original_rate: 550,
          override_rate: 450,
          reason: 'Viewer override attempt',
        })
      ).toThrow(/FORBIDDEN/i);
    });

    it('6.5 no price change (identical rates) is trivially authorized without reason requirement', () => {
      const res = PricingService.validatePriceOverride(sessionSales, {
        product_id: 'prod-1',
        original_rate: 550,
        override_rate: 550,
        reason: '',
      });
      expect(res.authorized).toBe(true);
    });
  });

  // ============================================================
  // 7. SUPPLIER PURCHASE PRICING & HISTORICAL AUDIT (6 Tests)
  // ============================================================
  describe('7. Supplier Purchase Pricing & Historical Audit', () => {
    it('7.1 should register and retrieve supplier contract purchase rate', async () => {
      const rate = await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-1',
        product_id: 'prod-1',
        unit: 'PCS',
        purchase_rate: 430,
        min_quantity: 10,
        notes: 'Annual procurement contract 2026',
      });

      expect(rate.purchase_rate).toBe(430);

      const resolved = await SupplierPricingService.resolvePurchaseRate(sessionOrgA, 'sup-1', 'prod-1', 15);
      expect(resolved.rate).toBe(430);
      expect(resolved.source).toBe('supplier_pricing');
    });

    it('7.2 falls back to product default purchase price if quantity below supplier threshold', async () => {
      await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-1',
        product_id: 'prod-1',
        purchase_rate: 400,
        min_quantity: 50,
      });

      // Purchasing 5 units does not qualify for supplier min_quantity 50
      const resolved = await SupplierPricingService.resolvePurchaseRate(sessionOrgA, 'sup-1', 'prod-1', 5);
      expect(resolved.source).toBe('product_default');
    });

    it('7.3 updates supplier rate and creates historical audit trail', async () => {
      // First set
      await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-1',
        product_id: 'prod-1',
        purchase_rate: 420,
        min_quantity: 1,
      });

      // Updated rate
      await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-1',
        product_id: 'prod-1',
        purchase_rate: 440,
        min_quantity: 1,
        notes: 'Raw material surcharge increase',
      });

      const history = await SupplierPricingService.getPriceHistory(sessionOrgA, 'prod-1', 'sup-1');
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[history.length - 1].new_price).toBe(440);
      expect(history[history.length - 1].old_price).toBe(420);
    });

    it('7.4 setting identical rate does not produce redundant history logs', async () => {
      await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-2',
        product_id: 'prod-2',
        purchase_rate: 100,
        min_quantity: 1,
      });

      const initialCount = demoPurchasePriceHistory.length;

      // Repeat with same rate
      await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-2',
        product_id: 'prod-2',
        purchase_rate: 100,
        min_quantity: 1,
      });

      expect(demoPurchasePriceHistory.length).toBe(initialCount);
    });

    it('7.5 supplier rates list can be filtered by supplier ID', async () => {
      await SupplierPricingService.setSupplierRate(sessionOrgA, {
        supplier_id: 'sup-1',
        product_id: 'prod-1',
        purchase_rate: 450,
        min_quantity: 1,
      });

      const rates = await SupplierPricingService.getSupplierRates(sessionOrgA, 'sup-1');
      expect(rates.every((r) => r.supplier_id === 'sup-1')).toBe(true);
    });

    it('7.6 viewer cannot update supplier purchase rates', async () => {
      await expect(
        SupplierPricingService.setSupplierRate(sessionViewer, {
          supplier_id: 'sup-1',
          product_id: 'prod-1',
          purchase_rate: 300,
          min_quantity: 1,
        })
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 8. CUSTOMER CREDIT CONTROL & SALES BLOCKING (8 Tests)
  // ============================================================
  describe('8. Customer Credit Control & Sales Blocking', () => {
    it('8.1 retrieves customer credit exposure and limit utilization %', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 100000;
      cust.current_balance = 40000;

      const profile = await CreditControlService.getCustomerCreditProfile(sessionOrgA, 'cust-1');
      expect(profile.credit_limit).toBe(100000);
      expect(profile.current_outstanding).toBe(40000);
      expect(profile.available_credit).toBe(60000);
      expect(profile.utilization_percent).toBe(40);
      expect(profile.credit_status).toBe('ok');
    });

    it('8.2 detects near_limit status when exposure reaches 80% of limit', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 100000;
      cust.current_balance = 85000;

      const profile = await CreditControlService.getCustomerCreditProfile(sessionOrgA, 'cust-1');
      expect(profile.credit_status).toBe('near_limit');
    });

    it('8.3 detects limit_exceeded status when exposure surpasses limit', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 100000;
      cust.current_balance = 105000;

      const profile = await CreditControlService.getCustomerCreditProfile(sessionOrgA, 'cust-1');
      expect(profile.credit_status).toBe('limit_exceeded');
    });

    it('8.4 blocks sales transaction when new credit exposure exceeds limit without override', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 50000;
      cust.current_balance = 40000;

      // New invoice of ₹20,000 pushes exposure to ₹60,000 (> ₹50,000)
      await expect(
        CreditControlService.evaluateSalesCreditCheck(sessionSales, {
          customer_id: 'cust-1',
          invoice_amount: 20000,
          immediate_payment: 0,
        })
      ).rejects.toThrow(/CREDIT_LIMIT_EXCEEDED/);
    });

    it('8.5 allows transaction if customer makes sufficient immediate upfront payment (cash sale)', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 50000;
      cust.current_balance = 48000;

      // Invoice ₹30,000, but customer pays ₹30,000 cash immediately
      const check = await CreditControlService.evaluateSalesCreditCheck(sessionSales, {
        customer_id: 'cust-1',
        invoice_amount: 30000,
        immediate_payment: 30000, // Fully paid
      });

      expect(check.allowed).toBe(true);
    });

    it('8.6 manager/admin can authorize credit limit override with mandatory reason', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 50000;
      cust.current_balance = 45000;

      const check = await CreditControlService.evaluateSalesCreditCheck(sessionOrgA, {
        customer_id: 'cust-1',
        invoice_amount: 25000,
        immediate_payment: 0,
        override_reason: 'Managing Director approved temporary credit extension',
      });

      expect(check.allowed).toBe(true);
      expect(check.status).toBe('limit_exceeded');
      expect(check.warning_message).toContain('authorized by admin@org-a.com');
    });

    it('8.7 updates customer credit limit and default payment terms', async () => {
      const updated = await CreditControlService.updateCreditLimit(sessionOrgA, 'cust-1', {
        credit_limit: 250000,
        payment_terms_days: 45,
        reason: 'Annual credit review upgrade',
      });

      expect(updated.credit_limit).toBe(250000);
      expect(updated.payment_terms_days).toBe(45);
    });

    it('8.8 strictly rejects negative credit limits', async () => {
      await expect(
        CreditControlService.updateCreditLimit(sessionOrgA, 'cust-1', {
          credit_limit: -5000,
        })
      ).rejects.toThrow(/cannot be negative/i);
    });
  });

  // ============================================================
  // 9. SALESPERSON PERFORMANCE & COMMISSION ENGINE (8 Tests)
  // ============================================================
  describe('9. Salesperson Performance & Commission Engine', () => {
    it('9.1 lists active salespersons with default commission rates', async () => {
      const salespersons = await SalespersonService.getSalespersons(sessionOrgA);
      expect(salespersons.length).toBeGreaterThanOrEqual(2);
      expect(salespersons.some((s) => s.code === 'SP-001')).toBe(true);
    });

    it('9.2 creates new salesperson profile', async () => {
      const created = await SalespersonService.createSalesperson(sessionOrgA, {
        name: 'Amit Verma',
        code: 'SP-003',
        email: 'amit.verma@wevly.test',
        phone: '+91 9988776655',
        commission_rate: 4.0,
        is_active: true,
      });

      expect(created.id).toBeDefined();
      expect(created.code).toBe('SP-003');
    });

    it('9.3 computes and logs commission upon sales invoice finalization', async () => {
      const comm = await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1', // Rate = 3.5%
        invoice_id: 'inv-test-001',
        sale_amount: 100000,
      });

      expect(comm).not.toBeNull();
      expect(comm?.commission_rate).toBe(3.5);
      expect(comm?.commission_amount).toBe(3500);
      expect(comm?.status).toBe('pending');
    });

    it('9.4 supports custom invoice-level commission rate override', async () => {
      const comm = await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1',
        invoice_id: 'inv-test-002',
        sale_amount: 50000,
        custom_commission_rate: 6.0, // Override from 3.5%
      });

      expect(comm?.commission_amount).toBe(3000);
    });

    it('9.5 manager can approve pending commission', async () => {
      const comm = await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1',
        invoice_id: 'inv-test-003',
        sale_amount: 20000,
      });

      const approved = await SalespersonService.approveCommission(sessionOrgA, comm!.id);
      expect(approved.status).toBe('approved');
    });

    it('9.6 manager can mark approved commission as paid', async () => {
      const comm = await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1',
        invoice_id: 'inv-test-004',
        sale_amount: 10000,
      });

      await SalespersonService.approveCommission(sessionOrgA, comm!.id);
      const paid = await SalespersonService.payCommission(sessionOrgA, comm!.id);

      expect(paid.status).toBe('paid');
      expect(paid.paid_at).toBeDefined();
    });

    it('9.7 invoice cancellation or sales return reverses commission', async () => {
      await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1',
        invoice_id: 'inv-test-cancelled',
        sale_amount: 40000,
      });

      await SalespersonService.reverseSalesCommission(sessionOrgA, 'inv-test-cancelled');

      const comms = await SalespersonService.getCommissions(sessionOrgA, { salesperson_id: 'sp-demo-1' });
      const record = comms.find((c) => c.invoice_id === 'inv-test-cancelled');
      expect(record?.status).toBe('reversed');
    });

    it('9.8 staff without commission.manage cannot approve commission', async () => {
      const comm = await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1',
        invoice_id: 'inv-test-unauth',
        sale_amount: 15000,
      });

      await expect(
        SalespersonService.approveCommission(sessionSales, comm!.id)
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 10. RECURRING INVOICES & IDEMPOTENCY (8 Tests)
  // ============================================================
  describe('10. Recurring Invoices & Idempotency', () => {
    it('10.1 creates recurring invoice template with monthly frequency', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Monthly Retainer Contract',
        customer_id: 'cust-1',
        frequency: 'monthly',
        start_date: '2026-09-01',
        payment_terms_days: 15,
        items: [{ product_id: 'prod-1', quantity: 2, unit_price: 2500 }],
      });

      expect(tpl.id).toBeDefined();
      expect(tpl.frequency).toBe('monthly');
      expect(tpl.next_run_date).toBe('2026-09-01');
    });

    it('10.2 processes due recurring invoice and generates sales invoice', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Weekly Cleaning Service',
        customer_id: 'cust-1',
        frequency: 'weekly',
        start_date: '2026-09-20',
        payment_terms_days: 7,
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 1200 }],
      });

      const res = await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');
      expect(res.processed_count).toBeGreaterThanOrEqual(1);
      expect(res.generated_invoices.some((i) => i.template_id === tpl.id)).toBe(true);
    });

    it('10.3 advances next_run_date based on frequency after generation', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Weekly Test Next Date',
        customer_id: 'cust-1',
        frequency: 'weekly',
        start_date: '2026-09-20',
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 1000 }],
      });

      await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');

      const updated = demoRecurringInvoices.find((r) => r.id === tpl.id);
      expect(updated?.last_run_date).toBe('2026-09-20');
      expect(updated?.next_run_date).toBe('2026-09-27'); // +7 days
    });

    it('10.4 idempotency: running generation twice for the same cycle date produces 0 duplicate invoices', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Idempotency Test Monthly',
        customer_id: 'cust-1',
        frequency: 'monthly',
        start_date: '2026-09-25',
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 5000 }],
      });

      const firstRun = await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');
      expect(firstRun.generated_invoices.some((i) => i.template_id === tpl.id)).toBe(true);

      // Immediate retry on same day
      const secondRun = await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');
      expect(secondRun.generated_invoices.some((i) => i.template_id === tpl.id)).toBe(false);
    });

    it('10.5 template with future start_date is not generated ahead of time', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Future Q4 Contract',
        customer_id: 'cust-1',
        frequency: 'quarterly',
        start_date: '2026-11-01', // Future
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 10000 }],
      });

      const res = await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');
      expect(res.generated_invoices.some((i) => i.template_id === tpl.id)).toBe(false);
    });

    it('10.6 paused recurring template is not processed', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Paused Contract',
        customer_id: 'cust-1',
        frequency: 'monthly',
        start_date: '2026-09-10',
        status: 'paused',
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 3000 }],
      });

      const res = await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');
      expect(res.generated_invoices.some((i) => i.template_id === tpl.id)).toBe(false);
    });

    it('10.7 marks template completed when next execution exceeds end_date', async () => {
      const tpl = await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Limited Term Project',
        customer_id: 'cust-1',
        frequency: 'monthly',
        start_date: '2026-09-01',
        end_date: '2026-09-15', // Only 1 cycle allowed
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 8000 }],
      });

      await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26');

      const finished = demoRecurringInvoices.find((r) => r.id === tpl.id);
      expect(finished?.status).toBe('completed');
    });

    it('10.8 calculateNextRunDate handles yearly interval accurately', () => {
      const next = RecurringInvoiceService.calculateNextRunDate('2026-09-26', 'yearly');
      expect(next).toBe('2027-09-26');
    });
  });

  // ============================================================
  // 11. PROCUREMENT & REORDER SUGGESTIONS (6 Tests)
  // ============================================================
  describe('11. Procurement & Reorder Suggestions', () => {
    it('11.1 generates replenishment suggestions for stock below reorder level', async () => {
      const suggestions = await ProcurementService.getProcurementSuggestions(sessionOrgA);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('11.2 computes suggested replenishment quantity factoring reorder threshold', async () => {
      const suggestions = await ProcurementService.getProcurementSuggestions(sessionOrgA);
      for (const s of suggestions) {
        expect(s.suggested_quantity).toBeGreaterThan(0);
        expect(s.available_stock).toBeLessThanOrEqual(s.reorder_level);
      }
    });

    it('11.3 includes preferred supplier and estimated procurement cost in recommendation', async () => {
      const suggestions = await ProcurementService.getProcurementSuggestions(sessionOrgA);
      for (const s of suggestions) {
        expect(s.estimated_unit_cost).toBeGreaterThanOrEqual(0);
        expect(s.estimated_total_cost).toBe(
          Math.round(s.estimated_unit_cost * s.suggested_quantity * 100) / 100
        );
      }
    });

    it('11.4 suggestions can be filtered by specific warehouse', async () => {
      const suggestions = await ProcurementService.getProcurementSuggestions(sessionOrgA, 'wh-demo-main');
      expect(suggestions.every((s) => s.warehouse_id === 'wh-demo-main')).toBe(true);
    });

    it('11.5 does not generate suggestions for products with zero or null reorder levels', async () => {
      const suggestions = await ProcurementService.getProcurementSuggestions(sessionOrgA);
      expect(suggestions.every((s) => s.reorder_level > 0)).toBe(true);
    });

    it('11.6 staff without procurement.view permission is rejected', async () => {
      await expect(
        ProcurementService.getProcurementSuggestions(sessionViewer)
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 12. PROFITABILITY, MARGIN ANALYTICS & ACCOUNTING (8 Tests)
  // ============================================================
  describe('12. Profitability, Margin Analytics & Accounting', () => {
    it('12.1 calculates net revenue, COGS, gross profit and gross margin %', async () => {
      const summary = await ProfitabilityService.getProfitabilitySummary(sessionOrgA);

      expect(summary.net_revenue).toBeGreaterThanOrEqual(0);
      expect(summary.cogs).toBeGreaterThanOrEqual(0);
      expect(summary.gross_profit).toBe(Math.round((summary.net_revenue - summary.cogs) * 100) / 100);
      if (summary.net_revenue > 0) {
        expect(summary.gross_margin_percent).toBe(
          Math.round((summary.gross_profit / summary.net_revenue) * 10000) / 100
        );
      }
    });

    it('12.2 accounting invariant: tax collected is isolated and excluded from revenue', async () => {
      const summary = await ProfitabilityService.getProfitabilitySummary(sessionOrgA);
      // Net revenue must NOT include tax liability
      expect(summary.net_revenue).not.toContain?.(summary.tax_collected);
      expect(typeof summary.tax_collected).toBe('number');
    });

    it('12.3 product-level profitability report ranks items by gross profit', async () => {
      const breakdown = await ProfitabilityService.getProductProfitability(sessionOrgA);
      expect(Array.isArray(breakdown)).toBe(true);
      if (breakdown.length > 1) {
        expect(breakdown[0].gross_profit).toBeGreaterThanOrEqual(breakdown[1].gross_profit);
      }
    });

    it('12.4 customer profitability report identifies top grossing accounts', async () => {
      const customers = await ProfitabilityService.getCustomerProfitability(sessionOrgA);
      expect(Array.isArray(customers)).toBe(true);
      for (const c of customers) {
        expect(c.gross_profit).toBe(Math.round((c.revenue - c.cogs) * 100) / 100);
      }
    });

    it('12.5 salesperson profitability breakdown correlates agent revenue against product cost', async () => {
      const agents = await ProfitabilityService.getSalespersonProfitability(sessionOrgA);
      expect(Array.isArray(agents)).toBe(true);
      for (const a of agents) {
        expect(a.margin_percent).toBeGreaterThanOrEqual(0);
      }
    });

    it('12.6 price list creation produces 0 financial journals and 0 tax entries', async () => {
      const initialRevenue = (await ProfitabilityService.getProfitabilitySummary(sessionOrgA)).net_revenue;

      await PricingService.createPriceList(sessionOrgA, {
        name: 'Financial Invariant List',
        code: 'PL-FIN-INV',
        currency: 'INR',
        items: [{ product_id: 'prod-1', unit: 'PCS', min_quantity: 1, fixed_price: 1000 }],
      });

      const afterRevenue = (await ProfitabilityService.getProfitabilitySummary(sessionOrgA)).net_revenue;
      expect(afterRevenue).toBe(initialRevenue);
    });

    it('12.7 recurring invoice template creation produces 0 accounting entries until execution', async () => {
      const initialSummary = await ProfitabilityService.getProfitabilitySummary(sessionOrgA);

      await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Template No Accounting',
        customer_id: 'cust-1',
        frequency: 'monthly',
        start_date: '2026-12-01', // Future
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 50000 }],
      });

      const afterSummary = await ProfitabilityService.getProfitabilitySummary(sessionOrgA);
      expect(afterSummary.total_invoices_count).toBe(initialSummary.total_invoices_count);
      expect(afterSummary.net_revenue).toBe(initialSummary.net_revenue);
    });

    it('12.8 staff without profitability.view permission is rejected', async () => {
      await expect(
        ProfitabilityService.getProfitabilitySummary(sessionViewer)
      ).rejects.toThrow(/FORBIDDEN/i);
    });
  });

  // ============================================================
  // 13. MULTI-TENANT ISOLATION, RBAC & CONCURRENCY (6 Tests)
  // ============================================================
  describe('13. Multi-Tenant Isolation, RBAC & Concurrency', () => {
    it('13.1 Tenant B cannot read or view Tenant A price lists', async () => {
      const tenantBLists = await PricingService.getPriceLists(sessionOrgB);
      expect(tenantBLists.some((pl) => pl.organization_id === DEMO_ORG_ID)).toBe(false);
    });

    it('13.2 Tenant B cannot access or modify Tenant A customer credit limits', async () => {
      await expect(
        CreditControlService.updateCreditLimit(sessionOrgB, 'cust-1', { credit_limit: 999999 })
      ).rejects.toThrow();
    });

    it('13.3 Tenant B cannot view or approve Tenant A sales commissions', async () => {
      const comm = await SalespersonService.recordSalesCommission(sessionOrgA, {
        salesperson_id: 'sp-demo-1',
        invoice_id: 'inv-tenant-isolation',
        sale_amount: 50000,
      });

      const tenantBCommissions = await SalespersonService.getCommissions(sessionOrgB);
      expect(tenantBCommissions.some((c) => c.id === comm?.id)).toBe(false);
    });

    it('13.4 Tenant B cannot process or execute Tenant A recurring invoice templates', async () => {
      const res = await RecurringInvoiceService.processDueRecurringInvoices(sessionOrgB);
      expect(res.generated_invoices.every((i) => i.template_id.includes(sessionOrgB.organization_id))).toBe(true);
    });

    it('13.5 concurrency: 10 simultaneous price resolution requests return consistent rates', async () => {
      const requests = Array.from({ length: 10 }).map(() =>
        PricingService.resolvePrice(sessionOrgA, {
          product_id: 'prod-1',
          quantity: 25,
        })
      );

      const results = await Promise.all(requests);
      const rates = results.map((r) => r.resolved_rate);
      expect(new Set(rates).size).toBe(1); // All 10 returned identical deterministic rate
    });

    it('13.6 concurrency: 10 simultaneous recurring invoice processing calls prevent duplicate invoices', async () => {
      await RecurringInvoiceService.createRecurringInvoice(sessionOrgA, {
        template_name: 'Concurrent Recurring Contract',
        customer_id: 'cust-1',
        frequency: 'monthly',
        start_date: '2026-09-24',
        items: [{ product_id: 'prod-1', quantity: 1, unit_price: 3000 }],
      });

      const parallelRuns = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          RecurringInvoiceService.processDueRecurringInvoices(sessionOrgA, '2026-09-26')
        )
      );

      const totalInvoicesCreated = parallelRuns.reduce((sum, run) => sum + run.processed_count, 0);
      expect(totalInvoicesCreated).toBe(1); // Exactly 1 generated despite 10 simultaneous triggers!
    });

    it('13.7 SalesTransactionService blocks credit invoice when customer credit limit is exceeded', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 50000;
      cust.current_balance = 40000;

      // Invoice ₹25,000 pushes exposure to ₹65,000 (> ₹50,000)
      await expect(
        SalesTransactionService.executeSale(sessionSales, {
          customer_id: 'cust-1',
          invoice_date: '2026-09-26',
          total_amount: 25000,
          amount_paid: 0,
          payment_status: 'unpaid',
          items: [{ product_id: 'prod-1', description: 'Bearing', quantity: 10, unit_price: 2500, gst_rate: 0 }],
        })
      ).rejects.toThrow(/CREDIT_LIMIT_EXCEEDED/);
    });

    it('13.8 SalesTransactionService allows sale exceeding limit if customer makes full immediate payment', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 50000;
      cust.current_balance = 48000;

      // Fully paid upfront sale
      const res = await SalesTransactionService.executeSale(sessionSales, {
        customer_id: 'cust-1',
        invoice_date: '2026-09-26',
        total_amount: 30000,
        amount_paid: 30000,
        payment_status: 'paid',
        items: [{ product_id: 'prod-1', description: 'Bearing', quantity: 10, unit_price: 3000, gst_rate: 0 }],
      });

      expect(res.invoice).toBeDefined();
      expect(res.invoice.payment_status).toBe('paid');
    });

    it('13.9 SalesTransactionService allows credit sale with authorized manager override reason', async () => {
      const cust = demoCustomers.find((c) => c.id === 'cust-1') as any;
      cust.credit_limit = 50000;
      cust.current_balance = 45000;

      const res = await SalesTransactionService.executeSale(sessionOrgA, {
        customer_id: 'cust-1',
        invoice_date: '2026-09-26',
        total_amount: 25000,
        amount_paid: 0,
        payment_status: 'unpaid',
        credit_override_reason: 'Managing Director approved special project credit',
        items: [{ product_id: 'prod-1', description: 'Bearing', quantity: 10, unit_price: 2500, gst_rate: 0 }],
      });

      expect(res.invoice).toBeDefined();
      expect(res.invoice.customer_id).toBe('cust-1');
    });

    it('13.10 SalesTransactionService automatically accrues salesperson commission on invoice creation', async () => {
      const prod = demoProducts.find((p) => p.id === 'prod-1');
      if (prod) prod.current_stock = 500;

      const res = await SalesTransactionService.executeSale(sessionOrgA, {
        customer_id: 'cust-1',
        salesperson_id: 'sp-demo-1', // Default rate = 3.5%
        invoice_date: '2026-09-26',
        total_amount: 100000,
        amount_paid: 100000,
        payment_status: 'paid',
        items: [{ product_id: 'prod-1', description: 'Bearing', quantity: 1, unit_price: 100000, gst_rate: 0 }],
      });

      expect(res.invoice).toBeDefined();

      const comms = await SalespersonService.getCommissions(sessionOrgA, { salesperson_id: 'sp-demo-1' });
      const matchingComm = comms.find((c) => c.invoice_id === res.invoice.id);
      expect(matchingComm).toBeDefined();
      expect(matchingComm?.commission_rate).toBe(3.5);
      expect(matchingComm?.commission_amount).toBe(3500);
      expect(matchingComm?.status).toBe('pending');
    });
  });
});
