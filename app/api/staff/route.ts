import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { StaffService } from '@/lib/services/staff.service';

export async function GET() {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const members = await StaffService.getStaffMembers(session);
    return NextResponse.json({ success: true, data: members });
  } catch (err: any) {
    const status = err.message?.startsWith('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: 'STAFF_ERROR', message: err.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.email || !body.role) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Email and role are required' }, { status: 400 });
    }

    const member = await StaffService.inviteStaffMember(session, {
      email: body.email,
      role: body.role,
      full_name: body.full_name,
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.startsWith('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ error: 'STAFF_INVITE_ERROR', message: err.message }, { status });
  }
}
