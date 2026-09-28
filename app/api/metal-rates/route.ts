import { NextResponse } from 'next/server'
import { demoGetMetalRates, demoUpdateMetalRate } from '@/lib/services/demo-store'
import { createClient } from '@/lib/supabase/server'
import { getServerSessionOptional } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getServerSessionOptional()

    if (session && !session.user_id.includes('demo')) {
      const supabase = await createClient()
      const { data: dbRates, error } = await supabase
        .from('metal_rates')
        .select('metal_type, rate_per_gram')
        .eq('organization_id', session.organization_id)

      if (!error && dbRates) {
        const ratesObj: Record<string, number> = {}
        dbRates.forEach(r => {
          ratesObj[r.metal_type] = Number(r.rate_per_gram)
        })
        return NextResponse.json({ success: true, data: ratesObj })
      }
    }

    // Fallback to demo store if demo user or db fails
    const rates = demoGetMetalRates()
    return NextResponse.json({ success: true, data: rates })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSessionOptional()
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { rates } = body // e.g. { rates: { gold_24k: 15500, silver: 95 } }

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid rates data' }, { status: 400 })
    }

    if (!session.user_id.includes('demo')) {
      const supabase = await createClient()
      
      const upsertData = Object.entries(rates).map(([metal_type, rate]) => ({
        organization_id: session.organization_id,
        metal_type,
        rate_per_gram: typeof rate === 'number' ? rate : 0,
        updated_at: new Date().toISOString()
      }))
      
      if (upsertData.length > 0) {
        const { error } = await supabase
          .from('metal_rates')
          .upsert(upsertData, { onConflict: 'organization_id, metal_type' })
          
        if (error) {
          console.error('[Metal Rates API] Upsert error:', error)
          // Fall through to demo if we fail
        } else {
          return NextResponse.json({ success: true, data: rates })
        }
      }
    }

    let updatedRates = demoGetMetalRates()
    for (const [metal_type, rate] of Object.entries(rates)) {
      if (typeof rate === 'number') {
        updatedRates = demoUpdateMetalRate(metal_type, rate)
      }
    }

    return NextResponse.json({ success: true, data: updatedRates })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
