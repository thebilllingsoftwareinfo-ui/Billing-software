// ============================================================
// lib/constants/indian-states.ts
// Official 36 Indian States and Union Territories with GST Codes
// ============================================================

export interface IndianState {
  code: string
  name: string
  isUnionTerritory?: boolean
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir', isUnionTerritory: true },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh', isUnionTerritory: true },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi', isUnionTerritory: true },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', isUnionTerritory: true },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep', isUnionTerritory: true },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry', isUnionTerritory: true },
  { code: '35', name: 'Andaman and Nicobar Islands', isUnionTerritory: true },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh', isUnionTerritory: true },
  { code: '97', name: 'Other Territory', isUnionTerritory: true },
]

/**
 * Filter states based on query (supports 1st letter, name substring, or state code)
 */
export function filterIndianStates(query: string): IndianState[] {
  if (!query || !query.trim()) return INDIAN_STATES
  const q = query.trim().toLowerCase()
  return INDIAN_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.code.includes(q) ||
      `${s.code} - ${s.name}`.toLowerCase().includes(q)
  )
}

/**
 * Find state by code or name
 */
export function findState(query: string): IndianState | undefined {
  if (!query) return undefined
  const clean = query.trim().toLowerCase()
  return INDIAN_STATES.find(
    (s) =>
      s.code.toLowerCase() === clean ||
      s.name.toLowerCase() === clean ||
      `${s.code} - ${s.name}`.toLowerCase() === clean
  )
}

/**
 * Normalize state name to format 'Name' or 'Code - Name'
 */
export function formatStateDisplay(stateOrCode: string): string {
  const match = findState(stateOrCode)
  if (match) return `${match.name} (${match.code})`
  return stateOrCode
}
