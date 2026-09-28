// ============================================================
// app/api/inventory/serials/[id]/transfer/route.ts — Transfer Serial API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { SerialNumberService } from '@/lib/services/serial-number.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { destination_warehouse_id } = await req.json();
    if (!destination_warehouse_id) {
      return NextResponse.json({ error: 'destination_warehouse_id is required' }, { status: 400 });
    }

    const updated = await SerialNumberService.transferSerial(session, id, destination_warehouse_id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to transfer serial' },
      { status: 500 }
    );
  }
}
