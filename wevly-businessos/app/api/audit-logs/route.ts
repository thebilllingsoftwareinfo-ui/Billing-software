import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const data = await AuditService.getAuditLogs(session, {
      action,
      resourceType,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const status = err.message?.startsWith('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: 'AUDIT_LOG_ERROR', message: err.message }, { status });
  }
}
