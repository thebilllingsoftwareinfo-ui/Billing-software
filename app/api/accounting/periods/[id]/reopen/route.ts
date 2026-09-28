import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { FinancialPeriodService } from '@/lib/services/financial-period.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!body.reason) {
      return NextResponse.json({ error: 'Reopening reason is required' }, { status: 400 });
    }

    const reopened = await FinancialPeriodService.reopenPeriod(
      session,
      id,
      body.reason
    );

    return NextResponse.json({ data: reopened });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
