'use client'

import { useState, useEffect } from 'react'
import type { BusinessCategory } from '@/types/app.types'
import { VaniraFirstSaleCreator } from './vyapar-first-sale-creator'
import VaniraMainDashboard from './vanira-main-dashboard'

interface DashboardSwitcherContainerProps {
  initialCategory: BusinessCategory
  organizationId?: string
  hasInvoices?: boolean
}

export function DashboardSwitcherContainer({
  initialCategory,
  organizationId = 'default',
  hasInvoices = false,
}: DashboardSwitcherContainerProps) {
  // The sample only appears when user signs up or logs in for the first time ever.
  // After that it should never appear.
  const [showSample, setShowSample] = useState<boolean>(false)

  useEffect(() => {
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const isFirstLoginParam = urlParams ? urlParams.get('first_login') === 'true' : false

      const seenKey = `vanira_sample_seen_${organizationId}`
      const completedKey = `vanira_sample_completed_${organizationId}`

      const hasSeenBefore = localStorage.getItem(seenKey) === 'true'
      const hasCompleted = localStorage.getItem(completedKey) === 'true'

      // The sample ONLY appears when user signs up or logs in for the very first time ever.
      // After that, it should NEVER appear.
      const isFirstEver = isFirstLoginParam && !hasInvoices && !hasSeenBefore && !hasCompleted

      if (isFirstEver) {
        setShowSample(true)
        // Mark that the first ever view has happened so it will NEVER appear again
        localStorage.setItem(seenKey, 'true')
      } else {
        setShowSample(false)
      }
    } catch {
      // ignore
    }
  }, [hasInvoices, organizationId])

  const handleDismissSample = () => {
    try {
      localStorage.setItem(`vanira_sample_completed_${organizationId}`, 'true')
      localStorage.setItem(`vanira_sample_seen_${organizationId}`, 'true')
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('first_login')
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''))
      }
    } catch {
      // ignore
    }
    setShowSample(false)
  }

  return (
    <div>
      {/* First-time-ever sample invoice creator — appears only once on first login */}
      {showSample ? (
        <VaniraFirstSaleCreator
          onInvoiceCreated={handleDismissSample}
          onDismiss={handleDismissSample}
        />
      ) : (
        /* Main Dashboard — always shown directly, no tabs */
        <VaniraMainDashboard />
      )}
    </div>
  )
}
