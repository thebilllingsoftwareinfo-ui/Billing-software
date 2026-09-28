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
    const supplierId = searchParams.get('supplier_id');

    if (supplierId) {
      const supplierAging = await ArApIntelligenceService.getSupplierAging(session, supplierId);
      return NextResponse.json({ data: supplierAging });
    }

    const asOfDate = searchParams.get('as_of_date') || undefined;
    const apReport = await ArApIntelligenceService.getApAging(session, { as_of_date: asOfDate });
    return NextResponse.json({ data: apReport });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
