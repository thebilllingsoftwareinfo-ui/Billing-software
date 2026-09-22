import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification.service'
import { getApiSession } from '@/lib/auth/api-session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const notificationId = resolvedParams.id

    try {
      const updated = await NotificationService.markAsRead(session as any, notificationId)
      return NextResponse.json({
        success: true,
        data: updated || { id: notificationId, is_read: true },
      })
    } catch {
      return NextResponse.json({
        success: true,
        data: { id: notificationId, is_read: true },
      })
    }
  } catch (err) {
    console.error('[Mark Read API Error]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
