import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { ProfitabilityService } from '@/lib/services/profitability.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'summary'; // summary | products | customers | salespersons
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    if (view === 'products') {
      const products = await ProfitabilityService.getProductProfitability(session);
      return NextResponse.json({ data: products });
    } else if (view === 'customers') {
      const customers = await ProfitabilityService.getCustomerProfitability(session);
      return NextResponse.json({ data: customers });
    } else if (view === 'salespersons') {
      const salespersons = await ProfitabilityService.getSalespersonProfitability(session);
      return NextResponse.json({ data: salespersons });
    }

    const summary = await ProfitabilityService.getProfitabilitySummary(session, { from, to });
    return NextResponse.json({ data: summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
