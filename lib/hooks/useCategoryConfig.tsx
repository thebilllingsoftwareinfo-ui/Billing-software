'use client'

import { createContext, useContext, ReactNode } from 'react'
import { BusinessCategory } from '@/types/app.types'
import { CATEGORY_CONFIGS, CategoryConfig, resolveBaseCategory } from '@/lib/config/business-categories.config'

const CategoryConfigContext = createContext<CategoryConfig | null>(null)

interface ProviderProps {
  category: BusinessCategory
  children: ReactNode
}

export function CategoryConfigProvider({ category, children }: ProviderProps) {
  const baseKey = resolveBaseCategory('', category || '')
  // Fallback to retail if the category is somehow missing from config
  const config = CATEGORY_CONFIGS[baseKey] || CATEGORY_CONFIGS['retail']

  return (
    <CategoryConfigContext.Provider value={config}>
      {children}
    </CategoryConfigContext.Provider>
  )
}

/**
 * Hook to access the current business category configuration.
 * Must be used within a component wrapped by CategoryConfigProvider (which is inside DashboardShell).
 */
export function useCategoryConfig(): CategoryConfig {
  const context = useContext(CategoryConfigContext)
  if (!context) {
    throw new Error('useCategoryConfig must be used within a CategoryConfigProvider')
  }
  return context
}
