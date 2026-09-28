// ============================================================
// app/api/inventory/serials/route.ts — Serial Numbers Collection API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { SerialNumberService } from '@/lib/services/serial-number.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id') || undefined;
    const warehouse_id = searchParams.get('warehouse_id') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const search = searchParams.get('search') || undefined;

    const serials = await SerialNumberService.getSerials(session, {
      product_id,
      warehouse_id,
      status,
      search,
    });
    return NextResponse.json({ serials });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch serial numbers' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (Array.isArray(body.serial_numbers)) {
      const serials = await SerialNumberService.bulkCreateSerials(session, body);
      return NextResponse.json({ serials }, { status: 201 });
    } else {
      const serial = await SerialNumberService.createSerial(session, body);
      return NextResponse.json(serial, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to register serial number' },
      { status: error.message?.includes('SERIAL_EXISTS') ? 400 : 500 }
    );
  }
}
