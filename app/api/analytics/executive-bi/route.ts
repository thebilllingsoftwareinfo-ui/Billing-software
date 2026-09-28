import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { BiDashboardService } from '@/lib/services/bi-dashboard.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = await BiDashboardService.getBiMetrics(session);
    return NextResponse.json({ data: metrics });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
