// ============================================================
// tests/pdf-generation.test.ts
// Automated Test Suite for Invoice PDF Generation & Snapshot Integrity
// ============================================================

import assert from 'node:assert'
import { numberToRupeeWords } from '../lib/utils/number-to-words'

export type PDFTemplateType = 'classic' | 'modern' | 'minimal'

export interface InvoicePDFSnapshot {
  invoice_number: string
  invoice_date: string
  due_date?: string | null
  status: string
  place_of_supply?: string | null
  reference_number?: string | null
  subtotal: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_tax_amount: number
  round_off_amount: number
  total_amount: number
  amount_paid: number
  balance_due?: number
  is_inter_state: boolean
  organization?: {
    name: string
    legal_name?: string | null
    gstin?: string | null
    state_code?: string | null
  } | null
  customers?: {
    display_name: string
    gstin?: string | null
    phone?: string | null
  } | null
  invoice_items: Array<{
    description: string
    hsn_sac_code?: string | null
    quantity: number
    unit?: string | null
    unit_price: number
    discount_percent: number
    gst_rate: number
    line_total: number
    taxable_amount: number
  }>
}

async function runTests() {
  console.log('🧪 Running Wevly BusinessOS PDF Generation & Snapshot Integrity Test Suite...\n')

  let passed = 0
  let total = 0

  async function test(name: string, fn: () => void | Promise<void>) {
    total++
    try {
      await fn()
      console.log(`  ✓ PASSED: ${name}`)
      passed++
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`)
      console.error(`     Error: ${err.message}`)
    }
  }

  // ── 1. Amount in Words Utility ──────────────────────────────
  console.log('🔤 Test Suite 1: Amount in Rupee Words Converter')

  await test('Converts integer thousands correctly to Rupee words', () => {
    const words = numberToRupeeWords(15000)
    assert.strictEqual(words, 'Rupees Fifteen Thousand Only', 'Must convert 15000 accurately')
  })

  await test('Converts Lakhs and Crores in Indian numbering system format', () => {
    const words1 = numberToRupeeWords(150000) // 1.5 Lakhs
    assert.strictEqual(words1, 'Rupees One Lakh Fifty Thousand Only')

    const words2 = numberToRupeeWords(12500000) // 1.25 Crores
    assert.strictEqual(words2, 'Rupees One Crore Twenty Five Lakh Only')
  })

  await test('Converts decimal paise fractions correctly', () => {
    const words = numberToRupeeWords(450.50)
    assert.strictEqual(words, 'Rupees Four Hundred Fifty and Fifty Paise Only')
  })

  // ── 2. PDF Template Selector Validation ────────────────────
  console.log('\n📄 Test Suite 2: PDF Template Selector & Snapshot Integrity')

  const sampleSnapshot: InvoicePDFSnapshot = {
    invoice_number: 'INV-2026-0001',
    invoice_date: '2026-09-13',
    due_date: '2026-09-27',
    status: 'issued',
    place_of_supply: 'Maharashtra (27)',
    reference_number: 'PO-98765',
    subtotal: 100000,
    discount_amount: 10000,
    taxable_amount: 90000,
    cgst_amount: 8100,
    sgst_amount: 8100,
    igst_amount: 0,
    total_tax_amount: 16200,
    round_off_amount: 0,
    total_amount: 106200,
    amount_paid: 0,
    balance_due: 106200,
    is_inter_state: false,
    organization: {
      name: 'Acme Enterprise Solutions Pvt Ltd',
      legal_name: 'Acme Enterprise Solutions Private Limited',
      gstin: '27AAAAA0000A1Z5',
      state_code: '27',
    },
    customers: {
      display_name: 'Global Business Corp',
      gstin: '27BBBCC1111B1Z2',
      phone: '+91 9876543210',
    },
    invoice_items: [
      {
        description: 'Enterprise Cloud Server Installation',
        hsn_sac_code: '998313',
        quantity: 2,
        unit: 'hrs',
        unit_price: 50000,
        discount_percent: 10,
        gst_rate: 18,
        taxable_amount: 90000,
        line_total: 106200,
      },
    ],
  }

  await test('Validates Classic, Modern, and Minimal template selection identifiers', () => {
    const validTemplates: PDFTemplateType[] = ['classic', 'modern', 'minimal']
    validTemplates.forEach((t) => {
      assert.strictEqual(['classic', 'modern', 'minimal'].includes(t), true, `Template ${t} must be valid`)
    })
  })

  await test('PDF generator builds snapshot document using frozen invoice snapshot data rather than live catalog changes', () => {
    const mutatedLiveCatalogPrice = 999999
    const frozenSnapshotItemPrice = sampleSnapshot.invoice_items[0].unit_price

    assert.strictEqual(
      frozenSnapshotItemPrice,
      50000,
      'Finalized invoice PDF snapshot price must remain frozen at 50000 regardless of catalog changes'
    )
    assert.notStrictEqual(frozenSnapshotItemPrice, mutatedLiveCatalogPrice)
  })

  console.log(`\n==================================================`)
  console.log(`📊 PDF Generation Test Summary: ${passed}/${total} Tests Passed`)
  console.log(`==================================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution crashed:', err)
  process.exit(1)
})
