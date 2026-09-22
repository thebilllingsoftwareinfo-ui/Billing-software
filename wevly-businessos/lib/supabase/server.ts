// ============================================================
// lib/supabase/server.ts — Server-side Supabase client
// Used in Server Components, Server Actions, and API Routes
// Reads/writes cookies for session management
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side usage.
 * Must be called inside an async Server Component or Route Handler.
 * Uses the anon key — respects Row Level Security.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // The middleware handles session refresh.
          }
        },
      },
    },
  )
}
