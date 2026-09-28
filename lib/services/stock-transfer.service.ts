// ============================================================
// lib/services/stock-transfer.service.ts — Phase 8 Stock Transfer Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  CreateStockTransferInput,
  createStockTransferSchema,
} from '@/lib/validators/stock-transfer.schema';
import {
  demoStockTransfers,
  demoStockTransferItems,
  demoWarehouseStock,
  demoProducts,
  demoGetNextDocSequence,
  DemoStockTransfer,
  DemoStockTransferItem,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';
import { postInventoryMovement } from '@/lib/services/inventory.service';

export class StockTransferService {
  /**
   * Generates next sequential transfer number (TR-YYYY-XXXX).
   */
  static async generateTransferNumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const seq = demoGetNextDocSequence(orgId, 'TR', year);
    return `TR-${year}-${seq.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a stock transfer (status: draft or initiated).
   */
  static async createStockTransfer(session: AppSession, payload: CreateStockTransferInput) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.transfer.create');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = createStockTransferSchema.parse(payload);
    const transferNumber = validated.transfer_number || (await this.generateTransferNumber(orgId));

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Validate source availability
      for (const item of validated.items) {
        if (item.quantity <= 0) {
          throw new Error('Transfer quantity must be greater than zero');
        }
        const stockRow = demoWarehouseStock.find(
          (s) => s.warehouse_id === validated.source_warehouse_id && s.product_id === item.product_id
        );
        const current = Number(stockRow?.current_quantity || 0);
        const reserved = Number(stockRow?.reserved_quantity || 0);
        const available = Math.max(0, current - reserved);

        if (item.quantity > available) {
          throw new Error(
            `TRANSFER_QUANTITY_EXCEEDED: Requested ${item.quantity} units, but only ${available} units available in source warehouse.`
          );
        }
      }

      const transferId = `tr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newTransfer: DemoStockTransfer = {
        id: transferId,
        organization_id: orgId,
        transfer_number: transferNumber,
        source_warehouse_id: validated.source_warehouse_id,
        destination_warehouse_id: validated.destination_warehouse_id,
        transfer_date: validated.transfer_date,
        status: validated.status || 'draft',
        reference_number: validated.reference_number || null,
        notes: validated.notes || null,
        shipped_at: validated.status === 'in_transit' ? new Date().toISOString() : null,
        received_at: null,
        cancelled_at: null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const items: DemoStockTransferItem[] = validated.items.map((it) => ({
        id: `tri-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: orgId,
        transfer_id: transferId,
        product_id: it.product_id,
        quantity: it.quantity,
        unit: it.unit || 'PCS',
        batch_id: it.batch_id || null,
        batch_number: it.batch_number || null,
        serial_numbers: it.serial_numbers || [],
        notes: it.notes || null,
        created_at: new Date().toISOString(),
      }));

      demoStockTransfers.unshift(newTransfer);
      demoStockTransferItems.unshift(...items);

      return { ...newTransfer, items };
    }

    const supabase = createAdminClient();

    // Check source stock
    for (const item of validated.items) {
      if (item.quantity <= 0) {
        throw new Error('Transfer quantity must be greater than zero');
      }
      const { data: stockRow } = await supabase
        .from('warehouse_stock')
        .select('current_quantity, reserved_quantity')
        .eq('warehouse_id', validated.source_warehouse_id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      const current = Number(stockRow?.current_quantity || 0);
      const reserved = Number(stockRow?.reserved_quantity || 0);
      const available = Math.max(0, current - reserved);

      if (item.quantity > available) {
        throw new Error(
          `TRANSFER_QUANTITY_EXCEEDED: Requested ${item.quantity} units, but only ${available} units available in source warehouse.`
        );
      }
    }

    const { data: transfer, error: transferErr } = await supabase
      .from('stock_transfers')
      .insert({
        organization_id: orgId,
        transfer_number: transferNumber,
        source_warehouse_id: validated.source_warehouse_id,
        destination_warehouse_id: validated.destination_warehouse_id,
        transfer_date: validated.transfer_date,
        status: validated.status || 'draft',
        reference_number: validated.reference_number || null,
        notes: validated.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (transferErr || !transfer) {
      throw new Error(`Failed to create stock transfer: ${transferErr?.message}`);
    }

    const itemRows = validated.items.map((it) => ({
      organization_id: orgId,
      transfer_id: transfer.id,
      product_id: it.product_id,
      quantity: it.quantity,
      unit: it.unit || 'PCS',
      batch_id: it.batch_id || null,
      batch_number: it.batch_number || null,
      serial_numbers: it.serial_numbers || [],
      notes: it.notes || null,
    }));

    await supabase.from('stock_transfer_items').insert(itemRows);

    await logAudit(session, 'stock_transfer.created', 'stock_transfers', transfer.id, {
      transfer_number: transferNumber,
      source: validated.source_warehouse_id,
      destination: validated.destination_warehouse_id,
    });

    return { ...transfer, items: itemRows };
  }

  /**
   * Receives a stock transfer at destination.
   * Atomically decrements source warehouse stock and increments destination warehouse stock.
   * Internal transfer: zero accounting impact, zero GST, zero revenue/expense.
   */
  static async receiveTransfer(session: AppSession, transferId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.transfer.receive');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const transfer = demoStockTransfers.find((t) => t.id === transferId && t.organization_id === orgId);
      if (!transfer) throw new Error('Stock transfer not found or unauthorized');

      if (transfer.status === 'received' || transfer.status === 'transferred') {
        throw new Error('This transfer has already been received');
      }
      if (transfer.status === 'cancelled') {
        throw new Error('Cannot receive a cancelled stock transfer');
      }

      const items = demoStockTransferItems.filter((it) => it.transfer_id === transfer.id);

      // Verify availability again at source
      for (const item of items) {
        const sourceStock = demoWarehouseStock.find(
          (s) => s.warehouse_id === transfer.source_warehouse_id && s.product_id === item.product_id
        );
        const current = Number(sourceStock?.current_quantity || 0);
        if (item.quantity > current) {
          throw new Error(
            `TRANSFER_QUANTITY_EXCEEDED: Source stock is insufficient (${current} available, ${item.quantity} required).`
          );
        }
      }

      // Execute atomic movement
      for (const item of items) {
        // Decrement source
        const sourceStock = demoWarehouseStock.find(
          (s) => s.warehouse_id === transfer.source_warehouse_id && s.product_id === item.product_id
        );
        if (sourceStock) {
          sourceStock.current_quantity = Math.max(0, sourceStock.current_quantity - item.quantity);
        }

        // Increment destination
        let destStock = demoWarehouseStock.find(
          (s) => s.warehouse_id === transfer.destination_warehouse_id && s.product_id === item.product_id
        );
        if (!destStock) {
          destStock = {
            id: `whs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            organization_id: orgId,
            warehouse_id: transfer.destination_warehouse_id,
            product_id: item.product_id,
            opening_quantity: 0,
            current_quantity: 0,
            reserved_quantity: 0,
            average_cost: sourceStock?.average_cost || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          demoWarehouseStock.push(destStock);
        }
        destStock.current_quantity += item.quantity;
      }

      transfer.status = 'received';
      transfer.received_at = new Date().toISOString();
      transfer.updated_at = new Date().toISOString();

      return { success: true, transfer };
    }

    const supabase = createAdminClient();
    const { data: transfer, error } = await supabase
      .from('stock_transfers')
      .select('*, stock_transfer_items (*)')
      .eq('id', transferId)
      .eq('organization_id', orgId)
      .single();

    if (error || !transfer) {
      throw new Error('Stock transfer not found or unauthorized');
    }

    if (transfer.status === 'received' || transfer.status === 'transferred') {
      throw new Error('This transfer has already been received');
    }
    if (transfer.status === 'cancelled') {
      throw new Error('Cannot receive a cancelled stock transfer');
    }

    const items = transfer.stock_transfer_items || [];

    // Verify source stock
    for (const item of items) {
      const { data: sourceStock } = await supabase
        .from('warehouse_stock')
        .select('current_quantity')
        .eq('warehouse_id', transfer.source_warehouse_id)
        .eq('product_id', item.product_id)
        .single();

      const current = Number(sourceStock?.current_quantity || 0);
      if (item.quantity > current) {
        throw new Error(
          `TRANSFER_QUANTITY_EXCEEDED: Source stock is insufficient (${current} available, ${item.quantity} required).`
        );
      }
    }

    // Atomic execution
    for (const item of items) {
      // 1. Decrement source
      const { data: sourceStock } = await supabase
        .from('warehouse_stock')
        .select('*')
        .eq('warehouse_id', transfer.source_warehouse_id)
        .eq('product_id', item.product_id)
        .single();

      const newSourceStock = Math.max(0, Number(sourceStock.current_quantity) - item.quantity);
      await supabase
        .from('warehouse_stock')
        .update({ current_quantity: newSourceStock, updated_at: new Date().toISOString() })
        .eq('id', sourceStock.id);

      // 2. Increment destination
      const { data: destStock } = await supabase
        .from('warehouse_stock')
        .select('*')
        .eq('warehouse_id', transfer.destination_warehouse_id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (destStock) {
        await supabase
          .from('warehouse_stock')
          .update({
            current_quantity: Number(destStock.current_quantity) + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', destStock.id);
      } else {
        await supabase.from('warehouse_stock').insert({
          organization_id: orgId,
          warehouse_id: transfer.destination_warehouse_id,
          product_id: item.product_id,
          current_quantity: item.quantity,
          average_cost: sourceStock.average_cost || 0,
        });
      }

      // Record canonical movements
      await postInventoryMovement({
        organization_id: orgId,
        product_id: item.product_id,
        movement_type: 'TRANSFER_OUT',
        quantity: -item.quantity,
        reference_type: 'manual',
        reference_id: transfer.id,
        reference_number: transfer.transfer_number,
        notes: `Transfer OUT to warehouse: ${transfer.destination_warehouse_id}`,
        user_id: userId,
      });

      await postInventoryMovement({
        organization_id: orgId,
        product_id: item.product_id,
        movement_type: 'TRANSFER_IN',
        quantity: item.quantity,
        reference_type: 'manual',
        reference_id: transfer.id,
        reference_number: transfer.transfer_number,
        notes: `Transfer IN from warehouse: ${transfer.source_warehouse_id}`,
        user_id: userId,
      });
    }

    await supabase
      .from('stock_transfers')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId);

    await logAudit(session, 'stock_transfer.received', 'stock_transfers', transferId, {
      transfer_number: transfer.transfer_number,
    });

    return { success: true };
  }

  /**
   * Direct/immediate stock transfer (bypasses in-transit staging).
   */
  static async transferImmediate(session: AppSession, payload: CreateStockTransferInput) {
    const created = await this.createStockTransfer(session, { ...payload, status: 'initiated' });
    const received = await this.receiveTransfer(session, created.id);
    return { ...created, status: 'transferred', received };
  }

  /**
   * Cancels a stock transfer. If in transit or dispatched, reverses physical deductions.
   */
  static async cancelTransfer(session: AppSession, transferId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.transfer.cancel');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const transfer = demoStockTransfers.find((t) => t.id === transferId && t.organization_id === orgId);
      if (!transfer) throw new Error('Stock transfer not found or unauthorized');

      if (transfer.status === 'cancelled') {
        throw new Error('This transfer has already been cancelled');
      }
      if (transfer.status === 'received' || transfer.status === 'transferred') {
        throw new Error('Cannot cancel an already received transfer. Use reverse transfer.');
      }

      transfer.status = 'cancelled';
      transfer.cancelled_at = new Date().toISOString();
      transfer.updated_at = new Date().toISOString();
      return { success: true };
    }

    const supabase = createAdminClient();
    const { data: transfer, error } = await supabase
      .from('stock_transfers')
      .select('*')
      .eq('id', transferId)
      .eq('organization_id', orgId)
      .single();

    if (error || !transfer) {
      throw new Error('Stock transfer not found or unauthorized');
    }

    if (transfer.status === 'cancelled') {
      throw new Error('This transfer has already been cancelled');
    }
    if (transfer.status === 'received' || transfer.status === 'transferred') {
      throw new Error('Cannot cancel an already received transfer. Use reverse transfer.');
    }

    await supabase
      .from('stock_transfers')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId);

    await logAudit(session, 'stock_transfer.cancelled', 'stock_transfers', transferId, {
      transfer_number: transfer.transfer_number,
    });

    return { success: true };
  }

  /**
   * Lists stock transfers with filters.
   */
  static async getStockTransfers(
    session: AppSession,
    filters: { status?: string; source_warehouse_id?: string; destination_warehouse_id?: string } = {}
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.transfer.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoStockTransfers.filter((t) => t.organization_id === orgId);
      if (filters.status) list = list.filter((t) => t.status === filters.status);
      if (filters.source_warehouse_id) {
        list = list.filter((t) => t.source_warehouse_id === filters.source_warehouse_id);
      }
      if (filters.destination_warehouse_id) {
        list = list.filter((t) => t.destination_warehouse_id === filters.destination_warehouse_id);
      }
      return list.map((t) => {
        const items = demoStockTransferItems.filter((it) => it.transfer_id === t.id);
        return { ...t, items };
      });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('stock_transfers')
      .select('*, stock_transfer_items (*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.source_warehouse_id) query = query.eq('source_warehouse_id', filters.source_warehouse_id);
    if (filters.destination_warehouse_id) query = query.eq('destination_warehouse_id', filters.destination_warehouse_id);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch stock transfers: ${error.message}`);
    return data || [];
  }
}
