// ============================================================
// lib/auth/session.ts — Server-side session resolution
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { AppSession, OrgRole, MemberStatus, BusinessCategory } from '@/types/app.types'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export type { AppSession }

// ── Shared demo session constant ─────────────────────────────
const DEMO_SESSION: AppSession = {
  user_id: 'usr-owner-demo-1111',
  organization_id: '11111111-1111-1111-1111-111111111111',
  role: 'owner' as OrgRole,
  user: {
    id: 'usr-owner-demo-1111',
    email: 'demo@acmeindustrial.com',
    full_name: 'Demo Owner (Acme)',
    avatar_url: null,
  },
  organization: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Acme Industrial Systems Pvt Ltd',
    gstin: '27AABCU9603R1ZM',
    logo_url: null,
    business_category: 'wholesale',
  },
  member: {
    id: 'mem-demo-owner',
    role: 'owner' as OrgRole,
    status: 'active' as MemberStatus,
  },
}

import { demoGetOrganizationProfile } from '@/lib/services/demo-store'

/**
 * Resolves the demo_auth cookie. Returns the shared demo AppSession or null.
 * Never throws — safe to call anywhere including edge/build contexts.
 */
async function getDemoSession(): Promise<AppSession | null> {
  try {
    const cookieStore = await cookies()
    const demoCookie = cookieStore.get('demo_auth')
    if (demoCookie?.value === 'true') {
      const categoryCookie = cookieStore.get('demo_category')?.value as BusinessCategory | undefined
      const demoProfile = demoGetOrganizationProfile()
      const category = (categoryCookie || demoProfile.business_category || 'wholesale') as BusinessCategory

      return {
        ...DEMO_SESSION,
        organization: {
          ...DEMO_SESSION.organization,
          name: demoProfile.name || DEMO_SESSION.organization.name,
          business_category: category,
        },
      }
    }
  } catch {
    // Ignore cookie resolution error in build/edge
  }
  return null
}

/**
 * Fetches and validates the current server-side session.
 * Throws a redirect to /login if the user is not authenticated.
 * Throws a redirect to /setup if the user has no active organization.
 */
export async function getServerSession(): Promise<AppSession> {
  // Check local demo auth cookie fallback first
  const demo = await getDemoSession()
  if (demo) return demo

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch the user's active organization membership
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select(
      `
      id,
      role,
      status,
      organization_id,
      organizations (
        id,
        name,
        gstin,
        logo_url,
        business_category
      )
    `,
    )
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (memberError || !member) {
    redirect('/setup')
  }

  const org = (member.organizations as unknown as {
    id: string
    name: string
    gstin: string | null
    logo_url: string | null
    business_category: BusinessCategory | null
  })

  return {
    user_id: user.id,
    organization_id: org.id,
    role: member.role as OrgRole,
    user: {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    organization: {
      id: org.id,
      name: org.name,
      gstin: org.gstin,
      logo_url: org.logo_url,
      business_category: (org.business_category ?? 'retail') as BusinessCategory,
    },
    member: {
      id: member.id,
      role: member.role as OrgRole,
      status: member.status as MemberStatus,
    },
  }
}

/**
 * Same as getServerSession but does NOT redirect — returns null instead.
 *
 * IMPORTANT: This checks the demo_auth cookie BEFORE calling getServerSession,
 * because getServerSession calls redirect() which throws a Next.js internal
 * error. That error would be swallowed by the catch block, incorrectly
 * returning null even when a valid demo session exists.
 */
export async function getServerSessionOptional(): Promise<AppSession | null> {
  const demo = await getDemoSession()
  if (demo) return demo

  try {
    return await getServerSession()
  } catch {
    return null
  }
}

export const getAppSession = getServerSession
