// ============================================================
// app/api/inventory/stock-counts/[id]/route.ts — Single Stock Count API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockCountService } from '@/lib/services/stock-count.service';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const result = await StockCountService.updateCountItems(session, id, body.items || []);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update stock count' },
      { status: 500 }
    );
  }
}
