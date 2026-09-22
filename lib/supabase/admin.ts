// ============================================================
// lib/supabase/admin.ts — Service-role Supabase client
//
// ⚠️  SERVER-ONLY — NEVER import this in client components
//     or any file that might be bundled for the browser.
//
// Uses the service_role key which bypasses Row Level Security.
// Only use for:
//   - Trusted server-to-server operations (webhooks)
//   - Admin tasks that must bypass RLS
//   - Background jobs
// ============================================================

import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | undefined

/**
 * Returns a singleton Supabase admin client (service-role key).
 * Bypasses Row Level Security — use with extreme caution.
 */
export function createAdminClient() {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
