// ============================================================
// middleware.ts — Auth guard + org resolution (Next.js 16)
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]

// Routes that authenticated users should be redirected AWAY from
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  // Check demo auth cookie fallback
  const demoCookie = request.cookies.get('demo_auth')
  const isDemo = demoCookie?.value === 'true'

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )

  let user = null

  if (!isDemo) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value),
              )
              response = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options),
              )
            },
          },
        },
      )

      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Supabase connection error fallback
    }
  }

  // ── Redirect authenticated users away from auth pages ────
  if ((user || isDemo) && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Redirect unauthenticated users ───────────────────────
  if (!user && !isDemo && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
