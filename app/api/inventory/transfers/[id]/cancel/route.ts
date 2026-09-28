// ============================================================
// app/api/inventory/transfers/[id]/cancel/route.ts — Cancel Transfer API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockTransferService } from '@/lib/services/stock-transfer.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const result = await StockTransferService.cancelTransfer(session, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel stock transfer' },
      { status: error.message?.includes('Cannot cancel') ? 400 : 500 }
    );
  }
}
