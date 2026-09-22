import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApiSession } from '@/lib/auth/api-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const supabase = await createClient()

    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', session.organization_id)

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,gstin.ilike.%${q}%`)
    }

    query = query.limit(limit)

    const { data: suppliers, error } = await query

    if (error || !suppliers || suppliers.length === 0) {
      // Return empty or fallback list
      return NextResponse.json({
        success: true,
        suppliers: suppliers || [],
      })
    }

    return NextResponse.json({
      success: true,
      suppliers,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch suppliers', suppliers: [] },
      { status: 200 }
    )
  }
}
