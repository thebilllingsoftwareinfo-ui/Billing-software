// ============================================================
// app/api/inventory/reservations/[id]/release/route.ts — Release Reservation API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { StockReservationService } from '@/lib/services/stock-reservation.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const result = await StockReservationService.releaseReservation(session, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to release reservation' },
      { status: 500 }
    );
  }
}
