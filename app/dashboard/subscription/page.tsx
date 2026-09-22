import React from 'react'
import { getAvailablePlans, getSubscriptionStatus, activateTrial, purchasePlan } from '@/lib/services/subscription.service'
import { redirect } from 'next/navigation'

export default async function SubscriptionPage() {
  const { subscription, isActive, isExpired, daysRemaining } = await getSubscriptionStatus()
  const plans = await getAvailablePlans()

  // Find plans
  const trialPlan = plans.find(p => p.plan_code === 'TRIAL')
  const silverPlan = plans.find(p => p.plan_code === 'SILVER')
  const goldPlan = plans.find(p => p.plan_code === 'GOLD')

  // Dummy Server Actions for demo purposes (these would normally hit a checkout route)
  async function handleActivateTrial() {
    'use server'
    await activateTrial()
    redirect('/dashboard/subscription')
  }

  async function handlePurchase(formData: FormData) {
    'use server'
    const planId = formData.get('planId') as string
    if (planId) {
      await purchasePlan(planId)
      redirect('/dashboard/subscription')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-500">Manage your billing and subscription plans.</p>
      </div>

      {/* Current Status */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Current Status</h2>
        
        {!subscription ? (
          <div className="text-gray-600">
            You do not have an active subscription. Please select a plan below.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="font-semibold text-lg">{subscription.plans?.plan_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-semibold text-lg ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                {isExpired ? 'EXPIRED' : subscription.status.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-semibold">{new Date(subscription.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expiry Date</p>
              <p className="font-semibold text-red-600">{new Date(subscription.expiry_date).toLocaleDateString()}</p>
            </div>
            {isActive && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="font-semibold text-orange-600">{daysRemaining} Days</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Trial Plan */}
          {trialPlan && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{trialPlan.plan_name}</h3>
                <p className="text-sm text-gray-500">{trialPlan.duration_days} Days Access</p>
              </div>
              <div className="mb-6 flex-grow">
                <p className="text-3xl font-extrabold text-gray-900">Free</p>
              </div>
              <form action={handleActivateTrial}>
                <button 
                  type="submit" 
                  disabled={!!subscription} 
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {subscription ? 'Trial Claimed' : 'Start Trial'}
                </button>
              </form>
            </div>
          )}

          {/* Silver Plan */}
          {silverPlan && (
            <div className="bg-white p-6 rounded-xl border-2 border-blue-600 shadow-md flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{silverPlan.plan_name}</h3>
                <p className="text-sm text-gray-500">{silverPlan.duration_days} Days Access</p>
              </div>
              <div className="mb-6 flex-grow">
                <p className="text-3xl font-extrabold text-gray-900">₹{(silverPlan.price_paise / 100).toLocaleString()}</p>
                <p className="text-sm text-gray-500">/year</p>
              </div>
              <form action={handlePurchase}>
                <input type="hidden" name="planId" value={silverPlan.id} />
                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  Purchase Silver
                </button>
              </form>
            </div>
          )}

          {/* Gold Plan */}
          {goldPlan && (
            <div className="bg-white p-6 rounded-xl border border-yellow-400 shadow-sm flex flex-col relative overflow-hidden bg-gradient-to-br from-white to-yellow-50">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{goldPlan.plan_name}</h3>
                <p className="text-sm text-gray-500">{goldPlan.duration_days} Days Access</p>
              </div>
              <div className="mb-6 flex-grow">
                <p className="text-3xl font-extrabold text-gray-900">₹{(goldPlan.price_paise / 100).toLocaleString()}</p>
                <p className="text-sm text-gray-500">/3 years</p>
              </div>
              <form action={handlePurchase}>
                <input type="hidden" name="planId" value={goldPlan.id} />
                <button 
                  type="submit" 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  Purchase Gold
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
