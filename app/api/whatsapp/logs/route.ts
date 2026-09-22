import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { getApiSession } from '@/lib/auth/api-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const sessionObj = {
      user: { id: session.user_id, email: 'demo@acmeindustrial.com' },
      organization: { id: session.organization_id },
      member: { role: session.role },
    } as any

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    try {
      const logs = await WhatsAppService.getMessageLogs(sessionObj, limit)
      return NextResponse.json({
        success: true,
        data: logs,
      })
    } catch {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }
  } catch (err: any) {
    console.error('[WhatsApp Logs API Error]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
