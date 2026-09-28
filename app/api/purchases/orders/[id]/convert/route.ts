// ============================================================
// app/api/purchases/orders/[id]/convert/route.ts — Convert PO to Purchase Bill API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { PurchaseOrderService } from '@/lib/services/purchase-order.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await PurchaseOrderService.convertToPurchaseBill(session, id, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to convert purchase order to purchase bill' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
