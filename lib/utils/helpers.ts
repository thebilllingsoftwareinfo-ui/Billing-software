// ============================================================
// lib/utils/helpers.ts — General utility functions
// ============================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS class names, resolving conflicts.
 * Standard shadcn/ui pattern.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random alphanumeric string of the given length.
 * Used for temporary references (not cryptographic).
 */
export function randomRef(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase()
}

/**
 * Formats a GSTIN for display: 27AAPFU0939F1ZV
 */
export function formatGSTIN(gstin: string): string {
  return gstin.trim().toUpperCase()
}

/**
 * Validates basic GSTIN format (15 chars, alphanumeric pattern)
 */
export function isValidGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gstin.trim().toUpperCase(),
  )
}

/**
 * Validates PAN format: AAPFU0939F
 */
export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase())
}

/**
 * Extracts the state code from a GSTIN (first 2 digits)
 */
export function getStateCodeFromGSTIN(gstin: string): string {
  return gstin.trim().substring(0, 2)
}

/**
 * Returns initials from a full name: "Amit Shah" → "AS"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Truncates a string to the given max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Converts a string to a URL-friendly slug.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Deep removes undefined/null values from an object (for API bodies).
 */
export function cleanPayload<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>
}
