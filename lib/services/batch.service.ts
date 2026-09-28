// ============================================================
// lib/services/batch.service.ts — Phase 8 Batch & Lot Tracking Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  CreateBatchInput,
  createBatchSchema,
} from '@/lib/validators/inventory-batch.schema';
import {
  demoBatches,
  demoProducts,
  demoWarehouses,
  DemoBatch,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export interface BatchExpiryAlert {
  batch_id: string;
  batch_number: string;
  product_id: string;
  product_name: string;
  warehouse_id: string | null;
  warehouse_name: string;
  expiry_date: string;
  days_remaining: number;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING';
  current_quantity: number;
  batch_value: number;
}

export class BatchService {
  /**
   * Creates a new product batch/lot.
   */
  static async createBatch(session: AppSession, payload: CreateBatchInput): Promise<DemoBatch> {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.batch.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = createBatchSchema.parse(payload);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const exists = demoBatches.some(
        (b) =>
          b.organization_id === orgId &&
          b.product_id === validated.product_id &&
          b.batch_number.toUpperCase() === validated.batch_number.toUpperCase()
      );
      if (exists) {
        throw new Error(
          `Batch '${validated.batch_number}' already exists for this product in organization.`
        );
      }

      const initialQty = Number(validated.initial_quantity || 0);
      const newBatch: DemoBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: orgId,
        product_id: validated.product_id,
        warehouse_id: validated.warehouse_id || null,
        batch_number: validated.batch_number,
        manufacturing_date: validated.manufacturing_date || null,
        expiry_date: validated.expiry_date,
        purchase_date: validated.purchase_date || null,
        cost: Number(validated.cost || 0),
        initial_quantity: initialQty,
        current_quantity: initialQty,
        supplier_id: validated.supplier_id || null,
        reference_document: validated.reference_document || null,
        is_active: validated.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      demoBatches.unshift(newBatch);
      return newBatch;
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('inventory_batches')
      .select('id')
      .eq('organization_id', orgId)
      .eq('product_id', validated.product_id)
      .ilike('batch_number', validated.batch_number)
      .maybeSingle();

    if (existing) {
      throw new Error(`Batch '${validated.batch_number}' already exists for this product.`);
    }

    const initialQty = Number(validated.initial_quantity || 0);
    const { data: batch, error } = await supabase
      .from('inventory_batches')
      .insert({
        ...validated,
        organization_id: orgId,
        initial_quantity: initialQty,
        current_quantity: initialQty,
      })
      .select()
      .single();

    if (error || !batch) {
      throw new Error(`Failed to create batch: ${error?.message}`);
    }

    await logAudit(session, 'batch.created', 'inventory_batches', batch.id, {
      batch_number: batch.batch_number,
      product_id: batch.product_id,
      expiry_date: batch.expiry_date,
    });

    return batch as any;
  }

  /**
   * Lists batches for product/warehouse.
   */
  static async getBatches(
    session: AppSession,
    filters: { product_id?: string; warehouse_id?: string; is_active?: boolean; search?: string } = {}
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.batch.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoBatches.filter((b) => b.organization_id === orgId);
      if (filters.product_id) list = list.filter((b) => b.product_id === filters.product_id);
      if (filters.warehouse_id) list = list.filter((b) => b.warehouse_id === filters.warehouse_id);
      if (filters.is_active !== undefined) list = list.filter((b) => b.is_active === filters.is_active);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter((b) => b.batch_number.toLowerCase().includes(q));
      }
      return list;
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('inventory_batches')
      .select('*')
      .eq('organization_id', orgId)
      .order('expiry_date', { ascending: true });

    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
    if (filters.search) query = query.ilike('batch_number', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch batches: ${error.message}`);
    return data || [];
  }

  /**
   * Retrieves batches expiring within configurable thresholds (Expired <= 0, Critical <= 7, Warning <= 30 days).
   */
  static async getExpiringBatches(
    session: AppSession,
    thresholdDaysOrWarehouseId?: number | string | { thresholdDays?: number; warehouse_id?: string }
  ): Promise<BatchExpiryAlert[]> {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.batch.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';
    const now = new Date();

    let thresholdDays = 30;
    let warehouseIdFilter: string | undefined;

    if (typeof thresholdDaysOrWarehouseId === 'number') {
      thresholdDays = thresholdDaysOrWarehouseId;
    } else if (typeof thresholdDaysOrWarehouseId === 'string') {
      warehouseIdFilter = thresholdDaysOrWarehouseId;
    } else if (typeof thresholdDaysOrWarehouseId === 'object') {
      if (thresholdDaysOrWarehouseId.thresholdDays !== undefined) thresholdDays = thresholdDaysOrWarehouseId.thresholdDays;
      if (thresholdDaysOrWarehouseId.warehouse_id) warehouseIdFilter = thresholdDaysOrWarehouseId.warehouse_id;
    }

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let activeBatches = demoBatches.filter((b) => b.organization_id === orgId && b.is_active && b.current_quantity > 0);
      if (warehouseIdFilter) {
        activeBatches = activeBatches.filter((b) => b.warehouse_id === warehouseIdFilter);
      }
      const alerts: BatchExpiryAlert[] = [];

      for (const b of activeBatches) {
        const expDate = new Date(b.expiry_date);
        const diffMs = expDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining <= thresholdDays) {
          const prod = demoProducts.find((p) => p.id === b.product_id);
          const wh = demoWarehouses.find((w) => w.id === b.warehouse_id);
          let status: 'EXPIRED' | 'CRITICAL' | 'WARNING' = 'WARNING';
          if (daysRemaining <= 0) status = 'EXPIRED';
          else if (daysRemaining <= 7) status = 'CRITICAL';

          alerts.push({
            batch_id: b.id,
            batch_number: b.batch_number,
            product_id: b.product_id,
            product_name: prod?.name || 'Unknown Product',
            warehouse_id: b.warehouse_id || null,
            warehouse_name: wh?.name || 'Unassigned',
            expiry_date: b.expiry_date,
            days_remaining: daysRemaining,
            status,
            current_quantity: b.current_quantity,
            batch_value: b.current_quantity * (b.cost || prod?.purchase_price || 0),
          });
        }
      }

      return alerts.sort((a, b) => a.days_remaining - b.days_remaining);
    }

    const supabase = createAdminClient();
    const thresholdDate = new Date(Date.now() + thresholdDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = supabase
      .from('inventory_batches')
      .select(`
        *,
        products (id, name, purchase_price),
        warehouses (id, name)
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .gt('current_quantity', 0)
      .lte('expiry_date', thresholdDate)
      .order('expiry_date', { ascending: true });

    if (warehouseIdFilter) {
      query = query.eq('warehouse_id', warehouseIdFilter);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to query expiring batches: ${error.message}`);

    return (data || []).map((b: any) => {
      const expDate = new Date(b.expiry_date);
      const diffMs = expDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      let status: 'EXPIRED' | 'CRITICAL' | 'WARNING' = 'WARNING';
      if (daysRemaining <= 0) status = 'EXPIRED';
      else if (daysRemaining <= 7) status = 'CRITICAL';

      return {
        batch_id: b.id,
        batch_number: b.batch_number,
        product_id: b.product_id,
        product_name: b.products?.name || 'Unknown Product',
        warehouse_id: b.warehouse_id || null,
        warehouse_name: b.warehouses?.name || 'Unassigned',
        expiry_date: b.expiry_date,
        days_remaining: daysRemaining,
        status,
        current_quantity: Number(b.current_quantity),
        batch_value: Number(b.current_quantity) * Number(b.cost || b.products?.purchase_price || 0),
      };
    });
  }

  /**
   * Deducts quantity from batch.
   */
  static async deductBatchStock(session: AppSession, batchId: string, quantity: number) {
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const b = demoBatches.find((item) => item.id === batchId && item.organization_id === orgId);
      if (!b) throw new Error('Batch not found');
      if (quantity > b.current_quantity) {
        throw new Error(`INSUFFICIENT_BATCH_STOCK: Batch has ${b.current_quantity}, requested ${quantity}`);
      }
      b.current_quantity = Math.max(0, b.current_quantity - quantity);
      return b;
    }

    const supabase = createAdminClient();
    const { data: b, error } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('id', batchId)
      .eq('organization_id', orgId)
      .single();

    if (error || !b) throw new Error('Batch not found');
    if (quantity > Number(b.current_quantity)) {
      throw new Error(`INSUFFICIENT_BATCH_STOCK: Batch has ${b.current_quantity}, requested ${quantity}`);
    }

    const { data: updated } = await supabase
      .from('inventory_batches')
      .update({
        current_quantity: Number(b.current_quantity) - quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
      .select()
      .single();
    return updated;
  }

  /**
   * Computes standardized expiry risk status:
   * - EXPIRED: daysRemaining <= 0
   * - CRITICAL: 1 <= daysRemaining <= 7
   * - WARNING: 8 <= daysRemaining <= 30
   * - SAFE: daysRemaining > 30
   */
  static getExpiryStatus(
    expiryDate: string,
    now: Date = new Date()
  ): { status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE'; daysRemaining: number } {
    const expDate = new Date(expiryDate);
    const diffMs = expDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE' = 'SAFE';
    if (daysRemaining <= 0) status = 'EXPIRED';
    else if (daysRemaining <= 7) status = 'CRITICAL';
    else if (daysRemaining <= 30) status = 'WARNING';
    return { status, daysRemaining };
  }
}
