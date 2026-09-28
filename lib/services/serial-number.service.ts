// ============================================================
// lib/services/serial-number.service.ts — Phase 8 Serial Number Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { logAudit } from '@/lib/services/audit.service';
import {
  CreateSerialInput,
  createSerialSchema,
  BulkCreateSerialsInput,
  bulkCreateSerialsSchema,
  SerialStatus,
} from '@/lib/validators/inventory-serial.schema';
import {
  demoSerials,
  DemoSerial,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store';

export class SerialNumberService {
  /**
   * Creates a single serial number. Validates uniqueness within organization and product.
   */
  static async createSerial(session: AppSession, payload: CreateSerialInput): Promise<DemoSerial> {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.serial.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const validated = createSerialSchema.parse(payload);

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const exists = demoSerials.some(
        (s) =>
          s.organization_id === orgId &&
          s.product_id === validated.product_id &&
          s.serial_number.toLowerCase() === validated.serial_number.toLowerCase()
      );
      if (exists) {
        throw new Error(
          `SERIAL_EXISTS: Serial number '${validated.serial_number}' already registered for this product.`
        );
      }

      const newSerial: DemoSerial = {
        id: `sn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: orgId,
        product_id: validated.product_id,
        warehouse_id: validated.warehouse_id,
        serial_number: validated.serial_number,
        status: validated.status || 'available',
        batch_id: validated.batch_id || null,
        purchase_reference: validated.purchase_reference || null,
        sale_reference: validated.sale_reference || null,
        notes: validated.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      demoSerials.unshift(newSerial);
      return newSerial;
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('inventory_serial_numbers')
      .select('id')
      .eq('organization_id', orgId)
      .eq('product_id', validated.product_id)
      .ilike('serial_number', validated.serial_number)
      .maybeSingle();

    if (existing) {
      throw new Error(
        `SERIAL_EXISTS: Serial number '${validated.serial_number}' already registered for this product.`
      );
    }

    const { data: serial, error } = await supabase
      .from('inventory_serial_numbers')
      .insert({
        ...validated,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error || !serial) {
      throw new Error(`Failed to register serial number: ${error?.message}`);
    }

    await logAudit(session, 'serial.created', 'inventory_serial_numbers', serial.id, {
      serial_number: serial.serial_number,
      product_id: serial.product_id,
      warehouse_id: serial.warehouse_id,
    });

    return serial as any;
  }

  /**
   * Bulk registers serial numbers (e.g. on purchase receipt or inward movement).
   */
  static async bulkCreateSerials(session: AppSession, payload: BulkCreateSerialsInput) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.serial.manage');
    const validated = bulkCreateSerialsSchema.parse(payload);

    const created: DemoSerial[] = [];
    for (const sn of validated.serial_numbers) {
      const serial = await this.createSerial(session, {
        product_id: validated.product_id,
        warehouse_id: validated.warehouse_id,
        serial_number: sn,
        batch_id: validated.batch_id,
        purchase_reference: validated.purchase_reference,
        notes: validated.notes,
        status: 'available',
      });
      created.push(serial);
    }

    return {
      serials: created,
      count: created.length,
    };
  }

  /**
   * Lists serial numbers with filtering.
   */
  static async getSerials(
    session: AppSession,
    filters: { product_id?: string; warehouse_id?: string; status?: SerialStatus; search?: string } = {}
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.serial.view');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let list = demoSerials.filter((s) => s.organization_id === orgId);
      if (filters.product_id) list = list.filter((s) => s.product_id === filters.product_id);
      if (filters.warehouse_id) list = list.filter((s) => s.warehouse_id === filters.warehouse_id);
      if (filters.status) list = list.filter((s) => s.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter((s) => s.serial_number.toLowerCase().includes(q));
      }
      return list;
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('inventory_serial_numbers')
      .select(`
        *,
        products (id, name, sku),
        warehouses (id, name, code)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (filters.product_id) query = query.eq('product_id', filters.product_id);
    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.search) query = query.ilike('serial_number', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch serial numbers: ${error.message}`);
    return data || [];
  }

  /**
   * Updates serial status and references (sale, reservation, return).
   */
  static async updateSerialStatus(
    session: AppSession,
    serialId: string,
    status: SerialStatus,
    references?: { sale_reference?: string; purchase_reference?: string } | string
  ) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.serial.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    const saleRef = typeof references === 'string' ? references : references?.sale_reference;
    const purchaseRef = typeof references === 'object' ? references?.purchase_reference : undefined;

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serial = demoSerials.find((s) => s.id === serialId && s.organization_id === orgId);
      if (!serial) throw new Error('Serial number not found or unauthorized');

      serial.status = status;
      if (saleRef !== undefined) serial.sale_reference = saleRef;
      if (purchaseRef !== undefined) serial.purchase_reference = purchaseRef;
      serial.updated_at = new Date().toISOString();
      return serial;
    }

    const supabase = createAdminClient();
    const updatePayload: any = { status, updated_at: new Date().toISOString() };
    if (saleRef !== undefined) updatePayload.sale_reference = saleRef;
    if (purchaseRef !== undefined) updatePayload.purchase_reference = purchaseRef;

    const { data: updated, error } = await supabase
      .from('inventory_serial_numbers')
      .update(updatePayload)
      .eq('id', serialId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update serial number: ${error?.message}`);
    }

    return updated;
  }

  /**
   * Moves serial number to another warehouse. Invariant: serial exists in exactly one warehouse.
   */
  static async transferSerial(session: AppSession, serialId: string, destinationWarehouseId: string) {
    const role = session.role || session.member?.role || 'owner';
    requirePermission(role, 'inventory.serial.manage');
    const orgId = session.organization_id || session.organization?.id || DEMO_ORG_ID;
    const userId = session.user_id || session.user?.id || '';

    if (userId.includes('demo') || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serial = demoSerials.find((s) => s.id === serialId && s.organization_id === orgId);
      if (!serial) throw new Error('Serial number not found or unauthorized');

      if (serial.warehouse_id === destinationWarehouseId) {
        throw new Error('Serial is already present in the destination warehouse');
      }

      serial.warehouse_id = destinationWarehouseId;
      serial.status = 'available';
      serial.updated_at = new Date().toISOString();
      return serial;
    }

    const supabase = createAdminClient();
    const { data: updated, error } = await supabase
      .from('inventory_serial_numbers')
      .update({
        warehouse_id: destinationWarehouseId,
        status: 'available',
        updated_at: new Date().toISOString(),
      })
      .eq('id', serialId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to transfer serial: ${error?.message}`);
    }

    return updated;
  }
}
