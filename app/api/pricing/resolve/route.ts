import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { PricingService } from '@/lib/services/pricing.service';
import { priceResolutionQuerySchema } from '@/lib/validators/pricing.schema';

export async function POST(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const query = priceResolutionQuerySchema.parse(body);

    const resolved = await PricingService.resolvePrice(session, {
      product_id: query.product_id,
      customer_id: query.customer_id,
      quantity: query.quantity,
      unit: query.unit,
      date: query.date,
    });

    return NextResponse.json({ data: resolved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
