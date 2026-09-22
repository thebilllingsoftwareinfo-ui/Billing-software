import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification.service'
import { getApiSession } from '@/lib/auth/api-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Dynamically evaluate system alerts before returning
    try {
      await NotificationService.generateSystemAlerts(session as any)
    } catch {
      // Ignore in demo
    }

    try {
      const notifications = await NotificationService.getNotifications(session as any, { unreadOnly, limit })
      const unreadCount = await NotificationService.getUnreadCount(session as any)

      return NextResponse.json({
        success: true,
        data: notifications || [],
        notifications: notifications || [],
        unread_count: unreadCount || 0,
      })
    } catch {
      return NextResponse.json({
        success: true,
        data: [],
        notifications: [],
        unread_count: 0,
      })
    }
  } catch (err) {
    console.error('[Notifications API Error]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, message, entity_type, entity_id, action_url } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title, message' },
        { status: 400 }
      )
    }

    const newNotification = await NotificationService.createNotification(session as any, {
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
    })

    return NextResponse.json({
      success: true,
      data: newNotification,
    })
  } catch (err) {
    console.error('[Create Notification API Error]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
