// ============================================================
// app/api/inventory/batches/route.ts — Batches API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { BatchService } from '@/lib/services/batch.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id') || undefined;
    const warehouse_id = searchParams.get('warehouse_id') || undefined;
    const search = searchParams.get('search') || undefined;
    const is_active = searchParams.get('is_active') === 'true' ? true : undefined;

    const batches = await BatchService.getBatches(session, {
      product_id,
      warehouse_id,
      is_active,
      search,
    });
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch batches' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const batch = await BatchService.createBatch(session, body);
    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create batch' },
      { status: error.message?.includes('already exists') ? 400 : 500 }
    );
  }
}
