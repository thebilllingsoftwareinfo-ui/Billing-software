// ============================================================
// app/api/sales/delivery-challans/[id]/route.ts — Delivery Challan Detail API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { DeliveryChallanService } from '@/lib/services/delivery-challan.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const dc = await DeliveryChallanService.getDeliveryChallan(session, id);

    return NextResponse.json(dc);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get delivery challan' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : error.message?.includes('not found') ? 404 : 500 }
    );
  }
}
