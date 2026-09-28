// ============================================================
// app/api/inventory/reservations/route.ts — Stock Reservations API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockReservationService } from '@/lib/services/stock-reservation.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id') || undefined;
    const warehouse_id = searchParams.get('warehouse_id') || undefined;
    const status = searchParams.get('status') || undefined;

    const reservations = await StockReservationService.getReservations(session, {
      product_id,
      warehouse_id,
      status,
    });
    return NextResponse.json({ reservations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservations' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const reservation = await StockReservationService.reserveStock(session, body);
    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reserve stock' },
      { status: error.message?.includes('INSUFFICIENT_AVAILABLE_STOCK') ? 400 : 500 }
    );
  }
}
