// ============================================================
// lib/auth/api-session.ts — Shared API route auth helper
// ============================================================
// Resolves session from either Supabase Auth OR demo_auth cookie.
// Use this in ALL API route handlers instead of supabase.auth.getUser()

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { OrgRole, MemberStatus } from '@/types/app.types'

export interface ApiSession {
  user_id: string
  organization_id: string
  role: OrgRole
  is_demo?: boolean
}

/**
 * Returns session or null. Never throws.
 * Use in API routes: const session = await getApiSession()
 * if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function getApiSession(): Promise<ApiSession | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (!member) return null

    return {
      user_id: user.id,
      organization_id: member.organization_id,
      role: member.role as OrgRole,
    }
  } catch {
    return null
  }
}
