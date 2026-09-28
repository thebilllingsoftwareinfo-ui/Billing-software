// ============================================================
// lib/services/stock-reservation.service.ts — Phase 8 Stock Reservation Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  CreateReservationInput,
  createReservationSchema,
} from '@/lib/validators/stock-reservation.schema';
import {
  demoReservations,
  demoWarehouseStock,
  DemoReservation,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export class StockReservationService {
  /**
   * Reserves product stock for an order or quote.
   * Crucial rule: Reduces AVAILABLE stock, but does NOT reduce PHYSICAL stock.
   */
  static async reserveStock(session: AppSession, payload: CreateReservationInput): Promise<DemoReservation> {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.reservation.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = createReservationSchema.parse(payload);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const stockRow = demoWarehouseStock.find(
        (s) => s.warehouse_id === validated.warehouse_id && s.product_id === validated.product_id
      );

      const current = Number(stockRow?.current_quantity || 0);
      const reserved = Number(stockRow?.reserved_quantity || 0);
      const available = Math.max(0, current - reserved);

      if (validated.quantity > available) {
        throw new Error(
          `INSUFFICIENT_AVAILABLE_STOCK: Cannot reserve ${validated.quantity} units. Only ${available} units available (${current} current, ${reserved} already reserved).`
        );
      }

      if (stockRow) {
        stockRow.reserved_quantity = reserved + validated.quantity;
      }

      const newReservation: DemoReservation = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: orgId,
        product_id: validated.product_id,
        warehouse_id: validated.warehouse_id,
        quantity: validated.quantity,
        reference_type: validated.reference_type,
        reference_id: validated.reference_id,
        status: 'active',
        notes: validated.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      demoReservations.unshift(newReservation);
      return newReservation;
    }

    const supabase = createAdminClient();
    const { data: stockRow, error: stockErr } = await supabase
      .from('warehouse_stock')
      .select('id, current_quantity, reserved_quantity')
      .eq('warehouse_id', validated.warehouse_id)
      .eq('product_id', validated.product_id)
      .single();

    if (stockErr || !stockRow) {
      throw new Error('Stock balance record not found for product in specified warehouse.');
    }

    const current = Number(stockRow.current_quantity || 0);
    const reserved = Number(stockRow.reserved_quantity || 0);
    const available = Math.max(0, current - reserved);

    if (validated.quantity > available) {
      throw new Error(
        `INSUFFICIENT_AVAILABLE_STOCK: Cannot reserve ${validated.quantity} units. Only ${available} units available.`
      );
    }

    await supabase
      .from('warehouse_stock')
      .update({
        reserved_quantity: reserved + validated.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stockRow.id);

    const { data: reservation, error: resErr } = await supabase
      .from('stock_reservations')
      .insert({
        ...validated,
        organization_id: orgId,
        status: 'active',
      })
      .select()
      .single();

    if (resErr || !reservation) {
      throw new Error(`Failed to create stock reservation: ${resErr?.message}`);
    }

    await logAudit(session, 'stock.reserved', 'stock_reservations', reservation.id, {
      product_id: validated.product_id,
      quantity: validated.quantity,
      reference_type: validated.reference_type,
    });

    return reservation as any;
  }

  /**
   * Partially releases an active stock reservation.
   */
  static async releasePartialReservation(
    session: AppSession,
    reservationId: string,
    quantityToRelease: number
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.reservation.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const res = demoReservations.find((r) => r.id === reservationId && r.organization_id === orgId);
      if (!res) throw new Error('Stock reservation not found or unauthorized');

      if (res.status !== 'active') {
        throw new Error(`Cannot release reservation with status '${res.status}'`);
      }

      const releaseQty = Math.min(res.quantity, quantityToRelease);
      const stockRow = demoWarehouseStock.find(
        (s) => s.warehouse_id === res.warehouse_id && s.product_id === res.product_id
      );
      if (stockRow) {
        stockRow.reserved_quantity = Math.max(0, (stockRow.reserved_quantity || 0) - releaseQty);
      }

      if (releaseQty >= res.quantity) {
        res.status = 'cancelled';
      } else {
        res.quantity -= releaseQty;
      }
      res.updated_at = new Date().toISOString();
      return { success: true };
    }

    const supabase = createAdminClient();
    const { data: res, error: resErr } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('organization_id', orgId)
      .single();

    if (resErr || !res) throw new Error('Stock reservation not found or unauthorized');

    if (res.status !== 'active') {
      throw new Error(`Cannot release reservation with status '${res.status}'`);
    }

    const releaseQty = Math.min(Number(res.quantity), quantityToRelease);
    const { data: stockRow } = await supabase
      .from('warehouse_stock')
      .select('id, reserved_quantity')
      .eq('warehouse_id', res.warehouse_id)
      .eq('product_id', res.product_id)
      .single();

    if (stockRow) {
      const newReserved = Math.max(0, Number(stockRow.reserved_quantity) - releaseQty);
      await supabase
        .from('warehouse_stock')
        .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', stockRow.id);
    }

    if (releaseQty >= Number(res.quantity)) {
      await supabase
        .from('stock_reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reservationId);
    } else {
      await supabase
        .from('stock_reservations')
        .update({
          quantity: Number(res.quantity) - releaseQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);
    }

    return { success: true };
  }

  /**
   * Releases an active stock reservation (e.g. order cancelled or expired).
   */
  static async releaseReservation(session: AppSession, reservationId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.reservation.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const res = demoReservations.find((r) => r.id === reservationId && r.organization_id === orgId);
      if (!res) throw new Error('Stock reservation not found or unauthorized');

      if (res.status !== 'active') {
        throw new Error(`Cannot release reservation with status '${res.status}'`);
      }

      const stockRow = demoWarehouseStock.find(
        (s) => s.warehouse_id === res.warehouse_id && s.product_id === res.product_id
      );
      if (stockRow) {
        stockRow.reserved_quantity = Math.max(0, (stockRow.reserved_quantity || 0) - res.quantity);
      }

      res.status = 'cancelled';
      res.updated_at = new Date().toISOString();
      return { success: true };
    }

    const supabase = createAdminClient();
    const { data: res, error: resErr } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('organization_id', orgId)
      .single();

    if (resErr || !res) throw new Error('Stock reservation not found or unauthorized');

    if (res.status !== 'active') {
      throw new Error(`Cannot release reservation with status '${res.status}'`);
    }

    const { data: stockRow } = await supabase
      .from('warehouse_stock')
      .select('id, reserved_quantity')
      .eq('warehouse_id', res.warehouse_id)
      .eq('product_id', res.product_id)
      .single();

    if (stockRow) {
      const newReserved = Math.max(0, Number(stockRow.reserved_quantity) - Number(res.quantity));
      await supabase
        .from('warehouse_stock')
        .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', stockRow.id);
    }

    await supabase
      .from('stock_reservations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    await logAudit(session, 'stock.reservation_released', 'stock_reservations', reservationId, {
      product_id: res.product_id,
      quantity: res.quantity,
    });

    return { success: true };
  }

  /**
   * Consumes/fulfills reservation upon Delivery Challan dispatch or invoice finalization.
   */
  static async fulfillReservation(session: AppSession, reservationId: string, fulfilledQty?: number) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.reservation.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const res = demoReservations.find((r) => r.id === reservationId && r.organization_id === orgId);
      if (!res) throw new Error('Stock reservation not found');

      const qtyToReduce = fulfilledQty !== undefined ? Math.min(res.quantity, fulfilledQty) : res.quantity;

      const stockRow = demoWarehouseStock.find(
        (s) => s.warehouse_id === res.warehouse_id && s.product_id === res.product_id
      );
      if (stockRow) {
        stockRow.reserved_quantity = Math.max(0, (stockRow.reserved_quantity || 0) - qtyToReduce);
        stockRow.current_quantity = Math.max(0, (stockRow.current_quantity || 0) - qtyToReduce);
      }

      if (fulfilledQty === undefined || fulfilledQty >= res.quantity) {
        res.status = 'fulfilled';
      } else {
        res.quantity -= fulfilledQty;
      }
      res.updated_at = new Date().toISOString();
      return { success: true };
    }

    const supabase = createAdminClient();
    const { data: res } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('organization_id', orgId)
      .single();

    if (!res) throw new Error('Stock reservation not found');

    const qtyToReduce = fulfilledQty !== undefined ? Math.min(Number(res.quantity), fulfilledQty) : Number(res.quantity);

    const { data: stockRow } = await supabase
      .from('warehouse_stock')
      .select('id, current_quantity, reserved_quantity')
      .eq('warehouse_id', res.warehouse_id)
      .eq('product_id', res.product_id)
      .single();

    if (stockRow) {
      const newCurrent = Math.max(0, Number(stockRow.current_quantity) - qtyToReduce);
      const newReserved = Math.max(0, Number(stockRow.reserved_quantity) - qtyToReduce);
      await supabase
        .from('warehouse_stock')
        .update({
          current_quantity: newCurrent,
          reserved_quantity: newReserved,
          updated_at: new Date().toISOString(),
        })
    }

    const isFullyFulfilled = fulfilledQty === undefined || fulfilledQty >= Number(res.quantity);
    await supabase
      .from('stock_reservations')
      .update({
        status: isFullyFulfilled ? 'fulfilled' : 'active',
        quantity: isFullyFulfilled ? Number(res.quantity) : Number(res.quantity) - qtyToReduce,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    return { success: true };
  }

  /**
   * Lists reservations with filters.
   */
  static async getReservations(
    session: AppSession,
    filters: {
      product_id?: string;
      warehouse_id?: string;
      status?: string;
      reference_id?: string;
      reference_type?: string;
    } = {}
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.reservation.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoReservations.filter((r) => r.organization_id === orgId);
      if (filters.product_id) list = list.filter((r) => r.product_id === filters.product_id);
      if (filters.warehouse_id) list = list.filter((r) => r.warehouse_id === filters.warehouse_id);
      if (filters.status) list = list.filter((r) => r.status === filters.status);
      if (filters.reference_id) list = list.filter((r) => r.reference_id === filters.reference_id);
      if (filters.reference_type) list = list.filter((r) => r.reference_type === filters.reference_type);
      return list;
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('stock_reservations')
      .select('*, products(name, sku), warehouses(name, code)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.reference_id) query = query.eq('reference_id', filters.reference_id);
    if (filters.reference_type) query = query.eq('reference_type', filters.reference_type);
    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch stock reservations: ${error.message}`);
    return data || [];
  }
}
