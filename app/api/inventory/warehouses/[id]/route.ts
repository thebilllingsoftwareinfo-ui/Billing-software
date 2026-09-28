// ============================================================
// app/api/inventory/warehouses/[id]/route.ts — Single Warehouse API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { WarehouseService } from '@/lib/services/warehouse.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const warehouse = await WarehouseService.getWarehouse(session, id);
    return NextResponse.json(warehouse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Warehouse not found' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const updated = await WarehouseService.updateWarehouse(session, id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update warehouse' },
      { status: error.message?.includes('already exists') ? 400 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await WarehouseService.deleteWarehouse(session, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete warehouse' },
      { status: error.message?.includes('Cannot delete') ? 400 : 500 }
    );
  }
}
