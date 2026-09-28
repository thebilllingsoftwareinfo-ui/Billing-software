import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { BankReconciliationService } from '@/lib/services/reconciliation.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id') || undefined;

    const list = await BankReconciliationService.getReconciliations(session, accountId);
    return NextResponse.json({ data: list });
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
    const created = await BankReconciliationService.createReconciliation(session, body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
