// ============================================================
// app/api/purchases/orders/[id]/route.ts — Purchase Order Detail & Delete API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { PurchaseOrderService } from '@/lib/services/purchase-order.service';

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
    const po = await PurchaseOrderService.getPurchaseOrder(session, id);

    return NextResponse.json(po);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get purchase order' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await PurchaseOrderService.deletePurchaseOrder(session, id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete purchase order' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
