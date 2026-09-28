// ============================================================
// lib/services/inventory-valuation.service.ts — Phase 8 Valuation & Reports Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import {
  demoWarehouses,
  demoWarehouseStock,
  demoProducts,
  demoBatches,
  demoSerials,
  demoStockTransfers,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export type ValuationMethod = 'fifo' | 'weighted_average' | 'lifo';

export interface MovementValuationInput {
  quantity: number; // positive = inbound, negative = outbound
  unit_cost: number;
  created_at?: string;
  type?: string;
}

export interface ValuationCalculationResult {
  method: ValuationMethod;
  ending_quantity: number;
  ending_value: number;
  unit_cost: number;
  cogs: number;
  total_inbound_quantity: number;
  total_inbound_value: number;
  total_outbound_quantity: number;
  layers?: Array<{ quantity: number; unit_cost: number }>;
}

export interface WarehouseValuationSummary {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  total_products: number;
  total_units: number;
  total_cost_value: number;
  total_retail_value: number;
}

export interface InventoryValuationReport {
  method: ValuationMethod;
  total_items: number;
  total_stock_units: number;
  total_reserved_units: number;
  total_available_units: number;
  total_cost_valuation: number;
  total_retail_valuation: number;
  warehouses: WarehouseValuationSummary[];
}

export class InventoryValuationService {
  /**
   * Pure deterministic inventory valuation algorithm for FIFO, LIFO, and Moving Weighted Average.
   * Invariant: Does not alter GL/GST/AR/AP; operates solely as a valuation calculation engine.
   */
  static computeValuation(
    movements: MovementValuationInput[],
    method: ValuationMethod = 'weighted_average'
  ): ValuationCalculationResult {
    // Sort movements chronologically if timestamps are provided
    const sorted = [...movements].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    let totalInboundQty = 0;
    let totalInboundVal = 0;
    let totalOutboundQty = 0;
    let totalCOGS = 0;

    if (method === 'fifo') {
      const queue: Array<{ quantityRemaining: number; unitCost: number }> = [];

      for (const mov of sorted) {
        if (mov.quantity > 0) {
          totalInboundQty += mov.quantity;
          totalInboundVal += mov.quantity * mov.unit_cost;
          queue.push({ quantityRemaining: mov.quantity, unitCost: mov.unit_cost });
        } else if (mov.quantity < 0) {
          let req = Math.abs(mov.quantity);
          totalOutboundQty += req;

          while (req > 0 && queue.length > 0) {
            const first = queue[0];
            if (first.quantityRemaining <= req) {
              req -= first.quantityRemaining;
              totalCOGS += first.quantityRemaining * first.unitCost;
              queue.shift();
            } else {
              first.quantityRemaining -= req;
              totalCOGS += req * first.unitCost;
              req = 0;
            }
          }
        }
      }

      const endingQty = queue.reduce((sum, item) => sum + item.quantityRemaining, 0);
      const endingVal = queue.reduce((sum, item) => sum + item.quantityRemaining * item.unitCost, 0);
      const unitCost = endingQty > 0 ? Number((endingVal / endingQty).toFixed(4)) : 0;

      return {
        method: 'fifo',
        ending_quantity: Number(endingQty.toFixed(4)),
        ending_value: Number(endingVal.toFixed(2)),
        unit_cost: unitCost,
        cogs: Number(totalCOGS.toFixed(2)),
        total_inbound_quantity: Number(totalInboundQty.toFixed(4)),
        total_inbound_value: Number(totalInboundVal.toFixed(2)),
        total_outbound_quantity: Number(totalOutboundQty.toFixed(4)),
        layers: queue.map((q) => ({ quantity: q.quantityRemaining, unit_cost: q.unitCost })),
      };
    }

    if (method === 'lifo') {
      const stack: Array<{ quantityRemaining: number; unitCost: number }> = [];

      for (const mov of sorted) {
        if (mov.quantity > 0) {
          totalInboundQty += mov.quantity;
          totalInboundVal += mov.quantity * mov.unit_cost;
          stack.push({ quantityRemaining: mov.quantity, unitCost: mov.unit_cost });
        } else if (mov.quantity < 0) {
          let req = Math.abs(mov.quantity);
          totalOutboundQty += req;

          while (req > 0 && stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.quantityRemaining <= req) {
              req -= top.quantityRemaining;
              totalCOGS += top.quantityRemaining * top.unitCost;
              stack.pop();
            } else {
              top.quantityRemaining -= req;
              totalCOGS += req * top.unitCost;
              req = 0;
            }
          }
        }
      }

      const endingQty = stack.reduce((sum, item) => sum + item.quantityRemaining, 0);
      const endingVal = stack.reduce((sum, item) => sum + item.quantityRemaining * item.unitCost, 0);
      const unitCost = endingQty > 0 ? Number((endingVal / endingQty).toFixed(4)) : 0;

      return {
        method: 'lifo',
        ending_quantity: Number(endingQty.toFixed(4)),
        ending_value: Number(endingVal.toFixed(2)),
        unit_cost: unitCost,
        cogs: Number(totalCOGS.toFixed(2)),
        total_inbound_quantity: Number(totalInboundQty.toFixed(4)),
        total_inbound_value: Number(totalInboundVal.toFixed(2)),
        total_outbound_quantity: Number(totalOutboundQty.toFixed(4)),
        layers: stack.map((s) => ({ quantity: s.quantityRemaining, unit_cost: s.unitCost })),
      };
    }

    // Default: Moving Weighted Average
    let currentStock = 0;
    let currentValue = 0;
    let currentAvgCost = 0;

    for (const mov of sorted) {
      if (mov.quantity > 0) {
        totalInboundQty += mov.quantity;
        totalInboundVal += mov.quantity * mov.unit_cost;
        currentValue += mov.quantity * mov.unit_cost;
        currentStock += mov.quantity;
        currentAvgCost = currentStock > 0 ? currentValue / currentStock : 0;
      } else if (mov.quantity < 0) {
        const req = Math.abs(mov.quantity);
        totalOutboundQty += req;
        const outboundCost = req * currentAvgCost;
        totalCOGS += outboundCost;
        currentStock = Math.max(0, currentStock - req);
        currentValue = Math.max(0, currentValue - outboundCost);
        if (currentStock === 0) currentValue = 0;
        currentAvgCost = currentStock > 0 ? currentValue / currentStock : 0;
      }
    }

    return {
      method: 'weighted_average',
      ending_quantity: Number(currentStock.toFixed(4)),
      ending_value: Number(currentValue.toFixed(2)),
      unit_cost: Number(currentAvgCost.toFixed(4)),
      cogs: Number(totalCOGS.toFixed(2)),
      total_inbound_quantity: Number(totalInboundQty.toFixed(4)),
      total_inbound_value: Number(totalInboundVal.toFixed(2)),
      total_outbound_quantity: Number(totalOutboundQty.toFixed(4)),
    };
  }

  /**
   * Generates comprehensive inventory valuation report with selected valuation method.
   */
  static async getValuationSummary(
    session: AppSession,
    options: { method?: ValuationMethod; warehouse_id?: string } = {}
  ): Promise<InventoryValuationReport> {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.valuation.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';
    const method = options.method || 'weighted_average';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let warehouses = demoWarehouses.filter((w) => w.organization_id === orgId && w.is_active);
      if (options.warehouse_id) {
        warehouses = warehouses.filter((w) => w.id === options.warehouse_id);
      }

      let totalUnits = 0;
      let totalReserved = 0;
      let totalCostVal = 0;
      let totalRetailVal = 0;

      const whSummaries: WarehouseValuationSummary[] = warehouses.map((wh) => {
        const stockRows = demoWarehouseStock.filter((s) => s.warehouse_id === wh.id);
        let whUnits = 0;
        let whCost = 0;
        let whRetail = 0;

        stockRows.forEach((s) => {
          const prod = demoProducts.find((p) => p.id === s.product_id);
          const current = Number(s.current_quantity || 0);
          const reserved = Number(s.reserved_quantity || 0);
          const cost = Number(s.average_cost || prod?.purchase_price || 0);
          const retail = Number(prod?.sale_price || 0);

          whUnits += current;
          whCost += current * cost;
          whRetail += current * retail;

          totalUnits += current;
          totalReserved += reserved;
          totalCostVal += current * cost;
          totalRetailVal += current * retail;
        });

        return {
          warehouse_id: wh.id,
          warehouse_name: wh.name,
          warehouse_code: wh.code,
          total_products: stockRows.length,
          total_units: whUnits,
          total_cost_value: whCost,
          total_retail_value: whRetail,
        };
      });

      return {
        method,
        total_items: demoProducts.filter((p) => p.organization_id === orgId).length,
        total_stock_units: totalUnits,
        total_reserved_units: totalReserved,
        total_available_units: Math.max(0, totalUnits - totalReserved),
        total_cost_valuation: totalCostVal,
        total_retail_valuation: totalRetailVal,
        warehouses: whSummaries,
      };
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('warehouse_stock')
      .select(`
        *,
        warehouses (id, name, code, is_active),
        products (id, name, purchase_price, sale_price)
      `)
      .eq('organization_id', orgId);

    if (options.warehouse_id) {
      query = query.eq('warehouse_id', options.warehouse_id);
    }

    const { data: rawStock } = await query;
    const stock = (rawStock || []).filter((s: any) => s.warehouses?.is_active);
    let totalUnits = 0;
    let totalReserved = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;

    const whMap: Record<string, WarehouseValuationSummary> = {};

    stock.forEach((s: any) => {
      const whId = s.warehouse_id;
      if (!whMap[whId]) {
        whMap[whId] = {
          warehouse_id: whId,
          warehouse_name: s.warehouses?.name || 'Warehouse',
          warehouse_code: s.warehouses?.code || 'WH',
          total_products: 0,
          total_units: 0,
          total_cost_value: 0,
          total_retail_value: 0,
        };
      }

      const current = Number(s.current_quantity || 0);
      const reserved = Number(s.reserved_quantity || 0);
      const cost = Number(s.average_cost || s.products?.purchase_price || 0);
      const retail = Number(s.products?.sale_price || 0);

      whMap[whId].total_products += 1;
      whMap[whId].total_units += current;
      whMap[whId].total_cost_value += current * cost;
      whMap[whId].total_retail_value += current * retail;

      totalUnits += current;
      totalReserved += reserved;
      totalCostVal += current * cost;
      totalRetailVal += current * retail;
    });

    return {
      method,
      total_items: stock.length,
      total_stock_units: totalUnits,
      total_reserved_units: totalReserved,
      total_available_units: Math.max(0, totalUnits - totalReserved),
      total_cost_valuation: totalCostVal,
      total_retail_valuation: totalRetailVal,
      warehouses: Object.values(whMap),
    };
  }

  /**
   * Comprehensive Stock Summary Report.
   */
  static async getStockSummaryReport(
    session: AppSession,
    filtersInput: { warehouse_id?: string; category_id?: string; search?: string } | string = {}
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const filters = typeof filtersInput === 'string' ? { warehouse_id: filtersInput } : (filtersInput || {});

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoWarehouseStock.filter((s) => s.organization_id === orgId);
      if (filters.warehouse_id) list = list.filter((s) => s.warehouse_id === filters.warehouse_id);

      let rows = list.map((s) => {
        const prod = demoProducts.find((p) => p.id === s.product_id);
        const wh = demoWarehouses.find((w) => w.id === s.warehouse_id);
        const current = Number(s.current_quantity || 0);
        const reserved = Number(s.reserved_quantity || 0);
        const cost = Number(s.average_cost || prod?.purchase_price || 0);
        return {
          id: s.id,
          product_id: s.product_id,
          product_name: prod?.name || 'Product',
          sku: prod?.sku || 'N/A',
          warehouse_id: s.warehouse_id,
          warehouse_name: wh?.name || 'Warehouse',
          current_quantity: current,
          reserved_quantity: reserved,
          available_quantity: Math.max(0, current - reserved),
          reorder_level: s.reorder_level ?? null,
          average_cost: cost,
          stock_value: current * cost,
        };
      });

      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(
          (r) => r.product_name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
        );
      }
      return rows;
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('warehouse_stock')
      .select(`
        *,
        warehouses (id, name, code),
        products (id, name, sku, purchase_price)
      `)
      .eq('organization_id', orgId);

    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch stock summary report: ${error.message}`);

    let rows = (data || []).map((s: any) => {
      const current = Number(s.current_quantity || 0);
      const reserved = Number(s.reserved_quantity || 0);
      const cost = Number(s.average_cost || s.products?.purchase_price || 0);
      return {
        id: s.id,
        product_id: s.product_id,
        product_name: s.products?.name || 'Product',
        sku: s.products?.sku || 'N/A',
        warehouse_id: s.warehouse_id,
        warehouse_name: s.warehouses?.name || 'Warehouse',
        current_quantity: current,
        reserved_quantity: reserved,
        available_quantity: Math.max(0, current - reserved),
        reorder_level: s.reorder_level,
        average_cost: cost,
        stock_value: current * cost,
      };
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r: any) => r.product_name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
      );
    }
    return rows;
  }
}
