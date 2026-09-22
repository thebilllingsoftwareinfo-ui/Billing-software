import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { StaffService } from '@/lib/services/staff.service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { action, role, status } = body;

    if (action === 'update_role') {
      if (!role) {
        return NextResponse.json({ error: 'Role is required' }, { status: 400 });
      }
      const updated = await StaffService.updateStaffRole(session, id, role);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }
      const updated = await StaffService.updateStaffStatus(session, id, status);
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (err: any) {
    const status = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: 'STAFF_UPDATE_ERROR', message: err.message }, { status });
  }
}
