// ============================================================
// app/api/sales/delivery-challans/[id]/status/route.ts — Delivery Challan Status API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { DeliveryChallanService } from '@/lib/services/delivery-challan.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();
    const result = await DeliveryChallanService.updateDeliveryChallanStatus(session, id, status);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update delivery challan status' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
