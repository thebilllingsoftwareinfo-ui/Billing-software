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
    const account_type = searchParams.get('account_type') || undefined;
    const search = searchParams.get('search') || undefined;
    const is_active_str = searchParams.get('is_active');
    const is_active = is_active_str !== null ? is_active_str === 'true' : undefined;

    const accounts = await AccountingService.getAccounts(session, {
      account_type,
      search,
      is_active,
    });

    return NextResponse.json({ accounts, total: accounts.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list accounts' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const account = await AccountingService.createAccount(session, body);

    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
