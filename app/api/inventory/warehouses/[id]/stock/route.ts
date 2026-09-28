// ============================================================
// app/api/inventory/warehouses/[id]/stock/route.ts — Warehouse Stock Balance API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { WarehouseService } from '@/lib/services/warehouse.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const low_stock = searchParams.get('low_stock') === 'true';

    const stock = await WarehouseService.getWarehouseStock(session, id, { search, low_stock });
    return NextResponse.json({ stock });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouse stock' },
      { status: 500 }
    );
  }
}
