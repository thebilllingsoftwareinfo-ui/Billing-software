// ============================================================
// lib/utils/date.ts — Date formatting utilities (Indian locale)
// ============================================================

import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns'

/**
 * Formats a date to Indian standard format: DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy')
}

/**
 * Formats a date to a longer readable form: 12 Sep 2026
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy')
}

/**
 * Returns relative time string: "3 days ago", "in 5 hours"
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Formats date for invoice display: Sep 12, 2026
 */
export function formatInvoiceDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

/**
 * Returns today's date as an ISO date string: 2026-09-12
 */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Returns true if the due date has passed (invoice is overdue)
 */
export function isOverdue(dueDate: Date | string): boolean {
  const d = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return isBefore(d, new Date())
}

/**
 * Returns financial year label from a date: e.g. "FY 2025-26"
 */
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1 // 1-indexed
  const year = date.getFullYear()
  if (month >= 4) {
    return `FY ${year}-${String(year + 1).slice(2)}`
  }
  return `FY ${year - 1}-${String(year).slice(2)}`
}
