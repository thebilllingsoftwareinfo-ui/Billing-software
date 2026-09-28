// ============================================================
// lib/services/procurement.service.ts — Phase 9 Procurement & Reorder Suggestions
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import {
  demoProducts,
  demoWarehouseStock,
  demoWarehouses,
  demoSupplierPricing,
  demoSuppliers,
  demoSalesOrders,
  demoPurchaseOrders,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface ProcurementSuggestion {
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  pending_sales_demand: number;
  pending_purchase_supply: number;
  suggested_quantity: number;
  preferred_supplier_id?: string | null;
  preferred_supplier_name?: string | null;
  estimated_unit_cost: number;
  estimated_total_cost: number;
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

export class ProcurementService {
  /**
   * Generates intelligent replenishment suggestions based on:
   * available stock, reorder level, pending sales orders, and pending purchase orders.
   */
  static async getProcurementSuggestions(
    session: AppSession,
    warehouseId?: string
  ): Promise<ProcurementSuggestion[]> {
    requirePermission(session.role, 'procurement.view');
    const orgId = session.org_id || DEMO_ORG_ID;
    const isSupabase = checkIsSupabase(session);

    const suggestions: ProcurementSuggestion[] = [];

    if (isSupabase) {
      const supabase = createAdminClient();
      let stockQuery = supabase
        .from('warehouse_stock')
        .select(`
          product_id,
          warehouse_id,
          current_quantity,
          reserved_quantity,
          reorder_level,
          reorder_quantity,
          average_cost,
          products (name, sku, purchase_price),
          warehouses (name)
        `)
        .eq('organization_id', orgId);

      if (warehouseId) stockQuery = stockQuery.eq('warehouse_id', warehouseId);
      const { data: stockRows, error } = await stockQuery;
      if (error) throw new Error(error.message);

      for (const row of stockRows || []) {
        const reorderLevel = Number(row.reorder_level || 0);
        if (reorderLevel <= 0) continue; // No reorder threshold defined

        const currentQty = Number(row.current_quantity || 0);
        const reservedQty = Number(row.reserved_quantity || 0);
        const availableQty = currentQty - reservedQty;

        if (availableQty <= reorderLevel) {
          const prod: any = row.products;
          const wh: any = row.warehouses;
          const unitCost = Number(row.average_cost || prod?.purchase_price || 0);
          const reorderQty = Number(row.reorder_quantity || 0) > 0 ? Number(row.reorder_quantity) : Math.max(10, reorderLevel * 2);

          suggestions.push({
            product_id: row.product_id,
            product_name: prod?.name || 'Product',
            sku: prod?.sku || '',
            warehouse_id: row.warehouse_id,
            warehouse_name: wh?.name || 'Warehouse',
            current_stock: currentQty,
            reserved_stock: reservedQty,
            available_stock: availableQty,
            reorder_level: reorderLevel,
            reorder_quantity: reorderQty,
            pending_sales_demand: 0,
            pending_purchase_supply: 0,
            suggested_quantity: Math.max(reorderQty, reorderLevel - availableQty),
            estimated_unit_cost: unitCost,
            estimated_total_cost: Math.round(unitCost * Math.max(reorderQty, reorderLevel - availableQty) * 100) / 100,
          });
        }
      }
    } else {
      const stockList = demoWarehouseStock.filter(
        (ws) => ws.organization_id === orgId && (!warehouseId || ws.warehouse_id === warehouseId)
      );

      for (const ws of stockList) {
        const reorderLevel = Number(ws.reorder_level || 0);
        if (reorderLevel <= 0) continue;

        const currentQty = Number(ws.current_quantity || 0);
        const reservedQty = Number(ws.reserved_quantity || 0);
        const availableQty = currentQty - reservedQty;

        if (availableQty <= reorderLevel) {
          const prod = demoProducts.find((p) => p.id === ws.product_id && p.organization_id === orgId);
          const wh = demoWarehouses.find((w) => w.id === ws.warehouse_id && w.organization_id === orgId);

          // Find preferred supplier and rate from demoSupplierPricing
          const suppRate = demoSupplierPricing.find(
            (sp) => sp.organization_id === orgId && sp.product_id === ws.product_id
          );
          const supp = suppRate ? demoSuppliers.find((s) => s.id === suppRate.supplier_id) : null;

          const unitCost = suppRate ? suppRate.purchase_rate : Number(ws.average_cost || prod?.purchase_price || 0);
          const reorderQty = Number(ws.reorder_quantity || 0) > 0 ? Number(ws.reorder_quantity) : Math.max(10, reorderLevel * 2);

          // Check pending Sales Orders for this product
          let pendingSODemand = 0;
          for (const so of demoSalesOrders.filter((o) => o.organization_id === orgId && o.status === 'confirmed')) {
            const line = (so.items as any[]).find((it: any) => it.product_id === ws.product_id);
            if (line) pendingSODemand += line.quantity;
          }

          // Check pending Purchase Orders for this product
          let pendingPOSupply = 0;
          for (const po of demoPurchaseOrders.filter((o) => o.organization_id === orgId && o.status === 'ordered')) {
            const line = (po.items as any[]).find((it: any) => it.product_id === ws.product_id);
            if (line) pendingPOSupply += line.quantity;
          }

          const suggested = Math.max(reorderQty, (reorderLevel - availableQty) + pendingSODemand - pendingPOSupply);

          suggestions.push({
            product_id: ws.product_id,
            product_name: prod?.name || 'Product',
            sku: prod?.sku || '',
            warehouse_id: ws.warehouse_id,
            warehouse_name: wh?.name || 'Warehouse',
            current_stock: currentQty,
            reserved_stock: reservedQty,
            available_stock: availableQty,
            reorder_level: reorderLevel,
            reorder_quantity: reorderQty,
            pending_sales_demand: pendingSODemand,
            pending_purchase_supply: pendingPOSupply,
            suggested_quantity: Math.max(1, suggested),
            preferred_supplier_id: supp?.id || null,
            preferred_supplier_name: supp?.name || null,
            estimated_unit_cost: unitCost,
            estimated_total_cost: Math.round(unitCost * Math.max(1, suggested) * 100) / 100,
          });
        }
      }
    }

    return suggestions;
  }
}
