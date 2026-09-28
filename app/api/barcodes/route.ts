import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSessionOptional } from '@/lib/auth/session'
import {
  demoGetProducts,
  demoUpdateProduct,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store'
import {
  lookupProductByBarcode,
  generateEan13Barcode,
  generateCode128Barcode,
  validateBarcode,
  generateBarcodeSvg,
} from '@/lib/services/barcode.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code') || searchParams.get('q') || ''

    const orgId = session?.organization_id || DEMO_ORG_ID
    const isDemo = !session || Boolean(session.user_id?.includes('demo'))

    if (isDemo) {
      const allProducts = demoGetProducts({}).products || []
      if (code) {
        const found = lookupProductByBarcode(code, allProducts)
        if (found) {
          const svg = generateBarcodeSvg(found.barcode || found.sku || code, { showText: true })
          return NextResponse.json({
            success: true,
            data: found,
            barcodeSvg: svg,
          })
        }
        return NextResponse.json({
          success: false,
          error: `No product found matching barcode/SKU: ${code}`,
        }, { status: 404 })
      }

      // Return list of products with barcode details
      const barcodeList = allProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || null,
        barcodes: p.barcodes || [],
        sale_price: p.sale_price,
        current_stock: p.current_stock,
        unit: p.primary_unit || (p.product_units as any)?.abbreviation || 'PCS',
        has_barcode: Boolean(p.barcode),
      }))

      return NextResponse.json({
        success: true,
        data: barcodeList,
      })
    }

    // Production / Supabase
    const supabase = await createClient()
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name, sku, barcode, sale_price, current_stock, unit, is_active')
      .eq('organization_id', orgId)

    if (error) {
      throw new Error(error.message)
    }

    const products = dbProducts || []
    if (code) {
      const found = lookupProductByBarcode(code, products as any[])
      if (found) {
        const svg = generateBarcodeSvg(found.barcode || found.sku || code, { showText: true })
        return NextResponse.json({
          success: true,
          data: found,
          barcodeSvg: svg,
        })
      }
      return NextResponse.json({
        success: false,
        error: `No product found matching barcode/SKU: ${code}`,
      }, { status: 404 })
    }

    const barcodeList = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || null,
      sale_price: p.sale_price,
      current_stock: p.current_stock,
      unit: p.unit || 'PCS',
      has_barcode: Boolean(p.barcode),
    }))

    return NextResponse.json({ success: true, data: barcodeList })
  } catch (err: any) {
    console.error('[Barcodes GET API] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionOptional()
    const body = await request.json()
    const {
      product_id,
      barcode: customBarcode,
      action = 'assign', // 'assign' | 'generate_ean13' | 'generate_code128'
      symbology = 'EAN13',
    } = body

    if (!product_id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 })
    }

    const orgId = session?.organization_id || DEMO_ORG_ID
    const isDemo = !session || Boolean(session.user_id?.includes('demo'))

    // Determine barcode value
    let targetBarcode = customBarcode?.trim()
    if (!targetBarcode) {
      if (action === 'generate_code128' || symbology === 'CODE128') {
        targetBarcode = generateCode128Barcode('VAN')
      } else {
        targetBarcode = generateEan13Barcode('890')
      }
    }

    // Validate barcode well-formedness
    const validation = validateBarcode(targetBarcode)
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // Check for duplicate barcode in other products
    if (isDemo) {
      const allProducts = demoGetProducts({}).products || []
      const conflict = allProducts.find(
        (p) => p.id !== product_id && (p.barcode === targetBarcode || p.barcodes?.includes(targetBarcode))
      )
      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: `DUPLICATE_BARCODE: Barcode ${targetBarcode} is already assigned to product '${conflict.name}' (SKU: ${conflict.sku})`,
          },
          { status: 409 }
        )
      }

      const updated = demoUpdateProduct(product_id, {
        barcode: targetBarcode,
        barcodes: [targetBarcode],
      })

      const svg = generateBarcodeSvg(targetBarcode, { showText: true })
      return NextResponse.json({
        success: true,
        message: `Barcode ${targetBarcode} successfully assigned to ${updated?.name || 'product'}`,
        data: updated,
        barcodeSvg: svg,
      })
    }

    // Supabase
    const supabase = await createClient()

    // Duplicate check
    const { data: duplicate } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('organization_id', orgId)
      .eq('barcode', targetBarcode)
      .neq('id', product_id)
      .maybeSingle()

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `DUPLICATE_BARCODE: Barcode ${targetBarcode} is already assigned to product '${duplicate.name}' (SKU: ${duplicate.sku})`,
        },
        { status: 409 }
      )
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update({ barcode: targetBarcode })
      .eq('id', product_id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const svg = generateBarcodeSvg(targetBarcode, { showText: true })
    return NextResponse.json({
      success: true,
      message: `Barcode ${targetBarcode} successfully assigned to ${updated.name}`,
      data: updated,
      barcodeSvg: svg,
    })
  } catch (err: any) {
    console.error('[Barcodes POST API] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
