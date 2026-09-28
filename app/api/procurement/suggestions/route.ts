import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { ProcurementService } from '@/lib/services/procurement.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouse_id') || undefined;

    const suggestions = await ProcurementService.getProcurementSuggestions(session, warehouseId);
    return NextResponse.json({ data: suggestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
