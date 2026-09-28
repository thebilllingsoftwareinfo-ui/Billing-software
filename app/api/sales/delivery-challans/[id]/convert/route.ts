// ============================================================
// app/api/sales/delivery-challans/[id]/convert/route.ts — Convert Challan to Invoice API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { DeliveryChallanService } from '@/lib/services/delivery-challan.service';

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
    const result = await DeliveryChallanService.convertToInvoice(session, id);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to convert delivery challan to invoice' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
