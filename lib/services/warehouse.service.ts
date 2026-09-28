// ============================================================
// lib/services/warehouse.service.ts — Phase 8 Warehouse Master Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  CreateWarehouseInput,
  createWarehouseSchema,
  UpdateWarehouseInput,
  updateWarehouseSchema,
} from '@/lib/validators/warehouse.schema';
import {
  demoWarehouses,
  demoWarehouseStock,
  demoProducts,
  DemoWarehouse,
  DemoWarehouseStock,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface WarehouseStockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_level: number | null;
  reorder_quantity: number | null;
  min_stock_level: number | null;
  max_stock_level: number | null;
  average_cost: number;
  stock_value: number;
}

export class WarehouseService {
  /**
   * Retrieves or auto-provisions the default warehouse for an organization.
   */
  static async getOrCreateDefaultWarehouse(session: AppSession): Promise<DemoWarehouse> {
    return this.getDefaultWarehouse(session);
  }

  /**
   * Retrieves or auto-provisions the default warehouse for an organization.
   */
  static async getDefaultWarehouse(session: AppSession): Promise<DemoWarehouse> {
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let defaultWh = demoWarehouses.find((w) => w.organization_id === orgId && w.is_default);
      if (!defaultWh) {
        defaultWh = {
          id: `wh-${orgId}-main`,
          organization_id: orgId,
          name: 'Main Central Godown',
          code: 'WH-MAIN',
          type: 'godown',
          is_default: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        demoWarehouses.unshift(defaultWh);
      }
      return defaultWh;
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('warehouses')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_default', true)
      .maybeSingle();

    if (existing) {
      return existing as any;
    }

    // Auto-provision if none exists
    const { data: created, error } = await supabase
      .from('warehouses')
      .insert({
        organization_id: orgId,
        name: 'Main Central Godown',
        code: 'WH-MAIN',
        type: 'godown',
        is_default: true,
        is_active: true,
      })
      .select()
      .single();

    if (error || !created) {
      throw new Error(`Failed to provision default warehouse: ${error?.message}`);
    }

    return created as any;
  }

  /**
   * Creates a new warehouse. Code must be unique per organization.
   */
  static async createWarehouse(session: AppSession, payload: CreateWarehouseInput) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.warehouse.create');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = createWarehouseSchema.parse(payload);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const codeExists = demoWarehouses.some(
        (w) => w.organization_id === orgId && w.code.toUpperCase() === validated.code.toUpperCase()
      );
      if (codeExists) {
        throw new Error(`Warehouse with code '${validated.code}' already exists in this organization.`);
      }

      if (validated.is_default) {
        demoWarehouses.forEach((w) => {
          if (w.organization_id === orgId) w.is_default = false;
        });
      }

      const newWh: DemoWarehouse = {
        id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: orgId,
        name: validated.name,
        code: validated.code,
        type: validated.type || 'main',
        address: validated.address || null,
        city: validated.city || null,
        state_code: validated.state_code || null,
        pincode: validated.pincode || null,
        contact_person: validated.contact_person || null,
        phone: validated.phone || null,
        email: validated.email || null,
        is_default: Boolean(validated.is_default),
        is_active: validated.is_active ?? true,
        notes: validated.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      demoWarehouses.push(newWh);
      return newWh;
    }

    const supabase = createAdminClient();

    // Check code uniqueness
    const { data: existingCode } = await supabase
      .from('warehouses')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('code', validated.code)
      .maybeSingle();

    if (existingCode) {
      throw new Error(`Warehouse with code '${validated.code}' already exists in this organization.`);
    }

    if (validated.is_default) {
      await supabase
        .from('warehouses')
        .update({ is_default: false })
        .eq('organization_id', orgId);
    }

    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .insert({
        ...validated,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error || !warehouse) {
      throw new Error(`Failed to create warehouse: ${error?.message}`);
    }

    await logAudit(session, 'warehouse.created', 'warehouses', warehouse.id, {
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
    });

    return warehouse;
  }

  /**
   * Lists all warehouses for an organization.
   */
  static async getWarehouses(session: AppSession, filters: { is_active?: boolean; search?: string } = {}) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.warehouse.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoWarehouses.filter((w) => w.organization_id === orgId);
      if (filters.is_active !== undefined) {
        list = list.filter((w) => w.is_active === filters.is_active);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
      }
      return list;
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('warehouses')
      .select('*')
      .eq('organization_id', orgId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch warehouses: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Retrieves single warehouse by ID.
   */
  static async getWarehouse(session: AppSession, warehouseId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.warehouse.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const wh = demoWarehouses.find((w) => w.id === warehouseId && w.organization_id === orgId);
      if (!wh) throw new Error('Warehouse not found or unauthorized');
      return wh;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .eq('organization_id', orgId)
      .single();

    if (error || !data) {
      throw new Error('Warehouse not found or unauthorized');
    }

    return data;
  }

  /**
   * Updates a warehouse.
   */
  static async updateWarehouse(session: AppSession, warehouseId: string, payload: UpdateWarehouseInput) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.warehouse.update');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = updateWarehouseSchema.parse(payload);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const wh = demoWarehouses.find((w) => w.id === warehouseId && w.organization_id === orgId);
      if (!wh) throw new Error('Warehouse not found or unauthorized');

      if (validated.code && validated.code.toUpperCase() !== wh.code.toUpperCase()) {
        const codeExists = demoWarehouses.some(
          (w) => w.id !== warehouseId && w.organization_id === orgId && w.code.toUpperCase() === validated.code!.toUpperCase()
        );
        if (codeExists) {
          throw new Error(`Warehouse with code '${validated.code}' already exists.`);
        }
      }

      if (validated.is_default) {
        demoWarehouses.forEach((w) => {
          if (w.organization_id === orgId) w.is_default = false;
        });
      }

      Object.assign(wh, validated, { updated_at: new Date().toISOString() });
      return wh;
    }

    const supabase = createAdminClient();

    if (validated.code) {
      const { data: codeCheck } = await supabase
        .from('warehouses')
        .select('id')
        .eq('organization_id', orgId)
        .ilike('code', validated.code)
        .neq('id', warehouseId)
        .maybeSingle();

      if (codeCheck) {
        throw new Error(`Warehouse with code '${validated.code}' already exists.`);
      }
    }

    if (validated.is_default) {
      await supabase
        .from('warehouses')
        .update({ is_default: false })
        .eq('organization_id', orgId);
    }

    const { data: updated, error } = await supabase
      .from('warehouses')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', warehouseId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update warehouse: ${error?.message}`);
    }

    await logAudit(session, 'warehouse.updated', 'warehouses', warehouseId, validated);
    return updated;
  }

  /**
   * Deletes a warehouse. Default warehouses or warehouses with stock cannot be deleted.
   */
  static async deleteWarehouse(session: AppSession, warehouseId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.warehouse.delete');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const wh = await this.getWarehouse(session, warehouseId);
    if (wh.is_default) {
      throw new Error('Cannot delete the organization default warehouse.');
    }

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const hasStock = demoWarehouseStock.some(
        (s) => s.warehouse_id === warehouseId && s.current_quantity > 0
      );
      if (hasStock) {
        throw new Error('Cannot delete warehouse that still holds active stock. Transfer or adjust stock first.');
      }
      const idx = demoWarehouses.findIndex((w) => w.id === warehouseId && w.organization_id === orgId);
      if (idx !== -1) demoWarehouses.splice(idx, 1);
      return { success: true };
    }

    const supabase = createAdminClient();
    const { count } = await supabase
      .from('warehouse_stock')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_id', warehouseId)
      .gt('current_quantity', 0);

    if (count && count > 0) {
      throw new Error('Cannot delete warehouse that still holds active stock. Transfer or adjust stock first.');
    }

    const { error } = await supabase
      .from('warehouses')
      .delete()
      .eq('id', warehouseId)
      .eq('organization_id', orgId);

    if (error) {
      throw new Error(`Failed to delete warehouse: ${error.message}`);
    }

    await logAudit(session, 'warehouse.deleted', 'warehouses', warehouseId, { name: wh.name, code: wh.code });
    return { success: true };
  }

  /**
   * Sets a warehouse as the organization default.
   */
  static async setDefaultWarehouse(session: AppSession, warehouseId: string) {
    return this.updateWarehouse(session, warehouseId, { is_default: true });
  }

  /**
   * Updates warehouse stock threshold levels (reorder level, min, max).
   */
  static async updateStockLevels(
    session: AppSession,
    warehouseId: string,
    productId: string,
    levels: {
      reorder_level?: number | null;
      reorder_quantity?: number | null;
      min_stock_level?: number | null;
      max_stock_level?: number | null;
    }
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.warehouse.update');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    await this.getWarehouse(session, warehouseId);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let row = demoWarehouseStock.find(
        (s) => s.warehouse_id === warehouseId && s.product_id === productId && s.organization_id === orgId
      );
      if (!row) {
        row = {
          id: `whs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          organization_id: orgId,
          warehouse_id: warehouseId,
          product_id: productId,
          opening_quantity: 0,
          current_quantity: 0,
          reserved_quantity: 0,
          average_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        demoWarehouseStock.push(row);
      }
      if (levels.reorder_level !== undefined) row.reorder_level = levels.reorder_level;
      if (levels.reorder_quantity !== undefined) row.reorder_quantity = levels.reorder_quantity;
      if (levels.min_stock_level !== undefined) row.min_stock_level = levels.min_stock_level;
      if (levels.max_stock_level !== undefined) row.max_stock_level = levels.max_stock_level;
      row.updated_at = new Date().toISOString();
      return row;
    }

    const supabase = createAdminClient();
    const { data: updated, error } = await supabase
      .from('warehouse_stock')
      .update({
        ...levels,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('warehouse_id', warehouseId)
      .eq('product_id', productId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update stock levels: ${error?.message}`);
    }

    return updated;
  }

  /**
   * Retrieves stock balance for a single product in a warehouse.
   */
  static async getProductStock(
    session: AppSession,
    warehouseId: string,
    productId: string
  ): Promise<WarehouseStockItem> {
    const list = await this.getWarehouseStock(session, warehouseId);
    const item = list.find((it) => it.product_id === productId);
    if (item) return item;
    return {
      id: '',
      product_id: productId,
      product_name: 'Product',
      sku: 'N/A',
      current_quantity: 0,
      reserved_quantity: 0,
      available_quantity: 0,
      reorder_level: null,
      reorder_quantity: null,
      min_stock_level: null,
      max_stock_level: null,
      average_cost: 0,
      stock_value: 0,
    };
  }

  /**
   * Retrieves stock balances for all products in a warehouse.
   * Computes available_quantity = current_quantity - reserved_quantity.
   */
  static async getWarehouseStock(
    session: AppSession,
    warehouseId: string,
    filtersInput: { search?: string; low_stock?: boolean; low_stock_only?: boolean; product_id?: string } | string = {}
  ): Promise<WarehouseStockItem[]> {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';
    const filters = typeof filtersInput === 'string' ? { search: filtersInput } : (filtersInput || {});

    // IDOR Check: Ensure warehouse exists and belongs to the caller's organization
    await this.getWarehouse(session, warehouseId);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const stockRows = demoWarehouseStock.filter(
        (s) => s.warehouse_id === warehouseId && s.organization_id === orgId
      );

      let items: WarehouseStockItem[] = stockRows.map((s) => {
        const prod = demoProducts.find((p) => p.id === s.product_id);
        const current = Number(s.current_quantity || 0);
        const reserved = Number(s.reserved_quantity || 0);
        const available = Math.max(0, current - reserved);
        const avgCost = Number(s.average_cost || prod?.purchase_price || 0);
        return {
          id: s.id,
          product_id: s.product_id,
          product_name: prod?.name || 'Unknown Product',
          sku: prod?.sku || 'N/A',
          current_quantity: current,
          reserved_quantity: reserved,
          available_quantity: available,
          reorder_level: s.reorder_level ?? null,
          reorder_quantity: s.reorder_quantity ?? null,
          min_stock_level: s.min_stock_level ?? null,
          max_stock_level: s.max_stock_level ?? null,
          average_cost: avgCost,
          stock_value: current * avgCost,
        };
      });

      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          (it) => it.product_name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
        );
      }

      if (filters.low_stock || filters.low_stock_only) {
        items = items.filter((it) => it.reorder_level && it.available_quantity <= it.reorder_level);
      }

      return items;
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('warehouse_stock')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          purchase_price,
          sale_price
        )
      `)
      .eq('organization_id', orgId)
      .eq('warehouse_id', warehouseId);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch warehouse stock: ${error.message}`);
    }

    let items: WarehouseStockItem[] = (data || []).map((row: any) => {
      const current = Number(row.current_quantity || 0);
      const reserved = Number(row.reserved_quantity || 0);
      const available = Math.max(0, current - reserved);
      const avgCost = Number(row.average_cost || row.products?.purchase_price || 0);

      return {
        id: row.id,
        product_id: row.product_id,
        product_name: row.products?.name || 'Unknown Product',
        sku: row.products?.sku || 'N/A',
        current_quantity: current,
        reserved_quantity: reserved,
        available_quantity: available,
        reorder_level: row.reorder_level,
        reorder_quantity: row.reorder_quantity,
        min_stock_level: row.min_stock_level,
        max_stock_level: row.max_stock_level,
        average_cost: avgCost,
        stock_value: current * avgCost,
      };
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (it) => it.product_name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
      );
    }

    if (filters.low_stock) {
      items = items.filter((it) => it.reorder_level && it.available_quantity <= it.reorder_level);
    }

    return items;
  }

  /**
   * Retrieves warehouse stock breakdown for a specific product across all warehouses.
   */
  static async getAllWarehouseStock(session: AppSession, productId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const warehouses = demoWarehouses.filter((w) => w.organization_id === orgId && w.is_active);
      return warehouses.map((wh) => {
        const stockRow = demoWarehouseStock.find(
          (s) => s.warehouse_id === wh.id && s.product_id === productId
        );
        const current = Number(stockRow?.current_quantity || 0);
        const reserved = Number(stockRow?.reserved_quantity || 0);
        return {
          warehouse_id: wh.id,
          warehouse_name: wh.name,
          warehouse_code: wh.code,
          is_default: wh.is_default,
          current_quantity: current,
          reserved_quantity: reserved,
          available_quantity: Math.max(0, current - reserved),
        };
      });
    }

    const supabase = createAdminClient();
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, name, code, is_default')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    const { data: stockRows } = await supabase
      .from('warehouse_stock')
      .select('*')
      .eq('organization_id', orgId)
      .eq('product_id', productId);

    return (warehouses || []).map((wh: any) => {
      const stockRow = (stockRows || []).find((s: any) => s.warehouse_id === wh.id);
      const current = Number(stockRow?.current_quantity || 0);
      const reserved = Number(stockRow?.reserved_quantity || 0);
      return {
        warehouse_id: wh.id,
        warehouse_name: wh.name,
        warehouse_code: wh.code,
        is_default: wh.is_default,
        current_quantity: current,
        reserved_quantity: reserved,
        available_quantity: Math.max(0, current - reserved),
      };
    });
  }
}
