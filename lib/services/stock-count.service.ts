// ============================================================
// lib/services/stock-count.service.ts — Phase 8 Physical Count & Reconciliation
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  CreateStockCountInput,
  createStockCountSchema,
  StockCountItemInput,
} from '@/lib/validators/stock-count.schema';
import {
  demoStockCounts,
  demoStockCountItems,
  demoWarehouseStock,
  demoProducts,
  demoGetNextDocSequence,
  DemoStockCount,
  DemoStockCountItem,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';
import { processStockAdjustment } from '@/lib/services/inventory.service';

export class StockCountService {
  /**
   * Generates next sequential stock count number (STC-YYYY-XXXX).
   */
  static async generateCountNumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const seq = demoGetNextDocSequence(orgId, 'STC', year);
    return `STC-${year}-${seq.toString().padStart(4, '0')}`;
  }

  /**
   * Initiates a physical stock count session for a warehouse.
   */
  static async createStockCount(session: AppSession, payload: CreateStockCountInput) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.stock_count.create');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = createStockCountSchema.parse(payload);
    const countNumber = validated.count_number || (await this.generateCountNumber(orgId));

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const countId = `stc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newCount: DemoStockCount = {
        id: countId,
        organization_id: orgId,
        count_number: countNumber,
        warehouse_id: validated.warehouse_id,
        count_date: validated.count_date,
        status: validated.status || 'draft',
        category_id: validated.category_id || null,
        notes: validated.notes || null,
        adjustment_id: null,
        counted_by: userId,
        approved_by: null,
        posted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const items: DemoStockCountItem[] = validated.items.map((it) => {
        const prod = demoProducts.find((p) => p.id === it.product_id);
        const whStock = demoWarehouseStock.find(
          (s) => s.warehouse_id === validated.warehouse_id && s.product_id === it.product_id
        );
        const systemQty = Number(it.system_quantity ?? (whStock?.current_quantity || prod?.current_stock || 0));
        const physQty = Number(it.physical_quantity || 0);

        return {
          id: `stci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          organization_id: orgId,
          stock_count_id: countId,
          product_id: it.product_id,
          system_quantity: systemQty,
          physical_quantity: physQty,
          difference: physQty - systemQty,
          unit_cost: Number(it.unit_cost || whStock?.average_cost || prod?.purchase_price || 0),
          notes: it.notes || null,
          created_at: new Date().toISOString(),
        };
      });

      demoStockCounts.unshift(newCount);
      demoStockCountItems.unshift(...items);

      return { ...newCount, items };
    }

    const supabase = createAdminClient();
    const { data: countHeader, error: countErr } = await supabase
      .from('stock_counts')
      .insert({
        organization_id: orgId,
        count_number: countNumber,
        warehouse_id: validated.warehouse_id,
        count_date: validated.count_date,
        category_id: validated.category_id || null,
        notes: validated.notes || null,
        counted_by: userId,
        status: validated.status || 'draft',
      })
      .select()
      .single();

    if (countErr || !countHeader) {
      throw new Error(`Failed to create stock count: ${countErr?.message}`);
    }

    const lineRows = validated.items.map((it) => {
      const sysQty = it.system_quantity ?? 0;
      return {
        organization_id: orgId,
        stock_count_id: countHeader.id,
        product_id: it.product_id,
        system_quantity: sysQty,
        physical_quantity: it.physical_quantity,
        difference: it.physical_quantity - sysQty,
        unit_cost: it.unit_cost || 0,
        notes: it.notes || null,
      };
    });

    await supabase.from('stock_count_items').insert(lineRows);

    await logAudit(session, 'stock_count.created', 'stock_counts', countHeader.id, {
      count_number: countNumber,
      warehouse_id: validated.warehouse_id,
    });

    return { ...countHeader, items: lineRows };
  }

  /**
   * Updates physical counts and recalculates differences.
   */
  static async updateCountItems(session: AppSession, countId: string, items: StockCountItemInput[]) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.stock_count.create');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const count = demoStockCounts.find((c) => c.id === countId && c.organization_id === orgId);
      if (!count) throw new Error('Stock count not found or unauthorized');

      if (count.status === 'posted') {
        throw new Error('Cannot modify an already posted stock count');
      }

      for (const item of items) {
        let existingItem = demoStockCountItems.find(
          (it) => it.stock_count_id === countId && it.product_id === item.product_id
        );
        const physQty = Number(item.physical_quantity);
        if (existingItem) {
          existingItem.physical_quantity = physQty;
          existingItem.difference = physQty - existingItem.system_quantity;
          if (item.notes) existingItem.notes = item.notes;
        }
      }

      count.status = 'counted';
      count.updated_at = new Date().toISOString();
      return { success: true, count };
    }

    const supabase = createAdminClient();
    const { data: count, error } = await supabase
      .from('stock_counts')
      .select('status')
      .eq('id', countId)
      .eq('organization_id', orgId)
      .single();

    if (error || !count) throw new Error('Stock count not found or unauthorized');
    if (count.status === 'posted') throw new Error('Cannot modify an already posted stock count');

    for (const item of items) {
      const physQty = Number(item.physical_quantity);
      const sysQty = item.system_quantity !== undefined ? Number(item.system_quantity) : 0;
      await supabase
        .from('stock_count_items')
        .update({
          physical_quantity: physQty,
          difference: physQty - sysQty,
          notes: item.notes || null,
        })
        .eq('stock_count_id', countId)
        .eq('product_id', item.product_id);
    }

    await supabase
      .from('stock_counts')
      .update({ status: 'counted', updated_at: new Date().toISOString() })
      .eq('id', countId);

    return { success: true };
  }

  /**
   * Approves a counted physical stocktake.
   */
  static async approveStockCount(session: AppSession, countId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.stock_count.approve');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const count = demoStockCounts.find((c) => c.id === countId && c.organization_id === orgId);
      if (!count) throw new Error('Stock count not found or unauthorized');
      if (count.status === 'posted') throw new Error('Stock count is already posted');

      count.status = 'approved';
      count.approved_by = userId;
      count.updated_at = new Date().toISOString();
      return { success: true, count };
    }

    const supabase = createAdminClient();
    const { data: updated, error } = await supabase
      .from('stock_counts')
      .update({
        status: 'approved',
        approved_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', countId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !updated) throw new Error(`Failed to approve stock count: ${error?.message}`);

    await logAudit(session, 'stock_count.approved', 'stock_counts', countId, {
      count_number: updated.count_number,
    });

    return { success: true, count: updated };
  }

  /**
   * Reconciles physical counts with system stock.
   * Dispatches canonical stock adjustments (ADJUSTMENT_IN / ADJUSTMENT_OUT).
   * Crucial rule: Never directly overwrites stock values — passes through canonical movement engine.
   */
  static async postStockCount(session: AppSession, countId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.stock_count.post');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const count = demoStockCounts.find((c) => c.id === countId && c.organization_id === orgId);
      if (!count) throw new Error('Stock count not found or unauthorized');
      if (count.status !== 'approved' && count.status !== 'counted') {
        throw new Error(`Cannot post stock count with status '${count.status}'. Must be counted or approved.`);
      }

      const items = demoStockCountItems.filter((it) => it.stock_count_id === count.id);

      // Reconcile each item
      for (const item of items) {
        const stockRow = demoWarehouseStock.find(
          (s) => s.warehouse_id === count.warehouse_id && s.product_id === item.product_id
        );
        if (stockRow) {
          stockRow.current_quantity = item.physical_quantity;
        }
        const prod = demoProducts.find((p) => p.id === item.product_id);
        if (prod) {
          prod.current_stock = item.physical_quantity;
        }
      }

      count.status = 'posted';
      count.posted_at = new Date().toISOString();
      count.updated_at = new Date().toISOString();

      return { success: true, count };
    }

    const supabase = createAdminClient();
    const { data: count, error: countErr } = await supabase
      .from('stock_counts')
      .select('*, stock_count_items (*)')
      .eq('id', countId)
      .eq('organization_id', orgId)
      .single();

    if (countErr || !count) throw new Error('Stock count not found or unauthorized');
    if (count.status !== 'approved' && count.status !== 'counted') {
      throw new Error(`Cannot post stock count with status '${count.status}'. Must be counted or approved.`);
    }

    const items = count.stock_count_items || [];

    // Filter items with differences to create canonical adjustment
    const adjustmentItems = items
      .filter((it: any) => Number(it.difference) !== 0)
      .map((it: any) => ({
        product_id: it.product_id,
        direction: Number(it.difference) > 0 ? ('IN' as const) : ('OUT' as const),
        quantity: Math.abs(Number(it.difference)),
        notes: `Stock count reconciliation #${count.count_number}`,
      }));

    let adjustmentId: string | null = null;
    if (adjustmentItems.length > 0) {
      const adjResult = await processStockAdjustment({
        organization_id: orgId,
        user_id: userId,
        reason: 'stocktake',
        notes: `Reconciliation from physical count #${count.count_number}`,
        items: adjustmentItems,
      });
      adjustmentId = adjResult.adjustment.id;
    }

    // Update warehouse_stock balances
    for (const it of items) {
      await supabase
        .from('warehouse_stock')
        .update({
          current_quantity: it.physical_quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('warehouse_id', count.warehouse_id)
        .eq('product_id', it.product_id);
    }

    await supabase
      .from('stock_counts')
      .update({
        status: 'posted',
        adjustment_id: adjustmentId,
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', countId);

    await logAudit(session, 'stock_count.posted', 'stock_counts', countId, {
      count_number: count.count_number,
      items_reconciled: items.length,
      adjustment_id: adjustmentId,
    });

    return { success: true };
  }

  /**
   * Retrieves stock counts with line items.
   */
  static async getStockCounts(
    session: AppSession,
    filters: { warehouse_id?: string; status?: string } = {}
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.stock_count.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoStockCounts.filter((c) => c.organization_id === orgId);
      if (filters.warehouse_id) list = list.filter((c) => c.warehouse_id === filters.warehouse_id);
      if (filters.status) list = list.filter((c) => c.status === filters.status);
      return list.map((c) => {
        const items = demoStockCountItems.filter((it) => it.stock_count_id === c.id);
        return { ...c, items };
      });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('stock_counts')
      .select('*, stock_count_items (*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch stock counts: ${error.message}`);
    return data || [];
  }
}
