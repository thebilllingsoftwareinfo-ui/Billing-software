import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { CrmService } from '@/lib/services/crm.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type') as 'customer' | 'supplier' | undefined
    const entityId = searchParams.get('entity_id') || undefined
    const status = searchParams.get('status') || undefined
    const overdueOnly = searchParams.get('overdue_only') === 'true'

    const followups = await CrmService.getFollowUps(session, {
      entityType: entityType || undefined,
      entityId,
      status,
      overdueOnly,
    })

    return NextResponse.json({ success: true, data: followups })
  } catch (error: any) {
    console.error('[CRM FollowUps GET] Error:', error?.message)
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
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
    const followup = await CrmService.createFollowUp(session, body)
    return NextResponse.json({ success: true, data: followup }, { status: 201 })
  } catch (error: any) {
    console.error('[CRM FollowUps POST] Error:', error?.message)
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
    if (error?.name === 'ZodError' || error?.issues) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues || error.flatten?.() },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Follow-up ID is required' }, { status: 400 })
    }

    const followup = await CrmService.updateFollowUp(session, id, data)
    return NextResponse.json({ success: true, data: followup })
  } catch (error: any) {
    console.error('[CRM FollowUps PATCH] Error:', error?.message)
    if (error?.message === 'Follow-up not found') {
      return NextResponse.json({ success: false, error: 'Follow-up not found' }, { status: 404 })
    }
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Follow-up ID is required' }, { status: 400 })
    }

    await CrmService.deleteFollowUp(session, id)
    return NextResponse.json({ success: true, message: 'Follow-up deleted' })
  } catch (error: any) {
    console.error('[CRM FollowUps DELETE] Error:', error?.message)
    if (error?.message === 'Follow-up not found') {
      return NextResponse.json({ success: false, error: 'Follow-up not found' }, { status: 404 })
    }
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
