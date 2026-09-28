import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/services/audit.service'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import {
  demoGetSupplier,
  demoUpdateSupplier,
  demoDeleteSupplier,
} from '@/lib/services/demo-store'
import { CrmService } from '@/lib/services/crm.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'suppliers.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const supabase = await createClient()

    // Try finding supplier with organization_id isolation
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (error || !supplier) {
      const demoSupp = demoGetSupplier(id)
      if (demoSupp) {
        return NextResponse.json({
          success: true,
          data: {
            supplier: demoSupp,
          },
        })
      }
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier,
      },
    })
  } catch (err) {
    console.error('[Supplier GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'suppliers.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to edit suppliers' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updatePayload.name = body.name
    if (body.display_name !== undefined) updatePayload.display_name = body.display_name
    if (body.email !== undefined) updatePayload.email = body.email || null
    if (body.phone !== undefined) updatePayload.phone = body.phone || null
    if (body.gstin !== undefined) updatePayload.gstin = body.gstin || null
    if (body.pan !== undefined) updatePayload.pan = body.pan || null
    if (body.state !== undefined) updatePayload.state = body.state || null
    if (body.state_code !== undefined) updatePayload.state_code = body.state_code || null
    if (body.billing_address !== undefined) updatePayload.billing_address = body.billing_address || null
    if (body.is_active !== undefined) updatePayload.is_active = Boolean(body.is_active)

    const { data: updated, error } = await supabase
      .from('suppliers')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .select()
      .single()

    if (error || !updated) {
      const demoUpdated = demoUpdateSupplier(id, updatePayload)
      if (demoUpdated) {
        return NextResponse.json({ success: true, data: demoUpdated })
      }
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    // Audit log
    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: 'updated',
      resource_type: 'supplier',
      resource_id: id,
      new_values: { name: updated.name || updated.display_name },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Supplier PATCH API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'suppliers.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to delete suppliers' }, { status: 403 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', session.organization_id)

    if (error) {
      const deleted = demoDeleteSupplier(id)
      if (!deleted) {
        return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
      }
    }

    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: 'deleted',
      resource_type: 'supplier',
      resource_id: id,
      new_values: { is_active: false },
    })

    return NextResponse.json({ success: true, message: 'Supplier deactivated successfully' })
  } catch (err) {
    console.error('[Supplier DELETE API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
