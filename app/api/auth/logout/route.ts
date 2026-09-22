import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { AuditService } from '@/lib/services/audit.service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getAppSession();

    if (session) {
      // Log Audit Event
      await AuditService.log({
        organization_id: session.organization.id,
        user_id: session.user.id,
        action: 'logout',
        resource_type: 'organization_member',
        resource_id: session.user.id,
        details: { email: session.user.email, timestamp: new Date().toISOString() },
      });
    }

    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'LOGOUT_ERROR', message: err.message }, { status: 500 });
  }
}
