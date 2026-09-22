'use client'

import React from 'react'
import Link from 'next/link'

interface SubscriptionBannerProps {
  isActive: boolean
  isExpired: boolean
  daysRemaining: number
}

export function SubscriptionBanner({ isActive, isExpired, daysRemaining }: SubscriptionBannerProps) {
  if (!isActive && !isExpired) {
    return null // Loading or no subscription
  }

  if (isExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shadow-sm z-50 sticky top-0">
        <span className="font-semibold text-sm sm:text-base">
          Your subscription has expired. Please renew to continue using all features.
        </span>
        <Link 
          href="/dashboard/subscription" 
          className="bg-white text-red-600 px-4 py-1.5 rounded-md text-sm font-bold shadow hover:bg-red-50 transition-colors"
        >
          Renew Now
        </Link>
      </div>
    )
  }

  if (isActive && daysRemaining <= 7) {
    return (
      <div className="bg-orange-500 text-white px-4 py-3 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shadow-sm z-50 sticky top-0">
        <span className="font-semibold text-sm sm:text-base">
          {daysRemaining === 0 
            ? 'Your subscription expires today!' 
            : `Your subscription expires in ${daysRemaining} days.`}
        </span>
        <Link 
          href="/dashboard/subscription" 
          className="bg-white text-orange-600 px-4 py-1.5 rounded-md text-sm font-bold shadow hover:bg-orange-50 transition-colors"
        >
          Upgrade / Renew
        </Link>
      </div>
    )
  }

  return null
}
