// ============================================================
// app/api/inventory/serials/[id]/route.ts — Single Serial API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { SerialNumberService } from '@/lib/services/serial-number.service';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const updated = await SerialNumberService.updateSerialStatus(session, id, body.status, {
      sale_reference: body.sale_reference,
      purchase_reference: body.purchase_reference,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update serial' },
      { status: 500 }
    );
  }
}
