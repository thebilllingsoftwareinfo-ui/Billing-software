import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ExpenseService } from '@/lib/services/expense.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const summary = await ExpenseService.getExpenseSummaries(session, startDate, endDate);

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expense summaries' },
      { status: 500 }
    );
  }
}
