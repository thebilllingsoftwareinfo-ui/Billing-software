// ============================================================
// lib/constants/invoice-templates.ts
// Standard Definitions for All Vyapar Invoice Print Templates & Color Themes
// ============================================================

import {
  FileSpreadsheet,
  Sparkles,
  Minimize2,
  Receipt,
  Layers,
  Gem,
  LucideIcon,
} from 'lucide-react'

export type PDFTemplateType =
  | 'standard'
  | 'classic'
  | 'vyapar_classic'
  | 'modern'
  | 'vyapar_modern'
  | 'compact_a5'
  | 'thermal_pos'
  | 'jewelry_gold'
  | 'minimal'

export interface TemplateColorTheme {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
  badgeBg: string
  badgeText: string
}

export const TEMPLATE_COLORS: TemplateColorTheme[] = [
  {
    id: 'vyapar_red',
    name: 'VANIRA Crimson',
    primary: '#D32F2F',
    secondary: '#B71C1C',
    accent: '#FFEBEE',
    badgeBg: '#FFEBEE',
    badgeText: '#C62828',
  },
  {
    id: 'corporate_blue',
    name: 'Royal Navy',
    primary: '#1E3A8A',
    secondary: '#1E40AF',
    accent: '#EFF6FF',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
  },
  {
    id: 'emerald_green',
    name: 'Forest Green',
    primary: '#047857',
    secondary: '#065F46',
    accent: '#ECFDF5',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
  },
  {
    id: 'luxury_gold',
    name: 'Jewelry Amber',
    primary: '#B45309',
    secondary: '#92400E',
    accent: '#FFFBEB',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  {
    id: 'charcoal_slate',
    name: 'Charcoal Slate',
    primary: '#334155',
    secondary: '#1E293B',
    accent: '#F8FAFC',
    badgeBg: '#F1F5F9',
    badgeText: '#1E293B',
  },
]

export interface InvoiceTemplateConfig {
  id: PDFTemplateType
  name: string
  category: 'gst' | 'thermal' | 'industry' | 'compact'
  paperSize: 'A4' | 'A5' | '80mm' | '58mm'
  badge: string
  desc: string
  icon: LucideIcon
  defaultColor?: string
}

export const TEMPLATE_OPTIONS: InvoiceTemplateConfig[] = [
  {
    id: 'standard',
    name: 'VANIRA Classic GST',
    category: 'gst',
    paperSize: 'A4',
    badge: 'VANIRA Signature',
    desc: 'The iconic Indian GST invoice with crimson borders, HSN summary box, bank details & UPI QR',
    icon: FileSpreadsheet,
    defaultColor: '#D32F2F',
  },
  {
    id: 'modern',
    name: 'VANIRA Modern Blue',
    category: 'gst',
    paperSize: 'A4',
    badge: 'A4 Modern',
    desc: 'Executive brand banner, clean tabular layout, and prominent payment status stamp',
    icon: Sparkles,
    defaultColor: '#1E3A8A',
  },
  {
    id: 'thermal_pos',
    name: 'VANIRA POS Thermal Roll',
    category: 'thermal',
    paperSize: '80mm',
    badge: '3-Inch / 80mm',
    desc: 'Fast receipt for thermal roll printers (Epson/TVS/Everycom) with UPI QR & barcode',
    icon: Receipt,
    defaultColor: '#111827',
  },
  {
    id: 'jewelry_gold',
    name: 'VANIRA Gold & Jewelry Special',
    category: 'industry',
    paperSize: 'A4',
    badge: 'BIS Hallmarking',
    desc: 'Specially designed for jewelers with Gross/Net Weight, Purity (22K/18K), Making & Stone charges',
    icon: Gem,
    defaultColor: '#B45309',
  },
  {
    id: 'compact_a5',
    name: 'VANIRA Compact A5 (Half-Page)',
    category: 'compact',
    paperSize: 'A5',
    badge: '50% Paper Saver',
    desc: 'Space-efficient format ideal for delivery challans, transport bills, and small retail orders',
    icon: Minimize2,
    defaultColor: '#047857',
  },
  {
    id: 'minimal',
    name: 'VANIRA Minimalist Ink-Saver',
    category: 'gst',
    paperSize: 'A4',
    badge: 'Dot-Matrix / Mono',
    desc: 'Clean monochrome borderless table for ultra-fast printing and ink conservation',
    icon: Layers,
    defaultColor: '#1E293B',
  },
]

export function getTemplateConfig(id: string): InvoiceTemplateConfig {
  const normId = id === 'vyapar_classic' || id === 'classic' ? 'standard' : id === 'vyapar_modern' ? 'modern' : id
  return (
    TEMPLATE_OPTIONS.find((t) => t.id === normId) ||
    TEMPLATE_OPTIONS[0]
  )
}

