// ============================================================
// app/api/sales/orders/[id]/status/route.ts — Sales Order Status API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { SalesOrderService } from '@/lib/services/sales-order.service';

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
    const result = await SalesOrderService.updateSalesOrderStatus(session, id, status);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update sales order status' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
