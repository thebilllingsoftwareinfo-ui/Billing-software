// ============================================================
// lib/supabase/client.ts — Browser-side Supabase client
// Used only in Client Components ('use client')
// ============================================================

import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | undefined

/**
 * Returns a singleton Supabase browser client.
 * Safe to call from any Client Component.
 */
export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return client
}
