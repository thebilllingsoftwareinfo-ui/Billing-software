import { NextResponse } from 'next/server'
import { demoGetMetalRates, demoUpdateMetalRate } from '@/lib/services/demo-store'

export async function GET() {
  try {
    const rates = demoGetMetalRates()
    return NextResponse.json({ success: true, data: rates })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { rates } = body // e.g. { rates: { gold_24k: 15500, silver: 95 } }

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid rates data' }, { status: 400 })
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
