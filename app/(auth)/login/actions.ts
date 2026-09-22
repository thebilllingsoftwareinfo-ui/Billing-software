'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginDemo() {
  const cookieStore = await cookies()
  cookieStore.set('demo_auth', 'true', { path: '/' })
  redirect('/dashboard')
}
