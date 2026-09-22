// ============================================================
// lib/services/demo-store.ts — In-Memory Store for Demo Session
// ============================================================
// Provides persistent state in development/demo mode across API calls.

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
  hsn_sac_code?: string | null
  product_type: 'goods' | 'service'
  sale_price: number
  purchase_price: number
  gst_rate: number
  min_stock_level: number
  current_stock: number
  opening_stock: number
  opening_stock_value: number
  description?: string | null
  is_active: boolean
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

const demoUnits: DemoUnit[] = [
  { id: 'unit-1', name: 'Piece', abbreviation: 'PCS', organization_id: null },
  { id: 'unit-2', name: 'Box', abbreviation: 'BOX', organization_id: null },
  { id: 'unit-3', name: 'Kilogram', abbreviation: 'KG', organization_id: null },
  { id: 'unit-4', name: 'Litre', abbreviation: 'LTR', organization_id: null },
  { id: 'unit-5', name: 'Metre', abbreviation: 'MTR', organization_id: null },
  { id: 'unit-6', name: 'Set', abbreviation: 'SET', organization_id: null },
  { id: 'unit-7', name: 'Dozen', abbreviation: 'DZ', organization_id: null },
  { id: 'unit-8', name: 'Pair', abbreviation: 'PR', organization_id: null },
]

const demoProducts: DemoProduct[] = [
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
]

const demoCustomers: DemoCustomer[] = [
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
    created_at: new Date().toISOString(),
    product_categories: cat ? { id: cat.id, name: cat.name } : null,
    product_units: unit ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation } : null,
  }

  // Prepend to top of list
  demoProducts.unshift(newProduct)
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
    ...(patch.category_id !== undefined && { category_id: patch.category_id || null }),
    ...(patch.unit_id !== undefined && { unit_id: patch.unit_id || null }),
    ...(patch.hsn_sac_code !== undefined && { hsn_sac_code: patch.hsn_sac_code || null }),
    ...(patch.product_type && { product_type: patch.product_type }),
    sale_price: salePrice,
    purchase_price: purchasePrice,
    ...(patch.gst_rate !== undefined && { gst_rate: Number(patch.gst_rate) }),
    ...(patch.min_stock_level !== undefined && { min_stock_level: Number(patch.min_stock_level) }),
    ...(patch.description !== undefined && { description: patch.description || null }),
    updated_at: new Date().toISOString(),
  }

  const cat = demoCategories.find((c) => c.id === updated.category_id)
  const unit = demoUnits.find((u) => u.id === updated.unit_id)
  updated.product_categories = cat ? { id: cat.id, name: cat.name } : null
  updated.product_units = unit ? { id: unit.id, name: unit.name, abbreviation: unit.abbreviation } : null

  demoProducts[index] = updated
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
  return { ...demoOrganizationProfile }
}

export function demoUpdateOrganizationProfile(patch: Partial<DemoOrganizationProfile>): DemoOrganizationProfile {
  demoOrganizationProfile = {
    ...demoOrganizationProfile,
    ...patch,
  }
  return { ...demoOrganizationProfile }
}

const demoInvoices: DemoInvoice[] = [
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

export function demoAddInvoice(data: any): DemoInvoice {
  const invId = `inv-demo-${Date.now()}`
  const invNumber = data.invoice_number || `INV-2026-${nextInvoiceSeq++}`
  const cust = demoCustomers.find((c) => c.id === data.customer_id)

  const items: DemoInvoiceItem[] = (data.items || []).map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1
    const price = Number(it.unit_price) || 0
    const discPercent = Number(it.discount_percent) || 0
    const gstRate = Number(it.gst_rate) || 18

    const gross = qty * price
    const disc = gross * (discPercent / 100)
    const taxable = gross - disc
    const tax = taxable * (gstRate / 100)
    const lineTot = taxable + tax

    return {
      id: `item-${Date.now()}-${idx}`,
      invoice_id: invId,
      product_id: it.product_id || null,
      description: it.description || 'Line Item',
      hsn_sac_code: it.hsn_sac_code || null,
      quantity: qty,
      unit: it.unit || 'pcs',
      unit_price: price,
      discount_percent: discPercent,
      discount_amount: disc,
      taxable_amount: taxable,
      gst_rate: gstRate,
      cgst_rate: gstRate / 2,
      sgst_rate: gstRate / 2,
      igst_rate: 0,
      cgst_amount: tax / 2,
      sgst_amount: tax / 2,
      igst_amount: 0,
      tax_amount: tax,
      line_total: lineTot,
      is_gst_inclusive: Boolean(it.is_gst_inclusive),
    }
  })

  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0)
  const discountAmount = items.reduce((acc, it) => acc + it.discount_amount, 0)
  const taxableAmount = items.reduce((acc, it) => acc + it.taxable_amount, 0)
  const totalTax = items.reduce((acc, it) => acc + it.tax_amount, 0)
  const grandTotal = Math.round(taxableAmount + totalTax)
  const roundOff = grandTotal - (taxableAmount + totalTax)

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
    status: paymentStatus === 'paid' ? 'paid' : (paymentStatus === 'partial' ? 'partial' : 'draft'),
    place_of_supply: data.place_of_supply || cust?.place_of_supply || 'Maharashtra',
    seller_state_code: '27',
    is_inter_state: false,
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
    cgst_amount: totalTax / 2,
    sgst_amount: totalTax / 2,
    igst_amount: 0,
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

  demoInvoices.unshift(newInv)
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
  let items = existing.invoice_items

  if (patch.items && Array.isArray(patch.items)) {
    items = patch.items.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 1
      const price = Number(it.unit_price) || 0
      const discPercent = Number(it.discount_percent) || 0
      const gstRate = Number(it.gst_rate) || 18

      const gross = qty * price
      const disc = gross * (discPercent / 100)
      const taxable = gross - disc
      const tax = taxable * (gstRate / 100)
      const lineTot = taxable + tax

      return {
        id: it.id || `item-${Date.now()}-${idx}`,
        invoice_id: id,
        product_id: it.product_id || null,
        description: it.description || 'Line Item',
        hsn_sac_code: it.hsn_sac_code || null,
        quantity: qty,
        unit: it.unit || 'pcs',
        unit_price: price,
        discount_percent: discPercent,
        discount_amount: disc,
        taxable_amount: taxable,
        gst_rate: gstRate,
        cgst_rate: gstRate / 2,
        sgst_rate: gstRate / 2,
        igst_rate: 0,
        cgst_amount: tax / 2,
        sgst_amount: tax / 2,
        igst_amount: 0,
        tax_amount: tax,
        line_total: lineTot,
        is_gst_inclusive: Boolean(it.is_gst_inclusive),
      }
    })

    subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0)
    discountAmount = items.reduce((acc, it) => acc + it.discount_amount, 0)
    taxableAmount = items.reduce((acc, it) => acc + it.taxable_amount, 0)
    totalTax = items.reduce((acc, it) => acc + it.tax_amount, 0)
    grandTotal = Math.round(taxableAmount + totalTax)
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
    total_tax_amount: totalTax,
    total_amount: grandTotal,
    ...(patch.notes !== undefined && { notes: patch.notes || null }),
    ...(patch.terms_and_conditions !== undefined && { terms_and_conditions: patch.terms_and_conditions || null }),
    invoice_items: items,
    updated_at: new Date().toISOString(),
  }

  demoInvoices[index] = updated
  return updated
}

export function demoFinalizeInvoice(id: string): DemoInvoice | null {
  const inv = demoInvoices.find((i) => i.id === id)
  if (!inv) return null

  const total = Number(inv.total_amount) || 0
  const paid = Number(inv.amount_paid) || 0
  const due = Math.max(0, total - paid)

  const finalStatus = paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'issued')

  inv.status = finalStatus
  inv.payment_status = finalStatus === 'paid' ? 'paid' : (paid > 0 ? 'partial' : 'unpaid')
  inv.balance_due = due
  inv.finalized_at = new Date().toISOString()
  inv.updated_at = new Date().toISOString()

  // Update customer balance in demo store: only add remaining unpaid dues
  const cust = demoCustomers.find((c) => c.id === inv.customer_id)
  if (cust) {
    cust.outstanding_balance = (cust.outstanding_balance || 0) + due
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

const demoPayments: DemoPayment[] = [
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
  const amountPaise = Number(data.amount_paise) || 0

  const allocations = (data.allocations || []).map((a: any, idx: number) => {
    const inv = demoInvoices.find((i) => i.id === a.invoice_id)
    const allocPaise = Number(a.allocated_paise) || 0
    if (inv) {
      const allocRupees = allocPaise / 100
      inv.amount_paid = (Number(inv.amount_paid) || 0) + allocRupees
      inv.balance_due = Math.max(0, (Number(inv.total_amount) || 0) - inv.amount_paid)
      inv.status = inv.balance_due === 0 ? 'paid' : 'partial'
      inv.payment_status = inv.status
    }
    return {
      id: `alloc-${Date.now()}-${idx}`,
      payment_id: payId,
      invoice_id: a.invoice_id,
      allocated_paise: allocPaise,
      invoices: inv
        ? {
            id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            total_paise: Math.round((Number(inv.total_amount) || 0) * 100),
            paid_paise: Math.round((Number(inv.amount_paid) || 0) * 100),
            status: inv.status,
          }
        : null,
    }
  })

  // Deduct from customer outstanding
  if (cust) {
    const payRupees = amountPaise / 100
    cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - payRupees)
  }

  const newPayment: DemoPayment = {
    id: payId,
    organization_id: data.organization_id || DEMO_ORG_ID,
    customer_id: data.customer_id,
    payment_date: data.payment_date || now.split('T')[0],
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
  return newPayment
}


