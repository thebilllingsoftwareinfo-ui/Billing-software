// ============================================================
// scripts/create-demo-user.ts
// Creates an authenticated Demo User account in Supabase Auth & links to Seed Tenant
// ============================================================

import { createAdminClient } from '../lib/supabase/admin'

const DEMO_EMAIL = 'demo@acmeindustrial.com'
const DEMO_PASSWORD = 'Demo12345!'
const SEED_ORG_ID = '11111111-1111-1111-1111-111111111111'

async function createDemoAccount() {
  console.log('👤 Creating/Updating Demo User Account in Supabase Auth...\n')

  const supabase = createAdminClient()

  // 1. Check if user already exists in auth.users
  const { data: usersList } = await supabase.auth.admin.listUsers()
  const existingUser = usersList?.users?.find((u) => u.email === DEMO_EMAIL)

  let userId: string

  if (existingUser) {
    console.log(`ℹ️ Demo user '${DEMO_EMAIL}' already exists (ID: ${existingUser.id}). Updating password...`)
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: 'Demo Owner (Acme)' } }
    )
    if (updateError) {
      throw new Error(`Failed to update demo user password: ${updateError.message}`)
    }
    userId = updated.user.id
  } else {
    console.log(`✨ Creating new Supabase Auth user for '${DEMO_EMAIL}'...`)
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Demo Owner (Acme)' },
    })

    if (createError || !created.user) {
      throw new Error(`Failed to create demo user: ${createError?.message}`)
    }
    userId = created.user.id
  }

  // 2. Ensure Seed Tenant Organization exists
  const { data: org } = await (supabase.from('organizations') as any)
    .select('id, name')
    .eq('id', SEED_ORG_ID)
    .single()

  if (!org) {
    console.log('🏢 Creating Seed Tenant Organization...')
    await (supabase.from('organizations') as any).upsert({
      id: SEED_ORG_ID,
      name: 'Acme Industrial Systems Pvt Ltd',
      legal_name: 'Acme Industrial Systems Private Limited',
      gstin: '27AABCU9603R1ZM',
      pan: 'AABCU9603R',
      gst_scheme: 'regular',
      is_gst_registered: true,
      state_code: '27',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400013',
      address_line1: 'Plot 42, Lower Parel Industrial Estate',
      email: 'contact@acmeindustrial.com',
      currency: 'INR',
      invoice_prefix: 'INV',
      invoice_sequence: 5,
    })
  }

  // 3. Link Demo User to Seed Organization Members as OWNER
  console.log(`🔗 Linking user '${userId}' to Organization '${SEED_ORG_ID}' as OWNER...`)
  await (supabase.from('organization_members') as any).upsert({
    id: `mem-demo-owner-${userId.slice(0, 8)}`,
    organization_id: SEED_ORG_ID,
    user_id: userId,
    role: 'owner',
    status: 'active',
    updated_at: new Date().toISOString(),
  })

  console.log(`\n==================================================`)
  console.log(`🎉 DEMO ACCOUNT READY FOR SIGN IN:`)
  console.log(`   Email:    ${DEMO_EMAIL}`)
  console.log(`   Password: ${DEMO_PASSWORD}`)
  console.log(`   Role:     OWNER (Acme Industrial Systems Pvt Ltd)`)
  console.log(`==================================================\n`)
}

createDemoAccount().catch((err) => {
  console.error('❌ Demo Account Creation Failed:', err)
  process.exit(1)
})
