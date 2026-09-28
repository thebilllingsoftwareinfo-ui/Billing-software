// ============================================================
// app/api/inventory/warehouses/route.ts — Warehouses API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { WarehouseService } from '@/lib/services/warehouse.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const is_active_param = searchParams.get('is_active');
    const is_active = is_active_param !== null ? is_active_param === 'true' : undefined;

    const warehouses = await WarehouseService.getWarehouses(session, { search, is_active });
    return NextResponse.json({ warehouses });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouses' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const warehouse = await WarehouseService.createWarehouse(session, body);
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create warehouse' },
      { status: error.message?.includes('already exists') ? 400 : error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}
