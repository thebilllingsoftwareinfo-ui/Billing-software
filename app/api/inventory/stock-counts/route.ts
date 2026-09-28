// ============================================================
// app/api/inventory/stock-counts/route.ts — Stock Counts Collection API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockCountService } from '@/lib/services/stock-count.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouse_id = searchParams.get('warehouse_id') || undefined;
    const status = searchParams.get('status') || undefined;

    const counts = await StockCountService.getStockCounts(session, { warehouse_id, status });
    return NextResponse.json({ counts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock counts' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const count = await StockCountService.createStockCount(session, body);
    return NextResponse.json(count, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create stock count' },
      { status: 500 }
    );
  }
}
