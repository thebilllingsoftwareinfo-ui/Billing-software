// ============================================================
// app/api/inventory/batches/expiring/route.ts — Expiring Batches API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { BatchService } from '@/lib/services/batch.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const alerts = await BatchService.getExpiringBatches(session, days);
    return NextResponse.json({ alerts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expiring batches' },
      { status: 500 }
    );
  }
}
