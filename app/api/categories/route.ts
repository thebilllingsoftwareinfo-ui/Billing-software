import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/validators/product.schema'
import { getServerSessionOptional } from '@/lib/auth/session'
import { demoGetCategories, demoAddCategory } from '@/lib/services/demo-store'

export async function GET() {
  try {
    const session = await getServerSessionOptional()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('organization_id', session.organization_id)
      .order('name', { ascending: true })

    if (error) {
      if (session.user_id.includes('demo')) {
        return NextResponse.json({
          success: true,
          data: demoGetCategories(),
        })
      }
      return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: categories || [] })
  } catch (err) {
    console.error('[Categories GET API] Error:', err)
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
    const parsed = categorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid category name' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('product_categories')
      .insert({
        organization_id: session.organization_id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        parent_id: parsed.data.parent_id || null,
      })
      .select()
      .single()

    if (error) {
      if (session.user_id.includes('demo')) {
        const newCat = demoAddCategory({
          name: parsed.data.name,
          description: parsed.data.description,
          organization_id: session.organization_id,
        })
        return NextResponse.json({
          success: true,
          data: newCat,
        })
      }
      console.error('[Categories POST API] Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: category })
  } catch (err) {
    console.error('[Categories POST API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
