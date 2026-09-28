// ============================================================
// app/api/sales/orders/[id]/route.ts — Sales Order Detail & Delete API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { SalesOrderService } from '@/lib/services/sales-order.service';

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
    const order = await SalesOrderService.getSalesOrder(session, id);

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get sales order' },
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
    const result = await SalesOrderService.deleteSalesOrder(session, id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete sales order' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
