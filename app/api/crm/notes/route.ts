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
    const entityType = searchParams.get('entity_type') as 'customer' | 'supplier'
    const entityId = searchParams.get('entity_id')

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entity_type and entity_id are required' },
        { status: 400 }
      )
    }

    const notes = await CrmService.getNotes(session, entityType, entityId)
    return NextResponse.json({ success: true, data: notes })
  } catch (error: any) {
    console.error('[CRM Notes GET] Error:', error?.message)
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
    const note = await CrmService.createNote(session, body)
    return NextResponse.json({ success: true, data: note }, { status: 201 })
  } catch (error: any) {
    console.error('[CRM Notes POST] Error:', error?.message)
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
      return NextResponse.json({ success: false, error: 'Note ID is required' }, { status: 400 })
    }

    const note = await CrmService.updateNote(session, id, data)
    return NextResponse.json({ success: true, data: note })
  } catch (error: any) {
    console.error('[CRM Notes PATCH] Error:', error?.message)
    if (error?.message === 'Note not found') {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
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
      return NextResponse.json({ success: false, error: 'Note ID is required' }, { status: 400 })
    }

    await CrmService.deleteNote(session, id)
    return NextResponse.json({ success: true, message: 'Note deleted' })
  } catch (error: any) {
    console.error('[CRM Notes DELETE] Error:', error?.message)
    if (error?.message === 'Note not found') {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
    }
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
