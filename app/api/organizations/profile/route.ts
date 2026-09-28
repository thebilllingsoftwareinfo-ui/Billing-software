import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApiSession } from '@/lib/auth/api-session'
import { demoGetOrganizationProfile, demoUpdateOrganizationProfile } from '@/lib/services/demo-store'
import { normalizeBusinessClassification } from '@/lib/validators/organization.schema'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      // In demo mode or public settings fetch, fallback to demo profile
      const demoData = demoGetOrganizationProfile()
      const demoCategoryCookie = request.cookies.get('demo_category')?.value
      const demoTypeCookie = request.cookies.get('demo_business_type')?.value
      if (demoCategoryCookie) {
        demoData.business_category = demoCategoryCookie
      }
      if (demoTypeCookie) {
        demoData.business_type = demoTypeCookie
      }
      const normalized = normalizeBusinessClassification(demoData.business_type, demoData.business_category)
      demoData.business_type = normalized.business_type
      demoData.business_category = normalized.business_category

      return NextResponse.json({
        success: true,
        data: demoData,
      })
    }

    if (session.is_demo || session.user_id?.includes('demo')) {
      const demoData = demoGetOrganizationProfile()
      const demoCategoryCookie = request.cookies.get('demo_category')?.value
      const demoTypeCookie = request.cookies.get('demo_business_type')?.value
      if (demoCategoryCookie) {
        demoData.business_category = demoCategoryCookie
      }
      if (demoTypeCookie) {
        demoData.business_type = demoTypeCookie
      }
      const normalized = normalizeBusinessClassification(demoData.business_type, demoData.business_category)
      demoData.business_type = normalized.business_type
      demoData.business_category = normalized.business_category

      return NextResponse.json({
        success: true,
        data: demoData,
      })
    }

    const supabase = await createClient()

    const { data: org, error } = await supabase
      .from('organizations')
      .select('*, organization_settings(*)')
      .eq('id', session.organization_id)
      .single()

    if (error || !org) {
      const demoData = demoGetOrganizationProfile()
      const demoCategoryCookie = request.cookies.get('demo_category')?.value
      const demoTypeCookie = request.cookies.get('demo_business_type')?.value
      if (demoCategoryCookie) {
        demoData.business_category = demoCategoryCookie
      }
      if (demoTypeCookie) {
        demoData.business_type = demoTypeCookie
      }
      const normalized = normalizeBusinessClassification(demoData.business_type, demoData.business_category)
      demoData.business_type = normalized.business_type
      demoData.business_category = normalized.business_category

      return NextResponse.json({
        success: true,
        data: demoData,
      })
    }

    const normalized = normalizeBusinessClassification(org.business_type, org.business_category)

    const profile = {
      id: org.id,
      name: org.name || 'Your Business Name',
      legal_name: org.legal_name || org.name,
      trade_name: org.trade_name || org.name,
      business_type: normalized.business_type,
      business_category: normalized.business_category,
      logo_url: org.logo_url || org.organization_settings?.[0]?.logo_url || null,
      signature_url: org.signature_url || org.organization_settings?.[0]?.signature_url || null,
      gstin: org.gstin || null,
      pan: org.pan || null,
      account_books_date: org.account_books_date || null,
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

    const normalized = normalizeBusinessClassification(body.business_type, body.business_category)
    const category = normalized.business_category
    const type = normalized.business_type

    // Always update demo store in development/demo mode
    const updatedDemo = demoUpdateOrganizationProfile({
      ...body,
      business_category: category,
      business_type: type,
    })

    if (session && !session.user_id.includes('demo')) {
      try {
        const supabase = await createClient()
        await supabase
          .from('organizations')
          .update({
            name: body.name,
            legal_name: body.legal_name || null,
            trade_name: body.trade_name || null,
            business_category: category,
            business_type: type,
            logo_url: body.logo_url || null,
            signature_url: body.signature_url || null,
            gstin: body.gstin || null,
            pan: body.pan || null,
            phone: body.phone || null,
            email: body.email || null,
            website: body.website || null,
            address: body.address_line1 || null,
            state: body.state || null,
            pincode: body.pincode || null,
            state_code: body.state_code || null,
            invoice_prefix: body.invoice_prefix || 'INV-',
            account_books_date: body.account_books_date || null,
          })
          .eq('id', session.organization_id)
      } catch (dbErr) {
        console.warn('[Organization Profile PUT API] Database update warning:', dbErr)
      }
    }

    // Invalidate the cache for the layout so the sidebar updates
    const { revalidatePath } = require('next/cache')
    revalidatePath('/', 'layout')

    const res = NextResponse.json({
      success: true,
      message: 'Business profile updated successfully',
      data: updatedDemo,
    })

    // Set cookie so server components immediately pick up the category change
    res.cookies.set('demo_category', category, {
      path: '/',
      maxAge: 30 * 86400,
      sameSite: 'lax',
    })

    res.cookies.set('demo_business_type', type, {
      path: '/',
      maxAge: 30 * 86400,
      sameSite: 'lax',
    })
    
    res.cookies.set('demo_org_name', body.name, {
      path: '/',
      maxAge: 30 * 86400,
      sameSite: 'lax',
    })

    return res
  } catch (err: any) {
    console.error('[Organization Profile PUT API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update business profile' },
      { status: 500 }
    )
  }
}
