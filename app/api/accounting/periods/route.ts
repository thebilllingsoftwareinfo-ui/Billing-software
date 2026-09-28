import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { FinancialPeriodService } from '@/lib/services/financial-period.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get('fiscal_year') || undefined;

    const periods = await FinancialPeriodService.getPeriods(session, fiscalYear);
    return NextResponse.json({ data: periods });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const created = await FinancialPeriodService.createPeriod(session, body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
