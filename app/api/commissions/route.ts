import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { SalespersonService } from '@/lib/services/salesperson.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const salespersonId = searchParams.get('salesperson_id') || undefined;
    const status = searchParams.get('status') || undefined;

    const commissions = await SalespersonService.getCommissions(session, {
      salesperson_id: salespersonId,
      status,
    });
    return NextResponse.json({ data: commissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
