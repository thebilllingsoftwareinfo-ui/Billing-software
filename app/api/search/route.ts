import { NextRequest, NextResponse } from 'next/server'
import { SearchService } from '@/lib/services/search.service'
import { getApiSession } from '@/lib/auth/api-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '5', 10)

    try {
      const results = await SearchService.globalSearch(session as any, query, limit)
      return NextResponse.json({
        success: true,
        data: results,
      })
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          customers: [],
          products: [],
          invoices: [],
          quotations: [],
        },
      })
    }
  } catch (err) {
    console.error('[Search API Error]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
