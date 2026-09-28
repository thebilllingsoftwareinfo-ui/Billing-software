// ============================================================
// app/api/inventory/stock-counts/[id]/approve/route.ts — Approve Count API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockCountService } from '@/lib/services/stock-count.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const result = await StockCountService.approveStockCount(session, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve stock count' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}
