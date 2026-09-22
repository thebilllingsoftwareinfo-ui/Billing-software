import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSessionOptional } from '@/lib/auth/session'
import {
  demoGetUnits,
  demoAddUnit,
  demoUpdateUnit,
  demoDeleteUnit,
} from '@/lib/services/demo-store'

export async function GET() {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user_id.includes('demo')) {
      return NextResponse.json({
        success: true,
        data: demoGetUnits(),
      })
    }

    const supabase = await createClient()

    // Fetch system global units (organization_id IS NULL) + custom org units
    const { data: units, error } = await supabase
      .from('product_units')
      .select('*')
      .or(`organization_id.is.null,organization_id.eq.${session.organization_id}`)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({
        success: true,
        data: demoGetUnits(),
      })
    }

    return NextResponse.json({ success: true, data: units || [] })
  } catch (err) {
    console.error('[Units GET API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, short_name, symbol, code, decimals_allowed = true } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Unit Name is required' }, { status: 400 })
    }
    if (!short_name || !short_name.trim()) {
      return NextResponse.json({ success: false, error: 'Short Name / Symbol is required' }, { status: 400 })
    }

    if (session.user_id.includes('demo')) {
      const created = demoAddUnit({
        name: name.trim(),
        short_name: short_name.trim(),
        symbol: symbol?.trim() || short_name.trim().toLowerCase(),
        code: code?.trim() || short_name.trim().toUpperCase(),
        decimals_allowed: Boolean(decimals_allowed),
        organization_id: session.organization_id,
      })
      return NextResponse.json({ success: true, data: created })
    }

    const supabase = await createClient()
    const { data: unit, error } = await supabase
      .from('product_units')
      .insert({
        organization_id: session.organization_id,
        name: name.trim(),
        abbreviation: short_name.trim(),
        code: code?.trim() || short_name.trim().toUpperCase(),
      })
      .select()
      .single()

    if (error) {
      // Fallback to demo store if DB table lacks custom columns
      const created = demoAddUnit({
        name: name.trim(),
        short_name: short_name.trim(),
        symbol: symbol?.trim() || short_name.trim().toLowerCase(),
        code: code?.trim() || short_name.trim().toUpperCase(),
        decimals_allowed: Boolean(decimals_allowed),
        organization_id: session.organization_id,
      })
      return NextResponse.json({ success: true, data: created })
    }

    return NextResponse.json({ success: true, data: unit })
  } catch (err) {
    console.error('[Units POST API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, short_name, decimals_allowed, is_active } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Unit ID is required' }, { status: 400 })
    }

    if (session.user_id.includes('demo')) {
      const updated = demoUpdateUnit(id, {
        ...(name && { name }),
        ...(short_name && { short_name, abbreviation: short_name }),
        ...(decimals_allowed !== undefined && { decimals_allowed }),
        ...(is_active !== undefined && { is_active }),
      })
      return NextResponse.json({ success: true, data: updated })
    }

    const supabase = await createClient()
    const { data: unit, error } = await supabase
      .from('product_units')
      .update({
        ...(name && { name }),
        ...(short_name && { abbreviation: short_name }),
      })
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .select()
      .single()

    if (error) {
      const updated = demoUpdateUnit(id, { name, short_name, decimals_allowed, is_active })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: true, data: unit })
  } catch (err) {
    console.error('[Units PUT API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Unit ID is required' }, { status: 400 })
    }

    demoDeleteUnit(id)
    return NextResponse.json({ success: true, message: 'Unit status updated' })
  } catch (err) {
    console.error('[Units DELETE API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
