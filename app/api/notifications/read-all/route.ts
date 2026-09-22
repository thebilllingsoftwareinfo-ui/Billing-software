import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification.service'
import { getApiSession } from '@/lib/auth/api-session'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const result = await NotificationService.markAllAsRead(session as any)
      return NextResponse.json({ success: true, data: result })
    } catch {
      return NextResponse.json({ success: true, data: { count: 0 } })
    }
  } catch (err) {
    console.error('[Mark All Read API Error]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
