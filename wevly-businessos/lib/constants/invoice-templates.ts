// ============================================================
// lib/constants/invoice-templates.ts
// Standard Definitions for All 5 Invoice Print Templates
// ============================================================

import {
  FileSpreadsheet,
  Sparkles,
  Minimize2,
  Receipt,
  Layers,
  LucideIcon,
} from 'lucide-react'

export type PDFTemplateType =
  | 'standard'
  | 'classic'
  | 'modern'
  | 'compact_a5'
  | 'thermal_pos'
  | 'minimal'

export interface InvoiceTemplateConfig {
  id: PDFTemplateType
  name: string
  paperSize: 'A4' | 'A5' | '80mm'
  badge: string
  desc: string
  icon: LucideIcon
}

export const TEMPLATE_OPTIONS: InvoiceTemplateConfig[] = [
  {
    id: 'standard',
    name: 'Standard GST Pro',
    paperSize: 'A4',
    badge: 'A4 Standard',
    desc: 'Exact match to reference GST invoice with 2-column box, HSN breakdown, Bank details & UPI QR',
    icon: FileSpreadsheet,
  },
  {
    id: 'modern',
    name: 'Modern Executive',
    paperSize: 'A4',
    badge: 'A4 Modern',
    desc: 'Indigo card styling with brand banner and compact settlement box',
    icon: Sparkles,
  },
  {
    id: 'compact_a5',
    name: 'Compact Half-Page',
    paperSize: 'A5',
    badge: 'A5 Half-Page',
    desc: '50% paper saving, perfect for delivery challans & small cut-sheet printers',
    icon: Minimize2,
  },
  {
    id: 'thermal_pos',
    name: 'POS Thermal Roll',
    paperSize: '80mm',
    badge: '80mm Roll',
    desc: 'Monospace receipt for 3-inch thermal roll printers (Epson/TVS) with UPI QR',
    icon: Receipt,
  },
  {
    id: 'minimal',
    name: 'Minimal Mono',
    paperSize: 'A4',
    badge: 'A4 Ink-Saver',
    desc: 'Clean black & white ink-saver layout for laser & dot-matrix printers',
    icon: Layers,
  },
]

export function getTemplateConfig(id: string): InvoiceTemplateConfig {
  return (
    TEMPLATE_OPTIONS.find((t) => t.id === id) ||
    TEMPLATE_OPTIONS[0]
  )
}
