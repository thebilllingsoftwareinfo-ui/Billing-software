import { describe, it, expect } from 'vitest'
import {
  BUSINESS_STRUCTURE,
  normalizeBusinessClassification,
} from '@/lib/validators/organization.schema'
import {
  demoGetOrganizationProfile,
  demoUpdateOrganizationProfile,
} from '@/lib/services/demo-store'
import { BusinessCategoryService } from '@/lib/services/business-category.service'
import { INDIAN_STATES } from '@/lib/constants/indian-states'

describe('Business Profile & Single Source of Truth Test Suite', () => {
  it('1. Canonical Business Structure contains supported business types and categories', () => {
    expect(BUSINESS_STRUCTURE['Retail']).toBeDefined()
    expect(BUSINESS_STRUCTURE['Retail']).toContain('Jewellery')
    expect(BUSINESS_STRUCTURE['Retail']).toContain('Grocery/Kirana')
    expect(BUSINESS_STRUCTURE['Food & Hospitality']).toContain('Restaurant')
    expect(BUSINESS_STRUCTURE['Wholesale & Distribution']).toContain('General Wholesale')
  })

  it('2. Normalizes classification bidirectionally and enforces valid pairings', () => {
    const res1 = normalizeBusinessClassification('Retail', 'Jewellery')
    expect(res1.business_type).toBe('Retail')
    expect(res1.business_category).toBe('Jewellery')

    // If type is missing, derives from category
    const res2 = normalizeBusinessClassification('', 'Restaurant')
    expect(res2.business_type).toBe('Food & Hospitality')
    expect(res2.business_category).toBe('Restaurant')

    // If category is mismatched, falls back to first allowed category for type
    const res3 = normalizeBusinessClassification('Automobile', 'NonExistentCategory')
    expect(res3.business_type).toBe('Automobile')
    expect(res3.business_category).toBe(BUSINESS_STRUCTURE['Automobile'][0])
  })

  it('3. Persists Business Profile in demo store with all required canonical fields', () => {
    const updated = demoUpdateOrganizationProfile({
      name: 'Test Jewel Mart',
      phone: '9876543210',
      gstin: '27AAAAA0000A1Z5',
      email: 'owner@testjewelmart.com',
      business_type: 'Retail',
      business_category: 'Jewellery',
      state: 'Maharashtra',
      pincode: '400001',
      address_line1: '123 Zaveri Bazaar',
    })

    expect(updated.name).toBe('Test Jewel Mart')
    expect(updated.business_type).toBe('Retail')
    expect(updated.business_category).toBe('Jewellery')
    expect(updated.state).toBe('Maharashtra')
    expect(updated.pincode).toBe('400001')
    expect(updated.address_line1).toBe('123 Zaveri Bazaar')

    const fetched = demoGetOrganizationProfile()
    expect(fetched.name).toBe('Test Jewel Mart')
    expect(fetched.business_category).toBe('Jewellery')
  })

  it('4. BusinessCategoryService adapts category engine and jewelry calculations properly', () => {
    const config = BusinessCategoryService.resolveCategory('Retail', 'Jewellery')
    expect(config.id).toBe('jewellery')
    expect(config.name).toContain('Jewellery')

    // Jewellery specific calculation
    const calc = BusinessCategoryService.calculateJewelleryItem({
      grossWeight: 10,
      stoneWeight: 1,
      metalRatePerGram: 6000,
      purityFactor: 0.916,
      makingCharge: 500,
      makingChargeType: 'per_gram',
      gstRate: 3,
    })

    // Net weight = 10 - 1 = 9g
    expect(calc.netWeight).toBe(9)
    expect(calc.grossWeight).toBe(10)
    expect(calc.stoneWeight).toBe(1)
    expect(calc.effectiveMetalWeight).toBe(9)
    // Metal value = 9 * 6000 * 0.916 = 49464
    expect(calc.metalValue).toBe(49464)
    // Making charges = 9 * 500 = 4500
    expect(calc.makingChargesAmount).toBe(4500)
    // Taxable = 49464 + 4500 = 53964
    expect(calc.taxableAmount).toBe(53964)
    // GST = 3% of 53964 = 1618.92
    expect(calc.gstAmount).toBe(1618.92)
    expect(calc.finalAmount).toBe(55582.92)
  })

  it('5. Indian States contains 36 official states and union territories', () => {
    expect(INDIAN_STATES.length).toBeGreaterThanOrEqual(36)
    const maharashtra = INDIAN_STATES.find(s => s.code === '27')
    expect(maharashtra).toBeDefined()
    expect(maharashtra?.name).toBe('Maharashtra')
    const delhi = INDIAN_STATES.find(s => s.code === '07')
    expect(delhi).toBeDefined()
    expect(delhi?.name).toBe('Delhi')
  })
})
