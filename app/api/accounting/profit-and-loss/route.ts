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
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const pnl = await AccountingService.getProfitAndLoss(session, {
      startDate,
      endDate,
    });

    return NextResponse.json(pnl);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate profit and loss statement' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}
