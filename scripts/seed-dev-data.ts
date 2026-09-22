// ============================================================
// scripts/seed-dev-data.ts
// Development-Only Data Seeding Script for WEVLY BUSINESSOS
//
// STRICT SAFETY RULE:
// This script contains explicit production environment guards.
// It can NEVER be run against production databases or environments.
// ============================================================

import { createAdminClient } from '../lib/supabase/admin'
import { calculateCentralGst } from '../lib/services/tax.service'

async function runDevSeed() {
  console.log('🌱 Initializing WEVLY BUSINESSOS Development Data Seeding System...\n')

  // ── 1. Production Environment Safety Guards ────────────────────────
  const nodeEnv = process.env.NODE_ENV || 'development'
  const vercelEnv = process.env.VERCEL_ENV || 'development'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  if (nodeEnv === 'production' || vercelEnv === 'production') {
    console.error('❌ SEED ABORTED: Cannot run seed script in PRODUCTION environment!')
    process.exit(1)
  }

  if (supabaseUrl.includes('prod') || supabaseUrl.includes('live')) {
    console.error('❌ SEED ABORTED: Supabase URL appears to point to a production cluster!')
    process.exit(1)
  }

  console.log(`✅ Production Safety Guards Passed (Environment: ${nodeEnv})`)
  console.log(`🔗 Target Supabase Host: ${supabaseUrl}\n`)

  const supabase = createAdminClient()

  // ── 2. Seed Organization Setup ──────────────────────────────────────
  const ORG_ID = '11111111-1111-1111-1111-111111111111'
  const OWNER_USER_ID = 'usr-owner-0000-1111'

  console.log('🏢 Seeding Development Tenant Organization...')

  await (supabase.from('organizations') as any).upsert({
    id: ORG_ID,
    name: 'Acme Industrial Systems Pvt Ltd',
    legal_name: 'Acme Industrial Systems Private Limited',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    gst_scheme: 'regular',
    is_gst_registered: true,
    state_code: '27', // Maharashtra
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400013',
    address_line1: 'Plot 42, Lower Parel Industrial Estate',
    address_line2: 'Senapati Bapat Marg',
    email: 'contact@acme-industrial.com',
    phone: '+91 98200 12345',
    currency: 'INR',
    invoice_prefix: 'INV',
    invoice_sequence: 5,
    created_at: new Date().toISOString(),
  })

  // ── 3. Seed Organization Members / Roles ────────────────────────────
  console.log('👥 Seeding Staff Members & Roles...')

  const members = [
    { id: 'mem-001', organization_id: ORG_ID, user_id: OWNER_USER_ID, role: 'owner', status: 'active' },
    { id: 'mem-002', organization_id: ORG_ID, user_id: 'usr-admin-2222', role: 'admin', status: 'active' },
    { id: 'mem-003', organization_id: ORG_ID, user_id: 'usr-mgr-3333', role: 'manager', status: 'active' },
    { id: 'mem-004', organization_id: ORG_ID, user_id: 'usr-acct-4444', role: 'accountant', status: 'active' },
    { id: 'mem-005', organization_id: ORG_ID, user_id: 'usr-sales-5555', role: 'sales', status: 'active' },
  ]

  for (const m of members) {
    await (supabase.from('organization_members') as any).upsert(m)
  }

  // ── 4. Seed Expense Categories ──────────────────────────────────────
  console.log('🏷️ Seeding Expense Categories...')

  const categories = [
    { id: 'exp-cat-01', organization_id: ORG_ID, name: 'Office Rent & Facilities', is_active: true },
    { id: 'exp-cat-02', organization_id: ORG_ID, name: 'Electricity & Utilities', is_active: true },
    { id: 'exp-cat-03', organization_id: ORG_ID, name: 'Raw Material Freight & Travel', is_active: true },
    { id: 'exp-cat-04', organization_id: ORG_ID, name: 'Staff Welfare & Operations', is_active: true },
    { id: 'exp-cat-05', organization_id: ORG_ID, name: 'Software & IT Licensing', is_active: true },
  ]

  for (const cat of categories) {
    await (supabase.from('expense_categories') as any).upsert(cat)
  }

  // ── 5. Seed Customers ────────────────────────────────────────────────
  console.log('🏬 Seeding Realistic B2B Customers...')

  const customers = [
    {
      id: 'cust-seed-01',
      organization_id: ORG_ID,
      display_name: 'Apex Automation Ltd',
      name: 'Apex Automation Limited',
      email: 'procurement@apexauto.in',
      phone: '+91 98190 88776',
      gstin: '27AAACA1234A1Z1',
      gst_type: 'registered_regular',
      state_code: '27', // Intra-state Maharashtra
      state: 'Maharashtra',
      city: 'Pune',
      outstanding_balance: 29800,
      outstanding_paise: 2980000,
      credit_limit: 500000,
    },
    {
      id: 'cust-seed-02',
      organization_id: ORG_ID,
      display_name: 'Bharat Heavy Machinery Corp',
      name: 'Bharat Heavy Machinery Corporation',
      email: 'accounts@bhmc.gov.in',
      phone: '+91 11 2345 6789',
      gstin: '07AAACB5678B1Z2',
      gst_type: 'registered_regular',
      state_code: '07', // Inter-state Delhi
      state: 'Delhi',
      city: 'New Delhi',
      outstanding_balance: 93220,
      outstanding_paise: 9322000,
      credit_limit: 1000000,
    },
    {
      id: 'cust-seed-03',
      organization_id: ORG_ID,
      display_name: 'Western Engineering Solutions',
      name: 'Western Engineering Solutions',
      email: 'info@westerneng.com',
      phone: '+91 98220 33445',
      gstin: '27AAACC9012C1Z3',
      gst_type: 'registered_composition',
      state_code: '27',
      state: 'Maharashtra',
      city: 'Nashik',
      outstanding_balance: 0,
      outstanding_paise: 0,
    },
    {
      id: 'cust-seed-04',
      organization_id: ORG_ID,
      display_name: 'Metro Retail Traders',
      name: 'Metro Retail Traders',
      email: 'sales@metroretail.in',
      phone: '+91 98900 11223',
      gstin: null,
      gst_type: 'unregistered',
      state_code: '27',
      state: 'Maharashtra',
      city: 'Mumbai',
      outstanding_balance: 0,
      outstanding_paise: 0,
    },
  ]

  for (const c of customers) {
    await (supabase.from('customers') as any).upsert(c)
  }

  // ── 6. Seed Suppliers ────────────────────────────────────────────────
  console.log('🏭 Seeding Suppliers...')

  const suppliers = [
    {
      id: 'supp-seed-01',
      organization_id: ORG_ID,
      name: 'Precision Electrical Components Ltd',
      company_name: 'Precision Electrical Components Limited',
      email: 'orders@precisionelec.com',
      phone: '+91 22 6789 1234',
      gstin: '27AAACD3456D1Z4',
      state_code: '27',
      state: 'Maharashtra',
      outstanding_balance: 145000,
      outstanding_paise: 14500000,
    },
    {
      id: 'supp-seed-02',
      organization_id: ORG_ID,
      name: 'National Steel & Alloys Corp',
      company_name: 'National Steel & Alloys Corporation',
      email: 'sales@nationalsteel.co.in',
      phone: '+91 79 2654 9876',
      gstin: '24AAACE7890E1Z5',
      state_code: '24', // Gujarat
      state: 'Gujarat',
      outstanding_balance: 82000,
      outstanding_paise: 8200000,
    },
  ]

  for (const s of suppliers) {
    await (supabase.from('suppliers') as any).upsert(s)
  }

  // ── 7. Seed Products (Tracked Goods & Services) ─────────────────────
  console.log('📦 Seeding Products & Services Catalog...')

  const products = [
    {
      id: 'prod-seed-01',
      organization_id: ORG_ID,
      name: 'Industrial Control Panel 440V',
      sku: 'ICP-440V-01',
      product_type: 'goods',
      track_inventory: true,
      unit_price: 55000,
      purchase_price: 35000,
      sale_price: 55000,
      gst_rate: 18,
      hsn_sac_code: '8537',
      current_stock: 45,
      min_stock_level: 10,
      is_active: true,
    },
    {
      id: 'prod-seed-02',
      organization_id: ORG_ID,
      name: 'Electric Motor 5HP 3-Phase',
      sku: 'MOT-5HP-3P',
      product_type: 'goods',
      track_inventory: true,
      unit_price: 18500,
      purchase_price: 12000,
      sale_price: 18500,
      gst_rate: 18,
      hsn_sac_code: '8501',
      current_stock: 80,
      min_stock_level: 15,
      is_active: true,
    },
    {
      id: 'prod-seed-03',
      organization_id: ORG_ID,
      name: 'Heavy Duty Copper Cable (100m)',
      sku: 'CBL-CU-100M',
      product_type: 'goods',
      track_inventory: true,
      unit_price: 12000,
      purchase_price: 8500,
      sale_price: 12000,
      gst_rate: 18,
      hsn_sac_code: '8544',
      current_stock: 8, // Low stock item
      min_stock_level: 20,
      is_active: true,
    },
    {
      id: 'prod-seed-04',
      organization_id: ORG_ID,
      name: 'Annual Maintenance Contract (AMC)',
      sku: 'SRV-AMC-1YR',
      product_type: 'service',
      track_inventory: false,
      unit_price: 25000,
      purchase_price: 0,
      sale_price: 25000,
      gst_rate: 18,
      hsn_sac_code: '9987',
      current_stock: 0,
      min_stock_level: 0,
      is_active: true,
    },
  ]

  for (const p of products) {
    await (supabase.from('products') as any).upsert(p)
  }

  // ── 8. Seed Opening Inventory Movements ──────────────────────────────
  console.log('📊 Seeding Initial Opening Inventory Movements...')

  const openingMovements = [
    {
      id: 'mov-seed-01',
      organization_id: ORG_ID,
      product_id: 'prod-seed-01',
      movement_type: 'opening',
      reference_type: 'manual',
      quantity: 50,
      unit_cost: 35000,
      total_cost: 1750000,
      running_balance: 50,
      notes: 'Initial opening stock audit setup',
      created_by: OWNER_USER_ID,
    },
    {
      id: 'mov-seed-02',
      organization_id: ORG_ID,
      product_id: 'prod-seed-02',
      movement_type: 'opening',
      reference_type: 'manual',
      quantity: 100,
      unit_cost: 12000,
      total_cost: 1200000,
      running_balance: 100,
      notes: 'Initial opening stock audit setup',
      created_by: OWNER_USER_ID,
    },
  ]

  for (const mov of openingMovements) {
    await (supabase.from('inventory_movements') as any).upsert(mov)
  }

  // ── 9. Seed Sales Invoices & Line Items ───────────────────────────────
  console.log('🧾 Seeding Realistic Sales Invoices...')

  // Invoice 1: Issued Intra-State Invoice to Apex Automation
  const inv1Calculated = calculateCentralGst({
    seller: { state_code: '27', is_gst_registered: true },
    buyer: { state_code: '27', is_gst_registered: true },
    items: [
      { description: 'Industrial Control Panel 440V', quantity: 2, unit_price: 55000, gst_rate: 18, hsn_sac_code: '8537' },
    ],
  })

  await (supabase.from('invoices') as any).upsert({
    id: 'inv-seed-001',
    organization_id: ORG_ID,
    customer_id: 'cust-seed-01',
    invoice_number: 'INV-2026-001',
    invoice_date: '2026-01-10',
    due_date: '2026-01-25',
    invoice_type: 'standard',
    status: 'issued',
    place_of_supply: '27',
    is_inter_state: false,
    subtotal: inv1Calculated.subtotal,
    taxable_amount: inv1Calculated.taxable_amount,
    cgst_amount: inv1Calculated.cgst_amount,
    sgst_amount: inv1Calculated.sgst_amount,
    igst_amount: inv1Calculated.igst_amount,
    total_tax_amount: inv1Calculated.total_tax_amount,
    total_amount: inv1Calculated.grand_total, // 129800
    amount_paid: 100000,
    created_by: OWNER_USER_ID,
  })

  await (supabase.from('invoice_items') as any).upsert({
    id: 'inv-item-001',
    organization_id: ORG_ID,
    invoice_id: 'inv-seed-001',
    product_id: 'prod-seed-01',
    description: 'Industrial Control Panel 440V',
    hsn_sac_code: '8537',
    quantity: 2,
    unit_price: 55000,
    taxable_amount: 110000,
    gst_rate: 18,
    cgst_rate: 9,
    sgst_rate: 9,
    cgst_amount: 9900,
    sgst_amount: 9900,
    line_total: 129800,
  })

  // Invoice 2: Issued Inter-State Invoice to Bharat Heavy Machinery
  const inv2Calculated = calculateCentralGst({
    seller: { state_code: '27', is_gst_registered: true },
    buyer: { state_code: '07', is_gst_registered: true },
    items: [
      { description: 'Electric Motor 5HP 3-Phase', quantity: 4, unit_price: 18500, gst_rate: 18, hsn_sac_code: '8501' },
      { description: 'Annual Maintenance Contract (AMC)', quantity: 1, unit_price: 5000, gst_rate: 18, hsn_sac_code: '9987' },
    ],
  })

  await (supabase.from('invoices') as any).upsert({
    id: 'inv-seed-002',
    organization_id: ORG_ID,
    customer_id: 'cust-seed-02',
    invoice_number: 'INV-2026-002',
    invoice_date: '2026-01-15',
    due_date: '2026-01-30',
    invoice_type: 'standard',
    status: 'issued',
    place_of_supply: '07',
    is_inter_state: true,
    subtotal: inv2Calculated.subtotal,
    taxable_amount: inv2Calculated.taxable_amount,
    igst_amount: inv2Calculated.igst_amount,
    total_tax_amount: inv2Calculated.total_tax_amount,
    total_amount: inv2Calculated.grand_total, // 93220
    amount_paid: 0,
    created_by: OWNER_USER_ID,
  })

  // ── 10. Seed Customer Payment ─────────────────────────────────────────
  console.log('💳 Seeding Customer Payment & Allocation...')

  await (supabase.from('payments') as any).upsert({
    id: 'pay-seed-001',
    organization_id: ORG_ID,
    customer_id: 'cust-seed-01',
    payment_date: '2026-01-20',
    amount_paise: 10000000, // ₹1,00,000
    payment_method: 'bank_transfer',
    reference_number: 'NEFT-AXIS-998877',
    notes: 'Part payment against Sales Invoice INV-2026-001',
  })

  await (supabase.from('payment_allocations') as any).upsert({
    id: 'alloc-seed-001',
    payment_id: 'pay-seed-001',
    invoice_id: 'inv-seed-001',
    allocated_paise: 10000000,
  })

  // ── 11. Seed Expenses ─────────────────────────────────────────────────
  console.log('💸 Seeding Categorized Expenses...')

  const expenses = [
    {
      id: 'exp-seed-001',
      organization_id: ORG_ID,
      category_id: 'exp-cat-01',
      expense_date: '2026-01-01',
      amount_paise: 4500000, // ₹45,000
      gst_paise: 810000,
      vendor_name: 'Parel Commercial Premises Co-Op Society',
      payment_method: 'bank_transfer',
      reference_number: 'CHQ-001122',
      description: 'Office & Workshop Monthly Rent - Jan 2026',
    },
    {
      id: 'exp-seed-002',
      organization_id: ORG_ID,
      category_id: 'exp-cat-02',
      expense_date: '2026-01-05',
      amount_paise: 1820000, // ₹18,200
      gst_paise: 327600,
      vendor_name: 'MSEDCL Industrial Power Ltd',
      payment_method: 'upi',
      reference_number: 'UPI-MSEDCL-4433',
      description: 'Monthly Industrial Electricity Consumption',
    },
    {
      id: 'exp-seed-003',
      organization_id: ORG_ID,
      category_id: 'exp-cat-03',
      expense_date: '2026-01-12',
      amount_paise: 650000, // ₹6,500
      gst_paise: 117000,
      vendor_name: 'FastFreight Logistics Pvt Ltd',
      payment_method: 'cash',
      reference_number: 'CASH-REC-889',
      description: 'Freight & Cartage for Raw Metal Enclosures',
    },
  ]

  for (const exp of expenses) {
    await (supabase.from('expenses') as any).upsert(exp)
  }

  // ── 12. Seed Audit Trail & System Notifications ───────────────────────
  console.log('📝 Seeding Audit Log & Notifications...')

  await (supabase.from('audit_logs') as any).upsert({
    id: 'audit-seed-001',
    organization_id: ORG_ID,
    user_id: OWNER_USER_ID,
    action: 'created',
    resource_type: 'invoice',
    resource_id: 'inv-seed-001',
    new_values: { invoice_number: 'INV-2026-001', grand_total: 129800 },
    created_at: new Date().toISOString(),
  })

  await (supabase.from('notifications') as any).upsert({
    id: 'notif-seed-001',
    organization_id: ORG_ID,
    type: 'low_stock',
    title: 'Low Stock Alert: Heavy Duty Copper Cable (100m)',
    message: 'Current stock level (8 ROLL) is below minimum reorder threshold (20 ROLL).',
    is_read: false,
    created_at: new Date().toISOString(),
  })

  console.log(`\n==================================================`)
  console.log(`🎉 DEVELOPMENT DATA SEEDING COMPLETE FOR ${ORG_ID}`)
  console.log(`==================================================\n`)
}

runDevSeed().catch((err) => {
  console.error('❌ Development Seeding Failed:', err)
  process.exit(1)
})
