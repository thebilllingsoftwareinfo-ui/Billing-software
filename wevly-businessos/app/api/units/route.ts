import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSessionOptional } from '@/lib/auth/session'
import { demoGetUnits } from '@/lib/services/demo-store'

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
