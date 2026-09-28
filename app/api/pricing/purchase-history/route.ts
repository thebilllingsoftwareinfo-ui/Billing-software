import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { SupplierPricingService } from '@/lib/services/supplier-pricing.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('product_id') || undefined;
    const supplierId = searchParams.get('supplier_id') || undefined;

    const history = await SupplierPricingService.getPriceHistory(session, productId, supplierId);
    return NextResponse.json({ data: history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
