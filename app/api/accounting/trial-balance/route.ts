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
    const asOfDate = searchParams.get('asOfDate') || undefined;

    const tb = await AccountingService.getTrialBalance(session, asOfDate);

    return NextResponse.json(tb);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate trial balance' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}
