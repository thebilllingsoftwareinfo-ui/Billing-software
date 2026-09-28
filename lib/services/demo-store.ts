// ============================================================
// lib/services/demo-store.ts — In-Memory Store for Demo Session
// ============================================================
// Provides persistent state in development/demo mode across API calls.

import { STANDARD_UNITS } from './unit.service'
import { normalizeBusinessClassification } from '@/lib/validators/organization.schema'
import { calculateCentralGst } from './tax.service'
import { INDIAN_STATES } from '../constants/indian-states'

function resolveDemoStateCode(input?: string | null): string {
  if (!input) return '27'
  const trimmed = input.trim()
  if (/^\d{2}$/.test(trimmed)) return trimmed
  const match = INDIAN_STATES.find((s) => s.name.toLowerCase() === trimmed.toLowerCase())
  return match?.code || '27'
}

export interface DemoCategory {
  id: string
  name: string
  description?: string | null
  organization_id: string
}

export interface DemoUnit {
  id: string
  name: string
  abbreviation: string
  short_name?: string
  symbol?: string
  code?: string
  decimals_allowed?: boolean
  is_standard?: boolean
  is_active?: boolean
  organization_id: string | null
}

export interface DemoProduct {
  id: string
  organization_id: string
  category_id?: string | null
  unit_id?: string | null
  name: string
  sku: string
  barcode?: string | null
  barcodes?: string[]
  hsn_sac_code?: string | null
  product_type: 'goods' | 'service'
  sale_price: number
  purchase_price: number
  gst_rate: number
  tax_treatment?: string
  cess_rate?: number
  cess_amount?: number
  decimals_allowed?: boolean
  is_gst_inclusive?: boolean
  primary_unit?: string | null
  secondary_unit?: string | null
  conversion_rate?: number | null
  purchase_unit?: string | null
  sales_unit?: string | null
  min_stock_level: number
  current_stock: number
  opening_stock: number
  opening_stock_value: number
  description?: string | null
  is_active: boolean
  metal_type?: string | null
  metal_weight?: number | null
  purity?: string | null
  carat?: number | null
  gross_weight?: number | null
  net_weight?: number | null
  making_charge?: number | null
  making_charge_type?: string | null
  stone_weight?: number | null
  stone_value?: number | null
  wastage?: number | null
  wastage_pct?: number | null
  wastage_type?: string | null
  other_charges?: number | null
  hallmark_huid?: string | null
  is_live_price?: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at?: string
  product_categories?: { id?: string; name: string } | null
  product_units?: { id?: string; name: string; abbreviation: string } | null
}

export interface DemoCustomerAddress {
  id: string
  customer_id: string
  address_type: 'billing' | 'shipping'
  is_default: boolean
  line1: string
  line2?: string | null
  city: string
  state: string
  state_code?: string | null
  pincode?: string | null
  country?: string | null
}

export interface DemoCustomer {
  id: string
  organization_id: string
  display_name: string
  legal_name?: string | null
  customer_type: 'business' | 'individual'
  email?: string | null
  phone?: string | null
  mobile?: string | null
  gstin?: string | null
  pan?: string | null
  place_of_supply?: string | null
  is_gst_registered: boolean
  credit_period_days: number
  credit_limit: number
  outstanding_balance: number
  notes?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string
  customer_addresses: DemoCustomerAddress[]
}

export const DEMO_ORG_ID = '11111111-1111-1111-1111-111111111111'

// Initial in-memory state
const demoCategories: DemoCategory[] = [
  { id: 'cat-1', name: 'Electronics', organization_id: DEMO_ORG_ID },
  { id: 'cat-2', name: 'Textiles', organization_id: DEMO_ORG_ID },
  { id: 'cat-3', name: 'Raw Materials', organization_id: DEMO_ORG_ID },
  { id: 'cat-4', name: 'Hardware', organization_id: DEMO_ORG_ID },
  { id: 'cat-5', name: 'Apparel', organization_id: DEMO_ORG_ID },
]

const demoUnits: DemoUnit[] = STANDARD_UNITS.map((u) => ({
  id: u.id,
  name: u.name,
  abbreviation: u.short_name,
  short_name: u.short_name,
  symbol: u.symbol,
  code: u.code,
  decimals_allowed: u.decimals_allowed,
  is_standard: u.is_standard,
  is_active: u.is_active,
  organization_id: null,
}))

export const demoProducts: DemoProduct[] = [
  {
    id: 'prod-demo-1',
    organization_id: DEMO_ORG_ID,
    category_id: 'cat-4',
    unit_id: 'unit-1',
    name: 'Industrial Valve 2-inch',
    sku: 'SKU-682844',
    barcode: '8901234567890',
    hsn_sac_code: '8481',
    product_type: 'goods',
    sale_price: 600,
    purchase_price: 410,
    gst_rate: 18,
    min_stock_level: 5,
    current_stock: 15,
    opening_stock: 15,
    opening_stock_value: 6150,
    description: 'High pressure stainless steel 2-inch industrial valve',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    product_categories: { id: 'cat-4', name: 'Hardware' },
    product_units: { id: 'unit-1', name: 'Piece', abbreviation: 'PCS' },
  },
  {
    id: 'prod-demo-2',
    organization_id: DEMO_ORG_ID,
    category_id: 'cat-4',
    unit_id: 'unit-5',
    name: 'Heavy Duty Steel Pipes 20ft',
    sku: 'SKU-319401',
    barcode: '8901234567891',
    hsn_sac_code: '7306',
    product_type: 'goods',
    sale_price: 1250,
    purchase_price: 920,
    gst_rate: 18,
    min_stock_level: 10,
    current_stock: 45,
    opening_stock: 45,
    opening_stock_value: 41400,
    description: 'Galvanized iron industrial heavy pipes',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    product_categories: { id: 'cat-4', name: 'Hardware' },
    product_units: { id: 'unit-5', name: 'Metre', abbreviation: 'MTR' },
  },
  {
    id: 'prod-demo-3',
    organization_id: DEMO_ORG_ID,
    category_id: 'cat-4',
    unit_id: 'unit-1',
    name: 'PVC Conduit Pipes 25mm',
    sku: 'SKU-772910',
    barcode: '8901234567892',
    hsn_sac_code: '3917',
    product_type: 'goods',
    sale_price: 180,
    purchase_price: 110,
    gst_rate: 18,
    min_stock_level: 20,
    current_stock: 120,
    opening_stock: 120,
    opening_stock_value: 13200,
    description: 'Electrical grade rigid PVC pipe conduit',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    product_categories: { id: 'cat-4', name: 'Hardware' },
    product_units: { id: 'unit-1', name: 'Piece', abbreviation: 'PCS' },
  },
  {
    id: 'prod-demo-4',
    organization_id: DEMO_ORG_ID,
    category_id: 'cat-1',
    unit_id: 'unit-1',
    name: 'Power Distribution Transformer 10kVA',
    sku: 'SKU-990142',
    barcode: '8901234567893',
    hsn_sac_code: '8504',
    product_type: 'goods',
    sale_price: 18500,
    purchase_price: 14000,
    gst_rate: 18,
    min_stock_level: 2,
    current_stock: 6,
    opening_stock: 6,
    opening_stock_value: 84000,
    description: 'Step-down electrical power distribution transformer',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    product_categories: { id: 'cat-1', name: 'Electronics' },
    product_units: { id: 'unit-1', name: 'Piece', abbreviation: 'PCS' },
  },
]

export const demoCustomers: DemoCustomer[] = [
  {
    id: 'cust-demo-1',
    organization_id: DEMO_ORG_ID,
    display_name: 'Apex Enterprises Pvt Ltd',
    legal_name: 'Apex Enterprises Private Limited',
    customer_type: 'business',
    email: 'accounts@apexenterprises.in',
    phone: '+91 98765 43210',
    gstin: '27AABCA1234A1Z5',
    outstanding_balance: 14500,
    credit_period_days: 30,
    credit_limit: 100000,
    place_of_supply: 'Maharashtra',
    is_gst_registered: true,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    customer_addresses: [
      {
        id: 'addr-1',
        customer_id: 'cust-demo-1',
        address_type: 'billing',
        is_default: true,
        line1: 'Plot 42, MIDC Industrial Area',
        city: 'Pune',
        state: 'Maharashtra',
        state_code: '27',
        pincode: '411018',
        country: 'India',
      },
    ],
  },
  {
    id: 'cust-demo-2',
    organization_id: DEMO_ORG_ID,
    display_name: 'Global Tech Solutions',
    legal_name: 'Global Tech Solutions LLP',
    customer_type: 'business',
    email: 'procurement@globaltech.com',
    phone: '+91 98111 22334',
    gstin: '29ABCDE1234F1Z5',
    outstanding_balance: -3200,
    credit_period_days: 15,
    credit_limit: 50000,
    place_of_supply: 'Karnataka',
    is_gst_registered: true,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    customer_addresses: [
      {
        id: 'addr-2',
        customer_id: 'cust-demo-2',
        address_type: 'billing',
        is_default: true,
        line1: '12th Floor, Outer Ring Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        state_code: '29',
        pincode: '560103',
        country: 'India',
      },
    ],
  },
  {
    id: 'cust-demo-3',
    organization_id: DEMO_ORG_ID,
    display_name: 'Sharma Electricals',
    legal_name: 'Sharma Electricals & Hardware',
    customer_type: 'business',
    email: 'contact@sharmaelec.com',
    phone: '+91 99887 76655',
    gstin: '27AAACS1429B1ZX',
    outstanding_balance: 0,
    credit_period_days: 30,
    credit_limit: 75000,
    place_of_supply: 'Maharashtra',
    is_gst_registered: true,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    customer_addresses: [
      {
        id: 'addr-3',
        customer_id: 'cust-demo-3',
        address_type: 'billing',
        is_default: true,
        line1: 'Shop 14, Main Market, MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        state_code: '27',
        pincode: '400001',
        country: 'India',
      },
    ],
  },
  {
    id: 'cust-demo-walk-in',
    organization_id: DEMO_ORG_ID,
    display_name: 'Walk-in Customer',
    legal_name: 'Walk-in / Cash Customer',
    customer_type: 'individual',
    email: null,
    phone: '0000000000',
    gstin: null,
    outstanding_balance: 0,
    credit_period_days: 0,
    credit_limit: 0,
    place_of_supply: 'Maharashtra',
    is_gst_registered: false,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    customer_addresses: [
      {
        id: 'addr-walk-in',
        customer_id: 'cust-demo-walk-in',
        address_type: 'billing',
        is_default: true,
        line1: 'Direct Retail / Counter Sale',
        city: 'Mumbai',
        state: 'Maharashtra',
        state_code: '27',
        pincode: '400001',
        country: 'India',
      },
    ],
  },
]

// ── Categories ──────────────────────────────────────────────

export function demoGetCategories(): DemoCategory[] {
  return [...demoCategories]
}

export function demoAddCategory(data: { name: string; description?: string | null; organization_id?: string }): DemoCategory {
  const newCat: DemoCategory = {
    id: `cat-${Date.now()}`,
    name: data.name,
    description: data.description || null,
    organization_id: data.organization_id || DEMO_ORG_ID,
  }
  demoCategories.push(newCat)
  return newCat
}

// ── Units ───────────────────────────────────────────────────

export function demoGetUnits(): DemoUnit[] {
  return [...demoUnits]
}

export function demoAddUnit(data: {
  name: string
  short_name: string
  code?: string
  symbol?: string
  decimals_allowed?: boolean
  organization_id?: string
}): DemoUnit {
  const newUnit: DemoUnit = {
    id: `unit-custom-${Date.now()}`,
    name: data.name.trim(),
    abbreviation: data.short_name.trim(),
    short_name: data.short_name.trim(),
    code: data.code?.trim() || data.short_name.trim().toUpperCase(),
    symbol: data.symbol?.trim() || data.short_name.trim().toLowerCase(),
    decimals_allowed: Boolean(data.decimals_allowed),
    is_standard: false,
    is_active: true,
    organization_id: data.organization_id || DEMO_ORG_ID,
  }
  demoUnits.push(newUnit)
  return newUnit
}

export function demoUpdateUnit(id: string, updates: Partial<DemoUnit>): DemoUnit | null {
  const index = demoUnits.findIndex((u) => u.id === id)
  if (index === -1) return null

  const existing = demoUnits[index]
  const updated: DemoUnit = {
    ...existing,
    ...updates,
    ...(updates.name && { name: updates.name.trim() }),
    ...(updates.short_name && {
      short_name: updates.short_name.trim(),
      abbreviation: updates.short_name.trim(),
    }),
  }
  demoUnits[index] = updated
  return updated
}

export function demoDeleteUnit(id: string): boolean {
  const index = demoUnits.findIndex((u) => u.id === id)
  if (index === -1) return false
  // Soft toggle active
  demoUnits[index].is_active = !demoUnits[index].is_active
  return true
}

// ── Products ────────────────────────────────────────────────

export function demoGetProducts(options: {
  q?: string
  category_id?: string
  status?: string
  stock_status?: string
  sort?: string
  page?: number
  limit?: number
}) {
  const {
    q = '',
    category_id = '',
    status = 'active',
    stock_status = 'all',
    sort = 'name_asc',
    page = 1,
    limit = 15,
  } = options

  let filtered = demoProducts.map((p) => {
    const cat = demoCategories.find((c) => c.id === p.category_id)
    const unit = demoUnits.find((u) => u.id === p.unit_id)
    return {
      ...p,
      product_categories: cat ? { id: cat.id, name: cat.name } : p.product_categories || null,
      product_units: unit ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation } : p.product_units || null,
    }
  })

  // Status filter
  if (status === 'active') {
    filtered = filtered.filter((p) => p.is_active)
  } else if (status === 'archived') {
    filtered = filtered.filter((p) => !p.is_active)
  }

  // Category filter
  if (category_id) {
    filtered = filtered.filter((p) => p.category_id === category_id)
  }

  // Query filter
  if (q) {
    const term = q.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.hsn_sac_code && p.hsn_sac_code.toLowerCase().includes(term))
    )
  }

  // Stock status filter
  if (stock_status === 'out_of_stock') {
    filtered = filtered.filter((p) => p.current_stock === 0)
  } else if (stock_status === 'low_stock') {
    filtered = filtered.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock_level)
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sort === 'name_asc') return a.name.localeCompare(b.name)
    if (sort === 'name_desc') return b.name.localeCompare(a.name)
    if (sort === 'price_asc') return a.sale_price - b.sale_price
    if (sort === 'price_desc') return b.sale_price - a.sale_price
    if (sort === 'stock_desc') return b.current_stock - a.current_stock
    if (sort === 'stock_asc') return a.current_stock - b.current_stock
    return a.name.localeCompare(b.name)
  })

  // Summary calculation for active products
  const activeProducts = demoProducts.filter((p) => p.is_active)
  let lowStockCount = 0
  let outOfStockCount = 0
  let totalStockValue = 0

  activeProducts.forEach((p) => {
    const stock = p.current_stock || 0
    const minLevel = p.min_stock_level || 0
    const purchaseVal = p.purchase_price || 0

    if (stock === 0) outOfStockCount++
    else if (minLevel > 0 && stock <= minLevel) lowStockCount++

    totalStockValue += stock * purchaseVal
  })

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return {
    products: paginated,
    count: total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      totalProducts: activeProducts.length,
      lowStockCount,
      outOfStockCount,
      totalStockValue,
    },
  }
}

export function demoAddProduct(data: any): DemoProduct {
  const cat = demoCategories.find((c) => c.id === data.category_id)
  const unit = demoUnits.find((u) => u.id === data.unit_id)
  const openingStock = Number(data.opening_stock) || 0
  const purchasePrice = Number(data.purchase_price) || 0
  const salePrice = Number(data.selling_price || data.sale_price) || 0

  const newProduct: DemoProduct = {
    id: `prod-${Date.now()}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    category_id: data.category_id || null,
    unit_id: data.unit_id || null,
    name: data.name,
    sku: data.sku,
    barcode: data.barcode || null,
    barcodes: data.barcodes || (data.barcode ? [data.barcode] : []),
    primary_unit: data.primary_unit || data.unit || 'PCS',
    secondary_unit: data.secondary_unit || null,
    conversion_rate: data.conversion_rate ? Number(data.conversion_rate) : null,
    purchase_unit: data.purchase_unit || data.primary_unit || data.unit || 'PCS',
    sales_unit: data.sales_unit || data.primary_unit || data.unit || 'PCS',
    cess_rate: Number(data.cess_rate) || 0,
    cess_amount: Number(data.cess_amount) || 0,
    tax_treatment: data.tax_treatment || 'taxable',
    decimals_allowed: Boolean(data.decimals_allowed),
    hsn_sac_code: data.hsn_sac_code || null,
    product_type: data.product_type || 'goods',
    sale_price: salePrice,
    purchase_price: purchasePrice,
    gst_rate: Number(data.gst_rate) || 18,
    min_stock_level: Number(data.min_stock_level) || 0,
    current_stock: openingStock,
    opening_stock: openingStock,
    opening_stock_value: openingStock * purchasePrice,
    description: data.description || null,
    is_active: true,
    metal_type: data.metal_type || null,
    metal_weight: data.metal_weight ? Number(data.metal_weight) : null,
    purity: data.purity || null,
    carat: data.carat ? Number(data.carat) : null,
    gross_weight: data.gross_weight ? Number(data.gross_weight) : null,
    net_weight: data.net_weight ? Number(data.net_weight) : null,
    stone_weight: data.stone_weight ? Number(data.stone_weight) : null,
    stone_value: data.stone_value ? Number(data.stone_value) : null,
    making_charge: data.making_charge ? Number(data.making_charge) : null,
    making_charge_type: data.making_charge_type || null,
    wastage: data.wastage ? Number(data.wastage) : null,
    wastage_pct: data.wastage_pct ? Number(data.wastage_pct) : null,
    wastage_type: data.wastage_type || null,
    other_charges: data.other_charges ? Number(data.other_charges) : null,
    hallmark_huid: data.hallmark_huid || null,
    is_live_price: Boolean(data.is_live_price),
    metadata: data.metadata || data.custom_fields || {},
    created_at: new Date().toISOString(),
    product_categories: cat ? { id: cat.id, name: cat.name } : null,
    product_units: unit ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation } : { id: 'u-custom', name: data.unit || 'Pieces', abbreviation: data.unit || 'PCS' },
  }

  // Prepend to top of list
  demoProducts.unshift(newProduct)
  persistStore()
  return newProduct
}

export function demoGetProduct(id: string): { product: DemoProduct; movements: any[] } | null {
  const p = demoProducts.find((item) => item.id === id)
  if (!p) return null

  const cat = demoCategories.find((c) => c.id === p.category_id)
  const unit = demoUnits.find((u) => u.id === p.unit_id)

  const enriched: DemoProduct = {
    ...p,
    product_categories: cat ? { id: cat.id, name: cat.name } : p.product_categories || null,
    product_units: unit ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation } : p.product_units || null,
  }

  const movements = [
    {
      id: `mov-${p.id}-1`,
      product_id: p.id,
      movement_type: 'opening',
      quantity: p.opening_stock,
      unit_cost: p.purchase_price,
      total_cost: p.opening_stock_value,
      description: 'Initial opening stock entry on product creation',
      created_at: p.created_at,
    },
  ]

  return { product: enriched, movements }
}

export function demoUpdateProduct(id: string, patch: any): DemoProduct | null {
  const index = demoProducts.findIndex((p) => p.id === id)
  if (index === -1) return null

  const existing = demoProducts[index]
  const salePrice = patch.selling_price !== undefined ? Number(patch.selling_price) : (patch.sale_price !== undefined ? Number(patch.sale_price) : existing.sale_price)
  const purchasePrice = patch.purchase_price !== undefined ? Number(patch.purchase_price) : existing.purchase_price

  const updated: DemoProduct = {
    ...existing,
    ...(patch.name && { name: patch.name }),
    ...(patch.sku && { sku: patch.sku }),
    ...(patch.barcode !== undefined && { barcode: patch.barcode || null }),
    ...(patch.barcodes !== undefined && { barcodes: patch.barcodes }),
    ...(patch.primary_unit !== undefined && { primary_unit: patch.primary_unit }),
    ...(patch.secondary_unit !== undefined && { secondary_unit: patch.secondary_unit }),
    ...(patch.conversion_rate !== undefined && { conversion_rate: patch.conversion_rate }),
    ...(patch.purchase_unit !== undefined && { purchase_unit: patch.purchase_unit }),
    ...(patch.sales_unit !== undefined && { sales_unit: patch.sales_unit }),
    ...(patch.cess_rate !== undefined && { cess_rate: Number(patch.cess_rate) }),
    ...(patch.cess_amount !== undefined && { cess_amount: Number(patch.cess_amount) }),
    ...(patch.tax_treatment !== undefined && { tax_treatment: patch.tax_treatment }),
    ...(patch.decimals_allowed !== undefined && { decimals_allowed: Boolean(patch.decimals_allowed) }),
    ...(patch.category_id !== undefined && { category_id: patch.category_id || null }),
    ...(patch.unit_id !== undefined && { unit_id: patch.unit_id || null }),
    ...(patch.hsn_sac_code !== undefined && { hsn_sac_code: patch.hsn_sac_code || null }),
    ...(patch.product_type && { product_type: patch.product_type }),
    sale_price: salePrice,
    purchase_price: purchasePrice,
    ...(patch.gst_rate !== undefined && { gst_rate: Number(patch.gst_rate) }),
    ...(patch.min_stock_level !== undefined && { min_stock_level: Number(patch.min_stock_level) }),
    ...(patch.description !== undefined && { description: patch.description || null }),
    ...(patch.metal_type !== undefined && { metal_type: patch.metal_type || null }),
    ...(patch.metal_weight !== undefined && { metal_weight: patch.metal_weight ? Number(patch.metal_weight) : null }),
    ...(patch.purity !== undefined && { purity: patch.purity || null }),
    ...(patch.carat !== undefined && { carat: patch.carat ? Number(patch.carat) : null }),
    ...(patch.gross_weight !== undefined && { gross_weight: patch.gross_weight ? Number(patch.gross_weight) : null }),
    ...(patch.net_weight !== undefined && { net_weight: patch.net_weight ? Number(patch.net_weight) : null }),
    ...(patch.stone_weight !== undefined && { stone_weight: patch.stone_weight ? Number(patch.stone_weight) : null }),
    ...(patch.stone_value !== undefined && { stone_value: patch.stone_value ? Number(patch.stone_value) : null }),
    ...(patch.making_charge !== undefined && { making_charge: patch.making_charge ? Number(patch.making_charge) : null }),
    ...(patch.making_charge_type !== undefined && { making_charge_type: patch.making_charge_type || null }),
    ...(patch.wastage !== undefined && { wastage: patch.wastage ? Number(patch.wastage) : null }),
    ...(patch.wastage_pct !== undefined && { wastage_pct: patch.wastage_pct ? Number(patch.wastage_pct) : null }),
    ...(patch.wastage_type !== undefined && { wastage_type: patch.wastage_type || null }),
    ...(patch.other_charges !== undefined && { other_charges: patch.other_charges ? Number(patch.other_charges) : null }),
    ...(patch.hallmark_huid !== undefined && { hallmark_huid: patch.hallmark_huid || null }),
    ...(patch.is_live_price !== undefined && { is_live_price: Boolean(patch.is_live_price) }),
    ...(patch.metadata !== undefined && { metadata: patch.metadata }),
    updated_at: new Date().toISOString(),
  }

  const cat = demoCategories.find((c) => c.id === updated.category_id)
  const unit = demoUnits.find((u) => u.id === updated.unit_id)
  updated.product_categories = cat ? { id: cat.id, name: cat.name } : null
  updated.product_units = unit ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation } : updated.product_units || null

  demoProducts[index] = updated
  persistStore()
  return updated
}

export function demoDeleteProduct(id: string): { is_active: boolean } | null {
  const product = demoProducts.find((p) => p.id === id)
  if (!product) return null

  product.is_active = !product.is_active
  return { is_active: product.is_active }
}

// ── Customers ───────────────────────────────────────────────

export function demoGetCustomers(options?: {
  q?: string
  status?: string
  sort?: string
  page?: number
  limit?: number
}) {
  const {
    q = '',
    status = 'active',
    sort = 'name_asc',
    page = 1,
    limit = 15,
  } = options || {}

  let filtered = [...demoCustomers]

  if (status === 'active') {
    filtered = filtered.filter((c) => c.is_active)
  } else if (status === 'archived') {
    filtered = filtered.filter((c) => !c.is_active)
  }

  if (q) {
    const term = q.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        c.display_name.toLowerCase().includes(term) ||
        (c.legal_name && c.legal_name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.gstin && c.gstin.toLowerCase().includes(term))
    )
  }

  filtered.sort((a, b) => {
    if (sort === 'name_asc') return a.display_name.localeCompare(b.display_name)
    if (sort === 'name_desc') return b.display_name.localeCompare(a.display_name)
    if (sort === 'balance_desc') return b.outstanding_balance - a.outstanding_balance
    return a.display_name.localeCompare(b.display_name)
  })

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  const activeCustomers = demoCustomers.filter((c) => c.is_active)
  const totalOutstanding = activeCustomers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0)

  return {
    customers: paginated,
    count: total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      totalCustomers: activeCustomers.length,
      totalOutstanding,
    },
  }
}

export function demoAddCustomer(data: any): DemoCustomer {
  const custId = `cust-${Date.now()}`
  const addresses: DemoCustomerAddress[] = []

  if (data.billing_address && data.billing_address.line1) {
    addresses.push({
      id: `addr-${Date.now()}-1`,
      customer_id: custId,
      address_type: 'billing',
      is_default: true,
      line1: data.billing_address.line1,
      line2: data.billing_address.line2 || null,
      city: data.billing_address.city || '',
      state: data.billing_address.state || data.place_of_supply || '',
      state_code: data.billing_address.state_code || null,
      pincode: data.billing_address.pincode || null,
      country: data.billing_address.country || 'India',
    })
  }

  const newCust: DemoCustomer = {
    id: custId,
    organization_id: data.organization_id || DEMO_ORG_ID,
    display_name: data.display_name,
    legal_name: data.legal_name || null,
    customer_type: data.customer_type || 'business',
    email: data.email || null,
    phone: data.phone || data.mobile || null,
    mobile: data.mobile || null,
    gstin: data.gstin || null,
    pan: data.pan || null,
    place_of_supply: data.place_of_supply || (addresses[0]?.state) || null,
    is_gst_registered: Boolean(data.gstin),
    credit_period_days: Number(data.credit_period_days) || 0,
    credit_limit: Number(data.credit_limit) || 0,
    outstanding_balance: Number(data.opening_balance) || 0,
    notes: data.notes || null,
    is_active: true,
    created_at: new Date().toISOString(),
    customer_addresses: addresses,
  }

  demoCustomers.unshift(newCust)
  return newCust
}

export function demoGetCustomer(id: string): DemoCustomer | null {
  return demoCustomers.find((c) => c.id === id) || null
}

export function demoUpdateCustomer(id: string, patch: any): DemoCustomer | null {
  const index = demoCustomers.findIndex((c) => c.id === id)
  if (index === -1) return null

  const existing = demoCustomers[index]
  const updated: DemoCustomer = {
    ...existing,
    ...(patch.display_name && { display_name: patch.display_name }),
    ...(patch.legal_name !== undefined && { legal_name: patch.legal_name || null }),
    ...(patch.customer_type && { customer_type: patch.customer_type }),
    ...(patch.email !== undefined && { email: patch.email || null }),
    ...(patch.phone !== undefined && { phone: patch.phone || null }),
    ...(patch.mobile !== undefined && { mobile: patch.mobile || null }),
    ...(patch.gstin !== undefined && { gstin: patch.gstin || null, is_gst_registered: Boolean(patch.gstin) }),
    ...(patch.pan !== undefined && { pan: patch.pan || null }),
    ...(patch.place_of_supply !== undefined && { place_of_supply: patch.place_of_supply || null }),
    ...(patch.credit_period_days !== undefined && { credit_period_days: patch.credit_period_days }),
    ...(patch.credit_limit !== undefined && { credit_limit: patch.credit_limit }),
    ...(patch.notes !== undefined && { notes: patch.notes || null }),
    updated_at: new Date().toISOString(),
  }

  demoCustomers[index] = updated
  return updated
}

export function demoDeleteCustomer(id: string): { is_active: boolean } | null {
  const c = demoCustomers.find((item) => item.id === id)
  if (!c) return null
  c.is_active = !c.is_active
  return { is_active: c.is_active }
}

// ── Invoices ────────────────────────────────────────────────

export interface DemoOrganizationProfile {
  id: string
  name: string
  legal_name?: string | null
  trade_name?: string | null
  business_type?: string | null
  business_category?: string | null
  logo_url?: string | null
  gstin?: string | null
  pan?: string | null
  state_code?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  bank_branch?: string | null
  upi_id?: string | null
  invoice_prefix?: string | null
  terms_and_conditions?: string | null
  notes?: string | null
}

export interface DemoInvoiceItem {
  id: string
  invoice_id: string
  product_id?: string | null
  description: string
  hsn_sac_code?: string | null
  quantity: number
  unit?: string | null
  unit_price: number
  discount_percent: number
  discount_amount: number
  taxable_amount: number
  gst_rate: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  tax_amount: number
  line_total: number
  is_gst_inclusive: boolean
  conversion_rate?: number | null
}

export interface DemoInvoice {
  id: string
  organization_id: string
  customer_id: string
  invoice_number: string
  invoice_date: string
  due_date?: string | null
  invoice_type: string
  status: 'draft' | 'issued' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'void'
  place_of_supply?: string | null
  seller_state_code?: string | null
  is_inter_state?: boolean
  reverse_charge?: boolean
  reference_number?: string | null
  payment_status?: 'unpaid' | 'paid' | 'partial'
  payment_mode?: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | 'credit' | 'other' | null
  payment_reference?: string | null
  subtotal: number
  discount_type?: string
  discount_value?: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_tax_amount: number
  round_off_amount: number
  total_amount: number
  amount_paid: number
  balance_due?: number
  notes?: string | null
  terms_and_conditions?: string | null
  created_at: string
  updated_at?: string
  finalized_at?: string | null
  void_reason?: string | null
  invoice_items: DemoInvoiceItem[]
  customers?: {
    id: string
    display_name: string
    phone?: string | null
    email?: string | null
    gstin?: string | null
    state?: string | null
  } | null
  organization?: DemoOrganizationProfile | null
}

// Default Business Profile State
let demoOrganizationProfile: DemoOrganizationProfile = {
  id: DEMO_ORG_ID,
  name: 'Acme Industrial Systems Pvt Ltd',
  legal_name: 'Acme Industrial Systems Private Limited',
  trade_name: 'Acme Systems',
  business_type: 'Wholesale & Distribution',
  business_category: 'General Wholesale',
  logo_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%234f46e5"/><path d="M30 70 L50 25 L70 70 L56 70 L50 54 L44 70 Z" fill="white"/><circle cx="50" cy="42" r="4" fill="%234f46e5"/></svg>',
  gstin: '27AABCU9603R1ZM',
  pan: 'AABCU9603R',
  state_code: '27',
  phone: '+91 98220 12345',
  email: 'billing@acmesystems.in',
  website: 'https://www.acmesystems.in',
  address_line1: 'Plot No. 108, Industrial Electronic Zone',
  address_line2: 'Near Software Technology Park, Hinjewadi Phase 1',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411057',
  country: 'India',
  bank_name: 'HDFC Bank Ltd',
  bank_account_name: 'Acme Industrial Systems Pvt Ltd',
  bank_account_number: '50200098765432',
  bank_ifsc: 'HDFC0001234',
  bank_branch: 'Hinjewadi Phase 1, Pune',
  upi_id: 'acmesystems@okhdfcbank',
  invoice_prefix: 'INV-',
  terms_and_conditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged on overdue payments.\n3. Subject to Pune jurisdiction only.',
  notes: 'Thank you for your valued business! For any billing queries, contact billing@acmesystems.in.',
}

export function demoGetOrganizationProfile(): DemoOrganizationProfile {
  const normalized = normalizeBusinessClassification(
    demoOrganizationProfile.business_type,
    demoOrganizationProfile.business_category
  )
  demoOrganizationProfile.business_type = normalized.business_type
  demoOrganizationProfile.business_category = normalized.business_category
  return { ...demoOrganizationProfile }
}

export function demoUpdateOrganizationProfile(patch: Partial<DemoOrganizationProfile> & { business_type?: string; business_category?: string }): DemoOrganizationProfile {
  const normalized = normalizeBusinessClassification(
    patch.business_type || demoOrganizationProfile.business_type,
    patch.business_category || demoOrganizationProfile.business_category
  )
  demoOrganizationProfile = {
    ...demoOrganizationProfile,
    ...patch,
    business_type: normalized.business_type,
    business_category: normalized.business_category,
  }
  persistStore()
  return { ...demoOrganizationProfile }
}

export const demoInvoices: DemoInvoice[] = [
  {
    id: 'inv-demo-1',
    organization_id: DEMO_ORG_ID,
    customer_id: 'cust-demo-1',
    invoice_number: 'INV-2026-0001',
    invoice_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
    invoice_type: 'standard',
    status: 'issued',
    place_of_supply: 'Maharashtra',
    seller_state_code: '27',
    is_inter_state: false,
    reverse_charge: false,
    reference_number: 'PO-77821',
    subtotal: 12000,
    discount_type: 'fixed',
    discount_value: 0,
    discount_amount: 0,
    taxable_amount: 12000,
    cgst_amount: 1080,
    sgst_amount: 1080,
    igst_amount: 0,
    total_tax_amount: 2160,
    round_off_amount: 0,
    total_amount: 14160,
    amount_paid: 0,
    balance_due: 14160,
    notes: 'Payment terms: 30 days credit.',
    terms_and_conditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. charged on overdue payments.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    invoice_items: [
      {
        id: 'item-1',
        invoice_id: 'inv-demo-1',
        product_id: 'prod-demo-1',
        description: 'Industrial Valve 2-inch',
        hsn_sac_code: '8481',
        quantity: 20,
        unit: 'pcs',
        unit_price: 600,
        discount_percent: 0,
        discount_amount: 0,
        taxable_amount: 12000,
        gst_rate: 18,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 0,
        cgst_amount: 1080,
        sgst_amount: 1080,
        igst_amount: 0,
        tax_amount: 2160,
        line_total: 14160,
        is_gst_inclusive: false,
      },
    ],
    customers: {
      id: 'cust-demo-1',
      display_name: 'Apex Enterprises Pvt Ltd',
      phone: '+91 98765 43210',
      email: 'accounts@apexenterprises.in',
      gstin: '27AABCA1234A1Z5',
      state: 'Maharashtra',
    },
  },
]

export function demoGetInvoices(options?: {
  q?: string
  status?: string
  page?: number
  limit?: number
}) {
  const { q = '', status = 'all', page = 1, limit = 15 } = options || {}

  let filtered = demoInvoices.map((inv) => {
    const cust = demoCustomers.find((c) => c.id === inv.customer_id)
    return {
      ...inv,
      customers: cust
        ? {
            id: cust.id,
            display_name: cust.display_name,
            phone: cust.phone,
            email: cust.email,
            gstin: cust.gstin,
            state: cust.place_of_supply || cust.customer_addresses?.[0]?.state || null,
          }
        : inv.customers || null,
    }
  })

  if (status && status !== 'all') {
    filtered = filtered.filter((i) => i.status === status)
  }

  if (q) {
    const term = q.toLowerCase()
    filtered = filtered.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(term) ||
        (i.reference_number && i.reference_number.toLowerCase().includes(term)) ||
        (i.customers?.display_name && i.customers.display_name.toLowerCase().includes(term)) ||
        (i.customers?.phone && i.customers.phone.toLowerCase().includes(term))
    )
  }

  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  let totalSales = 0
  let totalPaid = 0
  let totalOutstanding = 0
  let draftCount = 0
  let issuedCount = 0
  let paidCount = 0
  let overdueCount = 0

  demoInvoices.forEach((inv) => {
    const tot = Number(inv.total_amount) || 0
    const paid = Number(inv.amount_paid) || 0
    const due = tot - paid

    if (inv.status !== 'cancelled' && inv.status !== 'void') {
      totalSales += tot
      totalPaid += paid
      totalOutstanding += due
    }

    if (inv.status === 'draft') draftCount++
    if (inv.status === 'issued' || inv.status === 'sent') issuedCount++
    if (inv.status === 'paid') paidCount++
    if (inv.status === 'overdue') overdueCount++
  })

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return {
    invoices: paginated,
    count: total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    summary: {
      totalSales,
      totalPaid,
      totalOutstanding,
      draftCount,
      issuedCount,
      paidCount,
      overdueCount,
    },
  }
}

let nextInvoiceSeq = 1002

let isStoreLoaded = false

function getNodeFs(): { fs: any; path: any } | null {
  if (typeof window === 'undefined') {
    try {
      // Use eval('require') so Turbopack/Webpack client bundle does not attempt to resolve 'fs' or 'path'
      const fsMod = eval('require')('fs')
      const pathMod = eval('require')('path')
      return { fs: fsMod, path: pathMod }
    } catch {
      return null
    }
  }
  return null
}

export function loadPersistentStore() {
  if (isStoreLoaded) return
  isStoreLoaded = true
  const node = getNodeFs()
  if (!node) return
  try {
    const storeDir = node.path.join(process.cwd(), 'data')
    const storeFile = node.path.join(storeDir, 'demo-store.json')
    if (node.fs.existsSync(storeFile)) {
      const raw = node.fs.readFileSync(storeFile, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        demoProducts.length = 0
        demoProducts.push(...parsed.products)
      }
      if (Array.isArray(parsed.customers) && parsed.customers.length > 0) {
        demoCustomers.length = 0
        demoCustomers.push(...parsed.customers)
      }
      if (Array.isArray(parsed.invoices) && parsed.invoices.length > 0) {
        demoInvoices.length = 0
        demoInvoices.push(...parsed.invoices)
      }
      if (parsed.orgProfile) {
        Object.assign(demoOrganizationProfile, parsed.orgProfile)
      }
      if (typeof parsed.nextInvoiceSeq === 'number') {
        nextInvoiceSeq = parsed.nextInvoiceSeq
      }
    }
  } catch (e) {
    console.warn('[demo-store] Notice loading persistent store:', e)
  }
}

export function persistStore() {
  const node = getNodeFs()
  if (!node) return
  try {
    const storeDir = node.path.join(process.cwd(), 'data')
    const storeFile = node.path.join(storeDir, 'demo-store.json')
    if (!node.fs.existsSync(storeDir)) {
      node.fs.mkdirSync(storeDir, { recursive: true })
    }
    const snapshot = {
      products: demoProducts,
      customers: demoCustomers,
      invoices: demoInvoices,
      orgProfile: demoOrganizationProfile,
      nextInvoiceSeq,
      savedAt: new Date().toISOString(),
    }
    node.fs.writeFileSync(storeFile, JSON.stringify(snapshot, null, 2), 'utf8')
  } catch (e) {
    console.warn('[demo-store] Notice saving persistent store:', e)
  }
}

// Auto-load persistent state on module initialization
loadPersistentStore()


export function demoAddInvoice(data: any): DemoInvoice {
  const cust = demoCustomers.find((c) => c.id === data.customer_id)

  // 0. Stock Availability Pre-check (Only blocks if stop_sale_on_negative_stock is enabled)
  for (const it of (data.items || [])) {
    if (it.product_id) {
      const prod = demoProducts.find((p) => p.id === it.product_id)
      if (prod && prod.product_type === 'goods') {
        const available = Number(prod.current_stock) || 0
        const requested = Number(it.quantity) || 0
        if (data.stop_sale_on_negative_stock && requested > available) {
          throw new Error(
            `INSUFFICIENT_STOCK: Item '${prod.name}' has only ${available} ${prod.primary_unit || 'PCS'} available in stock, but ${requested} was requested.`
          )
        }
      }
    }
  }

  const invId = `inv-demo-${Date.now()}`
  const invNumber = data.invoice_number || `INV-2026-${nextInvoiceSeq++}`

  const sellerStateCode = '27'
  const buyerStateInput = data.place_of_supply || cust?.place_of_supply || cust?.customer_addresses?.[0]?.state || 'Maharashtra'
  const buyerStateCode = resolveDemoStateCode(buyerStateInput)

  const calc = calculateCentralGst({
    seller: { state_code: sellerStateCode, is_gst_registered: true },
    buyer: { state_code: buyerStateCode, is_gst_registered: Boolean(cust?.is_gst_registered) },
    supply: {
      reverse_charge: Boolean(data.reverse_charge),
    },
    items: (data.items || []).map((it: any) => ({
      product_id: it.product_id || null,
      description: it.description || 'Line Item',
      hsn_sac_code: it.hsn_sac_code || null,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      discount_percent: Number(it.discount_percent) || 0,
      discount_amount: Number(it.discount_amount) || 0,
      gst_rate: it.gst_rate !== undefined && it.gst_rate !== null ? Number(it.gst_rate) : 18,
      cess_rate: Number(it.cess_rate) || 0,
      cess_amount: Number(it.cess_amount) || 0,
      is_gst_inclusive: Boolean(it.is_gst_inclusive),
      tax_treatment: it.tax_treatment || 'taxable',
    })),
    invoice_discount_type: data.discount_type || 'fixed',
    invoice_discount_value: Number(data.discount_value) || 0,
  })

  const items: DemoInvoiceItem[] = calc.lines.map((l, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    invoice_id: invId,
    product_id: l.product_id || null,
    description: l.description,
    hsn_sac_code: l.hsn_sac_code,
    quantity: l.quantity,
    unit: (data.items || [])[idx]?.unit || 'pcs',
    unit_price: l.unit_price,
    discount_percent: (data.items || [])[idx]?.discount_percent || 0,
    discount_amount: l.discount_amount,
    taxable_amount: l.taxable_amount,
    gst_rate: l.gst_rate,
    cgst_rate: l.cgst_rate,
    sgst_rate: l.sgst_rate,
    igst_rate: l.igst_rate,
    cgst_amount: l.cgst_amount,
    sgst_amount: l.sgst_amount,
    igst_amount: l.igst_amount,
    tax_amount: l.total_tax,
    line_total: l.line_total,
    is_gst_inclusive: Boolean((data.items || [])[idx]?.is_gst_inclusive),
  }))

  const subtotal = calc.subtotal
  const discountAmount = calc.total_discount_amount
  const taxableAmount = calc.taxable_amount
  const totalTax = calc.total_tax_amount
  const grandTotal = calc.grand_total
  const roundOff = calc.round_off_amount

  const paymentStatus = data.payment_status || (data.amount_paid && data.amount_paid >= grandTotal ? 'paid' : (data.amount_paid > 0 ? 'partial' : 'unpaid'))
  const amountPaid = paymentStatus === 'paid' ? grandTotal : (Number(data.amount_paid) || 0)
  const balanceDue = Math.max(0, grandTotal - amountPaid)

  const newInv: DemoInvoice = {
    id: invId,
    organization_id: data.organization_id || DEMO_ORG_ID,
    customer_id: data.customer_id,
    invoice_number: invNumber,
    invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
    due_date: data.due_date || null,
    invoice_type: data.invoice_type || 'standard',
    status: data.status || (paymentStatus === 'paid' ? 'paid' : (paymentStatus === 'partial' ? 'partial' : 'issued')),
    place_of_supply: buyerStateInput,
    seller_state_code: sellerStateCode,
    is_inter_state: calc.is_inter_state,
    reverse_charge: Boolean(data.reverse_charge),
    reference_number: data.reference_number || null,
    payment_status: paymentStatus,
    payment_mode: data.payment_mode || null,
    payment_reference: data.payment_reference || null,
    subtotal,
    discount_type: data.discount_type || 'fixed',
    discount_value: data.discount_value || 0,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    cgst_amount: calc.cgst_amount,
    sgst_amount: calc.sgst_amount,
    igst_amount: calc.igst_amount,
    total_tax_amount: totalTax,
    round_off_amount: roundOff,
    total_amount: grandTotal,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    notes: data.notes || null,
    terms_and_conditions: data.terms_and_conditions || null,
    created_at: new Date().toISOString(),
    invoice_items: items,
    customers: cust
      ? {
          id: cust.id,
          display_name: cust.display_name,
          phone: cust.phone,
          email: cust.email,
          gstin: cust.gstin,
          state: cust.place_of_supply || cust.customer_addresses?.[0]?.state || null,
        }
      : null,
    organization: demoGetOrganizationProfile(),
  }

  // 1. Stock Outbound: Decrement product current_stock
  for (const item of items) {
    if (item.product_id) {
      const prod = demoProducts.find((p) => p.id === item.product_id)
      if (prod) {
        let deductQty = Number(item.quantity) || 0
        if (item.conversion_rate && Number(item.conversion_rate) > 0) {
          deductQty = deductQty * Number(item.conversion_rate)
        } else if (
          prod.secondary_unit &&
          item.unit &&
          prod.secondary_unit.toLowerCase() === item.unit.toLowerCase() &&
          prod.conversion_rate
        ) {
          deductQty = deductQty * Number(prod.conversion_rate)
        }
        prod.current_stock = (prod.current_stock || 0) - deductQty
      }
    }
  }

  // 2. Customer balance update & ledger entry
  if (cust) {
    cust.outstanding_balance = (cust.outstanding_balance || 0) + balanceDue
  }

  demoTransactions.unshift({
    id: `txn-${Date.now()}-inv`,
    organization_id: newInv.organization_id,
    customer_id: newInv.customer_id,
    transaction_type: 'invoice',
    reference_type: 'invoice',
    reference_id: newInv.id,
    reference_number: newInv.invoice_number,
    transaction_date: newInv.invoice_date,
    amount: newInv.total_amount,
    running_balance: cust ? cust.outstanding_balance : newInv.total_amount,
    narration: `Invoice ${newInv.invoice_number} generated`,
    created_at: new Date().toISOString(),
  })

  if (amountPaid > 0) {
    demoTransactions.unshift({
      id: `txn-${Date.now()}-pay`,
      organization_id: newInv.organization_id,
      customer_id: newInv.customer_id,
      transaction_type: 'payment',
      reference_type: 'payment',
      reference_id: `pay-${newInv.id}`,
      reference_number: newInv.payment_reference || `REC-${newInv.invoice_number}`,
      transaction_date: newInv.invoice_date,
      amount: -amountPaid,
      running_balance: cust ? cust.outstanding_balance : 0,
      narration: `Payment received (${newInv.payment_mode || 'Cash'})`,
      created_at: new Date().toISOString(),
    })

    // Post to Cash/Bank Ledger
    demoRecordCashBankTransaction({
      direction: 'in',
      amount: amountPaid,
      transaction_type: 'payment_in',
      transaction_date: newInv.invoice_date,
      payment_mode: newInv.payment_mode || 'cash',
      reference_type: 'invoice',
      reference_id: newInv.id,
      reference_number: newInv.invoice_number,
      narration: `Upfront payment for Invoice ${newInv.invoice_number}`,
      organization_id: newInv.organization_id,
    })
  }

  (newInv as any).stock_deducted = true
  demoInvoices.unshift(newInv)
  persistStore()
  return newInv
}

export function demoGetInvoice(id: string): any | null {
  const inv = demoInvoices.find((i) => i.id === id)
  if (!inv) return null

  const cust = demoCustomers.find((c) => c.id === inv.customer_id)
  const org = demoGetOrganizationProfile()
  return {
    ...inv,
    customers: cust
      ? {
          id: cust.id,
          display_name: cust.display_name,
          legal_name: cust.legal_name,
          phone: cust.phone,
          email: cust.email,
          gstin: cust.gstin,
          state: cust.place_of_supply || cust.customer_addresses?.[0]?.state || null,
        }
      : inv.customers || null,
    organization: org,
    invoice_taxes: [
      {
        hsn_sac_code: '8481',
        taxable_amount: inv.taxable_amount,
        gst_rate: 18,
        cgst_amount: inv.cgst_amount,
        sgst_amount: inv.sgst_amount,
        igst_amount: inv.igst_amount,
      },
    ],
  }
}

export function demoUpdateInvoice(id: string, patch: any): DemoInvoice | null {
  const index = demoInvoices.findIndex((i) => i.id === id)
  if (index === -1) return null

  const existing = demoInvoices[index]
  
  let subtotal = existing.subtotal
  let discountAmount = existing.discount_amount
  let taxableAmount = existing.taxable_amount
  let totalTax = existing.total_tax_amount
  let grandTotal = existing.total_amount
  let cgstAmount = existing.cgst_amount
  let sgstAmount = existing.sgst_amount
  let igstAmount = existing.igst_amount
  let roundOffAmount = existing.round_off_amount
  let isInterState = existing.is_inter_state
  let items = existing.invoice_items

  if (patch.items && Array.isArray(patch.items)) {
    const sellerStateCode = existing.seller_state_code || '27'
    const buyerStateInput = patch.place_of_supply || existing.place_of_supply || 'Maharashtra'
    const buyerStateCode = resolveDemoStateCode(buyerStateInput)

    const calc = calculateCentralGst({
      seller: { state_code: sellerStateCode, is_gst_registered: true },
      buyer: { state_code: buyerStateCode, is_gst_registered: true },
      supply: {
        reverse_charge: patch.reverse_charge !== undefined ? Boolean(patch.reverse_charge) : Boolean(existing.reverse_charge),
      },
      items: patch.items.map((it: any) => ({
        product_id: it.product_id || null,
        description: it.description || 'Line Item',
        hsn_sac_code: it.hsn_sac_code || null,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        discount_percent: Number(it.discount_percent) || 0,
        discount_amount: Number(it.discount_amount) || 0,
        gst_rate: it.gst_rate !== undefined && it.gst_rate !== null ? Number(it.gst_rate) : 18,
        cess_rate: Number(it.cess_rate) || 0,
        cess_amount: Number(it.cess_amount) || 0,
        is_gst_inclusive: Boolean(it.is_gst_inclusive),
        tax_treatment: it.tax_treatment || 'taxable',
      })),
      invoice_discount_type: patch.discount_type || existing.discount_type || 'fixed',
      invoice_discount_value: patch.discount_value !== undefined ? Number(patch.discount_value) : Number(existing.discount_value) || 0,
    })

    items = calc.lines.map((l, idx) => ({
      id: (patch.items[idx] && patch.items[idx].id) || `item-${Date.now()}-${idx}`,
      invoice_id: id,
      product_id: l.product_id || null,
      description: l.description,
      hsn_sac_code: l.hsn_sac_code,
      quantity: l.quantity,
      unit: patch.items[idx]?.unit || 'pcs',
      unit_price: l.unit_price,
      discount_percent: patch.items[idx]?.discount_percent || 0,
      discount_amount: l.discount_amount,
      taxable_amount: l.taxable_amount,
      gst_rate: l.gst_rate,
      cgst_rate: l.cgst_rate,
      sgst_rate: l.sgst_rate,
      igst_rate: l.igst_rate,
      cgst_amount: l.cgst_amount,
      sgst_amount: l.sgst_amount,
      igst_amount: l.igst_amount,
      tax_amount: l.total_tax,
      line_total: l.line_total,
      is_gst_inclusive: Boolean(patch.items[idx]?.is_gst_inclusive),
    }))

    subtotal = calc.subtotal
    discountAmount = calc.total_discount_amount
    taxableAmount = calc.taxable_amount
    totalTax = calc.total_tax_amount
    grandTotal = calc.grand_total
    cgstAmount = calc.cgst_amount
    sgstAmount = calc.sgst_amount
    igstAmount = calc.igst_amount
    roundOffAmount = calc.round_off_amount
    isInterState = calc.is_inter_state
  }

  const paymentStatus = patch.payment_status !== undefined 
    ? patch.payment_status 
    : (patch.amount_paid !== undefined 
        ? (patch.amount_paid >= grandTotal ? 'paid' : patch.amount_paid > 0 ? 'partial' : 'unpaid')
        : existing.payment_status || 'unpaid')

  const amountPaid = paymentStatus === 'paid' 
    ? grandTotal 
    : (patch.amount_paid !== undefined ? Number(patch.amount_paid) : (Number(existing.amount_paid) || 0))

  const balanceDue = Math.max(0, grandTotal - amountPaid)

  const updated: DemoInvoice = {
    ...existing,
    ...(patch.customer_id && { customer_id: patch.customer_id }),
    ...(patch.invoice_number && { invoice_number: patch.invoice_number }),
    ...(patch.invoice_date && { invoice_date: patch.invoice_date }),
    ...(patch.due_date !== undefined && { due_date: patch.due_date || null }),
    ...(patch.place_of_supply !== undefined && { place_of_supply: patch.place_of_supply || null }),
    ...(patch.reference_number !== undefined && { reference_number: patch.reference_number || null }),
    payment_status: paymentStatus,
    payment_mode: patch.payment_mode !== undefined ? patch.payment_mode : existing.payment_mode,
    payment_reference: patch.payment_reference !== undefined ? patch.payment_reference : existing.payment_reference,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    status: paymentStatus === 'paid' ? 'paid' : (amountPaid > 0 ? 'partial' : existing.status || 'draft'),
    subtotal,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    total_tax_amount: totalTax,
    round_off_amount: roundOffAmount,
    total_amount: grandTotal,
    is_inter_state: isInterState,
    ...(patch.notes !== undefined && { notes: patch.notes || null }),
    ...(patch.terms_and_conditions !== undefined && { terms_and_conditions: patch.terms_and_conditions || null }),
    invoice_items: items,
    updated_at: new Date().toISOString(),
  }

  demoInvoices[index] = updated
  return updated
}

export interface DemoTransaction {
  id: string
  organization_id: string
  customer_id?: string | null
  supplier_id?: string | null
  transaction_type: 'invoice' | 'payment' | 'purchase_bill' | 'credit_note' | 'debit_note' | 'opening_balance'
  reference_type: string
  reference_id: string
  reference_number: string
  transaction_date: string
  amount: number
  running_balance: number
  narration?: string | null
  created_at: string
}

export const demoTransactions: DemoTransaction[] = [
  {
    id: 'txn-demo-1',
    organization_id: DEMO_ORG_ID,
    customer_id: 'cust-demo-1',
    transaction_type: 'invoice',
    reference_type: 'invoice',
    reference_id: 'inv-demo-1',
    reference_number: 'INV-2026-1001',
    transaction_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    amount: 14160,
    running_balance: 14160,
    narration: 'Invoice INV-2026-1001 finalized',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'txn-demo-2',
    organization_id: DEMO_ORG_ID,
    customer_id: 'cust-demo-1',
    transaction_type: 'payment',
    reference_type: 'payment',
    reference_id: 'pay-demo-1',
    reference_number: 'UPI-9821894412',
    transaction_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    amount: -5000,
    running_balance: 9160,
    narration: 'Advance installment for valve order (UPI)',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

export function demoFinalizeInvoice(id: string): DemoInvoice | null {
  const inv = demoInvoices.find((i) => i.id === id)
  if (!inv) return null

  // 0. Strict Stock Availability Pre-check (Skip if already deducted upon sale creation)
  if (!(inv as any).stock_deducted) {
    for (const item of (inv.invoice_items || [])) {
      if (item.product_id) {
        const prod = demoProducts.find((p) => p.id === item.product_id)
        if (prod && prod.product_type === 'goods') {
          const available = Number(prod.current_stock) || 0
          let requested = Number(item.quantity) || 0
          if (item.conversion_rate && Number(item.conversion_rate) > 0) {
            requested = requested * Number(item.conversion_rate)
          } else if (
            prod.secondary_unit &&
            item.unit &&
            prod.secondary_unit.toLowerCase() === item.unit.toLowerCase() &&
            prod.conversion_rate
          ) {
            requested = requested * Number(prod.conversion_rate)
          }
          if ((inv as any).stop_sale_on_negative_stock && requested > available) {
            throw new Error(
              `INSUFFICIENT_STOCK: Item '${prod.name}' has only ${available} ${prod.primary_unit || 'PCS'} available in stock, but ${requested} was requested.`
            )
          }
        }
      }
    }
  }

  const total = Number(inv.total_amount) || 0
  const paid = Number(inv.amount_paid) || 0
  const due = Math.max(0, total - paid)

  const finalStatus = paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'issued')

  inv.status = finalStatus
  inv.payment_status = finalStatus === 'paid' ? 'paid' : (paid > 0 ? 'partial' : 'unpaid')
  inv.balance_due = due
  inv.finalized_at = new Date().toISOString()
  inv.updated_at = new Date().toISOString()

  // 1. Deduct stock for each line item (Only if not already deducted)
  if (!(inv as any).stock_deducted) {
    for (const item of (inv.invoice_items || [])) {
      if (item.product_id) {
        const prod = demoProducts.find((p) => p.id === item.product_id)
        if (prod) {
          let deductQty = Number(item.quantity || 0)
          if (item.conversion_rate && Number(item.conversion_rate) > 0) {
            deductQty = deductQty * Number(item.conversion_rate)
          } else if (
            prod.secondary_unit &&
            item.unit &&
            prod.secondary_unit.toLowerCase() === item.unit.toLowerCase() &&
            prod.conversion_rate
          ) {
            deductQty = deductQty * Number(prod.conversion_rate)
          }
          prod.current_stock = (prod.current_stock || 0) - deductQty
        }
      }
    }
    ;(inv as any).stock_deducted = true
  }

  // 2. Update customer balance in demo store
  const cust = demoCustomers.find((c) => c.id === inv.customer_id)
  if (cust) {
    cust.outstanding_balance = (cust.outstanding_balance || 0) + due
  }

  // 3. Post to customer transaction ledger
  demoTransactions.unshift({
    id: `txn-${Date.now()}-inv`,
    organization_id: inv.organization_id || DEMO_ORG_ID,
    customer_id: inv.customer_id,
    transaction_type: 'invoice',
    reference_type: 'invoice',
    reference_id: inv.id,
    reference_number: inv.invoice_number,
    transaction_date: inv.invoice_date || new Date().toISOString().split('T')[0],
    amount: total,
    running_balance: (cust?.outstanding_balance || 0),
    narration: `Invoice #${inv.invoice_number} finalized`,
    created_at: new Date().toISOString(),
  })

  if (paid > 0) {
    demoTransactions.unshift({
      id: `txn-${Date.now()}-pay`,
      organization_id: inv.organization_id || DEMO_ORG_ID,
      customer_id: inv.customer_id,
      transaction_type: 'payment',
      reference_type: 'invoice',
      reference_id: inv.id,
      reference_number: inv.payment_reference || inv.invoice_number,
      transaction_date: inv.invoice_date || new Date().toISOString().split('T')[0],
      amount: -paid,
      running_balance: (cust?.outstanding_balance || 0),
      narration: `Upfront payment received for Invoice #${inv.invoice_number}`,
      created_at: new Date().toISOString(),
    })

    demoRecordCashBankTransaction({
      direction: 'in',
      amount: paid,
      transaction_type: 'payment_in',
      transaction_date: inv.invoice_date || new Date().toISOString().split('T')[0],
      payment_mode: inv.payment_mode || 'cash',
      reference_type: 'invoice',
      reference_id: inv.id,
      reference_number: inv.payment_reference || inv.invoice_number,
      narration: `Upfront payment received for Invoice #${inv.invoice_number} via ${(inv.payment_mode || 'Cash').toUpperCase()}`,
      organization_id: inv.organization_id || DEMO_ORG_ID,
    })
  }

  return inv
}

export function demoRecordPayment(
  id: string,
  paymentData: { amount: number; payment_mode: any; payment_reference?: string }
): DemoInvoice | null {
  const inv = demoInvoices.find((i) => i.id === id)
  if (!inv) return null

  const payAmt = Number(paymentData.amount) || 0
  if (payAmt <= 0) return inv

  const total = Number(inv.total_amount) || 0
  const currentPaid = Number(inv.amount_paid) || 0
  const newAmountPaid = currentPaid + payAmt
  const newBalanceDue = Math.max(0, total - newAmountPaid)
  const newStatus = newAmountPaid >= total ? 'paid' : 'partial'

  inv.amount_paid = newAmountPaid
  inv.balance_due = newBalanceDue
  inv.status = newStatus
  inv.payment_status = newStatus
  inv.payment_mode = (paymentData.payment_mode as any) || inv.payment_mode
  inv.payment_reference = paymentData.payment_reference || inv.payment_reference
  inv.updated_at = new Date().toISOString()

  // Deduct from customer outstanding balance
  const cust = demoCustomers.find((c) => c.id === inv.customer_id)
  if (cust) {
    cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - payAmt)
  }

  // Record credit to customer transaction ledger
  demoTransactions.unshift({
    id: `txn-${Date.now()}-pay`,
    organization_id: inv.organization_id || DEMO_ORG_ID,
    customer_id: inv.customer_id,
    transaction_type: 'payment',
    reference_type: 'invoice',
    reference_id: inv.id,
    reference_number: inv.payment_reference || inv.invoice_number,
    transaction_date: new Date().toISOString().split('T')[0],
    amount: -payAmt,
    running_balance: cust ? cust.outstanding_balance : 0,
    narration: `Payment received for Invoice #${inv.invoice_number} via ${(paymentData.payment_mode || 'Cash').toUpperCase()}`,
    created_at: new Date().toISOString(),
  })

  // Post to Cash/Bank Ledger
  demoRecordCashBankTransaction({
    direction: 'in',
    amount: payAmt,
    transaction_type: 'payment_in',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_mode: paymentData.payment_mode || 'cash',
    reference_type: 'invoice',
    reference_id: inv.id,
    reference_number: paymentData.payment_reference || inv.invoice_number,
    narration: `Payment received for Invoice #${inv.invoice_number} via ${(paymentData.payment_mode || 'Cash').toUpperCase()}`,
    organization_id: inv.organization_id || DEMO_ORG_ID,
  })

  persistStore()
  return inv
}

export function demoCancelInvoice(id: string, reason: string): DemoInvoice | null {
  const inv = demoInvoices.find((i) => i.id === id)
  if (!inv) return null

  inv.status = 'cancelled'
  inv.void_reason = reason
  inv.updated_at = new Date().toISOString()

  // Reverse customer balance if was issued
  const cust = demoCustomers.find((c) => c.id === inv.customer_id)
  if (cust && inv.total_amount) {
    const remainingDue = inv.balance_due !== undefined ? inv.balance_due : inv.total_amount
    cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - remainingDue)
  }

  return inv
}

export function demoDeleteInvoice(id: string): boolean {
  const index = demoInvoices.findIndex((i) => i.id === id)
  if (index === -1) return false
  demoInvoices.splice(index, 1)
  return true
}

export interface DemoPayment {
  id: string
  organization_id: string
  customer_id: string
  payment_date: string
  amount_paise: number
  payment_method: string
  reference_number?: string | null
  notes?: string | null
  created_at: string
  customers?: {
    id: string
    name: string
    display_name?: string
    email?: string | null
    phone?: string | null
    gstin?: string | null
    billing_address?: string | null
  } | null
  allocations?: Array<{
    id: string
    payment_id: string
    invoice_id: string
    allocated_paise: number
    invoices?: {
      id: string
      invoice_number: string
      invoice_date: string
      total_paise: number
      paid_paise: number
      status: string
    } | null
  }>
}

export const demoPayments: DemoPayment[] = [
  {
    id: 'pay-demo-1',
    organization_id: DEMO_ORG_ID,
    customer_id: 'cust-demo-1',
    payment_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    amount_paise: 500000,
    payment_method: 'upi',
    reference_number: 'UPI-9821894412',
    notes: 'Advance installment for valve order',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    customers: {
      id: 'cust-demo-1',
      name: 'Apex Enterprises Pvt Ltd',
      display_name: 'Apex Enterprises Pvt Ltd',
      email: 'accounts@apexenterprises.in',
      phone: '+91 98765 43210',
      gstin: '27AABCA1234A1Z5',
      billing_address: 'Plot 42, MIDC Industrial Area, Pune, Maharashtra 411018',
    },
    allocations: [
      {
        id: 'alloc-demo-1',
        payment_id: 'pay-demo-1',
        invoice_id: 'inv-demo-1',
        allocated_paise: 500000,
        invoices: {
          id: 'inv-demo-1',
          invoice_number: 'INV-2026-0001',
          invoice_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          total_paise: 1416000,
          paid_paise: 500000,
          status: 'partial',
        },
      },
    ],
  },
]

export function demoGetPayments(filters?: {
  search?: string
  customerId?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  const { search = '', customerId, paymentMethod, startDate, endDate, page = 1, limit = 20 } = filters || {}
  let filtered = [...demoPayments]

  if (customerId) {
    filtered = filtered.filter((p) => p.customer_id === customerId)
  }
  if (paymentMethod && paymentMethod !== 'all') {
    filtered = filtered.filter((p) => p.payment_method.toLowerCase() === paymentMethod.toLowerCase())
  }
  if (startDate) {
    filtered = filtered.filter((p) => p.payment_date >= startDate)
  }
  if (endDate) {
    filtered = filtered.filter((p) => p.payment_date <= endDate)
  }
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        (p.reference_number && p.reference_number.toLowerCase().includes(q)) ||
        (p.customers?.name && p.customers.name.toLowerCase().includes(q)) ||
        (p.customers?.display_name && p.customers.display_name.toLowerCase().includes(q))
    )
  }

  filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return {
    payments: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

export function demoGetPaymentDetails(id: string) {
  const payment = demoPayments.find((p) => p.id === id)
  if (!payment) return null
  const org = demoGetOrganizationProfile()
  return {
    ...payment,
    organization: org,
  }
}

export function demoAddPayment(data: any) {
  const cust = demoCustomers.find((c) => c.id === data.customer_id)
  const payId = `pay-${Date.now()}`
  const now = new Date().toISOString()
  const payRupees = Number(data.amount ?? (data.amount_paise ? data.amount_paise / 100 : 0))
  const amountPaise = Math.round(payRupees * 100)

  const allocations = (data.allocations || []).map((a: any, idx: number) => {
    const inv = demoInvoices.find((i) => i.id === a.invoice_id)
    const allocRupees = Number(a.allocated_amount ?? a.allocated ?? (a.allocated_paise ? a.allocated_paise / 100 : 0))
    const allocPaise = Math.round(allocRupees * 100)
    if (inv) {
      inv.amount_paid = (Number(inv.amount_paid) || 0) + allocRupees
      inv.balance_due = Math.max(0, (Number(inv.total_amount) || 0) - inv.amount_paid)
      inv.status = inv.balance_due === 0 ? 'paid' : 'partial'
      inv.payment_status = inv.status
    }
    return {
      id: `alloc-${Date.now()}-${idx}`,
      payment_id: payId,
      invoice_id: a.invoice_id,
      allocated: allocRupees,
      allocated_amount: allocRupees,
      allocated_paise: allocPaise,
      invoices: inv
        ? {
            id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            total_amount: Number(inv.total_amount) || 0,
            amount_paid: Number(inv.amount_paid) || 0,
            total_paise: Math.round((Number(inv.total_amount) || 0) * 100),
            paid_paise: Math.round((Number(inv.amount_paid) || 0) * 100),
            status: inv.status,
          }
        : null,
    }
  })

  // Deduct from customer outstanding
  if (cust) {
    cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - payRupees)
  }

  const newPayment: any = {
    id: payId,
    organization_id: data.organization_id || DEMO_ORG_ID,
    customer_id: data.customer_id,
    payment_date: data.payment_date || now.split('T')[0],
    amount: payRupees,
    amount_paise: amountPaise,
    payment_method: data.payment_method || 'cash',
    reference_number: data.reference_number || null,
    notes: data.notes || null,
    created_at: now,
    customers: cust
      ? {
          id: cust.id,
          name: cust.display_name,
          display_name: cust.display_name,
          email: cust.email || null,
          phone: cust.phone || null,
          gstin: cust.gstin || null,
          billing_address: cust.customer_addresses?.[0]?.line1 || null,
        }
      : null,
    allocations,
  }

  demoPayments.unshift(newPayment)

  // Append credit to customer ledger
  demoTransactions.unshift({
    id: `txn-${Date.now()}-pay`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    customer_id: data.customer_id,
    transaction_type: 'payment',
    reference_type: 'payment',
    reference_id: payId,
    reference_number: data.reference_number || payId,
    transaction_date: data.payment_date || now.split('T')[0],
    amount: -payRupees,
    running_balance: cust ? cust.outstanding_balance : 0,
    narration: `Payment received (${(data.payment_method || 'Cash').toUpperCase()})`,
    created_at: now,
  })

  // Post to Cash/Bank Ledger
  demoRecordCashBankTransaction({
    direction: 'in',
    amount: payRupees,
    transaction_type: 'payment_in',
    transaction_date: data.payment_date || now.split('T')[0],
    payment_mode: data.payment_method || 'cash',
    reference_type: 'payment',
    reference_id: payId,
    reference_number: data.reference_number || `REC-${payId}`,
    narration: `Customer payment received via ${(data.payment_method || 'Cash').toUpperCase()}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
  })

  return newPayment
}

// ------------------------------------------------------------------
// Live Metal Rates
// ------------------------------------------------------------------

export const demoMetalRates: Record<string, number> = {
  gold_24k: 15000,
  gold_22k: 13750,
  gold_18k: 11250,
  silver: 90,
  diamond: 50000,
}

export function demoGetMetalRates() {
  return demoMetalRates
}

export function demoUpdateMetalRate(metal_type: string, new_rate: number) {
  demoMetalRates[metal_type] = new_rate

  demoProducts.forEach((p) => {
    if (p.is_live_price && p.metal_type === metal_type && p.metal_weight) {
      p.sale_price = p.metal_weight * new_rate
    }
  })

  return demoMetalRates
}

// ------------------------------------------------------------------
// Customer & Supplier Ledger Transactions
// ------------------------------------------------------------------

export function demoGetCustomerTransactions(customerId: string) {
  return demoTransactions.filter((t) => t.customer_id === customerId)
}

export function demoGetCustomerDetails(customerId: string) {
  const customer = demoCustomers.find((c) => c.id === customerId) || null
  if (!customer) return null

  const invoices = demoInvoices.filter((inv) => inv.customer_id === customerId)
  const payments = demoPayments.filter((p) => p.customer_id === customerId)
  const transactions = demoGetCustomerTransactions(customerId)

  const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)
  const paidAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0)
  const outstanding = Number(customer.outstanding_balance) || 0

  return {
    customer,
    summary: {
      totalSales: totalSales > 0 ? totalSales : (customer.outstanding_balance ? 45000 : 0),
      paidAmount: paidAmount > 0 ? paidAmount : (customer.outstanding_balance ? 30500 : 0),
      outstanding,
      creditLimit: Number(customer.credit_limit) || 0,
    },
    invoices,
    payments,
    quotations: [],
    transactions,
  }
}

export function demoGetSupplierTransactions(supplierId: string) {
  return demoTransactions.filter((t) => t.supplier_id === supplierId)
}

// ------------------------------------------------------------------
// Suppliers Store
// ------------------------------------------------------------------

export interface DemoSupplier {
  id: string
  organization_id: string
  name: string
  display_name: string
  email?: string | null
  phone?: string | null
  gstin?: string | null
  pan?: string | null
  state?: string | null
  state_code?: string | null
  billing_address?: string | null
  outstanding_balance: number
  outstanding_paise?: number
  is_active: boolean
  created_at: string
}

export const demoSuppliers: DemoSupplier[] = [
  {
    id: 'supp-demo-1',
    organization_id: DEMO_ORG_ID,
    name: 'Tata Steel Tubes Ltd',
    display_name: 'Tata Steel Tubes Ltd',
    email: 'sales@tatasteel.com',
    phone: '+91 91234 56789',
    gstin: '27AAACT1234T1Z1',
    state: 'Maharashtra',
    state_code: '27',
    billing_address: 'Tata Centre, 43 Jawaharlal Nehru Road, Kolkata',
    outstanding_balance: 24000,
    outstanding_paise: 2400000,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'supp-demo-2',
    organization_id: DEMO_ORG_ID,
    name: 'Bharat Heavy Electricals',
    display_name: 'Bharat Heavy Electricals',
    email: 'supplies@bhel.in',
    phone: '+91 93456 78901',
    gstin: '07AAACB5678C1Z2',
    state: 'Delhi',
    state_code: '07',
    billing_address: 'BHEL House, Siri Fort, New Delhi',
    outstanding_balance: 12500,
    outstanding_paise: 1250000,
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
]

export function demoGetSuppliers() {
  return [...demoSuppliers]
}

export function demoGetSupplier(id: string) {
  return demoSuppliers.find((s) => s.id === id) || null
}

export function demoAddSupplier(data: any): DemoSupplier {
  const newSupp: DemoSupplier = {
    id: `supp-demo-${Date.now()}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    name: data.name || data.display_name || 'Vendor',
    display_name: data.display_name || data.name || 'Vendor',
    email: data.email || null,
    phone: data.phone || null,
    gstin: data.gstin || null,
    pan: data.pan || null,
    state: data.state || 'Maharashtra',
    state_code: data.state_code || '27',
    billing_address: data.billing_address || null,
    outstanding_balance: Number(data.outstanding_balance || 0),
    outstanding_paise: Math.round(Number(data.outstanding_balance || 0) * 100),
    is_active: true,
    created_at: new Date().toISOString(),
  }
  demoSuppliers.unshift(newSupp)
  return newSupp
}

export function demoUpdateSupplier(id: string, data: any): DemoSupplier | null {
  const index = demoSuppliers.findIndex((s) => s.id === id)
  if (index === -1) return null
  demoSuppliers[index] = {
    ...demoSuppliers[index],
    ...data,
    name: data.name || data.display_name || demoSuppliers[index].name,
    display_name: data.display_name || data.name || demoSuppliers[index].display_name,
  }
  return demoSuppliers[index]
}

export function demoDeleteSupplier(id: string): boolean {
  const index = demoSuppliers.findIndex((s) => s.id === id)
  if (index === -1) return false
  demoSuppliers.splice(index, 1)
  return true
}

// ------------------------------------------------------------------
// Purchases Store
// ------------------------------------------------------------------

export interface DemoPurchaseBillItem {
  id: string
  purchase_bill_id: string
  product_id?: string | null
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  discount_amount: number
  taxable_amount: number
  gst_rate: number
  gst_type: string
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_amount: number
  conversion_rate?: number | null
  unit_price_paise?: number
  line_subtotal_paise?: number
  line_total_paise?: number
}

export interface DemoPurchaseBill {
  id: string
  organization_id: string
  supplier_id: string
  bill_number: string
  bill_date: string
  due_date?: string | null
  status: 'draft' | 'approved' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  subtotal: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  round_off_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  total_paise?: number
  paid_paise?: number
  notes?: string | null
  is_inter_state?: boolean
  total_tax_amount?: number
  created_at: string
  updated_at?: string
  purchase_bill_items: DemoPurchaseBillItem[]
  suppliers?: DemoSupplier | null
}

export const demoPurchaseBills: DemoPurchaseBill[] = [
  {
    id: 'bill-demo-1',
    organization_id: DEMO_ORG_ID,
    supplier_id: 'supp-demo-1',
    bill_number: 'PB-2026-0001',
    bill_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    due_date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
    status: 'approved',
    subtotal: 20000,
    discount_amount: 0,
    taxable_amount: 20000,
    cgst_amount: 1800,
    sgst_amount: 1800,
    igst_amount: 0,
    round_off_amount: 0,
    total_amount: 23600,
    amount_paid: 0,
    balance_due: 23600,
    total_paise: 2360000,
    paid_paise: 0,
    notes: 'Batch pipes delivery',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    purchase_bill_items: [
      {
        id: 'bitem-1',
        purchase_bill_id: 'bill-demo-1',
        product_id: 'prod-demo-1',
        description: 'Industrial Valve 2-inch',
        quantity: 50,
        unit: 'PCS',
        unit_price: 400,
        discount_percent: 0,
        discount_amount: 0,
        taxable_amount: 20000,
        gst_rate: 18,
        gst_type: 'exclusive',
        cgst_amount: 1800,
        sgst_amount: 1800,
        igst_amount: 0,
        total_amount: 23600,
        unit_price_paise: 40000,
        line_subtotal_paise: 2000000,
        line_total_paise: 2360000,
      },
    ],
    suppliers: demoSuppliers[0],
  },
]

export function demoGetPurchaseBills(options?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}) {
  const { search = '', status = 'all', page = 1, limit = 15 } = options || {}
  let filtered = [...demoPurchaseBills]

  const effectiveStatus = status === 'unpaid' ? 'approved' : status
  if (effectiveStatus && effectiveStatus !== 'all') {
    filtered = filtered.filter((b) => b.status === effectiveStatus)
  }

  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (b) =>
        b.bill_number.toLowerCase().includes(q) ||
        (b.suppliers?.name && b.suppliers.name.toLowerCase().includes(q))
    )
  }

  filtered.sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime())
  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return {
    bills: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

export function demoGetPurchaseBill(id: string) {
  const bill = demoPurchaseBills.find((b) => b.id === id)
  if (!bill) return null
  return {
    ...bill,
    suppliers: demoSuppliers.find((s) => s.id === bill.supplier_id) || bill.suppliers,
  }
}

export function demoAddPurchaseBill(data: any): DemoPurchaseBill {
  const billId = `bill-demo-${Date.now()}`
  const supp = demoSuppliers.find((s) => s.id === data.supplier_id) || demoSuppliers[0]

  const buyerStateCode = resolveDemoStateCode(data.buyer_state_code || '27')
  const sellerStateCode = resolveDemoStateCode(supp?.state_code || data.place_of_supply || buyerStateCode)

  const calc = calculateCentralGst({
    seller: { state_code: sellerStateCode, is_gst_registered: Boolean(supp?.gstin) },
    buyer: { state_code: buyerStateCode, is_gst_registered: true },
    items: (data.items || []).map((it: any) => ({
      product_id: it.product_id || null,
      description: it.description || 'Purchase Item',
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price ?? (it.unit_price_paise ? it.unit_price_paise / 100 : 0)),
      discount_percent: Number(it.discount_percent ?? it.discount_pct ?? 0),
      discount_amount: Number(it.discount_amount || 0),
      is_gst_inclusive: Boolean(it.is_gst_inclusive || it.gst_type === 'inclusive'),
      gst_rate: Number(it.gst_rate) || 0,
      hsn_sac_code: it.hsn_sac || null,
    })),
  })

  const items: DemoPurchaseBillItem[] = calc.lines.map((li, idx) => ({
    id: `bitem-${Date.now()}-${idx}`,
    purchase_bill_id: billId,
    product_id: li.product_id || null,
    description: li.description,
    quantity: li.quantity,
    unit: data.items?.[idx]?.unit || 'PCS',
    unit_price: li.unit_price,
    discount_percent: data.items?.[idx]?.discount_percent ?? data.items?.[idx]?.discount_pct ?? 0,
    discount_amount: li.discount_amount,
    taxable_amount: li.taxable_amount,
    gst_rate: li.gst_rate,
    gst_type: Boolean(data.items?.[idx]?.is_gst_inclusive || data.items?.[idx]?.gst_type === 'inclusive') ? 'inclusive' : 'exclusive',
    cgst_amount: li.cgst_amount,
    sgst_amount: li.sgst_amount,
    igst_amount: li.igst_amount,
    total_amount: li.line_total,
    unit_price_paise: Math.round(li.unit_price * 100),
    line_subtotal_paise: Math.round(li.taxable_amount * 100),
    line_total_paise: Math.round(li.line_total * 100),
    cgst_paise: Math.round(li.cgst_amount * 100),
    sgst_paise: Math.round(li.sgst_amount * 100),
    igst_paise: Math.round(li.igst_amount * 100),
  }))

  const finalTotal = calc.grand_total
  const amountPaid = Math.min(Number(data.amount_paid) || 0, finalTotal)
  const balanceDue = Math.max(0, finalTotal - amountPaid)
  const status = data.status === 'approved' 
    ? (balanceDue === 0 && amountPaid > 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'approved')
    : 'draft'

  const newBill: DemoPurchaseBill = {
    id: billId,
    organization_id: data.organization_id || DEMO_ORG_ID,
    supplier_id: supp ? supp.id : (data.supplier_id || 'supp-demo-1'),
    bill_number: data.bill_number || `PB-${Date.now().toString().slice(-6)}`,
    bill_date: data.bill_date || new Date().toISOString().split('T')[0],
    due_date: data.due_date || null,
    status,
    subtotal: calc.subtotal,
    discount_amount: calc.total_discount_amount,
    taxable_amount: calc.taxable_amount,
    cgst_amount: calc.cgst_amount,
    sgst_amount: calc.sgst_amount,
    igst_amount: calc.igst_amount,
    total_tax_amount: calc.total_tax_amount,
    is_inter_state: calc.is_inter_state,
    round_off_amount: calc.round_off_amount,
    total_amount: finalTotal,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    total_paise: Math.round(finalTotal * 100),
    paid_paise: Math.round(amountPaid * 100),
    notes: data.notes || null,
    created_at: new Date().toISOString(),
    purchase_bill_items: items,
    suppliers: supp,
  }

  demoPurchaseBills.unshift(newBill)
  return newBill
}

export function demoFinalizePurchaseBill(id: string): DemoPurchaseBill | null {
  const bill = demoPurchaseBills.find((b) => b.id === id)
  if (!bill) return null

  if (bill.status !== 'draft') {
    throw new Error(`Purchase bill is already finalized (Current status: ${bill.status.toUpperCase()})`)
  }

  const finalStatus = bill.balance_due === 0 && bill.amount_paid > 0 ? 'paid' : bill.amount_paid > 0 ? 'partial' : 'approved'
  bill.status = finalStatus

  // 1. Stock Inbound: Increment product current_stock
  for (const item of bill.purchase_bill_items) {
    if (item.product_id) {
      const prod = demoProducts.find((p) => p.id === item.product_id)
      if (prod) {
        let addQty = Number(item.quantity) || 0
        if (item.conversion_rate && Number(item.conversion_rate) > 0) {
          addQty = addQty * Number(item.conversion_rate)
        } else if (
          prod.secondary_unit &&
          item.unit &&
          prod.secondary_unit.toLowerCase() === item.unit.toLowerCase() &&
          prod.conversion_rate
        ) {
          addQty = addQty * Number(prod.conversion_rate)
        }
        prod.current_stock = (prod.current_stock || 0) + addQty
      }
    }
  }

  // 2. Increase supplier payable balance
  const supp = demoSuppliers.find((s) => s.id === bill.supplier_id)
  if (supp) {
    supp.outstanding_balance = (supp.outstanding_balance || 0) + bill.total_amount
    supp.outstanding_paise = Math.round(supp.outstanding_balance * 100)
  }

  // 3. Post to supplier ledger (+total_amount)
  demoTransactions.unshift({
    id: `txn-${Date.now()}-bill`,
    organization_id: bill.organization_id || DEMO_ORG_ID,
    supplier_id: bill.supplier_id,
    transaction_type: 'purchase_bill',
    reference_type: 'purchase_bill',
    reference_id: bill.id,
    reference_number: bill.bill_number,
    transaction_date: bill.bill_date,
    amount: bill.total_amount,
    running_balance: supp ? supp.outstanding_balance : bill.total_amount,
    narration: `Purchase bill #${bill.bill_number} finalized`,
    created_at: new Date().toISOString(),
  })

  // 4. Handle upfront payment if any
  if (bill.amount_paid > 0) {
    if (supp) {
      supp.outstanding_balance = Math.max(0, supp.outstanding_balance - bill.amount_paid)
      supp.outstanding_paise = Math.round(supp.outstanding_balance * 100)
    }

    demoTransactions.unshift({
      id: `txn-${Date.now()}-supp-pay`,
      organization_id: bill.organization_id || DEMO_ORG_ID,
      supplier_id: bill.supplier_id,
      transaction_type: 'payment',
      reference_type: 'purchase_bill',
      reference_id: bill.id,
      reference_number: bill.bill_number,
      transaction_date: bill.bill_date,
      amount: -bill.amount_paid,
      running_balance: supp ? supp.outstanding_balance : 0,
      narration: `Upfront payment for purchase bill #${bill.bill_number}`,
      created_at: new Date().toISOString(),
    })

    demoRecordCashBankTransaction({
      direction: 'out',
      amount: bill.amount_paid,
      transaction_type: 'payment_out',
      transaction_date: bill.bill_date,
      payment_mode: 'cash',
      reference_type: 'purchase_bill',
      reference_id: bill.id,
      reference_number: bill.bill_number,
      narration: `Payment for purchase bill #${bill.bill_number} to ${supp?.name || 'Supplier'}`,
      organization_id: bill.organization_id || DEMO_ORG_ID,
    })
  }

  return bill
}

export function demoRecordSupplierPayment(data: {
  supplier_id: string
  purchase_bill_id?: string | null
  amount: number
  payment_date: string
  payment_method?: string
  reference_number?: string | null
  notes?: string | null
  organization_id?: string
}) {
  const supp = demoSuppliers.find((s) => s.id === data.supplier_id)
  if (!supp) throw new Error('Supplier not found')

  const payAmt = Number(data.amount) || 0
  if (payAmt <= 0) throw new Error('Payment amount must be greater than zero')

  let targetBill: DemoPurchaseBill | undefined
  if (data.purchase_bill_id) {
    targetBill = demoPurchaseBills.find((b) => b.id === data.purchase_bill_id)
    if (!targetBill) throw new Error('Purchase bill not found')
    if (targetBill.supplier_id !== data.supplier_id) throw new Error('Bill does not belong to supplier')
    const balanceDue = Number(targetBill.balance_due) || 0
    if (payAmt > balanceDue) {
      throw new Error(`OVERPAYMENT_NOT_ALLOWED: Payment ₹${payAmt.toFixed(2)} exceeds bill balance due ₹${balanceDue.toFixed(2)}`)
    }
  } else {
    const currentPayable = Number(supp.outstanding_balance) || 0
    if (payAmt > currentPayable) {
      throw new Error(`OVERPAYMENT_NOT_ALLOWED: Payment ₹${payAmt.toFixed(2)} exceeds supplier payable balance ₹${currentPayable.toFixed(2)}`)
    }
  }

  // Deduct from supplier balance
  supp.outstanding_balance = Math.max(0, (supp.outstanding_balance || 0) - payAmt)
  supp.outstanding_paise = Math.round(supp.outstanding_balance * 100)

  // Update target bill if linked
  if (targetBill) {
    const newPaid = (Number(targetBill.amount_paid) || 0) + payAmt
    const billTotal = Number(targetBill.total_amount) || 0
    targetBill.amount_paid = newPaid
    targetBill.paid_paise = Math.round(newPaid * 100)
    targetBill.balance_due = Math.max(0, billTotal - newPaid)
    targetBill.status = targetBill.balance_due === 0 ? 'paid' : 'partial'
  }

  // Post to supplier ledger (-payAmt)
  demoTransactions.unshift({
    id: `txn-${Date.now()}-supp-pay`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    supplier_id: supp.id,
    transaction_type: 'payment',
    reference_type: targetBill ? 'purchase_bill' : 'payment_out',
    reference_id: targetBill?.id || supp.id,
    reference_number: data.reference_number || targetBill?.bill_number || `PAY-${Date.now().toString().slice(-4)}`,
    transaction_date: data.payment_date,
    amount: -payAmt,
    running_balance: supp.outstanding_balance,
    narration: data.notes || `Payment made to supplier ${supp.name}`,
    created_at: new Date().toISOString(),
  })

  // Post Cash/Bank OUT entry
  demoRecordCashBankTransaction({
    direction: 'out',
    amount: payAmt,
    transaction_type: 'payment_out',
    transaction_date: data.payment_date,
    payment_mode: data.payment_method || 'cash',
    reference_type: targetBill ? 'purchase_bill' : 'payment_out',
    reference_id: targetBill?.id || supp.id,
    reference_number: data.reference_number || targetBill?.bill_number || `PAY-${Date.now().toString().slice(-4)}`,
    narration: `Payment to supplier ${supp.name}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
  })

  return {
    success: true,
    payment_id: `sp-${Date.now()}`,
    amount: payAmt,
    supplier_id: supp.id,
    purchase_bill_id: targetBill?.id || null,
    remaining_payable: supp.outstanding_balance,
  }
}

export function demoCancelPurchaseBill(id: string) {
  const bill = demoPurchaseBills.find((b) => b.id === id)
  if (!bill) throw new Error('Purchase bill not found')
  if (bill.status === 'cancelled') throw new Error('Purchase bill is already cancelled')

  const wasFinalized = bill.status !== 'draft'

  if (wasFinalized) {
    // 1. Reverse stock
    for (const item of bill.purchase_bill_items) {
      if (item.product_id) {
        const prod = demoProducts.find((p) => p.id === item.product_id)
        if (prod) {
          prod.current_stock = Math.max(0, (prod.current_stock || 0) - Number(item.quantity))
        }
      }
    }

    // 2. Reverse supplier payable
    const supp = demoSuppliers.find((s) => s.id === bill.supplier_id)
    const unpaidPayable = Math.max(0, bill.total_amount - (bill.amount_paid || 0))
    if (supp) {
      supp.outstanding_balance = Math.max(0, (supp.outstanding_balance || 0) - unpaidPayable)
      supp.outstanding_paise = Math.round(supp.outstanding_balance * 100)
    }

    demoTransactions.unshift({
      id: `txn-${Date.now()}-pb-cancel`,
      organization_id: bill.organization_id || DEMO_ORG_ID,
      supplier_id: bill.supplier_id,
      transaction_type: 'adjustment' as any,
      reference_type: 'purchase_bill',
      reference_id: bill.id,
      reference_number: bill.bill_number,
      transaction_date: new Date().toISOString().split('T')[0],
      amount: -bill.total_amount,
      running_balance: supp ? supp.outstanding_balance : 0,
      narration: `Reversal for cancelled purchase bill #${bill.bill_number}`,
      created_at: new Date().toISOString(),
    })

    // 3. Reverse payment if any
    if (bill.amount_paid > 0) {
      demoRecordCashBankTransaction({
        direction: 'in',
        amount: bill.amount_paid,
        transaction_type: 'payment_in',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_mode: 'cash',
        reference_type: 'purchase_bill',
        reference_id: bill.id,
        reference_number: bill.bill_number,
        narration: `Refund / Reversal of payment for cancelled purchase bill #${bill.bill_number}`,
        organization_id: bill.organization_id || DEMO_ORG_ID,
      })
    }

    // 4. Reverse double-entry accounting entry if exists
    const origEntry = demoJournalEntries.find(
      (je) => je.reference_id === bill.id && je.status === 'posted'
    )
    if (origEntry) {
      try {
        demoReverseJournalEntry(origEntry.id, `Reversal for cancelled purchase bill #${bill.bill_number}`)
      } catch {
        // ignore if already reversed
      }
    }
  }

  bill.status = 'cancelled'
  bill.updated_at = new Date().toISOString()

  return {
    bill_id: bill.id,
    status: 'cancelled',
    reversed: true,
  }
}

// ------------------------------------------------------------------
// Staff Store
// ------------------------------------------------------------------

export interface DemoStaffMember {
  id: string
  organization_id: string
  user_id?: string | null
  email: string
  invited_email?: string | null
  role: string
  status: 'active' | 'invited' | 'suspended'
  created_at: string
}

export const demoStaffMembers: DemoStaffMember[] = [
  {
    id: 'mem-demo-1',
    organization_id: DEMO_ORG_ID,
    user_id: 'user-demo-1',
    email: 'admin@acmesystems.in',
    role: 'owner',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'mem-demo-2',
    organization_id: DEMO_ORG_ID,
    user_id: null,
    email: 'rahul.sales@acmesystems.in',
    invited_email: 'rahul.sales@acmesystems.in',
    role: 'sales',
    status: 'invited',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

export function demoGetStaffMembers() {
  return [...demoStaffMembers]
}

export function demoInviteStaffMember(payload: { email: string; role: string }): DemoStaffMember {
  const existing = demoStaffMembers.find(
    (m) => m.email.toLowerCase() === payload.email.toLowerCase() || m.invited_email?.toLowerCase() === payload.email.toLowerCase()
  )
  if (existing) {
    throw new Error(`Staff member with email '${payload.email}' already exists in this organization`)
  }

  const newMember: DemoStaffMember = {
    id: `mem-demo-${Date.now()}`,
    organization_id: DEMO_ORG_ID,
    user_id: null,
    email: payload.email,
    invited_email: payload.email,
    role: payload.role,
    status: 'invited',
    created_at: new Date().toISOString(),
  }

  demoStaffMembers.push(newMember)
  return newMember
}

// ------------------------------------------------------------------
// Expenses Store
// ------------------------------------------------------------------

export interface DemoExpense {
  id: string
  organization_id: string
  category: string
  description: string
  amount: number
  tax_amount: number
  expense_date: string
  payment_method: string
  vendor_name?: string | null
  created_at: string
}

export const demoExpenses: DemoExpense[] = [
  {
    id: 'exp-demo-1',
    organization_id: DEMO_ORG_ID,
    category: 'Rent & Lease',
    description: 'Factory Workshop Lease - September',
    amount: 35000,
    tax_amount: 6300,
    expense_date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    vendor_name: 'Industrial Estates Mumbai',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'exp-demo-2',
    organization_id: DEMO_ORG_ID,
    category: 'Utilities & Electricity',
    description: 'MSEB Electricity Bill',
    amount: 14200,
    tax_amount: 0,
    expense_date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0],
    payment_method: 'upi',
    vendor_name: 'Maharashtra State Electricity Board',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
]

export function demoGetExpenses() {
  return [...demoExpenses]
}

export function demoAddExpense(data: any): DemoExpense {
  const newExp: DemoExpense = {
    id: `exp-demo-${Date.now()}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    category: data.category || 'General',
    description: data.description || 'Business Expense',
    amount: Number(data.amount || 0),
    tax_amount: Number(data.tax_amount || 0),
    expense_date: data.expense_date || new Date().toISOString().split('T')[0],
    payment_method: data.payment_method || 'cash',
    vendor_name: data.vendor_name || null,
    created_at: new Date().toISOString(),
  }
  demoExpenses.unshift(newExp)
  return newExp
}

// ------------------------------------------------------------------
// Global Search (Demo Mode Fallback)
// ------------------------------------------------------------------

export function demoGlobalSearch(query: string, limitPerCategory: number = 5): any[] {
  const trimmed = query?.trim().toLowerCase() || ''
  if (!trimmed) return []

  const results: any[] = []

  // 1. Customers
  const matchedCusts = demoCustomers
    .filter((c) =>
      c.display_name.toLowerCase().includes(trimmed) ||
      (c.phone && c.phone.includes(trimmed)) ||
      (c.gstin && c.gstin.toLowerCase().includes(trimmed))
    )
    .slice(0, limitPerCategory)

  matchedCusts.forEach((c) => {
    results.push({
      id: c.id,
      entity_type: 'customer',
      title: c.display_name,
      subtitle: c.email || c.phone || 'Customer',
      status: 'Customer',
      amount: c.outstanding_balance,
      amount_paise: Math.round(c.outstanding_balance * 100),
      url: `/customers/${c.id}`,
    })
  })

  // 2. Suppliers
  const matchedSupps = demoSuppliers
    .filter((s) =>
      s.name.toLowerCase().includes(trimmed) ||
      (s.phone && s.phone.includes(trimmed)) ||
      (s.gstin && s.gstin.toLowerCase().includes(trimmed))
    )
    .slice(0, limitPerCategory)

  matchedSupps.forEach((s) => {
    results.push({
      id: s.id,
      entity_type: 'supplier',
      title: s.name,
      subtitle: s.email || s.phone || 'Supplier',
      status: 'Supplier',
      amount: s.outstanding_balance,
      amount_paise: Math.round(s.outstanding_balance * 100),
      url: `/purchases/suppliers/${s.id}`,
    })
  })

  // 3. Products
  const matchedProds = demoProducts
    .filter((p) =>
      p.name.toLowerCase().includes(trimmed) ||
      (p.sku && p.sku.toLowerCase().includes(trimmed)) ||
      (p.barcode && p.barcode.includes(trimmed))
    )
    .slice(0, limitPerCategory)

  matchedProds.forEach((p) => {
    results.push({
      id: p.id,
      entity_type: 'product',
      title: p.name,
      subtitle: p.sku ? `SKU: ${p.sku}` : 'Product',
      status: `Stock: ${p.current_stock}`,
      amount: p.sale_price,
      amount_paise: Math.round(p.sale_price * 100),
      url: `/products/${p.id}`,
    })
  })

  // 4. Invoices
  const matchedInvs = demoInvoices
    .filter((inv) =>
      inv.invoice_number.toLowerCase().includes(trimmed) ||
      (inv.customers?.display_name && inv.customers.display_name.toLowerCase().includes(trimmed))
    )
    .slice(0, limitPerCategory)

  matchedInvs.forEach((inv) => {
    results.push({
      id: inv.id,
      entity_type: 'invoice',
      title: inv.invoice_number,
      subtitle: inv.customers?.display_name || 'Invoice',
      status: (inv.status || 'DRAFT').toUpperCase(),
      amount: Number(inv.total_amount),
      amount_paise: Math.round(Number(inv.total_amount) * 100),
      url: `/sales/invoices/${inv.id}`,
    })
  })

  // 5. Purchases
  const matchedBills = demoPurchaseBills
    .filter((b) =>
      b.bill_number.toLowerCase().includes(trimmed) ||
      (b.suppliers?.name && b.suppliers.name.toLowerCase().includes(trimmed))
    )
    .slice(0, limitPerCategory)

  matchedBills.forEach((b) => {
    results.push({
      id: b.id,
      entity_type: 'purchase_bill',
      title: b.bill_number,
      subtitle: b.suppliers?.name || 'Purchase Bill',
      status: (b.status || 'DRAFT').toUpperCase(),
      amount: b.total_amount,
      amount_paise: Math.round(b.total_amount * 100),
      url: `/purchases/bills/${b.id}`,
    })
  })

  // 6. Payments
  const matchedPays = demoPayments
    .filter((pay) =>
      (pay.reference_number && pay.reference_number.toLowerCase().includes(trimmed)) ||
      (pay.customers?.name && pay.customers.name.toLowerCase().includes(trimmed))
    )
    .slice(0, limitPerCategory)

  matchedPays.forEach((pay) => {
    const amt = Number((pay as any).amount ?? (pay.amount_paise ? pay.amount_paise / 100 : 0))
    results.push({
      id: pay.id,
      entity_type: 'payment',
      title: pay.reference_number || pay.id,
      subtitle: pay.customers?.name || 'Customer Payment',
      status: (pay.payment_method || 'CASH').toUpperCase(),
      amount: amt,
      amount_paise: Math.round(amt * 100),
      url: `/payments/${pay.id}`,
    })
  })

  return results
}

// ------------------------------------------------------------------
// Demo Reports Engine
// ------------------------------------------------------------------

export function demoGetReportsData(type: string, subType: string = 'daily', filter?: any) {
  const dateRange = {
    startDate: filter?.startDate || '2026-09-01',
    endDate: filter?.endDate || '2026-09-30',
  }

  if (type === 'sales') {
    let grandTotal = 0
    let grandTaxable = 0
    let grandTax = 0
    let grandPaid = 0
    let grandOutstanding = 0

    const rows = demoInvoices.map((inv) => {
      const tot = Number(inv.total_amount) || 0
      const paid = Number(inv.amount_paid) || 0
      const taxable = Number(inv.taxable_amount) || 0
      const tax = Number(inv.total_tax_amount) || 0
      const due = Math.max(0, tot - paid)

      grandTotal += tot
      grandTaxable += taxable
      grandTax += tax
      grandPaid += paid
      grandOutstanding += due

      return {
        customer_id: inv.customer_id,
        customer_name: inv.customers?.display_name || 'Customer',
        gstin: inv.customers?.gstin || 'N/A',
        invoice_count: 1,
        total_amount: tot,
        taxable_amount: taxable,
        tax_amount: tax,
        paid_amount: paid,
        outstanding: due,
        total_paise: Math.round(tot * 100),
        taxable_paise: Math.round(taxable * 100),
        tax_paise: Math.round(tax * 100),
        paid_paise: Math.round(paid * 100),
        outstanding_paise: Math.round(due * 100),
      }
    })

    return {
      subType,
      dateRange,
      grandTotals: {
        total_amount: grandTotal,
        taxable_amount: grandTaxable,
        tax_amount: grandTax,
        paid_amount: grandPaid,
        outstanding: grandOutstanding,
        total_paise: Math.round(grandTotal * 100),
        taxable_paise: Math.round(grandTaxable * 100),
        tax_paise: Math.round(grandTax * 100),
        paid_paise: Math.round(grandPaid * 100),
        outstanding_paise: Math.round(grandOutstanding * 100),
      },
      rows,
      totalCount: rows.length,
      page: 1,
      limit: 20,
    }
  }

  if (type === 'purchases') {
    let grandTotal = 0
    let grandTaxable = 0
    let grandTax = 0

    const validBills = demoPurchaseBills.filter((b) => b.status !== 'draft' && b.status !== 'cancelled')
    const rows = validBills.map((b) => {
      const tot = Number(b.total_amount) || 0
      const taxable = Number(b.taxable_amount) || 0
      const tax = Number(b.cgst_amount + b.sgst_amount + b.igst_amount) || 0

      grandTotal += tot
      grandTaxable += taxable
      grandTax += tax

      return {
        supplier_id: b.supplier_id,
        supplier_name: b.suppliers?.name || 'Vendor',
        bill_number: b.bill_number,
        total_amount: tot,
        taxable_amount: taxable,
        tax_amount: tax,
        total_paise: Math.round(tot * 100),
        taxable_paise: Math.round(taxable * 100),
        tax_paise: Math.round(tax * 100),
      }
    })

    return {
      subType,
      dateRange,
      grandTotals: {
        total_amount: grandTotal,
        taxable_amount: grandTaxable,
        tax_amount: grandTax,
        total_paise: Math.round(grandTotal * 100),
        taxable_paise: Math.round(grandTaxable * 100),
        tax_paise: Math.round(grandTax * 100),
      },
      rows,
      totalCount: rows.length,
      page: 1,
      limit: 20,
    }
  }

  // Inventory / Stock
  const totalStockQty = demoProducts.reduce((s, p) => s + (p.current_stock || 0), 0)
  const totalStockValuation = demoProducts.reduce((s, p) => s + ((p.current_stock || 0) * (p.purchase_price || 0)), 0)

  return {
    subType,
    dateRange,
    grandTotals: {
      total_quantity: totalStockQty,
      total_valuation: totalStockValuation,
      total_valuation_paise: Math.round(totalStockValuation * 100),
    },
    rows: demoProducts.map((p) => ({
      product_id: p.id,
      name: p.name,
      sku: p.sku,
      current_stock: p.current_stock,
      unit_cost: p.purchase_price,
      valuation: (p.current_stock || 0) * (p.purchase_price || 0),
    })),
    totalCount: demoProducts.length,
    page: 1,
    limit: 20,
  }
}

// ============================================================
// Phase 2: Cash & Bank Financial Ledger In-Memory Store
// ============================================================

export interface DemoCashBankAccount {
  id: string
  organization_id: string
  account_name: string
  account_type: 'cash' | 'bank' | 'upi' | 'wallet'
  bank_name?: string | null
  account_number?: string | null
  ifsc_code?: string | null
  upi_id?: string | null
  opening_balance: number
  current_balance: number
  is_default: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface DemoCashBankTransaction {
  id: string
  organization_id: string
  account_id: string
  transaction_type: 'payment_in' | 'payment_out' | 'expense_out' | 'transfer' | 'opening_balance' | 'adjustment'
  direction: 'in' | 'out'
  amount: number
  running_balance: number
  transaction_date: string
  reference_type?: string | null
  reference_id?: string | null
  reference_number?: string | null
  payment_mode: string
  narration?: string | null
  created_by?: string | null
  created_at?: string
  account?: DemoCashBankAccount | null
}

export const demoCashBankAccounts: DemoCashBankAccount[] = [
  {
    id: 'cba-cash-default',
    organization_id: DEMO_ORG_ID,
    account_name: 'Cash in Hand',
    account_type: 'cash',
    opening_balance: 25000,
    current_balance: 25000,
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cba-bank-default',
    organization_id: DEMO_ORG_ID,
    account_name: 'State Bank of India',
    account_type: 'bank',
    bank_name: 'State Bank of India',
    account_number: '50200098765432',
    ifsc_code: 'SBIN0001234',
    upi_id: 'apex.enterprises@oksbi',
    opening_balance: 75000,
    current_balance: 75000,
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export const demoCashBankTransactions: DemoCashBankTransaction[] = [
  {
    id: 'cbt-init-1',
    organization_id: DEMO_ORG_ID,
    account_id: 'cba-cash-default',
    transaction_type: 'opening_balance',
    direction: 'in',
    amount: 25000,
    running_balance: 25000,
    transaction_date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
    payment_mode: 'cash',
    narration: 'Cash in Hand opening float',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'cbt-init-2',
    organization_id: DEMO_ORG_ID,
    account_id: 'cba-bank-default',
    transaction_type: 'opening_balance',
    direction: 'in',
    amount: 75000,
    running_balance: 75000,
    transaction_date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
    payment_mode: 'bank_transfer',
    narration: 'Primary Current Account opening balance',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
]

// In-Memory Idempotency Cache to prevent duplicate submissions
export const demoIdempotencyStore = new Map<string, { timestamp: number; response: any }>()

export function demoGetCashBankAccounts(): DemoCashBankAccount[] {
  return demoCashBankAccounts.filter((a) => a.is_active)
}

export function demoCreateCashBankAccount(data: Partial<DemoCashBankAccount>): DemoCashBankAccount {
  const newAccount: DemoCashBankAccount = {
    id: `cba-${Date.now()}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    account_name: data.account_name || 'Bank Account',
    account_type: data.account_type || 'bank',
    bank_name: data.bank_name || null,
    account_number: data.account_number || null,
    ifsc_code: data.ifsc_code || null,
    upi_id: data.upi_id || null,
    opening_balance: Number(data.opening_balance) || 0,
    current_balance: Number(data.opening_balance) || 0,
    is_default: Boolean(data.is_default),
    is_active: true,
    created_at: new Date().toISOString(),
  }

  if (newAccount.is_default) {
    demoCashBankAccounts.forEach((a) => {
      if (a.account_type === newAccount.account_type) {
        a.is_default = false
      }
    })
  }

  demoCashBankAccounts.push(newAccount)

  if (newAccount.opening_balance > 0) {
    demoCashBankTransactions.unshift({
      id: `cbt-${Date.now()}-open`,
      organization_id: newAccount.organization_id,
      account_id: newAccount.id,
      transaction_type: 'opening_balance',
      direction: 'in',
      amount: newAccount.opening_balance,
      running_balance: newAccount.current_balance,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_mode: newAccount.account_type === 'cash' ? 'cash' : 'bank_transfer',
      narration: 'Opening balance record',
      created_at: new Date().toISOString(),
    })
  }

  return newAccount
}

export function demoRecordCashBankTransaction(data: {
  account_id?: string
  direction: 'in' | 'out'
  amount: number
  transaction_type: 'payment_in' | 'payment_out' | 'expense_out' | 'transfer' | 'opening_balance' | 'adjustment'
  transaction_date?: string
  reference_type?: string
  reference_id?: string
  reference_number?: string
  payment_mode?: string
  narration?: string
  organization_id?: string
  user_id?: string
}): DemoCashBankTransaction {
  const mode = (data.payment_mode || 'cash').toLowerCase().trim()
  const targetType = mode === 'cash' ? 'cash' : 'bank'

  let targetAccount = demoCashBankAccounts.find(
    (a) => a.id === data.account_id || (a.account_type === targetType && a.is_default && a.is_active)
  )

  if (!targetAccount) {
    targetAccount = demoCashBankAccounts.find((a) => a.account_type === targetType && a.is_active)
  }

  if (!targetAccount) {
    targetAccount = demoCashBankAccounts[0]
  }

  const amt = Number(data.amount) || 0
  if (data.direction === 'in') {
    targetAccount.current_balance += amt
  } else {
    targetAccount.current_balance -= amt
  }

  const newTxn: DemoCashBankTransaction = {
    id: `cbt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    organization_id: data.organization_id || DEMO_ORG_ID,
    account_id: targetAccount.id,
    transaction_type: data.transaction_type,
    direction: data.direction,
    amount: amt,
    running_balance: targetAccount.current_balance,
    transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
    reference_type: data.reference_type || null,
    reference_id: data.reference_id || null,
    reference_number: data.reference_number || null,
    payment_mode: data.payment_mode || 'cash',
    narration: data.narration || null,
    created_by: data.user_id || 'demo-user',
    created_at: new Date().toISOString(),
    account: targetAccount,
  }

  demoCashBankTransactions.unshift(newTxn)
  return newTxn
}

export function demoGetCashBankTransactions(options?: {
  account_id?: string
  direction?: 'in' | 'out'
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}): { transactions: DemoCashBankTransaction[]; total: number } {
  const { account_id, direction, startDate, endDate, page = 1, limit = 20 } = options || {}
  let filtered = [...demoCashBankTransactions]

  if (account_id) {
    filtered = filtered.filter((t) => t.account_id === account_id)
  }

  if (direction) {
    filtered = filtered.filter((t) => t.direction === direction)
  }

  if (startDate) {
    filtered = filtered.filter((t) => t.transaction_date >= startDate)
  }

  if (endDate) {
    filtered = filtered.filter((t) => t.transaction_date <= endDate)
  }

  filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit).map((t) => ({
    ...t,
    account: demoCashBankAccounts.find((a) => a.id === t.account_id) || null,
  }))

  return {
    transactions: paginated,
    total,
  }
}

export function demoGetCashBankSummary(): {
  cash_balance: number
  bank_balance: number
  total_balance: number
  accounts_count: number
} {
  let cash = 0
  let bank = 0

  demoCashBankAccounts.forEach((acc) => {
    if (acc.is_active) {
      if (acc.account_type === 'cash') {
        cash += Number(acc.current_balance) || 0
      } else {
        bank += Number(acc.current_balance) || 0
      }
    }
  })

  return {
    cash_balance: cash,
    bank_balance: bank,
    total_balance: cash + bank,
    accounts_count: demoCashBankAccounts.filter((a) => a.is_active).length,
  }
}

// ============================================================
// PHASE 4: DOUBLE-ENTRY ACCOUNTING IN-MEMORY STORE
// ============================================================

export interface DemoAccount {
  id: string
  organization_id: string
  account_code: string
  account_name: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  parent_account_id?: string | null
  opening_balance: number
  opening_balance_type: 'DEBIT' | 'CREDIT'
  current_balance: number
  is_system_account: boolean
  is_active: boolean
  description?: string | null
  created_at: string
  updated_at: string
}

export interface DemoJournalEntryLine {
  id: string
  organization_id: string
  journal_entry_id: string
  account_id: string
  debit: number
  credit: number
  description?: string | null
  created_at: string
  account?: DemoAccount
}

export interface DemoJournalEntry {
  id: string
  organization_id: string
  entry_number: string
  entry_date: string
  reference_type?: string | null
  reference_id?: string | null
  description: string
  status: 'draft' | 'posted' | 'void'
  source: string
  total_amount: number
  total_debit: number
  total_credit: number
  created_by?: string | null
  created_at: string
  updated_at: string
  lines: DemoJournalEntryLine[]
}

export interface DemoAccountingSettings {
  id: string
  organization_id: string
  financial_year_start: string
  default_cash_account_id?: string | null
  default_bank_account_id?: string | null
  default_ar_account_id?: string | null
  default_ap_account_id?: string | null
  default_sales_account_id?: string | null
  default_purchase_account_id?: string | null
  auto_post_invoices: boolean
  auto_post_purchases: boolean
  auto_post_payments: boolean
  auto_post_expenses: boolean
  created_at: string
  updated_at: string
}

export const demoAccounts: DemoAccount[] = [
  // Assets (1000 - 1999)
  {
    id: 'acc-1010',
    organization_id: DEMO_ORG_ID,
    account_code: '1010',
    account_name: 'Cash on Hand',
    account_type: 'ASSET',
    opening_balance: 50000,
    opening_balance_type: 'DEBIT',
    current_balance: 50000,
    is_system_account: true,
    is_active: true,
    description: 'Physical currency held on premises',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1020',
    organization_id: DEMO_ORG_ID,
    account_code: '1020',
    account_name: 'Bank Account',
    account_type: 'ASSET',
    opening_balance: 150000,
    opening_balance_type: 'DEBIT',
    current_balance: 150000,
    is_system_account: true,
    is_active: true,
    description: 'Primary corporate checking/savings account',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1030',
    organization_id: DEMO_ORG_ID,
    account_code: '1030',
    account_name: 'UPI / Online Payment Clearing',
    account_type: 'ASSET',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Digital payment gateway settlement account',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1040',
    organization_id: DEMO_ORG_ID,
    account_code: '1040',
    account_name: 'Accounts Receivable (Debtors)',
    account_type: 'ASSET',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Receivables owed by customers for goods/services',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1050',
    organization_id: DEMO_ORG_ID,
    account_code: '1050',
    account_name: 'Inventory Asset',
    account_type: 'ASSET',
    opening_balance: 75000,
    opening_balance_type: 'DEBIT',
    current_balance: 75000,
    is_system_account: true,
    is_active: true,
    description: 'Value of stock on hand held for sale',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1060',
    organization_id: DEMO_ORG_ID,
    account_code: '1060',
    account_name: 'Input CGST',
    account_type: 'ASSET',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Central GST paid on purchases (Input Tax Credit)',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1070',
    organization_id: DEMO_ORG_ID,
    account_code: '1070',
    account_name: 'Input SGST',
    account_type: 'ASSET',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'State GST paid on purchases (Input Tax Credit)',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-1080',
    organization_id: DEMO_ORG_ID,
    account_code: '1080',
    account_name: 'Input IGST',
    account_type: 'ASSET',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Integrated GST paid on inter-state purchases (ITC)',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },

  // Liabilities (2000 - 2999)
  {
    id: 'acc-2010',
    organization_id: DEMO_ORG_ID,
    account_code: '2010',
    account_name: 'Accounts Payable (Creditors)',
    account_type: 'LIABILITY',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Payables owed to vendors and suppliers',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-2020',
    organization_id: DEMO_ORG_ID,
    account_code: '2020',
    account_name: 'Output CGST',
    account_type: 'LIABILITY',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Central GST collected on sales (Tax Payable)',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-2030',
    organization_id: DEMO_ORG_ID,
    account_code: '2030',
    account_name: 'Output SGST',
    account_type: 'LIABILITY',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'State GST collected on sales (Tax Payable)',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-2040',
    organization_id: DEMO_ORG_ID,
    account_code: '2040',
    account_name: 'Output IGST',
    account_type: 'LIABILITY',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Integrated GST collected on inter-state sales',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },

  // Equity (3000 - 3999)
  {
    id: 'acc-3010',
    organization_id: DEMO_ORG_ID,
    account_code: '3010',
    account_name: 'Owner Capital',
    account_type: 'EQUITY',
    opening_balance: 275000,
    opening_balance_type: 'CREDIT',
    current_balance: 275000,
    is_system_account: true,
    is_active: true,
    description: 'Initial and contributed capital by business owner',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-3020',
    organization_id: DEMO_ORG_ID,
    account_code: '3020',
    account_name: 'Owner Drawings',
    account_type: 'EQUITY',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Withdrawals of funds/assets by owner',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-3030',
    organization_id: DEMO_ORG_ID,
    account_code: '3030',
    account_name: 'Retained Earnings',
    account_type: 'EQUITY',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Accumulated profits retained in the business',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },

  // Income (4000 - 4999)
  {
    id: 'acc-4010',
    organization_id: DEMO_ORG_ID,
    account_code: '4010',
    account_name: 'Sales Revenue',
    account_type: 'INCOME',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Operating sales revenue from goods and services',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-4020',
    organization_id: DEMO_ORG_ID,
    account_code: '4020',
    account_name: 'Other Income',
    account_type: 'INCOME',
    opening_balance: 0,
    opening_balance_type: 'CREDIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Non-operating discounts and interest income',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },

  // Expenses (5000 - 5999)
  {
    id: 'acc-5010',
    organization_id: DEMO_ORG_ID,
    account_code: '5010',
    account_name: 'Cost of Goods Sold / Purchases',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Direct merchandise purchases and supply costs',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-5020',
    organization_id: DEMO_ORG_ID,
    account_code: '5020',
    account_name: 'Rent Expense',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Shop, office, and warehouse lease payments',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-5030',
    organization_id: DEMO_ORG_ID,
    account_code: '5030',
    account_name: 'Salary & Staff Wages',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Employee payroll and compensation',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-5040',
    organization_id: DEMO_ORG_ID,
    account_code: '5040',
    account_name: 'Electricity & Utilities',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Electricity, water, and broadband expenses',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-5050',
    organization_id: DEMO_ORG_ID,
    account_code: '5050',
    account_name: 'Marketing & Promotion',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Advertising, promotion, and marketing campaigns',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-5060',
    organization_id: DEMO_ORG_ID,
    account_code: '5060',
    account_name: 'Office & Admin Expenses',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Stationery, consumables, and office administration',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acc-5070',
    organization_id: DEMO_ORG_ID,
    account_code: '5070',
    account_name: 'Other Operating Expenses',
    account_type: 'EXPENSE',
    opening_balance: 0,
    opening_balance_type: 'DEBIT',
    current_balance: 0,
    is_system_account: true,
    is_active: true,
    description: 'Miscellaneous operating expenses',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]

export const demoJournalEntries: DemoJournalEntry[] = []

export const demoAccountingSettings: DemoAccountingSettings = {
  id: 'acc-set-demo-1',
  organization_id: DEMO_ORG_ID,
  financial_year_start: '2026-04-01',
  default_cash_account_id: 'acc-1010',
  default_bank_account_id: 'acc-1020',
  default_ar_account_id: 'acc-1040',
  default_ap_account_id: 'acc-2010',
  default_sales_account_id: 'acc-4010',
  default_purchase_account_id: 'acc-5010',
  auto_post_invoices: true,
  auto_post_purchases: true,
  auto_post_payments: true,
  auto_post_expenses: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

// ---- Chart of Accounts Methods ----

export function demoGetAccounts(options?: {
  organization_id?: string
  account_type?: string
  search?: string
  is_active?: boolean
}): DemoAccount[] {
  const orgId = options?.organization_id || DEMO_ORG_ID
  let list = demoAccounts.filter((a) => a.organization_id === orgId)

  if (options?.account_type && options.account_type !== 'all') {
    list = list.filter((a) => a.account_type === options.account_type)
  }

  if (options?.is_active !== undefined) {
    list = list.filter((a) => a.is_active === options.is_active)
  }

  if (options?.search) {
    const q = options.search.toLowerCase()
    list = list.filter(
      (a) => a.account_code.toLowerCase().includes(q) || a.account_name.toLowerCase().includes(q)
    )
  }

  return list.sort((a, b) => a.account_code.localeCompare(b.account_code, undefined, { numeric: true }))
}

export function demoGetAccount(id: string): DemoAccount | null {
  return demoAccounts.find((a) => a.id === id) || null
}

export function demoGetAccountByCode(code: string, orgId: string = DEMO_ORG_ID): DemoAccount | null {
  return demoAccounts.find((a) => a.account_code === code && a.organization_id === orgId) || null
}

export function demoCreateAccount(data: any): DemoAccount {
  const orgId = data.organization_id || DEMO_ORG_ID

  const exists = demoAccounts.some((a) => a.organization_id === orgId && a.account_code === data.account_code)
  if (exists) {
    throw new Error(`Account code '${data.account_code}' already exists in this organization.`)
  }

  const opening = Number(data.opening_balance) || 0
  const newAcc: DemoAccount = {
    id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    organization_id: orgId,
    account_code: data.account_code,
    account_name: data.account_name,
    account_type: data.account_type,
    parent_account_id: data.parent_account_id || null,
    opening_balance: opening,
    opening_balance_type: data.opening_balance_type || 'DEBIT',
    current_balance: opening,
    is_system_account: Boolean(data.is_system_account),
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
    description: data.description || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  demoAccounts.push(newAcc)
  return newAcc
}

export function demoUpdateAccount(id: string, data: any): DemoAccount {
  const acc = demoAccounts.find((a) => a.id === id)
  if (!acc) throw new Error('Account not found')

  if (data.account_code && data.account_code !== acc.account_code) {
    const conflict = demoAccounts.some(
      (a) => a.id !== id && a.organization_id === acc.organization_id && a.account_code === data.account_code
    )
    if (conflict) {
      throw new Error(`Account code '${data.account_code}' already in use.`)
    }
    acc.account_code = data.account_code
  }

  if (data.account_name) acc.account_name = data.account_name
  if (data.account_type) acc.account_type = data.account_type
  if (data.description !== undefined) acc.description = data.description
  if (data.is_active !== undefined) acc.is_active = Boolean(data.is_active)
  if (data.parent_account_id !== undefined) acc.parent_account_id = data.parent_account_id

  acc.updated_at = new Date().toISOString()
  return acc
}

export function demoDeleteAccount(id: string): { success: boolean } {
  const idx = demoAccounts.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error('Account not found')

  const acc = demoAccounts[idx]
  if (acc.is_system_account) {
    throw new Error('SYSTEM_ACCOUNT_PROTECTED: Default system accounts cannot be deleted.')
  }

  // Check if has journal lines
  const hasTxns = demoJournalEntries.some((je) => je.lines.some((l) => l.account_id === id))
  if (hasTxns) {
    throw new Error('ACCOUNT_HAS_TRANSACTIONS: Cannot delete account with posted journal entries. Deactivate it instead.')
  }

  demoAccounts.splice(idx, 1)
  return { success: true }
}

// ---- Journal Entry Methods ----

export function demoCreateJournalEntry(data: {
  organization_id?: string
  entry_number?: string | null
  entry_date: string
  reference_type?: string | null
  reference_id?: string | null
  description: string
  source?: string
  created_by?: string | null
  lines: Array<{
    account_id: string
    debit?: number
    credit?: number
    description?: string | null
  }>
}): DemoJournalEntry {
  const orgId = data.organization_id || DEMO_ORG_ID

  if (!data.lines || data.lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines.')
  }

  // Idempotency check: if reference_type and reference_id provided and already exists with same ref, return existing
  if (data.reference_type && data.reference_id) {
    const existing = demoJournalEntries.find(
      (je) =>
        je.organization_id === orgId &&
        je.reference_type === data.reference_type &&
        je.reference_id === data.reference_id &&
        je.status !== 'void'
    )
    if (existing) {
      return existing
    }
  }

  // Mandatory Double-Entry Balance Invariant: TOTAL DEBIT == TOTAL CREDIT
  let totalDebitPaise = 0
  let totalCreditPaise = 0

  for (const line of data.lines) {
    const debit = Number(line.debit) || 0
    const credit = Number(line.credit) || 0

    if (debit < 0 || credit < 0) {
      throw new Error('Debit and credit amounts cannot be negative.')
    }

    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new Error('Each journal line must specify either a positive debit or a positive credit, not both or neither.')
    }

    totalDebitPaise += Math.round(debit * 100)
    totalCreditPaise += Math.round(credit * 100)
  }

  if (totalDebitPaise !== totalCreditPaise) {
    const diff = Math.abs(totalDebitPaise - totalCreditPaise) / 100
    throw new Error(
      `DOUBLE_ENTRY_UNBALANCED: Total debit (₹${(totalDebitPaise / 100).toFixed(2)}) must equal total credit (₹${(totalCreditPaise / 100).toFixed(2)}). Difference: ₹${diff.toFixed(2)}.`
    )
  }

  const entryId = `je-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const entryNumber = data.entry_number || `JE-${Date.now().toString().slice(-6)}`

  // Build entry lines and apply balance mutations to accounts
  const lines: DemoJournalEntryLine[] = data.lines.map((l, idx) => {
    const debit = Number(l.debit) || 0
    const credit = Number(l.credit) || 0
    const acc = demoAccounts.find((a) => a.id === l.account_id && a.organization_id === orgId)

    if (!acc) {
      throw new Error(`Account '${l.account_id}' not found in organization.`)
    }

    // Mutate account balance according to normal balance rules:
    // ASSET / EXPENSE: Debit increases (+), Credit decreases (-)
    // LIABILITY / EQUITY / INCOME: Credit increases (+), Debit decreases (-)
    if (acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE') {
      acc.current_balance = Number((acc.current_balance + debit - credit).toFixed(2))
    } else {
      acc.current_balance = Number((acc.current_balance + credit - debit).toFixed(2))
    }
    acc.updated_at = new Date().toISOString()

    return {
      id: `jel-${Date.now()}-${idx}`,
      organization_id: orgId,
      journal_entry_id: entryId,
      account_id: l.account_id,
      debit,
      credit,
      description: l.description || null,
      created_at: new Date().toISOString(),
      account: { ...acc },
    }
  })

  const newEntry: DemoJournalEntry = {
    id: entryId,
    organization_id: orgId,
    entry_number: entryNumber,
    entry_date: data.entry_date || new Date().toISOString().split('T')[0],
    reference_type: data.reference_type || null,
    reference_id: data.reference_id || null,
    description: data.description,
    status: 'posted',
    source: data.source || 'manual',
    total_amount: totalDebitPaise / 100,
    total_debit: totalDebitPaise / 100,
    total_credit: totalCreditPaise / 100,
    created_by: data.created_by || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lines,
  }

  demoJournalEntries.unshift(newEntry)
  return newEntry
}

export function demoReverseJournalEntry(id: string, reason: string, orgId?: string): DemoJournalEntry {
  const original = demoJournalEntries.find((je) => je.id === id)
  if (!original || (orgId && original.organization_id !== orgId)) {
    throw new Error('Journal entry not found or unauthorized')
  }

  if (original.status === 'void') {
    throw new Error('Journal entry is already reversed.')
  }

  // Mark original as void
  original.status = 'void'
  original.updated_at = new Date().toISOString()

  // Create compensating reversal lines (flip debit and credit)
  const reversalLines = original.lines.map((l) => ({
    account_id: l.account_id,
    debit: l.credit,
    credit: l.debit,
    description: `Reversal of line: ${l.description || original.description}`,
  }))

  return demoCreateJournalEntry({
    organization_id: original.organization_id,
    entry_date: new Date().toISOString().split('T')[0],
    reference_type: 'reversal',
    reference_id: original.id,
    description: `Reversal of ${original.entry_number}: ${reason}`,
    source: 'system',
    lines: reversalLines,
  })
}

export function demoGetJournalEntries(options?: {
  organization_id?: string
  startDate?: string
  endDate?: string
  reference_type?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const orgId = options?.organization_id || DEMO_ORG_ID
  let filtered = demoJournalEntries.filter((je) => je.organization_id === orgId)

  if (options?.status && options.status !== 'all') {
    filtered = filtered.filter((je) => je.status === options.status)
  }

  if (options?.reference_type && options.reference_type !== 'all') {
    filtered = filtered.filter((je) => je.reference_type === options.reference_type)
  }

  if (options?.startDate) {
    filtered = filtered.filter((je) => je.entry_date >= options.startDate!)
  }

  if (options?.endDate) {
    filtered = filtered.filter((je) => je.entry_date <= options.endDate!)
  }

  if (options?.search) {
    const q = options.search.toLowerCase()
    filtered = filtered.filter(
      (je) =>
        je.entry_number.toLowerCase().includes(q) ||
        je.description.toLowerCase().includes(q) ||
        (je.reference_id && je.reference_id.toLowerCase().includes(q))
    )
  }

  filtered.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())

  const total = filtered.length
  const page = options?.page || 1
  const limit = options?.limit || 20
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return {
    entries: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

export function demoGetJournalEntry(id: string): DemoJournalEntry | null {
  return demoJournalEntries.find((je) => je.id === id) || null
}

// ---- General Ledger ----

export function demoGetGeneralLedger(
  accountId: string,
  options?: {
    organization_id?: string
    startDate?: string
    endDate?: string
  }
) {
  const orgId = options?.organization_id || DEMO_ORG_ID
  const acc = demoAccounts.find((a) => (a.id === accountId || a.account_code === accountId) && a.organization_id === orgId)
  if (!acc) throw new Error(`Account '${accountId}' not found`)

  const startDate = options?.startDate || '1970-01-01'
  const endDate = options?.endDate || '2099-12-31'

  // 1. Calculate opening balance as of startDate
  const isDebitNormal = acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE'
  let openingBalance = acc.opening_balance_type === 'DEBIT' ? acc.opening_balance : -acc.opening_balance
  if (!isDebitNormal) {
    openingBalance = -openingBalance
  }

  // Accumulate prior transactions before startDate
  demoJournalEntries.forEach((je) => {
    if (je.organization_id === orgId && je.status === 'posted' && je.entry_date < startDate) {
      je.lines.forEach((l) => {
        if (l.account_id === accountId) {
          if (isDebitNormal) {
            openingBalance += l.debit - l.credit
          } else {
            openingBalance += l.credit - l.debit
          }
        }
      })
    }
  })

  // 2. Fetch period transactions
  const txns: Array<{
    date: string
    entry_number: string
    journal_entry_id: string
    reference_type?: string | null
    reference_id?: string | null
    description: string
    debit: number
    credit: number
    running_balance: number
  }> = []

  let currentRunning = openingBalance
  let periodDebitTotal = 0
  let periodCreditTotal = 0

  // Sort chronological
  const periodEntries = demoJournalEntries
    .filter(
      (je) =>
        je.organization_id === orgId &&
        je.status === 'posted' &&
        je.entry_date >= startDate &&
        je.entry_date <= endDate
    )
    .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())

  periodEntries.forEach((je) => {
    je.lines.forEach((l) => {
      if (l.account_id === accountId) {
        if (isDebitNormal) {
          currentRunning += l.debit - l.credit
        } else {
          currentRunning += l.credit - l.debit
        }

        periodDebitTotal += l.debit
        periodCreditTotal += l.credit

        txns.push({
          date: je.entry_date,
          entry_number: je.entry_number,
          journal_entry_id: je.id,
          reference_type: je.reference_type,
          reference_id: je.reference_id,
          description: l.description || je.description,
          debit: l.debit,
          credit: l.credit,
          running_balance: Number(currentRunning.toFixed(2)),
        })
      }
    })
  })

  return {
    account: acc,
    startDate,
    endDate,
    opening_balance: Number(openingBalance.toFixed(2)),
    closing_balance: Number(currentRunning.toFixed(2)),
    total_debit: Number(periodDebitTotal.toFixed(2)),
    total_credit: Number(periodCreditTotal.toFixed(2)),
    transactions: txns,
  }
}

// ---- Trial Balance ----

export function demoGetTrialBalance(options?: {
  organization_id?: string
  asOfDate?: string
}) {
  const orgId = options?.organization_id || DEMO_ORG_ID
  const asOfDate = options?.asOfDate || new Date().toISOString().split('T')[0]

  const accounts = demoAccounts.filter((a) => a.organization_id === orgId && a.is_active)

  let totalDebit = 0
  let totalCredit = 0

  const rows = accounts.map((acc) => {
    const isDebitNormal = acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE'

    // Start with opening balance
    let net = acc.opening_balance_type === 'DEBIT' ? acc.opening_balance : -acc.opening_balance
    if (!isDebitNormal) {
      net = -net
    }

    // Accumulate all posted lines up to asOfDate
    demoJournalEntries.forEach((je) => {
      if (je.organization_id === orgId && je.status === 'posted' && je.entry_date <= asOfDate) {
        je.lines.forEach((l) => {
          if (l.account_id === acc.id) {
            if (isDebitNormal) {
              net += l.debit - l.credit
            } else {
              net += l.credit - l.debit
            }
          }
        })
      }
    })

    let debitBal = 0
    let creditBal = 0

    if (isDebitNormal) {
      if (net >= 0) {
        debitBal = net
      } else {
        creditBal = -net
      }
    } else {
      if (net >= 0) {
        creditBal = net
      } else {
        debitBal = -net
      }
    }

    totalDebit += Math.round(debitBal * 100)
    totalCredit += Math.round(creditBal * 100)

    return {
      account_id: acc.id,
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type: acc.account_type,
      debit: Number(debitBal.toFixed(2)),
      credit: Number(creditBal.toFixed(2)),
    }
  })

  // Filter rows with at least one non-zero balance
  const activeRows = rows
    .filter((r) => r.debit > 0 || r.credit > 0)
    .sort((a, b) => a.account_code.localeCompare(b.account_code, undefined, { numeric: true }))

  const accountsList = activeRows.map((r) => ({
    ...r,
    debit_balance: r.debit,
    credit_balance: r.credit,
  }))

  return {
    asOfDate,
    rows: activeRows,
    accounts: accountsList,
    total_debit: Number((totalDebit / 100).toFixed(2)),
    total_credit: Number((totalCredit / 100).toFixed(2)),
    is_balanced: totalDebit === totalCredit,
    difference: Number((Math.abs(totalDebit - totalCredit) / 100).toFixed(2)),
  }
}

// ---- Profit & Loss Statement ----

export function demoGetProfitAndLoss(options?: {
  organization_id?: string
  startDate?: string
  endDate?: string
}) {
  const orgId = options?.organization_id || DEMO_ORG_ID
  const startDate = options?.startDate || `${new Date().getFullYear()}-01-01`
  const endDate = options?.endDate || new Date().toISOString().split('T')[0]

  const accounts = demoAccounts.filter((a) => a.organization_id === orgId)

  // Accumulate income & expense lines
  const accountTotals = new Map<string, number>()

  demoJournalEntries.forEach((je) => {
    if (
      je.organization_id === orgId &&
      je.status === 'posted' &&
      je.entry_date >= startDate &&
      je.entry_date <= endDate
    ) {
      je.lines.forEach((l) => {
        const cur = accountTotals.get(l.account_id) || 0
        accountTotals.set(l.account_id, cur + l.debit - l.credit)
      })
    }
  })

  const incomeRows: Array<{ account_id: string; account_code: string; account_name: string; amount: number }> = []
  const expenseRows: Array<{ account_id: string; account_code: string; account_name: string; amount: number }> = []

  let totalIncome = 0
  let totalExpenses = 0
  let cogsAmount = 0

  accounts.forEach((acc) => {
    const raw = accountTotals.get(acc.id) || 0

    if (acc.account_type === 'INCOME') {
      // Income increases with Credit (-raw)
      const amt = -raw
      if (amt !== 0) {
        incomeRows.push({
          account_id: acc.id,
          account_code: acc.account_code,
          account_name: acc.account_name,
          amount: Number(amt.toFixed(2)),
        })
        totalIncome += amt
      }
    } else if (acc.account_type === 'EXPENSE') {
      // Expense increases with Debit (+raw)
      const amt = raw
      if (amt !== 0) {
        expenseRows.push({
          account_id: acc.id,
          account_code: acc.account_code,
          account_name: acc.account_name,
          amount: Number(amt.toFixed(2)),
        })
        totalExpenses += amt

        if (acc.account_code === '5010') {
          cogsAmount += amt
        }
      }
    }
  })

  const grossProfit = totalIncome - cogsAmount
  const netProfit = totalIncome - totalExpenses

  return {
    startDate,
    endDate,
    income: {
      rows: incomeRows.sort((a, b) => b.amount - a.amount),
      operating_income: incomeRows.filter(r => r.account_code === '4010'),
      other_income: incomeRows.filter(r => r.account_code !== '4010'),
      total: Number(totalIncome.toFixed(2)),
    },
    expenses: {
      rows: expenseRows.sort((a, b) => b.amount - a.amount),
      cogs: expenseRows.filter(r => r.account_code === '5010'),
      operating_expenses: expenseRows.filter(r => r.account_code !== '5010'),
      total: Number(totalExpenses.toFixed(2)),
    },
    gross_profit: Number(grossProfit.toFixed(2)),
    net_profit: Number(netProfit.toFixed(2)),
  }
}

// ---- Balance Sheet ----

export function demoGetBalanceSheet(options?: {
  organization_id?: string
  asOfDate?: string
}) {
  const orgId = options?.organization_id || DEMO_ORG_ID
  const asOfDate = options?.asOfDate || new Date().toISOString().split('T')[0]

  const tb = demoGetTrialBalance({ organization_id: orgId, asOfDate })
  const pnl = demoGetProfitAndLoss({ organization_id: orgId, endDate: asOfDate })

  const assets: Array<{ account_id: string; account_code: string; account_name: string; amount: number }> = []
  const liabilities: Array<{ account_id: string; account_code: string; account_name: string; amount: number }> = []
  const equity: Array<{ account_id: string; account_code: string; account_name: string; amount: number }> = []

  let totalAssets = 0
  let totalLiabilities = 0
  let totalEquity = 0

  tb.rows.forEach((r) => {
    if (r.account_type === 'ASSET') {
      const amt = r.debit - r.credit
      assets.push({ account_id: r.account_id, account_code: r.account_code, account_name: r.account_name, amount: amt })
      totalAssets += amt
    } else if (r.account_type === 'LIABILITY') {
      const amt = r.credit - r.debit
      liabilities.push({ account_id: r.account_id, account_code: r.account_code, account_name: r.account_name, amount: amt })
      totalLiabilities += amt
    } else if (r.account_type === 'EQUITY') {
      const amt = r.credit - r.debit
      equity.push({ account_id: r.account_id, account_code: r.account_code, account_name: r.account_name, amount: amt })
      totalEquity += amt
    }
  })

  // Add Current Period Net Profit to Equity (Retained Earnings)
  const currentPeriodEarnings = pnl.net_profit
  if (currentPeriodEarnings !== 0) {
    equity.push({
      account_id: 'current-period-pnl',
      account_code: '3099',
      account_name: 'Current Period Net Profit / (Loss)',
      amount: currentPeriodEarnings,
    })
    totalEquity += currentPeriodEarnings
  }

  const totalLiabEquity = totalLiabilities + totalEquity
  const difference = Math.abs(Number(totalAssets.toFixed(2)) - Number(totalLiabEquity.toFixed(2)))
  const isBalanced = difference < 0.01

  return {
    asOfDate,
    assets: {
      rows: assets,
      current_assets: assets,
      fixed_assets: [],
      total: Number(totalAssets.toFixed(2)),
    },
    liabilities: {
      rows: liabilities,
      current_liabilities: liabilities,
      long_term_liabilities: [],
      total: Number(totalLiabilities.toFixed(2)),
    },
    equity: {
      rows: equity,
      capital: equity.filter(e => e.account_code === '3010'),
      retained_earnings: 0,
      current_period_earnings: currentPeriodEarnings,
      total: Number(totalEquity.toFixed(2)),
    },
    total_liabilities_and_equity: Number(totalLiabEquity.toFixed(2)),
    is_balanced: isBalanced,
    difference: Number(difference.toFixed(2)),
  }
}

// ---- Accounting Settings ----

export function demoGetAccountingSettings(orgId: string = DEMO_ORG_ID): DemoAccountingSettings {
  return { ...demoAccountingSettings, organization_id: orgId }
}

export function demoUpdateAccountingSettings(orgId: string = DEMO_ORG_ID, data: Partial<DemoAccountingSettings>): DemoAccountingSettings {
  Object.assign(demoAccountingSettings, data, { organization_id: orgId, updated_at: new Date().toISOString() })
  return { ...demoAccountingSettings }
}

// ---- Opening Balances ----

export function demoSetOpeningBalances(data: {
  organization_id?: string
  as_of_date: string
  balances: Array<{
    account_id: string
    debit?: number
    credit?: number
  }>
}): DemoJournalEntry {
  const orgId = data.organization_id || DEMO_ORG_ID

  let totalDebit = 0
  let totalCredit = 0

  const lines = data.balances.map((b: any) => {
    let deb = 0
    let cred = 0
    if (b.type === 'DEBIT') {
      deb = Number(b.amount) || 0
    } else if (b.type === 'CREDIT') {
      cred = Number(b.amount) || 0
    } else {
      deb = Number(b.debit) || 0
      cred = Number(b.credit) || 0
    }
    totalDebit += Math.round(deb * 100)
    totalCredit += Math.round(cred * 100)
    return {
      account_id: b.account_id,
      debit: deb,
      credit: cred,
      description: 'Opening balance setup entry',
    }
  })

  if (totalDebit !== totalCredit) {
    throw new Error(
      `UNBALANCED_OPENING_BALANCES: Total debits (₹${(totalDebit / 100).toFixed(2)}) must equal total credits (₹${(totalCredit / 100).toFixed(2)}).`
    )
  }

  // Update opening balance on accounts
  data.balances.forEach((b: any) => {
    const acc = demoAccounts.find((a) => a.id === b.account_id && a.organization_id === orgId)
    if (acc) {
      const isDebit = b.type === 'DEBIT' || (b.debit || 0) > 0
      const amt = b.amount !== undefined ? Number(b.amount) : isDebit ? b.debit : b.credit
      acc.opening_balance = amt || 0
      acc.opening_balance_type = isDebit ? 'DEBIT' : 'CREDIT'
    }
  })

  return demoCreateJournalEntry({
    organization_id: orgId,
    entry_date: data.as_of_date,
    reference_type: 'opening_balance',
    description: 'Initial Opening Balance Journal Entry',
    source: 'system',
    lines,
  })
}

// ------------------------------------------------------------------
// CRM Notes & Follow-ups Store (Phase 7B)
// ------------------------------------------------------------------

export interface DemoCrmNote {
  id: string
  organization_id: string
  entity_type: 'customer' | 'supplier'
  entity_id: string
  note_text: string
  created_by: string
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export interface DemoCrmFollowUp {
  id: string
  organization_id: string
  entity_type: 'customer' | 'supplier'
  entity_id: string
  followup_date: string
  followup_time?: string | null
  followup_type: 'payment' | 'sales' | 'quotation' | 'general' | 'support'
  purpose: string
  notes?: string | null
  status: 'pending' | 'completed' | 'cancelled'
  completed_at?: string | null
  cancelled_at?: string | null
  created_by: string
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export const demoCrmNotes: DemoCrmNote[] = [
  {
    id: 'note-demo-1',
    organization_id: DEMO_ORG_ID,
    entity_type: 'customer',
    entity_id: 'cust-demo-1',
    note_text: 'Client requested standard 30-day payment term on bulk orders above 50 units.',
    created_by: 'user-demo-1',
    created_by_name: 'Rajesh Sharma',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'note-demo-2',
    organization_id: DEMO_ORG_ID,
    entity_type: 'supplier',
    entity_id: 'supp-demo-1',
    note_text: 'Direct vendor contract for Q4 steel tubes delivery with GST tax invoice.',
    created_by: 'user-demo-1',
    created_by_name: 'Rajesh Sharma',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
]

export const demoCrmFollowUps: DemoCrmFollowUp[] = [
  {
    id: 'followup-demo-1',
    organization_id: DEMO_ORG_ID,
    entity_type: 'customer',
    entity_id: 'cust-demo-1',
    followup_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    followup_time: '14:30',
    followup_type: 'payment',
    purpose: 'Follow up on pending invoice INV-2026-001 outstanding balance',
    notes: 'Speak with accounts head regarding cheque clearance.',
    status: 'pending',
    created_by: 'user-demo-1',
    created_by_name: 'Rajesh Sharma',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'followup-demo-2',
    organization_id: DEMO_ORG_ID,
    entity_type: 'supplier',
    entity_id: 'supp-demo-1',
    followup_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    followup_time: '11:00',
    followup_type: 'payment',
    purpose: 'Clear supplier payable balance for batch #402',
    notes: 'Verify raw material receipt and confirm debit note if any.',
    status: 'pending',
    created_by: 'user-demo-1',
    created_by_name: 'Rajesh Sharma',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

export function demoGetCrmNotes(orgId: string, entityType: 'customer' | 'supplier', entityId: string): DemoCrmNote[] {
  return demoCrmNotes
    .filter((n) => n.organization_id === orgId && n.entity_type === entityType && n.entity_id === entityId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function demoAddCrmNote(data: {
  organization_id: string
  entity_type: 'customer' | 'supplier'
  entity_id: string
  note_text: string
  created_by: string
  created_by_name?: string | null
}): DemoCrmNote {
  const newNote: DemoCrmNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organization_id: data.organization_id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    note_text: data.note_text,
    created_by: data.created_by,
    created_by_name: data.created_by_name || 'Staff Member',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  demoCrmNotes.unshift(newNote)
  return newNote
}

export function demoUpdateCrmNote(orgId: string, id: string, note_text: string): DemoCrmNote | null {
  const note = demoCrmNotes.find((n) => n.id === id && n.organization_id === orgId)
  if (!note) return null
  note.note_text = note_text
  note.updated_at = new Date().toISOString()
  return note
}

export function demoDeleteCrmNote(orgId: string, id: string): boolean {
  const idx = demoCrmNotes.findIndex((n) => n.id === id && n.organization_id === orgId)
  if (idx === -1) return false
  demoCrmNotes.splice(idx, 1)
  return true
}

export function demoGetCrmFollowUps(
  orgId: string,
  entityType?: 'customer' | 'supplier',
  entityId?: string
): DemoCrmFollowUp[] {
  return demoCrmFollowUps
    .filter((f) => {
      if (f.organization_id !== orgId) return false
      if (entityType && f.entity_type !== entityType) return false
      if (entityId && f.entity_id !== entityId) return false
      return true
    })
    .sort((a, b) => new Date(b.followup_date).getTime() - new Date(a.followup_date).getTime())
}

export function demoAddCrmFollowUp(data: {
  organization_id: string
  entity_type: 'customer' | 'supplier'
  entity_id: string
  followup_date: string
  followup_time?: string | null
  followup_type: 'payment' | 'sales' | 'quotation' | 'general' | 'support'
  purpose: string
  notes?: string | null
  created_by: string
  created_by_name?: string | null
}): DemoCrmFollowUp {
  const newFollowUp: DemoCrmFollowUp = {
    id: `followup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organization_id: data.organization_id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    followup_date: data.followup_date,
    followup_time: data.followup_time || null,
    followup_type: data.followup_type,
    purpose: data.purpose,
    notes: data.notes || null,
    status: 'pending',
    created_by: data.created_by,
    created_by_name: data.created_by_name || 'Staff Member',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  demoCrmFollowUps.unshift(newFollowUp)
  return newFollowUp
}

export function demoUpdateCrmFollowUp(
  orgId: string,
  id: string,
  data: {
    followup_date?: string
    followup_time?: string | null
    followup_type?: 'payment' | 'sales' | 'quotation' | 'general' | 'support'
    purpose?: string
    notes?: string | null
    status?: 'pending' | 'completed' | 'cancelled'
  }
): DemoCrmFollowUp | null {
  const followUp = demoCrmFollowUps.find((f) => f.id === id && f.organization_id === orgId)
  if (!followUp) return null

  if (data.followup_date) followUp.followup_date = data.followup_date
  if (data.followup_time !== undefined) followUp.followup_time = data.followup_time
  if (data.followup_type) followUp.followup_type = data.followup_type
  if (data.purpose) followUp.purpose = data.purpose
  if (data.notes !== undefined) followUp.notes = data.notes

  if (data.status && data.status !== followUp.status) {
    followUp.status = data.status
    if (data.status === 'completed') {
      followUp.completed_at = new Date().toISOString()
    } else if (data.status === 'cancelled') {
      followUp.cancelled_at = new Date().toISOString()
    }
  }

  followUp.updated_at = new Date().toISOString()
  return followUp
}

export function demoDeleteCrmFollowUp(orgId: string, id: string): boolean {
  const idx = demoCrmFollowUps.findIndex((f) => f.id === id && f.organization_id === orgId)
  if (idx === -1) return false
  demoCrmFollowUps.splice(idx, 1)
  return true
}

// ============================================================
// Phase 7C: Sales & Purchase Operations Stores & Helpers
// ============================================================

export function demoDeductStock(productId: string, quantity: number) {
  const product = demoProducts.find((p) => p.id === productId)
  if (product) {
    product.current_stock = Math.max(0, (product.current_stock || 0) - quantity)
  }
}

export function demoRestoreStock(productId: string, quantity: number) {
  const product = demoProducts.find((p) => p.id === productId)
  if (product) {
    product.current_stock = (product.current_stock || 0) + quantity
  }
}

// 1. Sales Orders Store
export const demoSalesOrders: any[] = []
export const demoSalesOrderItems: any[] = []

export function demoAddSalesOrder(data: any): any {
  const orderId = `so-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const order = { ...data, id: orderId, created_at: new Date().toISOString() }
  const items = (data.items || []).map((it: any) => ({ ...it, sales_order_id: orderId }))
  demoSalesOrders.unshift(order)
  demoSalesOrderItems.unshift(...items)
  return { ...order, items }
}

export function demoGetSalesOrder(id: string, orgId?: string): any | null {
  const order = demoSalesOrders.find((o) => o.id === id && (!orgId || o.organization_id === orgId))
  if (!order) return null
  const items = demoSalesOrderItems.filter((it) => it.sales_order_id === order.id)
  const customer = demoGetCustomer(order.customer_id)
  return { ...order, items, customer }
}

export function demoGetSalesOrders(orgId?: string, filters: any = {}): any {
  let list = demoSalesOrders.filter((o) => !orgId || o.organization_id === orgId)
  if (filters.status) list = list.filter((o) => o.status === filters.status)
  if (filters.customerId) list = list.filter((o) => o.customer_id === filters.customerId)
  if (filters.startDate) list = list.filter((o) => o.order_date >= filters.startDate)
  if (filters.endDate) list = list.filter((o) => o.order_date <= filters.endDate)

  const orders = list.map((order) => {
    const items = demoSalesOrderItems.filter((it) => it.sales_order_id === order.id)
    const customer = demoGetCustomer(order.customer_id)
    return { ...order, items, customer }
  })

  return {
    orders,
    total: orders.length,
    page: filters.page || 1,
    limit: filters.limit || 20,
    totalPages: 1,
  }
}

export function demoUpdateSalesOrder(id: string, orgId?: string, updates: any = {}): any {
  const order = demoSalesOrders.find((o) => o.id === id && (!orgId || o.organization_id === orgId))
  if (!order) throw new Error('Sales order not found')
  Object.assign(order, updates, { updated_at: new Date().toISOString() })
  return demoGetSalesOrder(id, orgId)
}

export function demoDeleteSalesOrder(id: string, orgId?: string): boolean {
  const idx = demoSalesOrders.findIndex((o) => o.id === id && (!orgId || o.organization_id === orgId))
  if (idx === -1) return false
  demoSalesOrders.splice(idx, 1)
  const itemIndices: number[] = []
  demoSalesOrderItems.forEach((it, i) => {
    if (it.sales_order_id === id) itemIndices.push(i)
  })
  itemIndices.reverse().forEach((i) => demoSalesOrderItems.splice(i, 1))
  return true
}

// 2. Proforma Invoices Store
export const demoProformaInvoices: any[] = []
export const demoProformaInvoiceItems: any[] = []

export function demoAddProformaInvoice(data: any): any {
  const piId = `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const pi = { converted_invoice_id: null, ...data, id: piId, created_at: new Date().toISOString() }
  const items = (data.items || []).map((it: any) => ({ ...it, proforma_invoice_id: piId }))
  demoProformaInvoices.unshift(pi)
  demoProformaInvoiceItems.unshift(...items)
  return { ...pi, items }
}

export function demoGetProformaInvoice(id: string, orgId?: string): any | null {
  const pi = demoProformaInvoices.find((p) => p.id === id && (!orgId || p.organization_id === orgId))
  if (!pi) return null
  const items = demoProformaInvoiceItems.filter((it) => it.proforma_invoice_id === pi.id)
  const customer = demoGetCustomer(pi.customer_id)
  return { ...pi, converted_invoice_id: pi.converted_invoice_id ?? null, items, customer }
}

export function demoGetProformaInvoices(orgId?: string, filters: any = {}): any {
  let list = demoProformaInvoices.filter((p) => !orgId || p.organization_id === orgId)
  if (filters.status) list = list.filter((p) => p.status === filters.status)
  if (filters.customerId) list = list.filter((p) => p.customer_id === filters.customerId)
  if (filters.startDate) list = list.filter((p) => p.proforma_date >= filters.startDate)
  if (filters.endDate) list = list.filter((p) => p.proforma_date <= filters.endDate)

  const proforma_invoices = list.map((pi) => {
    const items = demoProformaInvoiceItems.filter((it) => it.proforma_invoice_id === pi.id)
    const customer = demoGetCustomer(pi.customer_id)
    return { ...pi, items, customer }
  })

  return {
    proforma_invoices,
    total: proforma_invoices.length,
    page: filters.page || 1,
    limit: filters.limit || 20,
    totalPages: 1,
  }
}

export function demoUpdateProformaInvoice(id: string, orgId?: string, updates: any = {}): any {
  const pi = demoProformaInvoices.find((p) => p.id === id && (!orgId || p.organization_id === orgId))
  if (!pi) throw new Error('Proforma invoice not found')
  Object.assign(pi, updates, { updated_at: new Date().toISOString() })
  return demoGetProformaInvoice(id, orgId)
}

export function demoDeleteProformaInvoice(id: string, orgId?: string): boolean {
  const idx = demoProformaInvoices.findIndex((p) => p.id === id && (!orgId || p.organization_id === orgId))
  if (idx === -1) return false
  demoProformaInvoices.splice(idx, 1)
  const itemIndices: number[] = []
  demoProformaInvoiceItems.forEach((it, i) => {
    if (it.proforma_invoice_id === id) itemIndices.push(i)
  })
  itemIndices.reverse().forEach((i) => demoProformaInvoiceItems.splice(i, 1))
  return true
}

// 3. Delivery Challans Store
export const demoDeliveryChallans: any[] = []
export const demoDeliveryChallanItems: any[] = []

export function demoAddDeliveryChallan(data: any): any {
  const dcId = `dc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const dc = { ...data, id: dcId, created_at: new Date().toISOString() }
  const items = (data.items || []).map((it: any) => ({ ...it, delivery_challan_id: dcId }))
  demoDeliveryChallans.unshift(dc)
  demoDeliveryChallanItems.unshift(...items)
  return { ...dc, items }
}

export function demoGetDeliveryChallan(id: string, orgId?: string): any | null {
  const dc = demoDeliveryChallans.find((d) => d.id === id && (!orgId || d.organization_id === orgId))
  if (!dc) return null
  const items = demoDeliveryChallanItems.filter((it) => it.delivery_challan_id === dc.id)
  const customer = demoGetCustomer(dc.customer_id)
  return { ...dc, items, customer }
}

export function demoGetDeliveryChallans(orgId?: string, filters: any = {}): any {
  let list = demoDeliveryChallans.filter((d) => !orgId || d.organization_id === orgId)
  if (filters.status) list = list.filter((d) => d.status === filters.status)
  if (filters.challanType) list = list.filter((d) => d.challan_type === filters.challanType)
  if (filters.customerId) list = list.filter((d) => d.customer_id === filters.customerId)
  if (filters.startDate) list = list.filter((d) => d.challan_date >= filters.startDate)
  if (filters.endDate) list = list.filter((d) => d.challan_date <= filters.endDate)

  const challans = list.map((dc) => {
    const items = demoDeliveryChallanItems.filter((it) => it.delivery_challan_id === dc.id)
    const customer = demoGetCustomer(dc.customer_id)
    return { ...dc, items, customer }
  })

  return {
    challans,
    total: challans.length,
    page: filters.page || 1,
    limit: filters.limit || 20,
    totalPages: 1,
  }
}

export function demoUpdateDeliveryChallan(id: string, orgId?: string, updates: any = {}): any {
  const dc = demoDeliveryChallans.find((d) => d.id === id && (!orgId || d.organization_id === orgId))
  if (!dc) throw new Error('Delivery challan not found')
  Object.assign(dc, updates, { updated_at: new Date().toISOString() })
  return demoGetDeliveryChallan(id, orgId)
}

export function demoDeleteDeliveryChallan(id: string, orgId?: string): boolean {
  const idx = demoDeliveryChallans.findIndex((d) => d.id === id && (!orgId || d.organization_id === orgId))
  if (idx === -1) return false
  demoDeliveryChallans.splice(idx, 1)
  const itemIndices: number[] = []
  demoDeliveryChallanItems.forEach((it, i) => {
    if (it.delivery_challan_id === id) itemIndices.push(i)
  })
  itemIndices.reverse().forEach((i) => demoDeliveryChallanItems.splice(i, 1))
  return true
}

// 4. Purchase Orders Store
export const demoPurchaseOrders: any[] = []
export const demoPurchaseOrderItems: any[] = []

export function demoAddPurchaseOrder(data: any): any {
  const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const po = { ...data, id: poId, created_at: new Date().toISOString() }
  const items = (data.items || []).map((it: any) => ({ ...it, purchase_order_id: poId }))
  demoPurchaseOrders.unshift(po)
  demoPurchaseOrderItems.unshift(...items)
  return { ...po, items }
}

export function demoGetPurchaseOrder(id: string, orgId?: string): any | null {
  const po = demoPurchaseOrders.find((p) => p.id === id && (!orgId || p.organization_id === orgId))
  if (!po) return null
  const items = demoPurchaseOrderItems.filter((it) => it.purchase_order_id === po.id)
  const supplier = demoGetSupplier(po.supplier_id)
  return { ...po, items, supplier }
}

export function demoGetPurchaseOrders(orgId?: string, filters: any = {}): any {
  let list = demoPurchaseOrders.filter((p) => !orgId || p.organization_id === orgId)
  if (filters.status) list = list.filter((p) => p.status === filters.status)
  if (filters.supplierId) list = list.filter((p) => p.supplier_id === filters.supplierId)
  if (filters.startDate) list = list.filter((p) => p.order_date >= filters.startDate)
  if (filters.endDate) list = list.filter((p) => p.order_date <= filters.endDate)

  const orders = list.map((po) => {
    const items = demoPurchaseOrderItems.filter((it) => it.purchase_order_id === po.id)
    const supplier = demoGetSupplier(po.supplier_id)
    return { ...po, items, supplier }
  })

  return {
    orders,
    total: orders.length,
    page: filters.page || 1,
    limit: filters.limit || 20,
    totalPages: 1,
  }
}

export function demoUpdatePurchaseOrder(id: string, orgId?: string, updates: any = {}): any {
  const po = demoPurchaseOrders.find((p) => p.id === id && (!orgId || p.organization_id === orgId))
  if (!po) throw new Error('Purchase order not found')
  Object.assign(po, updates, { updated_at: new Date().toISOString() })
  return demoGetPurchaseOrder(id, orgId)
}

export function demoDeletePurchaseOrder(id: string, orgId?: string): boolean {
  const idx = demoPurchaseOrders.findIndex((p) => p.id === id && (!orgId || p.organization_id === orgId))
  if (idx === -1) return false
  demoPurchaseOrders.splice(idx, 1)
  const itemIndices: number[] = []
  demoPurchaseOrderItems.forEach((it, i) => {
    if (it.purchase_order_id === id) itemIndices.push(i)
  })
  itemIndices.reverse().forEach((i) => demoPurchaseOrderItems.splice(i, 1))
  return true
}

// Atomic Sequence Counters for Document Numbering Concurrency
const demoDocCounters: Record<string, number> = {}

export function demoResetDocSequences(): void {
  for (const k of Object.keys(demoDocCounters)) {
    delete demoDocCounters[k]
  }
}

export function demoGetNextDocSequence(orgId: string, docPrefix: string, year: number): number {
  const key = `${orgId || 'default'}:${docPrefix}:${year}`
  if (demoDocCounters[key] === undefined) {
    let existingCount = 0
    if (docPrefix === 'SO') existingCount = demoSalesOrders.filter((d) => !orgId || d.organization_id === orgId).length
    else if (docPrefix === 'PI') existingCount = demoProformaInvoices.filter((d) => !orgId || d.organization_id === orgId).length
    else if (docPrefix === 'DC') existingCount = demoDeliveryChallans.filter((d) => !orgId || d.organization_id === orgId).length
    else if (docPrefix === 'PO') existingCount = demoPurchaseOrders.filter((d) => !orgId || d.organization_id === orgId).length
    else if (docPrefix === 'TR') existingCount = (demoStockTransfers || []).filter((d) => !orgId || d.organization_id === orgId).length
    else if (docPrefix === 'STC') existingCount = (demoStockCounts || []).filter((d) => !orgId || d.organization_id === orgId).length
    demoDocCounters[key] = existingCount
  }
  demoDocCounters[key] += 1
  return demoDocCounters[key]
}

// Stateful Demo Quotation Conversion Tracking
export const demoQuotationStates: Record<string, { status?: string; converted_invoice_id?: string; converted_order_id?: string; converted_proforma_id?: string }> = {}

export function demoResetQuotationStates(): void {
  for (const k of Object.keys(demoQuotationStates)) {
    delete demoQuotationStates[k]
  }
}

// ============================================================
// Phase 8: Advanced Inventory & Warehouse Stores
// ============================================================

export interface DemoWarehouse {
  id: string
  organization_id: string
  name: string
  code: string
  type: string
  address?: string | null
  city?: string | null
  state_code?: string | null
  pincode?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  is_default: boolean
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface DemoWarehouseStock {
  id: string
  organization_id: string
  warehouse_id: string
  product_id: string
  opening_quantity: number
  current_quantity: number
  reserved_quantity: number
  reorder_level?: number | null
  reorder_quantity?: number | null
  min_stock_level?: number | null
  max_stock_level?: number | null
  average_cost: number
  created_at: string
  updated_at: string
}

export interface DemoStockTransfer {
  id: string
  organization_id: string
  transfer_number: string
  source_warehouse_id: string
  destination_warehouse_id: string
  transfer_date: string
  status: 'draft' | 'initiated' | 'in_transit' | 'received' | 'transferred' | 'cancelled'
  reference_number?: string | null
  notes?: string | null
  shipped_at?: string | null
  received_at?: string | null
  cancelled_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  items?: DemoStockTransferItem[]
}

export interface DemoStockTransferItem {
  id: string
  organization_id: string
  transfer_id: string
  product_id: string
  quantity: number
  unit: string
  batch_id?: string | null
  batch_number?: string | null
  serial_numbers?: string[]
  notes?: string | null
  created_at: string
}

export interface DemoBatch {
  id: string
  organization_id: string
  product_id: string
  warehouse_id?: string | null
  batch_number: string
  manufacturing_date?: string | null
  expiry_date: string
  purchase_date?: string | null
  cost: number
  initial_quantity: number
  current_quantity: number
  supplier_id?: string | null
  reference_document?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DemoSerial {
  id: string
  organization_id: string
  product_id: string
  warehouse_id: string
  serial_number: string
  status: 'available' | 'reserved' | 'sold' | 'transferred' | 'returned' | 'damaged'
  batch_id?: string | null
  purchase_reference?: string | null
  sale_reference?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface DemoReservation {
  id: string
  organization_id: string
  product_id: string
  warehouse_id: string
  quantity: number
  reference_type: string
  reference_id: string
  status: 'active' | 'fulfilled' | 'cancelled'
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface DemoStockCount {
  id: string
  organization_id: string
  count_number: string
  warehouse_id: string
  count_date: string
  status: 'draft' | 'counted' | 'review' | 'approved' | 'posted' | 'cancelled'
  category_id?: string | null
  notes?: string | null
  adjustment_id?: string | null
  counted_by?: string | null
  approved_by?: string | null
  posted_at?: string | null
  created_at: string
  updated_at: string
  items?: DemoStockCountItem[]
}

export interface DemoStockCountItem {
  id: string
  organization_id: string
  stock_count_id: string
  product_id: string
  system_quantity: number
  physical_quantity: number
  difference: number
  unit_cost: number
  notes?: string | null
  created_at: string
}

export const demoWarehouses: DemoWarehouse[] = [
  {
    id: 'wh-demo-main',
    organization_id: DEMO_ORG_ID,
    name: 'Main Central Godown',
    code: 'WH-MAIN',
    type: 'godown',
    address: 'Plot 42, MIDC Industrial Area',
    city: 'Pune',
    state_code: '27',
    pincode: '411019',
    contact_person: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'warehouse@orga.com',
    is_default: true,
    is_active: true,
    notes: 'Primary distribution warehouse',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'wh-demo-store-1',
    organization_id: DEMO_ORG_ID,
    name: 'Retail Outlet A',
    code: 'WH-RETAIL1',
    type: 'retail_outlet',
    address: 'Shop 10, City Centre Mall',
    city: 'Pune',
    state_code: '27',
    pincode: '411001',
    contact_person: 'Amit Patil',
    phone: '+91 98765 12345',
    email: 'retail1@orga.com',
    is_default: false,
    is_active: true,
    notes: 'Front retail store',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
]

export const demoWarehouseStock: DemoWarehouseStock[] = [
  {
    id: 'whs-demo-1',
    organization_id: DEMO_ORG_ID,
    warehouse_id: 'wh-demo-main',
    product_id: 'prod-1',
    opening_quantity: 50,
    current_quantity: 50,
    reserved_quantity: 0,
    reorder_level: 10,
    reorder_quantity: 20,
    min_stock_level: 5,
    max_stock_level: 100,
    average_cost: 450,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'whs-demo-2',
    organization_id: DEMO_ORG_ID,
    warehouse_id: 'wh-demo-main',
    product_id: 'prod-2',
    opening_quantity: 100,
    current_quantity: 100,
    reserved_quantity: 0,
    reorder_level: 20,
    reorder_quantity: 50,
    min_stock_level: 10,
    max_stock_level: 200,
    average_cost: 80,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'whs-demo-3',
    organization_id: DEMO_ORG_ID,
    warehouse_id: 'wh-demo-store-1',
    product_id: 'prod-1',
    opening_quantity: 10,
    current_quantity: 10,
    reserved_quantity: 0,
    reorder_level: 5,
    reorder_quantity: 10,
    min_stock_level: 2,
    max_stock_level: 30,
    average_cost: 450,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
]

export const demoStockTransfers: DemoStockTransfer[] = []
export const demoStockTransferItems: DemoStockTransferItem[] = []

export const demoBatches: DemoBatch[] = [
  {
    id: 'batch-demo-1',
    organization_id: DEMO_ORG_ID,
    product_id: 'prod-1',
    warehouse_id: 'wh-demo-main',
    batch_number: 'BATCH-2026-A1',
    manufacturing_date: '2026-01-10',
    expiry_date: '2026-10-30',
    purchase_date: '2026-01-15',
    cost: 450,
    initial_quantity: 50,
    current_quantity: 50,
    is_active: true,
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'batch-demo-expired',
    organization_id: DEMO_ORG_ID,
    product_id: 'prod-2',
    warehouse_id: 'wh-demo-main',
    batch_number: 'BATCH-2025-EXP',
    manufacturing_date: '2025-01-01',
    expiry_date: '2026-09-01',
    purchase_date: '2025-01-05',
    cost: 75,
    initial_quantity: 10,
    current_quantity: 10,
    is_active: true,
    created_at: '2025-01-05T00:00:00.000Z',
    updated_at: '2025-01-05T00:00:00.000Z',
  },
]

export const demoSerials: DemoSerial[] = [
  {
    id: 'sn-demo-1',
    organization_id: DEMO_ORG_ID,
    product_id: 'prod-1',
    warehouse_id: 'wh-demo-main',
    serial_number: 'SN-2026-0001',
    status: 'available',
    batch_id: 'batch-demo-1',
    purchase_reference: 'PB-2026-0001',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'sn-demo-2',
    organization_id: DEMO_ORG_ID,
    product_id: 'prod-1',
    warehouse_id: 'wh-demo-main',
    serial_number: 'SN-2026-0002',
    status: 'available',
    batch_id: 'batch-demo-1',
    purchase_reference: 'PB-2026-0001',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'sn-demo-3',
    organization_id: DEMO_ORG_ID,
    product_id: 'prod-1',
    warehouse_id: 'wh-demo-main',
    serial_number: 'SN-2026-0003',
    status: 'available',
    batch_id: 'batch-demo-1',
    purchase_reference: 'PB-2026-0001',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
]

export const demoReservations: DemoReservation[] = []
export const demoStockCounts: DemoStockCount[] = []
export const demoStockCountItems: DemoStockCountItem[] = []

export function demoResetPhase8Stores(): void {
  demoStockTransfers.length = 0
  demoStockTransferItems.length = 0
  demoReservations.length = 0
  demoStockCounts.length = 0
  demoStockCountItems.length = 0
  demoResetDocSequences()
}

// ============================================================
// Phase 9: Pricing, Commissions, Credit & Operations Stores
// ============================================================
export interface DemoPriceList {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string | null;
  currency: string;
  is_active: boolean;
  customer_group?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoPriceListItem {
  id: string;
  organization_id: string;
  price_list_id: string;
  product_id: string;
  unit: string;
  min_quantity: number;
  max_quantity?: number | null;
  fixed_price?: number | null;
  discount_percent?: number;
  discount_amount?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DemoCustomerSpecialPrice {
  id: string;
  organization_id: string;
  customer_id: string;
  product_id: string;
  custom_rate: number;
  discount_percent?: number;
  min_quantity: number;
  effective_from?: string | null;
  effective_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoPromotionalRule {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  promo_type: 'buy_x_get_y' | 'percentage_discount' | 'fixed_discount' | 'bundle_rate';
  buy_product_id?: string | null;
  buy_quantity: number;
  get_product_id?: string | null;
  get_quantity: number;
  discount_value: number;
  min_order_amount: number;
  start_date: string;
  end_date: string;
  max_usage_count?: number | null;
  current_usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DemoSupplierPricing {
  id: string;
  organization_id: string;
  supplier_id: string;
  product_id: string;
  unit: string;
  purchase_rate: number;
  min_quantity: number;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoPurchasePriceHistory {
  id: string;
  organization_id: string;
  supplier_id: string;
  product_id: string;
  old_price?: number | null;
  new_price: number;
  changed_by?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface DemoSalesperson {
  id: string;
  organization_id: string;
  staff_id?: string | null;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DemoSalesCommission {
  id: string;
  organization_id: string;
  salesperson_id: string;
  invoice_id: string;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoRecurringInvoice {
  id: string;
  organization_id: string;
  template_name: string;
  customer_id: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  next_run_date: string;
  last_run_date?: string | null;
  payment_terms_days: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    tax_rate?: number;
    notes?: string | null;
  }>;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoRecurringInvoiceLog {
  id: string;
  organization_id: string;
  recurring_invoice_id: string;
  generated_invoice_id?: string | null;
  cycle_date: string;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string | null;
  created_at: string;
}

export const demoPriceLists: DemoPriceList[] = [
  {
    id: 'pl-wholesale-1',
    organization_id: DEMO_ORG_ID,
    name: 'Wholesale Standard',
    code: 'PL-WHOLESALE',
    description: 'Tiered pricing for verified wholesale dealers',
    currency: 'INR',
    is_active: true,
    customer_group: 'wholesale',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pl-retail-1',
    organization_id: DEMO_ORG_ID,
    name: 'Retail Standard',
    code: 'PL-RETAIL',
    description: 'Walk-in retail customer pricing',
    currency: 'INR',
    is_active: true,
    customer_group: 'retail',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const demoPriceListItems: DemoPriceListItem[] = [
  {
    id: 'pli-1',
    organization_id: DEMO_ORG_ID,
    price_list_id: 'pl-wholesale-1',
    product_id: 'prod-1',
    unit: 'PCS',
    min_quantity: 1,
    max_quantity: 9,
    fixed_price: 520,
    discount_percent: 0,
    discount_amount: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pli-2',
    organization_id: DEMO_ORG_ID,
    price_list_id: 'pl-wholesale-1',
    product_id: 'prod-1',
    unit: 'PCS',
    min_quantity: 10,
    max_quantity: 49,
    fixed_price: 490,
    discount_percent: 0,
    discount_amount: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pli-3',
    organization_id: DEMO_ORG_ID,
    price_list_id: 'pl-wholesale-1',
    product_id: 'prod-1',
    unit: 'PCS',
    min_quantity: 50,
    max_quantity: null,
    fixed_price: 460,
    discount_percent: 0,
    discount_amount: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const demoCustomerSpecialPrices: DemoCustomerSpecialPrice[] = [];
export const demoPromotions: DemoPromotionalRule[] = [];
export const demoSupplierPricing: DemoSupplierPricing[] = [];
export const demoPurchasePriceHistory: DemoPurchasePriceHistory[] = [];
export const demoSalespersons: DemoSalesperson[] = [
  {
    id: 'sp-demo-1',
    organization_id: DEMO_ORG_ID,
    name: 'Rahul Sharma',
    code: 'SP-001',
    email: 'rahul.sales@wevly.test',
    phone: '+91 9876543210',
    commission_rate: 3.5,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sp-demo-2',
    organization_id: DEMO_ORG_ID,
    name: 'Priya Patel',
    code: 'SP-002',
    email: 'priya.sales@wevly.test',
    phone: '+91 9876543211',
    commission_rate: 5.0,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];
export const demoSalesCommissions: DemoSalesCommission[] = [];
export const demoRecurringInvoices: DemoRecurringInvoice[] = [];
export const demoRecurringInvoiceLogs: DemoRecurringInvoiceLog[] = [];

export function demoResetPhase9Stores(): void {
  demoResetPhase8Stores();
  demoPriceLists.length = 2;
  if (demoPriceLists[0]) {
    demoPriceLists[0].is_active = true;
    demoPriceLists[0].name = 'Wholesale Standard';
  }
  if (demoPriceLists[1]) {
    demoPriceLists[1].is_active = true;
    demoPriceLists[1].name = 'Retail Standard';
  }
  demoPriceListItems.length = 3;
  for (const item of demoPriceListItems) {
    item.is_active = true;
  }
  demoCustomerSpecialPrices.length = 0;
  demoPromotions.length = 0;
  demoSupplierPricing.length = 0;
  demoPurchasePriceHistory.length = 0;
  demoSalespersons.length = 2;
  demoSalesCommissions.length = 0;
  demoRecurringInvoices.length = 0;
  demoRecurringInvoiceLogs.length = 0;

  const existingProd1 = demoProducts.find((p) => p.id === 'prod-1');
  if (!existingProd1) {
    demoProducts.push({
      id: 'prod-1',
      organization_id: DEMO_ORG_ID,
      category_id: 'cat-4',
      unit_id: 'unit-1',
      name: 'Precision Ball Bearing 6205',
      sku: 'SKU-BEARING-01',
      product_type: 'goods',
      sale_price: 550,
      purchase_price: 350,
      gst_rate: 18,
      min_stock_level: 25,
      current_stock: 15,
      opening_stock: 15,
      opening_stock_value: 5250,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  } else {
    existingProd1.sale_price = 550;
    existingProd1.purchase_price = 350;
    existingProd1.current_stock = 15;
    existingProd1.min_stock_level = 25;
  }
}

// ============================================================
// Phase 10: Advanced Financial Accounting & BI Demo Store
// ============================================================

export interface DemoFinancialPeriod {
  id: string;
  organization_id: string;
  fiscal_year: string;
  period_name: string;
  period_key: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked';
  closed_at?: string | null;
  closed_by?: string | null;
  reopen_reason?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoCostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: 'cost_center' | 'business_unit' | 'branch' | 'department' | 'project';
  is_active: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoBankReconciliation {
  id: string;
  organization_id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  system_balance: number;
  difference: number;
  status: 'in_progress' | 'completed';
  reconciled_at?: string | null;
  reconciled_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoBankReconciliationMatch {
  id: string;
  organization_id: string;
  reconciliation_id: string;
  transaction_id: string;
  transaction_type: string;
  amount: number;
  matched: boolean;
  matched_at: string;
}

export interface DemoTaxPeriod {
  id: string;
  organization_id: string;
  period_key: string;
  period_type: 'monthly' | 'quarterly';
  status: 'draft' | 'reviewed' | 'finalized';
  total_taxable_turnover: number;
  total_output_tax: number;
  total_input_tax: number;
  net_tax_payable: number;
  finalized_at?: string | null;
  finalized_by?: string | null;
  filing_date?: string | null;
  period_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const demoFinancialPeriods: DemoFinancialPeriod[] = [
  {
    id: 'fp-2026-04',
    organization_id: DEMO_ORG_ID,
    fiscal_year: '2026-2027',
    period_name: 'April 2026',
    period_key: '2026-04',
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    status: 'open',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'fp-2026-05',
    organization_id: DEMO_ORG_ID,
    fiscal_year: '2026-2027',
    period_name: 'May 2026',
    period_key: '2026-05',
    start_date: '2026-05-01',
    end_date: '2026-05-31',
    status: 'open',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'fp-2026-06',
    organization_id: DEMO_ORG_ID,
    fiscal_year: '2026-2027',
    period_name: 'June 2026',
    period_key: '2026-06',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    status: 'open',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'fp-2026-07',
    organization_id: DEMO_ORG_ID,
    fiscal_year: '2026-2027',
    period_name: 'July 2026',
    period_key: '2026-07',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    status: 'open',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'fp-2026-08',
    organization_id: DEMO_ORG_ID,
    fiscal_year: '2026-2027',
    period_name: 'August 2026',
    period_key: '2026-08',
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    status: 'open',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'fp-2026-09',
    organization_id: DEMO_ORG_ID,
    fiscal_year: '2026-2027',
    period_name: 'September 2026',
    period_key: '2026-09',
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    status: 'open',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
];

export const demoCostCenters: DemoCostCenter[] = [
  {
    id: 'cc-1',
    organization_id: DEMO_ORG_ID,
    code: 'HQ-CORP',
    name: 'Corporate Headquarters',
    type: 'business_unit',
    is_active: true,
    description: 'Central operations and executive administration',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cc-2',
    organization_id: DEMO_ORG_ID,
    code: 'PLANT-01',
    name: 'Industrial Plant & Assembly',
    type: 'branch',
    is_active: true,
    description: 'Manufacturing, testing, and production facility',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cc-3',
    organization_id: DEMO_ORG_ID,
    code: 'SALES-NORTH',
    name: 'North Region Sales & Distribution',
    type: 'department',
    is_active: true,
    description: 'Northern territorial wholesale sales force',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const demoBankReconciliations: DemoBankReconciliation[] = [];
export const demoBankReconciliationMatches: DemoBankReconciliationMatch[] = [];

export const demoTaxPeriods: DemoTaxPeriod[] = [
  {
    id: 'tp-2026-08',
    organization_id: DEMO_ORG_ID,
    period_key: '2026-08',
    period_type: 'monthly',
    status: 'finalized',
    total_taxable_turnover: 350000,
    total_output_tax: 63000,
    total_input_tax: 28000,
    net_tax_payable: 35000,
    finalized_at: '2026-09-05T10:00:00.000Z',
    finalized_by: 'usr-admin-demo',
    notes: 'GSTR-3B matching verified and reconciled',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-09-05T10:00:00.000Z',
  },
  {
    id: 'tp-2026-09',
    organization_id: DEMO_ORG_ID,
    period_key: '2026-09',
    period_type: 'monthly',
    status: 'draft',
    total_taxable_turnover: 180000,
    total_output_tax: 32400,
    total_input_tax: 15500,
    net_tax_payable: 16900,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
];

export function resetDemoPhase10() {
  demoFinancialPeriods.length = 6;
  demoFinancialPeriods.forEach((p, idx) => {
    p.status = idx === 0 ? 'closed' : 'open';
    p.reopen_reason = null;
    p.closed_at = idx === 0 ? '2026-05-01T00:00:00.000Z' : null;
  });
  demoCostCenters.length = 3;
  demoCostCenters[0].is_active = true;
  demoCostCenters[1].is_active = true;
  demoCostCenters[2].is_active = true;
  demoBankReconciliations.length = 0;
  demoBankReconciliationMatches.length = 0;
  demoTaxPeriods.length = 2;
  demoTaxPeriods[0].status = 'finalized';
  demoTaxPeriods[1].status = 'draft';
}

