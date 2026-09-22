import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/services/audit.service'
import { organizationSetupSchema } from '@/lib/validators/organization.schema'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // ── Step 1: Validate session ─────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // ── Step 2: Validate input ───────────────────────────
    const body = await request.json()
    const parsed = organizationSetupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const values = parsed.data

    // ── Step 3: Check user doesn't already have an org ───
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'You already have an organization.' },
        { status: 409 },
      )
    }

    // ── Step 4: Create organization ──────────────────────
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: values.name,
        gstin: values.gstin || null,
        pan: values.pan || null,
        state_code: values.state_code || null,
        address: values.address || null,
        invoice_prefix: values.invoice_prefix,
        financial_year_start: values.financial_year_start,
        business_category: values.business_category,
      })
      .select()
      .single()

    if (orgError || !org) {
      console.error('[Setup API] Failed to create org:', orgError)
      return NextResponse.json(
        { success: false, error: 'Failed to create organization.' },
        { status: 500 },
      )
    }

    // ── Step 5: Create owner membership ─────────────────
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      })

    if (memberError) {
      // Rollback org creation
      await supabase.from('organizations').delete().eq('id', org.id)
      console.error('[Setup API] Failed to create member:', memberError)
      return NextResponse.json(
        { success: false, error: 'Failed to set up membership.' },
        { status: 500 },
      )
    }

    // ── Step 6: Create default settings ─────────────────
    await supabase.from('organization_settings').insert({
      organization_id: org.id,
    })

    // ── Step 7: Audit log ────────────────────────────────
    await logAudit({
      organization_id: org.id,
      user_id: user.id,
      action: 'created',
      resource_type: 'organization',
      resource_id: org.id,
      new_values: { name: org.name, gstin: org.gstin },
    })

    return NextResponse.json({ success: true, data: { organization_id: org.id } })
  } catch (err) {
    console.error('[Setup API] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    )
  }
}
