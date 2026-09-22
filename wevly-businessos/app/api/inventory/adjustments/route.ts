import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processStockAdjustment } from '@/lib/services/inventory.service'
import { stockAdjustmentSchema } from '@/lib/validators/inventory.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'inventory.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: adjustments, error } = await supabase
      .from('stock_adjustments')
      .select('*')
      .eq('organization_id', session.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      if (session.user_id.includes('demo')) {
        return NextResponse.json({ success: true, data: [] })
      }
      return NextResponse.json({ success: false, error: 'Failed to fetch adjustments' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: adjustments || [] })
  } catch (err) {
    console.error('[Stock Adjustments GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'inventory.adjust')) {
      return NextResponse.json({ success: false, error: 'Permission denied to perform stock adjustments' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = stockAdjustmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid stock adjustment data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (session.user_id.includes('demo')) {
      return NextResponse.json({
        success: true,
        data: {
          id: `adj-demo-${Date.now()}`,
          reason: parsed.data.reason,
          notes: parsed.data.notes,
          items: parsed.data.items,
        },
      })
    }

    const result = await processStockAdjustment({
      organization_id: session.organization_id,
      user_id: session.user_id,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
      items: parsed.data.items,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error('[Stock Adjustments POST API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process stock adjustment' },
      { status: 400 }
    )
  }
}
