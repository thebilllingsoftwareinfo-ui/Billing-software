import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { BankReconciliationService } from '@/lib/services/reconciliation.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const rec = await BankReconciliationService.getReconciliationById(session, id);
    if (!rec) {
      return NextResponse.json({ error: 'Reconciliation session not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rec });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
