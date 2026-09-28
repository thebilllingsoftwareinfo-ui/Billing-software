import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionOptional } from '@/lib/auth/session'
import { BusinessCategoryService } from '@/lib/services/business-category.service'
import { getCategoryConfig } from '@/lib/config/business-categories.config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()
    const categories = BusinessCategoryService.getAllCategories()
    const currentCategoryKey = session?.organization?.business_category || 'General Wholesale'
    const activeConfig = BusinessCategoryService.resolveCategory('', currentCategoryKey)

    return NextResponse.json({
      success: true,
      currentCategory: activeConfig,
      categories,
    })
  } catch (err: any) {
    console.error('[Business Categories GET API] Error:', err)
    return NextResponse.json({
      success: true,
      currentCategory: getCategoryConfig('retail'),
      categories: BusinessCategoryService.getAllCategories(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()
    const orgId = session?.organization_id || '11111111-1111-1111-1111-111111111111'
    const isDemo = !session || Boolean(session.user_id?.includes('demo'))

    const body = await request.json()
    const { category_id, subcategory } = body

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: 'Business category ID is required' },
        { status: 400 }
      )
    }

    const result = await BusinessCategoryService.updateCategory(
      orgId,
      category_id,
      subcategory,
      isDemo
    )

    const res = NextResponse.json({
      success: true,
      message: result.message,
      data: result.config,
    })

    // Set demo cookie so server components immediately adopt the new category
    res.cookies.set('demo_category', result.config.name, {
      path: '/',
      maxAge: 30 * 86400,
      sameSite: 'lax',
    })

    if (subcategory) {
      res.cookies.set('demo_business_type', subcategory, {
        path: '/',
        maxAge: 30 * 86400,
        sameSite: 'lax',
      })
    }

    return res
  } catch (err: any) {
    console.error('[Business Categories POST API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update business category' },
      { status: 500 }
    )
  }
}
