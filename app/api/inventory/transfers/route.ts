// ============================================================
// app/api/inventory/transfers/route.ts — Stock Transfers Collection API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockTransferService } from '@/lib/services/stock-transfer.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const source_warehouse_id = searchParams.get('source_warehouse_id') || undefined;
    const destination_warehouse_id = searchParams.get('destination_warehouse_id') || undefined;

    const transfers = await StockTransferService.getStockTransfers(session, {
      status,
      source_warehouse_id,
      destination_warehouse_id,
    });
    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock transfers' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const transfer = await StockTransferService.createStockTransfer(session, body);
    return NextResponse.json(transfer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create stock transfer' },
      { status: error.message?.includes('TRANSFER_QUANTITY_EXCEEDED') ? 400 : 500 }
    );
  }
}
