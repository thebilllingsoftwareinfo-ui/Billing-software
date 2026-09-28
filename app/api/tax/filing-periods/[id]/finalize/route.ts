import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { TaxComplianceService } from '@/lib/services/tax-compliance.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const finalized = await TaxComplianceService.finalizeTaxPeriod(
      session,
      id,
      body.notes
    );

    return NextResponse.json({ data: finalized });
  } catch (error: any) {
    const status = error.message?.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
