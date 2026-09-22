import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/services/audit.service'
import { customerSchema } from '@/lib/validators/customer.schema'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetCustomer, demoUpdateCustomer, demoDeleteCustomer } from '@/lib/services/demo-store'

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

    if (!can(session.role, 'customers.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const supabase = await createClient()

    // Fetch customer record with addresses
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, customer_addresses(*)')
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (customerError || !customer) {
      const demoCust = demoGetCustomer(id)
      if (demoCust) {
        return NextResponse.json({
          success: true,
          data: {
            customer: demoCust,
            summary: {
              totalSales: 45000,
              paidAmount: 30500,
              outstanding: demoCust.outstanding_balance || 0,
              creditLimit: demoCust.credit_limit || 0,
            },
            invoices: [],
            payments: [],
            quotations: [],
            transactions: [],
          },
        })
      }
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    // Fetch invoices for customer
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', id)
      .eq('organization_id', session.organization_id)
      .order('invoice_date', { ascending: false })

    // Fetch payments for customer
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('party_type', 'customer')
      .eq('party_id', id)
      .eq('organization_id', session.organization_id)
      .order('payment_date', { ascending: false })

    // Fetch quotations for customer
    const { data: quotations } = await supabase
      .from('quotations')
      .select('*')
      .eq('customer_id', id)
      .eq('organization_id', session.organization_id)
      .order('quotation_date', { ascending: false })

    // Fetch transaction ledger
    const { data: transactions } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', id)
      .eq('organization_id', session.organization_id)
      .order('transaction_date', { ascending: false })

    // Calculate financial summary totals
    const totalSales = invoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0
    const paidAmount = invoices?.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0) || 0
    const outstanding = Number(customer.outstanding_balance) || (totalSales - paidAmount)

    return NextResponse.json({
      success: true,
      data: {
        customer,
        summary: {
          totalSales,
          paidAmount,
          outstanding,
          creditLimit: Number(customer.credit_limit) || 0,
        },
        invoices: invoices || [],
        payments: payments || [],
        quotations: quotations || [],
        transactions: transactions || [],
      },
    })
  } catch (err) {
    console.error('[Customer Detail GET API] Error:', err)
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

    if (!can(session.role, 'customers.edit')) {
      return NextResponse.json({ success: false, error: 'Permission denied to edit customers' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = customerSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const v = parsed.data
    const supabase = await createClient()

    // Update customer core fields
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        ...(v.display_name && { display_name: v.display_name }),
        ...(v.legal_name !== undefined && { legal_name: v.legal_name || null }),
        ...(v.customer_type && { customer_type: v.customer_type }),
        ...(v.email !== undefined && { email: v.email || null }),
        ...(v.phone !== undefined && { phone: v.phone || null }),
        ...(v.mobile !== undefined && { mobile: v.mobile || null }),
        ...(v.gstin !== undefined && { gstin: v.gstin || null, is_gst_registered: Boolean(v.gstin) }),
        ...(v.pan !== undefined && { pan: v.pan || null }),
        ...(v.place_of_supply !== undefined && { place_of_supply: v.place_of_supply || null }),
        ...(v.credit_period_days !== undefined && { credit_period_days: v.credit_period_days }),
        ...(v.credit_limit !== undefined && { credit_limit: v.credit_limit }),
        ...(v.notes !== undefined && { notes: v.notes || null }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .select()
      .single()

    if (updateError || !updatedCustomer) {
      const demoUpdated = demoUpdateCustomer(id, v)
      if (demoUpdated) {
        return NextResponse.json({ success: true, data: demoUpdated })
      }
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    // Upsert addresses if provided
    if (v.billing_address && v.billing_address.line1) {
      await supabase.from('customer_addresses').upsert({
        organization_id: session.organization_id,
        customer_id: id,
        address_type: 'billing',
        is_default: true,
        line1: v.billing_address.line1,
        line2: v.billing_address.line2 || null,
        city: v.billing_address.city,
        state: v.billing_address.state,
        state_code: v.billing_address.state_code || null,
        pincode: v.billing_address.pincode || null,
        country: v.billing_address.country || 'India',
      }, { onConflict: 'customer_id, address_type' })
    }

    if (v.shipping_address && v.shipping_address.line1) {
      await supabase.from('customer_addresses').upsert({
        organization_id: session.organization_id,
        customer_id: id,
        address_type: 'shipping',
        is_default: true,
        line1: v.shipping_address.line1,
        line2: v.shipping_address.line2 || null,
        city: v.shipping_address.city,
        state: v.shipping_address.state,
        state_code: v.shipping_address.state_code || null,
        pincode: v.shipping_address.pincode || null,
        country: v.shipping_address.country || 'India',
      }, { onConflict: 'customer_id, address_type' })
    }

    // Audit log
    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: 'updated',
      resource_type: 'customer',
      resource_id: id,
      new_values: { name: updatedCustomer.display_name },
    })

    return NextResponse.json({ success: true, data: updatedCustomer })
  } catch (err) {
    console.error('[Customer PATCH API] Error:', err)
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

    if (!can(session.role, 'customers.delete')) {
      return NextResponse.json({ success: false, error: 'Permission denied to archive customer' }, { status: 403 })
    }

    const supabase = await createClient()

    // Check if customer exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id, is_active, display_name')
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    if (!existing) {
      const demoRes = demoDeleteCustomer(id)
      if (demoRes) {
        return NextResponse.json({
          success: true,
          message: demoRes.is_active ? 'Customer unarchived successfully (demo)' : 'Customer archived successfully (demo)',
        })
      }
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    // Toggle active state / archive
    const nextActiveState = !existing.is_active
    const { error: archiveError } = await supabase
      .from('customers')
      .update({
        is_active: nextActiveState,
        archived_at: nextActiveState ? null : new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', session.organization_id)

    if (archiveError) {
      return NextResponse.json({ success: false, error: 'Failed to toggle customer status' }, { status: 500 })
    }

    // Audit Log
    await logAudit({
      organization_id: session.organization_id,
      user_id: session.user_id,
      action: nextActiveState ? 'updated' : 'archived',
      resource_type: 'customer',
      resource_id: id,
      new_values: { is_active: nextActiveState },
    })

    return NextResponse.json({
      success: true,
      message: nextActiveState ? 'Customer unarchived successfully' : 'Customer archived successfully',
    })
  } catch (err) {
    console.error('[Customer DELETE API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
