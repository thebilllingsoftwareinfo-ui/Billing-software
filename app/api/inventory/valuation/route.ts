// ============================================================
// app/api/inventory/valuation/route.ts — Inventory Valuation API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { InventoryValuationService } from '@/lib/services/inventory-valuation.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const method = (searchParams.get('method') as any) || 'weighted_average';
    const warehouseId = searchParams.get('warehouse_id') || undefined;

    const valuation = await InventoryValuationService.getValuationSummary(session, {
      method,
      warehouse_id: warehouseId,
    });
    return NextResponse.json(valuation);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory valuation' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}
