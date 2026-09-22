import { redirect } from 'next/navigation'

/**
 * Root page — redirects to /dashboard.
 * Middleware will redirect unauthenticated users to /login.
 */
export default function RootPage() {
  redirect('/dashboard')
}
