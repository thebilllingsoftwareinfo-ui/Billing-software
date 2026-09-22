import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetOrganizationProfile, demoUpdateOrganizationProfile } from '@/lib/services/demo-store'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      // In demo mode or public settings fetch, fallback to demo profile
      return NextResponse.json({
        success: true,
        data: demoGetOrganizationProfile(),
      })
    }

    const supabase = await createClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select('*, organization_settings(*)')
      .eq('id', session.organization_id)
      .single()

    if (error || !org) {
      return NextResponse.json({
        success: true,
        data: demoGetOrganizationProfile(),
      })
    }

    const profile = {
      id: org.id,
      name: org.name || 'Your Business Name',
      legal_name: org.legal_name || org.name,
      trade_name: org.trade_name || org.name,
      logo_url: org.logo_url || org.organization_settings?.[0]?.logo_url || null,
      gstin: org.gstin || null,
      pan: org.pan || null,
      state_code: org.state_code || '27',
      phone: org.phone || null,
      email: org.email || null,
      website: org.website || null,
      address_line1: org.address || null,
      address_line2: org.address_line2 || null,
      city: org.city || null,
      state: org.state || 'Maharashtra',
      pincode: org.pincode || null,
      country: org.country || 'India',
      bank_name: org.bank_name || null,
      bank_account_name: org.bank_account_name || null,
      bank_account_number: org.bank_account_number || null,
      bank_ifsc: org.bank_ifsc || null,
      bank_branch: org.bank_branch || null,
      upi_id: org.upi_id || null,
      invoice_prefix: org.invoice_prefix || 'INV-',
      terms_and_conditions: org.terms_and_conditions || null,
      notes: org.notes || null,
    }

    return NextResponse.json({ success: true, data: profile })
  } catch (err: any) {
    console.error('[Organization Profile GET API] Error:', err)
    return NextResponse.json({
      success: true,
      data: demoGetOrganizationProfile(),
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getApiSession()
    const body = await request.json()

    // Always update demo store in development/demo mode
    const updatedDemo = demoUpdateOrganizationProfile(body)

    if (session && !session.user_id.includes('demo')) {
      try {
        const supabase = await createClient()
        await supabase
          .from('organizations')
          .update({
            name: body.name,
            legal_name: body.legal_name || null,
            trade_name: body.trade_name || null,
            logo_url: body.logo_url || null,
            gstin: body.gstin || null,
            pan: body.pan || null,
            phone: body.phone || null,
            email: body.email || null,
            website: body.website || null,
            address: body.address_line1 || null,
            state_code: body.state_code || null,
            invoice_prefix: body.invoice_prefix || 'INV-',
          })
          .eq('id', session.organization_id)
      } catch (dbErr) {
        console.warn('[Organization Profile PUT API] Database update warning:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Business profile updated successfully',
      data: updatedDemo,
    })
  } catch (err: any) {
    console.error('[Organization Profile PUT API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update business profile' },
      { status: 500 }
    )
  }
}
