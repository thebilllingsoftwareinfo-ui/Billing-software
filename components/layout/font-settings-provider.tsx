'use client'

import { useEffect } from 'react'

export const FONT_OPTIONS = [
  {
    id: 'lato',
    name: 'Lato',
    subtitle: 'Warm & Professional Sans (Default)',
    family: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'inter',
    name: 'Inter',
    subtitle: 'Modern Crisp Sans',
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'roboto',
    name: 'Roboto',
    subtitle: 'Clean Google Material Sans',
    family: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'outfit',
    name: 'Outfit',
    subtitle: 'Geometric & Elegant Display',
    family: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    subtitle: 'High-Legibility Modern SaaS',
    family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
]

export const FONT_SIZE_OPTIONS = [
  { id: 'default', name: 'Default', scale: 100, size: '14px', desc: 'Default standard font size (100%)' },
  { id: '110', name: '110%', scale: 110, size: '15.4px', desc: '10% larger text' },
  { id: '115', name: '115%', scale: 115, size: '16.1px', desc: '15% larger text' },
  { id: '120', name: '120%', scale: 120, size: '16.8px', desc: '20% larger text' },
  { id: '125', name: '125%', scale: 125, size: '17.5px', desc: '25% larger text' },
  { id: '130', name: '130%', scale: 130, size: '18.2px', desc: '30% larger text' },
]

export function applyAppFont(fontId: string) {
  const fontConfig = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0]
  document.documentElement.style.setProperty('--app-font-family', fontConfig.family)
  localStorage.setItem('vanira_app_font', fontId)
}

export function applyAppFontSize(sizeId: string) {
  const sizeConfig = FONT_SIZE_OPTIONS.find((s) => s.id === sizeId) || FONT_SIZE_OPTIONS[1]
  document.documentElement.style.setProperty('--app-font-size', sizeConfig.size)
  localStorage.setItem('vanira_app_font_size', sizeId)
}

export function FontSettingsProvider() {
  useEffect(() => {
    try {
      const savedFont = localStorage.getItem('vanira_app_font') || 'lato'
      applyAppFont(savedFont)

      const s = JSON.parse(localStorage.getItem('vanira_full_settings') || '{}')
      // Baseline: 100% in settings maps to 120% visual zoom (the user's preferred default)
      const scale = typeof s.screenScale === 'number' ? s.screenScale : 100
      const effectiveZoom = Math.round((scale / 100) * 120)
      document.documentElement.style.zoom = `${effectiveZoom}%`
    } catch {
      // ignore
    }
  }, [])

  return null
}
