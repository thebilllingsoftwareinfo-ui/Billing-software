import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { ArApIntelligenceService } from '@/lib/services/ar-ap-intelligence.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');

    if (customerId) {
      const customerAging = await ArApIntelligenceService.getCustomerAging(session, customerId);
      return NextResponse.json({ data: customerAging });
    }

    const asOfDate = searchParams.get('as_of_date') || undefined;
    const arReport = await ArApIntelligenceService.getArAging(session, { as_of_date: asOfDate });
    return NextResponse.json({ data: arReport });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
