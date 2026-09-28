import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { AccountingService } from '@/lib/services/accounting.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const account_id = searchParams.get('account_id');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!account_id) {
      return NextResponse.json({ error: 'account_id query parameter is required' }, { status: 400 });
    }

    const ledger = await AccountingService.getGeneralLedger(session, account_id, {
      startDate,
      endDate,
    });

    return NextResponse.json(ledger);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load general ledger' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}
