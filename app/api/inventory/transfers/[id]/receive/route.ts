// ============================================================
// app/api/inventory/transfers/[id]/receive/route.ts — Receive Transfer API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockTransferService } from '@/lib/services/stock-transfer.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const result = await StockTransferService.receiveTransfer(session, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to receive stock transfer' },
      { status: error.message?.includes('already been') ? 400 : 500 }
    );
  }
}
