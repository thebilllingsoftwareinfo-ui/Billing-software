import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateInvoiceService } from '@/lib/services/invoice.service'
import { createInvoiceSchema } from '@/lib/validators/invoice.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetInvoice, demoUpdateInvoice, demoDeleteInvoice, demoGetOrganizationProfile } from '@/lib/services/demo-store'

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

    if (!can(session.role, 'invoices.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const supabase = await createClient()

    // Fetch invoice with items, customer details, tax breakdown, and payments
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `*,
        customers(*),
        invoice_items(*),
        invoice_taxes(*)`
      )
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (error || !invoice) {
      const demoInv = demoGetInvoice(id)
      if (demoInv) {
        return NextResponse.json({
          success: true,
          data: demoInv,
        })
      }
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch organization info for document template/preview header
    let organizationData: any = null
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', session.organization_id)
      .single()

    if (organization) {
      organizationData = organization
    } else {
      organizationData = demoGetOrganizationProfile()
    }

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        organization: organizationData,
      },
    })
  } catch (err) {
    console.error('[Invoice GET Details API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'invoices.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to edit invoices' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createInvoiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (session.user_id.includes('demo')) {
      const updated = demoUpdateInvoice(id, parsed.data)
      return NextResponse.json({
        success: true,
        data: updated || { id, ...parsed.data },
      })
    }

    try {
      const updated = await updateInvoiceService(session.organization_id, session.user_id, id, parsed.data)
      return NextResponse.json({ success: true, data: updated })
    } catch (serviceErr: any) {
      const updated = demoUpdateInvoice(id, parsed.data)
      return NextResponse.json({
        success: true,
        data: updated || { id, ...parsed.data },
      })
    }
  } catch (err: any) {
    console.error('[Invoice PUT API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update draft invoice' },
      { status: 400 }
    )
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

    if (!can(session.role, 'invoices.delete')) {
      return NextResponse.json({ success: false, error: 'Permission denied to delete invoices' }, { status: 403 })
    }

    const supabase = await createClient()

    // Only allow deletion if status is draft
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (!invoice) {
      const deleted = demoDeleteInvoice(id)
      if (deleted) {
        return NextResponse.json({ success: true, message: 'Draft invoice deleted (demo)' })
      }
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: `Cannot delete invoice in '${invoice.status}' status. Only DRAFT invoices can be deleted.` },
        { status: 400 }
      )
    }

    const { error: delErr } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('organization_id', session.organization_id)

    if (delErr) {
      return NextResponse.json({ success: false, error: 'Failed to delete draft invoice' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Draft invoice deleted successfully' })
  } catch (err) {
    console.error('[Invoice DELETE API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
