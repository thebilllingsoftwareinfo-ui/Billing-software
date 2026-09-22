import { createClient } from '@/lib/supabase/server'

export type Plan = {
  id: string
  plan_name: string
  plan_code: string
  duration_days: number
  price_paise: number
  currency: string
  is_active: boolean
}

export type Subscription = {
  id: string
  user_id: string
  plan_id: string
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'pending'
  start_date: string
  expiry_date: string
  purchased_price: number
  currency: string
  plans?: Plan // joined plan data
}

/**
 * Gets the current subscription status for the authenticated user.
 * It strictly compares the current server time with the expiry date to calculate status.
 */
export async function getSubscriptionStatus(): Promise<{
  subscription: Subscription | null
  isActive: boolean
  isExpired: boolean
  daysRemaining: number
}> {
  const supabase = await createClient()

  // 1. Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { subscription: null, isActive: false, isExpired: false, daysRemaining: 0 }
  }

  // 2. Fetch the latest subscription
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', user.id)
    .order('expiry_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !sub) {
    return { subscription: null, isActive: false, isExpired: false, daysRemaining: 0 }
  }

  // 3. Calculate Expiry securely on the server side
  const now = new Date()
  const expiry = new Date(sub.expiry_date)
  
  const isExpired = now >= expiry
  const isActive = !isExpired && (sub.status === 'trial' || sub.status === 'active')

  // 4. Calculate days remaining
  const timeDiff = expiry.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)))

  return {
    subscription: sub as Subscription,
    isActive,
    isExpired,
    daysRemaining
  }
}

/**
 * Calls the secure RPC to activate a 7-day trial.
 */
export async function activateTrial() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('activate_trial')
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data // returns subscription id
}

/**
 * Retrieves all available active plans
 */
export async function getAvailablePlans(): Promise<Plan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_paise', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data as Plan[]
}

/**
 * Mock Purchase Function for Testing.
 * It simulates a secure backend purchase by calling Supabase.
 * In a real app, this would be inside a webhook from Razorpay/Stripe.
 */
export async function purchasePlan(planId: string) {
  const supabase = await createClient()
  
  // 1. Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 2. Get the plan to lock the price
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()
    
  if (planError || !plan) throw new Error('Plan not found')

  // 3. Calculate new expiry
  // If user already has an active subscription, add to it. Otherwise, start from now.
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('expiry_date')
    .eq('user_id', user.id)
    .order('expiry_date', { ascending: false })
    .limit(1)
    .single()

  let startDate = new Date()
  let expiryDate = new Date()

  if (existingSub && new Date(existingSub.expiry_date) > new Date()) {
    // Add to existing expiry
    startDate = new Date(existingSub.expiry_date)
    expiryDate = new Date(existingSub.expiry_date)
  }

  expiryDate.setDate(expiryDate.getDate() + plan.duration_days)

  // 4. Create new subscription record (price locked)
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      status: 'active',
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      purchased_price: plan.price_paise,
      currency: plan.currency
    })
    .select()
    .single()

  if (subError) throw new Error(subError.message)

  // 5. Create payment record
  const { error: payError } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      subscription_id: sub.id,
      plan_id: plan.id,
      amount_paise: plan.price_paise,
      currency: plan.currency,
      status: 'completed'
    })

  if (payError) throw new Error(payError.message)

  return sub
}
