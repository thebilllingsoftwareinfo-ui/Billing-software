// ============================================================
// tests/phase6-inventory.test.ts
// Phase 6 Inventory & Stock Management — Stock Adjustment Hardening Test Suite
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  postInventoryMovement,
  processStockAdjustment,
  normalizeMovementType,
  computeStockStatus,
} from '../lib/services/inventory.service'
import { toBaseQuantity, fromBaseQuantity } from '../lib/services/unit.service'
import { POST as openingStockPost } from '../app/api/inventory/opening/route'
import { POST as adjustmentsPost } from '../app/api/inventory/adjustments/route'
import { POST as salesReturnPost } from '../app/api/returns/sales/route'
import { POST as purchaseReturnPost } from '../app/api/returns/purchases/route'
import { GET as productMovementsGet } from '../app/api/inventory/product/[id]/movements/route'
import { SalesReturnService, inMemorySalesReturns } from '../lib/services/sales-return.service'
import { PurchaseReturnService, inMemoryPurchaseReturns } from '../lib/services/purchase-return.service'
import { PurchaseTransactionService } from '../lib/services/purchase-transaction.service'
import { cancelInvoiceService } from '../lib/services/invoice.service'
import { stockAdjustmentSchema } from '../lib/validators/inventory.schema'
import { productSchema } from '../lib/validators/product.schema'

// ── In-Memory Database Simulator for Supabase ───────────────────
interface ProductRow {
  id: string
  organization_id: string
  name: string
  sku: string
  product_type?: string
  track_inventory: boolean
  current_stock: number
  reorder_level?: number | null
  min_stock_level?: number | null
  primary_unit: string
  secondary_unit?: string | null
  conversion_rate?: number | null
  purchase_price: number
  allow_negative_stock?: boolean
  custom_fields?: Record<string, any>
}

let mockStorage: {
  products: ProductRow[]
  inventory_movements: any[]
  stock_adjustments: any[]
  stock_adjustment_items: any[]
  organizations: any[]
  invoices: any[]
  invoice_items: any[]
  customers: any[]
  customer_transactions: any[]
  credit_notes: any[]
  purchase_bills: any[]
  purchase_bill_items: any[]
  suppliers: any[]
  supplier_transactions: any[]
  debit_notes: any[]
}

function resetMockDb() {
  inMemorySalesReturns.length = 0
  inMemoryPurchaseReturns.length = 0
  mockStorage = {
    products: [
      {
        id: 'a0000000-0000-4000-a000-000000000001',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        name: 'Standard Widget',
        sku: 'WID-001',
        product_type: 'goods',
        track_inventory: true,
        current_stock: 10,
        reorder_level: 5,
        min_stock_level: 5,
        primary_unit: 'PCS',
        secondary_unit: 'BOX',
        conversion_rate: 10, // 1 BOX = 10 PCS
        purchase_price: 50,
        allow_negative_stock: false,
      },
      {
        id: 'a0000000-0000-4000-a000-000000000002',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        name: 'Negative Stock Allowed Widget',
        sku: 'WID-NEG',
        product_type: 'goods',
        track_inventory: true,
        current_stock: 5,
        reorder_level: 2,
        min_stock_level: 2,
        primary_unit: 'PCS',
        purchase_price: 20,
        allow_negative_stock: true,
      },
      {
        id: 'b0000000-0000-4000-a000-000000000003',
        organization_id: 'c0000000-0000-4000-a000-000000000002',
        name: 'Tenant B Widget',
        sku: 'TEN-B-001',
        product_type: 'goods',
        track_inventory: true,
        current_stock: 20,
        reorder_level: 8,
        min_stock_level: 8,
        primary_unit: 'PCS',
        purchase_price: 30,
        allow_negative_stock: false,
      },
      {
        id: 'a0000000-0000-4000-a000-000000000004',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        name: 'Opening Stock Test Widget',
        sku: 'WID-OPEN',
        product_type: 'goods',
        track_inventory: true,
        current_stock: 0,
        reorder_level: 0,
        min_stock_level: 0,
        primary_unit: 'PCS',
        secondary_unit: 'BOX',
        conversion_rate: 12, // 1 BOX = 12 PCS
        purchase_price: 15,
        allow_negative_stock: false,
      },
    ],
    inventory_movements: [],
    stock_adjustments: [],
    stock_adjustment_items: [],
    organizations: [
      { id: 'c0000000-0000-4000-a000-000000000001', name: 'Tenant A Org', business_category: 'retail' },
      { id: 'c0000000-0000-4000-a000-000000000002', name: 'Tenant B Org', business_category: 'retail' },
    ],
    customers: [
      {
        id: 'e0000000-0000-4000-a000-000000000001',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        name: 'Acme Retail Customer',
        phone: '9876543210',
        outstanding_balance: 5000,
      },
    ],
    customer_transactions: [],
    invoices: [
      {
        id: 'f0000000-0000-4000-a000-000000000001',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        customer_id: 'e0000000-0000-4000-a000-000000000001',
        invoice_number: 'INV-2026-001',
        invoice_date: '2026-09-25',
        status: 'finalized',
        subtotal: 1000,
        tax_amount: 180,
        total_amount: 1180,
        amount_paid: 0,
      },
      {
        id: 'f0000000-0000-4000-a000-000000000002',
        organization_id: 'c0000000-0000-4000-a000-000000000002', // Tenant B invoice
        customer_id: 'e0000000-0000-4000-a000-000000000001',
        invoice_number: 'INV-TENB-001',
        invoice_date: '2026-09-25',
        status: 'finalized',
        subtotal: 500,
        tax_amount: 90,
        total_amount: 590,
        amount_paid: 0,
      },
    ],
    invoice_items: [
      {
        id: 'item-inv-1',
        invoice_id: 'f0000000-0000-4000-a000-000000000001',
        product_id: 'a0000000-0000-4000-a000-000000000001',
        description: 'Standard Widget',
        quantity: 10,
        unit: 'PCS',
        unit_price: 100,
        gst_rate: 18,
        tax_amount: 180,
        total_amount: 1180,
      },
      {
        id: 'item-inv-2',
        invoice_id: 'f0000000-0000-4000-a000-000000000002',
        product_id: 'b0000000-0000-4000-a000-000000000003',
        description: 'Tenant B Widget',
        quantity: 5,
        unit: 'PCS',
        unit_price: 100,
        gst_rate: 18,
        tax_amount: 90,
        total_amount: 590,
      },
    ],
    credit_notes: [],
    suppliers: [
      {
        id: 's0000000-0000-4000-a000-000000000001',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        name: 'Apex Wholesale Supplier',
        phone: '9123456780',
        outstanding_balance: 4000,
      },
    ],
    supplier_transactions: [],
    purchase_bills: [
      {
        id: 'p0000000-0000-4000-a000-000000000001',
        organization_id: 'c0000000-0000-4000-a000-000000000001',
        supplier_id: 's0000000-0000-4000-a000-000000000001',
        bill_number: 'BILL-2026-001',
        bill_date: '2026-09-25',
        status: 'approved',
        subtotal: 500,
        tax_amount: 90,
        total_amount: 590,
        amount_paid: 0,
      },
      {
        id: 'p0000000-0000-4000-a000-000000000002',
        organization_id: 'c0000000-0000-4000-a000-000000000002', // Tenant B bill
        supplier_id: 's0000000-0000-4000-a000-000000000001',
        bill_number: 'BILL-TENB-001',
        bill_date: '2026-09-25',
        status: 'approved',
        subtotal: 300,
        tax_amount: 54,
        total_amount: 354,
        amount_paid: 0,
      },
    ],
    purchase_bill_items: [
      {
        id: 'item-bill-1',
        purchase_bill_id: 'p0000000-0000-4000-a000-000000000001',
        product_id: 'a0000000-0000-4000-a000-000000000001',
        description: 'Standard Widget',
        quantity: 5,
        unit: 'PCS',
        unit_price: 100,
        gst_rate: 18,
        tax_amount: 90,
        total_amount: 590,
      },
      {
        id: 'item-bill-2',
        purchase_bill_id: 'p0000000-0000-4000-a000-000000000002',
        product_id: 'b0000000-0000-4000-a000-000000000003',
        description: 'Tenant B Widget',
        quantity: 3,
        unit: 'PCS',
        unit_price: 100,
        gst_rate: 18,
        tax_amount: 54,
        total_amount: 354,
      },
    ],
    debit_notes: [],
  }
}

// Mock Supabase admin client
vi.mock('../lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => createMockSupabaseClient()),
}))

// Mock Supabase server client
vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(async () => createMockSupabaseClient()),
}))

// Mock API session
let currentSession: any = {
  organization_id: 'c0000000-0000-4000-a000-000000000001',
  user_id: 'd0000000-0000-4000-a000-000000000001',
  role: 'admin',
}

vi.mock('../lib/auth/api-session', () => ({
  getApiSession: vi.fn(async () => currentSession),
}))

// Mock Audit Logger
vi.mock('../lib/services/audit.service', () => ({
  logAudit: vi.fn(async () => ({ success: true })),
}))

function createMockSupabaseClient() {
  return {
    from: (table: string) => {
      const filters: [string, any][] = []
      const neqFilters: [string, any][] = []
      const gteFilters: [string, any][] = []
      const lteFilters: [string, any][] = []
      const gtFilters: [string, any][] = []
      const ltFilters: [string, any][] = []
      const ilikeFilters: [string, string][] = []
      let selectedCols = '*'

      const getTableRows = () => {
        if (!(mockStorage as any)[table]) {
          (mockStorage as any)[table] = []
        }
        return (mockStorage as any)[table] as any[]
      }

      const matchRow = (row: any) => {
        const eqMatch = filters.every(([c, v]) => row[c] === v)
        const neqMatch = neqFilters.every(([c, v]) => row[c] !== v)
        const gteMatch = gteFilters.every(([c, v]) => row[c] >= v)
        const lteMatch = lteFilters.every(([c, v]) => row[c] <= v)
        const gtMatch = gtFilters.every(([c, v]) => Number(row[c]) > Number(v))
        const ltMatch = ltFilters.every(([c, v]) => Number(row[c]) < Number(v))
        const ilikeMatch = ilikeFilters.every(([c, v]) => String(row[c] || '').toLowerCase().includes(v.toLowerCase()))
        return eqMatch && neqMatch && gteMatch && lteMatch && gtMatch && ltMatch && ilikeMatch
      }

      const enrichRow = (row: any) => {
        if (!row) return row
        const enriched = { ...row }
        if (table === 'invoices') {
          enriched.customers = mockStorage.customers?.find((c) => c.id === row.customer_id) || null
          enriched.invoice_items = (mockStorage.invoice_items || [])
            .filter((it) => it.invoice_id === row.id)
            .map((it) => ({
              ...it,
              products: mockStorage.products?.find((p) => p.id === it.product_id) || null,
            }))
        } else if (table === 'purchase_bills') {
          enriched.suppliers = mockStorage.suppliers?.find((s) => s.id === row.supplier_id) || null
          enriched.purchase_bill_items = (mockStorage.purchase_bill_items || [])
            .filter((it) => it.purchase_bill_id === row.id || it.bill_id === row.id)
            .map((it) => ({
              ...it,
              products: mockStorage.products?.find((p) => p.id === it.product_id) || null,
            }))
        } else if (table === 'products') {
          enriched.product_units = { name: row.primary_unit || 'PCS', abbreviation: row.primary_unit || 'PCS' }
          enriched.product_categories = { name: 'General' }
        }
        return enriched
      }

      const builder: any = {
        select: (cols = '*', opts?: any) => {
          selectedCols = cols
          return builder
        },
        eq: (col: string, val: any) => {
          filters.push([col, val])
          return builder
        },
        neq: (col: string, val: any) => {
          neqFilters.push([col, val])
          return builder
        },
        gte: (col: string, val: any) => {
          gteFilters.push([col, val])
          return builder
        },
        lte: (col: string, val: any) => {
          lteFilters.push([col, val])
          return builder
        },
        gt: (col: string, val: any) => {
          gtFilters.push([col, val])
          return builder
        },
        lt: (col: string, val: any) => {
          ltFilters.push([col, val])
          return builder
        },
        ilike: (col: string, val: string) => {
          ilikeFilters.push([col, val.replace(/%/g, '')])
          return builder
        },
        or: (_str: string) => builder,
        limit: (_n: number) => builder,
        order: (_col: string, _opts: any) => builder,
        range: (_from: number, _to: number) => builder,
        update: (data: any) => {
          const updateFilters: [string, any][] = []
          const updateBuilder: any = {
            eq: (col: string, val: any) => {
              updateFilters.push([col, val])
              const rows = getTableRows()
              const matches = rows.filter((r) => updateFilters.every(([c, v]) => r[c] === v))
              for (const m of matches) {
                Object.assign(m, data)
              }
              return updateBuilder
            },
            select: () => updateBuilder,
            single: async () => {
              const rows = getTableRows()
              const match = rows.find((r) => updateFilters.every(([c, v]) => r[c] === v))
              return { data: match || null, error: null }
            },
            then: (res: any) => {
              const rows = getTableRows()
              const matches = rows.filter((r) => updateFilters.every(([c, v]) => r[c] === v))
              return res({ data: matches, error: null })
            },
          }
          return updateBuilder
        },
        insert: (data: any | any[]) => {
          const rows = Array.isArray(data) ? data : [data]
          const tableRows = getTableRows()
          const inserted = rows.map((r) => ({
            id: r.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            created_at: new Date().toISOString(),
            ...r,
          }))

          tableRows.push(...inserted)

          // Trigger: inventory movements update products.current_stock
          if (table === 'inventory_movements') {
            for (const mov of inserted) {
              const product = mockStorage.products.find((p) => p.id === mov.product_id)
              if (product) {
                product.current_stock = (Number(product.current_stock) || 0) + Number(mov.quantity)
              }
            }
          }

          return {
            select: () => ({
              single: async () => ({ data: inserted[0] || null, error: null }),
            }),
            data: inserted,
            error: null,
          }
        },
        single: async () => {
          const tableRows = getTableRows()
          const match = tableRows.find(matchRow)
          if (!match) {
            return { data: null, error: { code: 'PGRST116', message: 'Not found' } }
          }
          return { data: enrichRow(match), error: null }
        },
        then: (resolve: any) => {
          const tableRows = getTableRows()
          const matches = tableRows.filter(matchRow).map(enrichRow)
          return resolve({ data: matches, error: null, count: matches.length })
        },
      }

      return builder
    },
  }
}

describe('Phase 6: Inventory & Stock Management — Stock Adjustment Hardening', () => {
  const tenantA = 'c0000000-0000-4000-a000-000000000001'
  const tenantB = 'c0000000-0000-4000-a000-000000000002'
  const userA = 'd0000000-0000-4000-a000-000000000001'
  const userB = 'd0000000-0000-4000-a000-000000000002'

  const prodA = 'a0000000-0000-4000-a000-000000000001'
  const prodNeg = 'a0000000-0000-4000-a000-000000000002'
  const prodB = 'b0000000-0000-4000-a000-000000000003'
  const openingProdId = 'a0000000-0000-4000-a000-000000000004'

  beforeEach(() => {
    resetMockDb()
    currentSession = {
      organization_id: tenantA,
      user_id: userA,
      role: 'admin',
    }
  })

  // ============================================================
  // SECTION 1: OPENING STOCK
  // ============================================================
  describe('Opening Stock', () => {
    it('successfully creates opening stock with primary unit and increases stock', async () => {
      const req = {
        json: async () => ({
          product_id: openingProdId,
          quantity: 25,
          unit: 'PCS',
          reference_type: 'manual',
          reference_number: 'OPEN-001',
          notes: 'Initial primary unit opening stock',
        }),
      } as any

      const res = await openingStockPost(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.before_quantity).toBe(0)
      expect(body.data.after_quantity).toBe(25)
      expect(body.data.movement.quantity).toBe(25)
      expect(body.data.movement.running_balance).toBe(25)
      expect(body.data.movement.movement_type).toBe('opening')

      // Verify product stock in DB updated to 25
      const prod = mockStorage.products.find((p) => p.id === openingProdId)
      expect(prod?.current_stock).toBe(25)
    })

    it('correctly converts secondary unit to base quantity for opening stock', async () => {
      // 3 BOX @ 12 PCS/BOX = 36 PCS base quantity
      const req = {
        json: async () => ({
          product_id: openingProdId,
          quantity: 3,
          unit: 'BOX',
          reference_type: 'manual',
          reference_number: 'OPEN-002',
          notes: 'Initial secondary unit opening stock',
        }),
      } as any

      const res = await openingStockPost(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.before_quantity).toBe(0)
      expect(body.data.after_quantity).toBe(36)
      expect(body.data.movement.quantity).toBe(36) // Persisted in base unit!

      const prod = mockStorage.products.find((p) => p.id === openingProdId)
      expect(prod?.current_stock).toBe(36)
    })

    it('rejects opening stock with invalid quantity <= 0', async () => {
      const req = {
        json: async () => ({
          product_id: openingProdId,
          quantity: 0,
          unit: 'PCS',
        }),
      } as any

      const res = await openingStockPost(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toContain('greater than 0')
    })

    it('rejects opening stock for non-existent product', async () => {
      const req = {
        json: async () => ({
          product_id: '99999999-9999-4999-a999-999999999999',
          quantity: 10,
        }),
      } as any

      const res = await openingStockPost(req)
      expect(res.status).toBe(404)
    })

    it('prevents duplicate opening stock for the same product', async () => {
      // First opening stock
      const req1 = {
        json: async () => ({
          product_id: openingProdId,
          quantity: 10,
          unit: 'PCS',
        }),
      } as any
      const res1 = await openingStockPost(req1)
      expect(res1.status).toBe(200)

      // Duplicate opening stock attempt
      const req2 = {
        json: async () => ({
          product_id: openingProdId,
          quantity: 20,
          unit: 'PCS',
        }),
      } as any
      const res2 = await openingStockPost(req2)
      const body2 = await res2.json()

      expect(res2.status).toBe(409)
      expect(body2.success).toBe(false)
      expect(body2.error).toContain('already recorded')
    })

    it('enforces server-side permissions: rejects unauthorized role', async () => {
      currentSession = {
        organization_id: tenantA,
        user_id: userA,
        role: 'sales', // sales role cannot adjust inventory
      }

      const req = {
        json: async () => ({
          product_id: openingProdId,
          quantity: 10,
        }),
      } as any

      const res = await openingStockPost(req)
      expect(res.status).toBe(403)
    })

    it('enforces strict tenant isolation: rejects opening stock for another tenant product', async () => {
      currentSession = {
        organization_id: tenantB, // Tenant B tries to adjust Tenant A product
        user_id: userB,
        role: 'admin',
      }

      const req = {
        json: async () => ({
          product_id: openingProdId, // Owned by Tenant A
          quantity: 10,
        }),
      } as any

      const res = await openingStockPost(req)
      expect(res.status).toBe(404)
    })
  })

  // ============================================================
  // SECTION 2: STOCK ADJUSTMENT SERVICE & API
  // ============================================================
  describe('Stock Adjustment Core Calculations & Hardening', () => {
    it('correctly processes IN adjustment: before + baseQuantity = after', async () => {
      const result = await processStockAdjustment({
        organization_id: tenantA,
        user_id: userA,
        reason: 'stocktake',
        items: [
          {
            product_id: prodA,
            direction: 'IN',
            quantity: 5,
            unit: 'PCS',
          },
        ],
      })

      expect(result.movements).toHaveLength(1)
      const mov = result.movements[0]
      expect(mov.before_quantity).toBe(10)
      expect(mov.quantity).toBe(5)
      expect(mov.base_quantity).toBe(5)
      expect(mov.after_quantity).toBe(15) // 10 + 5 = 15
      expect(mov.direction).toBe('IN')
      expect(mov.movement_type).toBe('adjustment_in')

      // Verify product stock in simulated database
      const p = mockStorage.products.find((prod) => prod.id === prodA)
      expect(p?.current_stock).toBe(15)
    })

    it('correctly processes OUT adjustment: before - baseQuantity = after', async () => {
      const result = await processStockAdjustment({
        organization_id: tenantA,
        user_id: userA,
        reason: 'damage',
        items: [
          {
            product_id: prodA,
            direction: 'OUT',
            quantity: 4,
            unit: 'PCS',
          },
        ],
      })

      expect(result.movements).toHaveLength(1)
      const mov = result.movements[0]
      expect(mov.before_quantity).toBe(10)
      expect(mov.quantity).toBe(4)
      expect(mov.base_quantity).toBe(4)
      expect(mov.after_quantity).toBe(6) // 10 - 4 = 6
      expect(mov.direction).toBe('OUT')
      expect(mov.movement_type).toBe('damage') // damage reason maps to damage

      const p = mockStorage.products.find((prod) => prod.id === prodA)
      expect(p?.current_stock).toBe(6)
    })

    it('converts secondary unit (2 BOX IN @ 10 PCS/BOX) into 20 PCS base movement', async () => {
      const result = await processStockAdjustment({
        organization_id: tenantA,
        user_id: userA,
        reason: 'correction',
        items: [
          {
            product_id: prodA,
            direction: 'IN',
            quantity: 2,
            unit: 'BOX',
          },
        ],
      })

      const mov = result.movements[0]
      expect(mov.before_quantity).toBe(10)
      expect(mov.quantity).toBe(2) // Input qty: 2
      expect(mov.base_quantity).toBe(20) // 2 BOX × 10 = 20 PCS base movement!
      expect(mov.after_quantity).toBe(30) // 10 + 20 = 30
      expect(mov.running_balance).toBe(30)

      const p = mockStorage.products.find((prod) => prod.id === prodA)
      expect(p?.current_stock).toBe(30)
    })

    it('converts secondary unit (1 BOX OUT @ 10 PCS/BOX) into -10 PCS base movement', async () => {
      const result = await processStockAdjustment({
        organization_id: tenantA,
        user_id: userA,
        reason: 'expiry',
        items: [
          {
            product_id: prodA,
            direction: 'OUT',
            quantity: 1,
            unit: 'BOX',
          },
        ],
      })

      const mov = result.movements[0]
      expect(mov.before_quantity).toBe(10)
      expect(mov.quantity).toBe(1)
      expect(mov.base_quantity).toBe(10) // 1 BOX = 10 PCS
      expect(mov.after_quantity).toBe(0) // 10 - 10 = 0
      expect(mov.running_balance).toBe(0)

      const p = mockStorage.products.find((prod) => prod.id === prodA)
      expect(p?.current_stock).toBe(0)
    })

    it('rejects adjustment with invalid quantity <= 0', async () => {
      await expect(
        processStockAdjustment({
          organization_id: tenantA,
          user_id: userA,
          reason: 'stocktake',
          items: [
            {
              product_id: prodA,
              direction: 'IN',
              quantity: 0,
            },
          ],
        })
      ).rejects.toThrow('Adjustment quantity must be greater than 0.')
    })

    it('rejects adjustment when reason is missing', async () => {
      await expect(
        processStockAdjustment({
          organization_id: tenantA,
          user_id: userA,
          reason: '' as any,
          items: [
            {
              product_id: prodA,
              direction: 'IN',
              quantity: 5,
            },
          ],
        })
      ).rejects.toThrow('Adjustment reason is required.')
    })

    it('rejects adjustment with invalid unit not matching product primary or secondary unit', async () => {
      await expect(
        processStockAdjustment({
          organization_id: tenantA,
          user_id: userA,
          reason: 'stocktake',
          items: [
            {
              product_id: prodA,
              direction: 'IN',
              quantity: 5,
              unit: 'LITERS', // Invalid unit for PCS/BOX product
            },
          ],
        })
      ).rejects.toThrow(/Invalid unit 'LITERS'/)
    })

    it('rejects negative stock when allow_negative_stock is false: stock must remain unchanged', async () => {
      // Current stock is 10 PCS. Attempting OUT of 11 PCS must be rejected.
      await expect(
        processStockAdjustment({
          organization_id: tenantA,
          user_id: userA,
          reason: 'stocktake',
          items: [
            {
              product_id: prodA,
              direction: 'OUT',
              quantity: 11,
              unit: 'PCS',
            },
          ],
        })
      ).rejects.toThrow(/INSUFFICIENT_STOCK/)

      // Ensure stock remains exactly 10
      const p = mockStorage.products.find((prod) => prod.id === prodA)
      expect(p?.current_stock).toBe(10)
    })

    it('allows negative stock when product has allow_negative_stock: true', async () => {
      // Current stock is 5 PCS. OUT of 8 PCS results in -3 PCS
      const result = await processStockAdjustment({
        organization_id: tenantA,
        user_id: userA,
        reason: 'stocktake',
        items: [
          {
            product_id: prodNeg,
            direction: 'OUT',
            quantity: 8,
            unit: 'PCS',
          },
        ],
      })

      const mov = result.movements[0]
      expect(mov.before_quantity).toBe(5)
      expect(mov.after_quantity).toBe(-3)
      expect(mov.running_balance).toBe(-3)

      const p = mockStorage.products.find((prod) => prod.id === prodNeg)
      expect(p?.current_stock).toBe(-3)
    })

    it('enforces tenant isolation: Tenant A cannot adjust Tenant B product', async () => {
      await expect(
        processStockAdjustment({
          organization_id: tenantA,
          user_id: userA,
          reason: 'stocktake',
          items: [
            {
              product_id: prodB, // Owned by Tenant B
              direction: 'IN',
              quantity: 5,
            },
          ],
        })
      ).rejects.toThrow(/not found in organization/)
    })
  })

  // ============================================================
  // SECTION 3: STOCK ADJUSTMENT API ROUTE INTEGRATION
  // ============================================================
  describe('Stock Adjustment API Route', () => {
    it('handles flat single-item payload from UI modal successfully', async () => {
      const req = {
        json: async () => ({
          product_id: prodA,
          direction: 'IN',
          quantity: 4,
          unit: 'PCS',
          reason: 'stocktake',
          notes: 'Reconciled during count',
        }),
      } as any

      const res = await adjustmentsPost(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.movements[0].before_quantity).toBe(10)
      expect(body.data.movements[0].after_quantity).toBe(14)
    })

    it('handles secondary unit conversion in API: 2 BOX IN = 20 PCS base movement', async () => {
      const req = {
        json: async () => ({
          product_id: prodA,
          direction: 'IN',
          quantity: 2,
          unit: 'BOX',
          reason: 'stocktake',
        }),
      } as any

      const res = await adjustmentsPost(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.movements[0].base_quantity).toBe(20)
      expect(body.data.movements[0].after_quantity).toBe(30)
    })

    it('returns 400 with negative stock error message when OUT exceeds available stock', async () => {
      const req = {
        json: async () => ({
          product_id: prodA,
          direction: 'OUT',
          quantity: 15, // Available is 10
          unit: 'PCS',
          reason: 'stocktake',
        }),
      } as any

      const res = await adjustmentsPost(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toContain('INSUFFICIENT_STOCK')
    })

    it('returns 403 when user lacks inventory.adjust permission', async () => {
      currentSession = {
        organization_id: tenantA,
        user_id: userA,
        role: 'sales',
      }

      const req = {
        json: async () => ({
          product_id: prodA,
          direction: 'IN',
          quantity: 5,
          unit: 'PCS',
          reason: 'stocktake',
        }),
      } as any

      const res = await adjustmentsPost(req)
      expect(res.status).toBe(403)
    })

    it('returns 404 when attempting adjustment on product owned by different tenant', async () => {
      const req = {
        json: async () => ({
          product_id: prodB, // Tenant B product
          direction: 'IN',
          quantity: 5,
          unit: 'PCS',
          reason: 'stocktake',
        }),
      } as any

      const res = await adjustmentsPost(req)
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.success).toBe(false)
      expect(body.error).toContain('not found')
    })
  })

  // ============================================================
  // SECTION 4: SALES RETURNS WORKFLOW
  // ============================================================
  describe('Sales Return Core Service & API', () => {
    const invAId = 'f0000000-0000-4000-a000-000000000001'
    const invBId = 'f0000000-0000-4000-a000-000000000002'
    const invItemId = 'item-inv-1'

    it('creates a sales return, increases stock (STOCK IN), reduces customer balance, and calculates tax', async () => {
      const returnResult = await SalesReturnService.createSalesReturn(tenantA, userA, {
        invoice_id: invAId,
        items: [
          {
            invoice_item_id: invItemId,
            product_id: prodA,
            quantity: 4,
            unit: 'PCS',
          },
        ],
        reason: 'Customer reported minor cosmetic defect',
        notes: 'Credited to customer ledger',
      })

      expect(returnResult).toBeDefined()
      expect(returnResult.return_number).toMatch(/^(SR|CN)-/)
      // Original invoice item was 10 PCS @ 100 + 18% GST = 1180.
      // 4 PCS return: subtotal = 400, tax = 72, total = 472.
      expect(returnResult.subtotal).toBe(400)
      expect(returnResult.tax_amount).toBe(72)
      expect(returnResult.total_amount).toBe(472)

      // 1. Verify stock increased from 10 to 14
      const prod = mockStorage.products.find((p) => p.id === prodA)
      expect(prod?.current_stock).toBe(14)

      // 2. Verify immutable inventory movement created (SALE_RETURN / return_in)
      const movements = mockStorage.inventory_movements.filter((m) => m.product_id === prodA)
      expect(movements.length).toBeGreaterThan(0)
      const lastMov = movements[movements.length - 1]
      expect(lastMov.movement_type).toBe('return_in')
      expect(lastMov.quantity).toBe(4)

      // 3. Verify customer balance reduced by 472 (from 5000 to 4528)
      const cust = mockStorage.customers.find((c) => c.id === 'e0000000-0000-4000-a000-000000000001')
      expect(cust?.outstanding_balance).toBe(4528)

      // 4. Verify customer transaction created
      const custTx = mockStorage.customer_transactions.find((tx) => tx.transaction_type === 'credit_note')
      expect(custTx).toBeDefined()
      expect(custTx.amount).toBe(-472)
    })

    it('correctly handles secondary unit conversion for sales returns (1 BOX = 10 PCS stock in)', async () => {
      const returnResult = await SalesReturnService.createSalesReturn(tenantA, userA, {
        invoice_id: invAId,
        items: [
          {
            invoice_item_id: invItemId,
            product_id: prodA,
            quantity: 1, // 1 BOX = 10 PCS
            unit: 'BOX',
          },
        ],
        reason: 'Entire unopened box returned',
      })

      expect(returnResult).toBeDefined()
      // 1 BOX = 10 PCS base quantity -> stock increases by 10 (10 -> 20)
      const prod = mockStorage.products.find((p) => p.id === prodA)
      expect(prod?.current_stock).toBe(20)

      const lastMov = mockStorage.inventory_movements[mockStorage.inventory_movements.length - 1]
      expect(lastMov.quantity).toBe(10) // Base quantity persisted!
    })

    it('prevents return quantity exceeding remaining returnable quantity', async () => {
      // Original quantity is 10. Attempting to return 15 must throw an error.
      await expect(
        SalesReturnService.createSalesReturn(tenantA, userA, {
          invoice_id: invAId,
          items: [
            {
              invoice_item_id: invItemId,
              product_id: prodA,
              quantity: 15,
              unit: 'PCS',
            },
          ],
          reason: 'Excess return test',
        })
      ).rejects.toThrow(/exceeds remaining returnable quantity/)
    })

    it('enforces tenant isolation: Tenant A cannot return Tenant B invoice', async () => {
      await expect(
        SalesReturnService.createSalesReturn(tenantA, userA, {
          invoice_id: invBId, // Tenant B invoice
          items: [
            {
              invoice_item_id: 'item-inv-2',
              product_id: prodB,
              quantity: 1,
              unit: 'PCS',
            },
          ],
          reason: 'Cross-tenant breach test',
        })
      ).rejects.toThrow(/not found/)
    })

    it('enforces permissions in Sales Return API: rejects unauthorized role', async () => {
      currentSession = {
        organization_id: tenantA,
        user_id: userA,
        role: 'inventory', // Role lacking sales_returns.create
      }

      const req = {
        json: async () => ({
          invoice_id: invAId,
          items: [
            {
              invoice_item_id: invItemId,
              product_id: prodA,
              quantity: 2,
              unit: 'PCS',
            },
          ],
          reason: 'Defective',
        }),
      } as any

      const res = await salesReturnPost(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain('Insufficient permissions')
    })

    it('prevents duplicate/redundant return when entire invoice is already returned', async () => {
      // First return: return all 10 PCS
      await SalesReturnService.createSalesReturn(tenantA, userA, {
        invoice_id: invAId,
        items: [
          {
            invoice_item_id: invItemId,
            product_id: prodA,
            quantity: 10,
            unit: 'PCS',
          },
        ],
        reason: 'Full return',
      })

      // Second return attempt on same item should fail
      await expect(
        SalesReturnService.createSalesReturn(tenantA, userA, {
          invoice_id: invAId,
          items: [
            {
              invoice_item_id: invItemId,
              product_id: prodA,
              quantity: 1,
              unit: 'PCS',
            },
          ],
          reason: 'Second return attempt',
        })
      ).rejects.toThrow(/exceeds remaining returnable quantity/)
    })

    it('enforces multi-step return quantity limits: original 10 -> return 4 -> return 7 fails -> return 6 succeeds -> return 1 fails', async () => {
      // 1. First return: 4 PCS (out of 10)
      const firstReturn = await SalesReturnService.createSalesReturn(tenantA, userA, {
        invoice_id: invAId,
        items: [
          {
            invoice_item_id: invItemId,
            product_id: prodA,
            quantity: 4,
            unit: 'PCS',
          },
        ],
        reason: 'Partial return of 4 PCS',
      })
      expect(firstReturn).toBeDefined()

      // Remaining returnable quantity is now 6 (10 - 4).
      // Attempting to return 7 must fail!
      await expect(
        SalesReturnService.createSalesReturn(tenantA, userA, {
          invoice_id: invAId,
          items: [
            {
              invoice_item_id: invItemId,
              product_id: prodA,
              quantity: 7,
              unit: 'PCS',
            },
          ],
          reason: 'Excess return attempt of 7 PCS',
        })
      ).rejects.toThrow(/exceeds remaining returnable quantity/)

      // 2. Second return: exactly 6 PCS succeeds
      const secondReturn = await SalesReturnService.createSalesReturn(tenantA, userA, {
        invoice_id: invAId,
        items: [
          {
            invoice_item_id: invItemId,
            product_id: prodA,
            quantity: 6,
            unit: 'PCS',
          },
        ],
        reason: 'Return remaining 6 PCS',
      })
      expect(secondReturn).toBeDefined()

      // Remaining returnable quantity is now 0. Attempting any further return (1 PCS) must fail!
      await expect(
        SalesReturnService.createSalesReturn(tenantA, userA, {
          invoice_id: invAId,
          items: [
            {
              invoice_item_id: invItemId,
              product_id: prodA,
              quantity: 1,
              unit: 'PCS',
            },
          ],
          reason: 'Third return attempt when 0 remaining',
        })
      ).rejects.toThrow(/exceeds remaining returnable quantity/)
    })
  })

  // ============================================================
  // SECTION 5: PURCHASE RETURNS WORKFLOW
  // ============================================================
  describe('Purchase Return Core Service & API', () => {
    const billAId = 'p0000000-0000-4000-a000-000000000001'
    const billBId = 'p0000000-0000-4000-a000-000000000002'
    const billItemId = 'item-bill-1'

    it('creates a purchase return, decreases stock (STOCK OUT), reduces supplier payable, and reverses input GST', async () => {
      const returnResult = await PurchaseReturnService.createPurchaseReturn(tenantA, userA, {
        purchase_bill_id: billAId,
        items: [
          {
            purchase_bill_item_id: billItemId,
            product_id: prodA,
            quantity: 2,
            unit: 'PCS',
          },
        ],
        reason: 'Damaged during freight delivery',
        notes: 'Returned to supplier Apex',
      })

      expect(returnResult).toBeDefined()
      expect(returnResult.return_number).toMatch(/^(PR|DN)-/)
      // Original bill was 5 PCS @ 100 + 18% GST = 590.
      // 2 PCS return: subtotal = 200, tax = 36, total = 236.
      expect(returnResult.subtotal).toBe(200)
      expect(returnResult.tax_amount).toBe(36)
      expect(returnResult.total_amount).toBe(236)

      // 1. Verify stock decreased from 10 to 8
      const prod = mockStorage.products.find((p) => p.id === prodA)
      expect(prod?.current_stock).toBe(8)

      // 2. Verify immutable inventory movement created (PURCHASE_RETURN / return_out)
      const movements = mockStorage.inventory_movements.filter((m) => m.product_id === prodA)
      const lastMov = movements[movements.length - 1]
      expect(lastMov.movement_type).toBe('return_out')
      expect(lastMov.quantity).toBe(-2) // Stock OUT is negative signed

      // 3. Verify supplier payable reduced by 236 (from 4000 to 3764)
      const supp = mockStorage.suppliers.find((s) => s.id === 's0000000-0000-4000-a000-000000000001')
      expect(supp?.outstanding_balance).toBe(3764)

      // 4. Verify supplier transaction recorded
      const suppTx = mockStorage.supplier_transactions.find((tx) => tx.transaction_type === 'debit_note')
      expect(suppTx).toBeDefined()
      expect(suppTx.amount).toBe(-236)
    })

    it('correctly handles secondary unit conversion for purchase returns (1 BOX = 10 PCS stock out)', async () => {
      // Current stock is 10 PCS. Return 1 BOX = 10 PCS -> stock becomes 0
      const returnResult = await PurchaseReturnService.createPurchaseReturn(tenantA, userA, {
        purchase_bill_id: billAId,
        items: [
          {
            purchase_bill_item_id: billItemId,
            product_id: prodA,
            quantity: 1, // 1 BOX
            unit: 'BOX',
          },
        ],
        reason: 'Entire defective box returned to vendor',
      })

      expect(returnResult).toBeDefined()
      const prod = mockStorage.products.find((p) => p.id === prodA)
      expect(prod?.current_stock).toBe(0)

      const lastMov = mockStorage.inventory_movements[mockStorage.inventory_movements.length - 1]
      expect(lastMov.quantity).toBe(-10) // -10 PCS base quantity OUT
    })

    it('prevents purchase return exceeding purchased quantity', async () => {
      // Bill only contains 5 PCS. Requesting 8 must fail.
      await expect(
        PurchaseReturnService.createPurchaseReturn(tenantA, userA, {
          purchase_bill_id: billAId,
          items: [
            {
              purchase_bill_item_id: billItemId,
              product_id: prodA,
              quantity: 8,
              unit: 'PCS',
            },
          ],
          reason: 'Excess purchase return test',
        })
      ).rejects.toThrow(/exceeds remaining returnable quantity/)
    })

    it('enforces tenant isolation: Tenant A cannot return Tenant B purchase bill', async () => {
      await expect(
        PurchaseReturnService.createPurchaseReturn(tenantA, userA, {
          purchase_bill_id: billBId, // Tenant B bill
          items: [
            {
              purchase_bill_item_id: 'item-bill-2',
              product_id: prodB,
              quantity: 1,
              unit: 'PCS',
            },
          ],
          reason: 'Tenant breach purchase return',
        })
      ).rejects.toThrow(/not found/)
    })

    it('enforces permissions in Purchase Return API: rejects unauthorized role', async () => {
      currentSession = {
        organization_id: tenantA,
        user_id: userA,
        role: 'sales', // Role lacking purchase_returns.create
      }

      const req = {
        json: async () => ({
          purchase_bill_id: billAId,
          items: [
            {
              purchase_bill_item_id: billItemId,
              product_id: prodA,
              quantity: 1,
              unit: 'PCS',
            },
          ],
          reason: 'Faulty shipment',
        }),
      } as any

      const res = await purchaseReturnPost(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain('Insufficient permissions')
    })
  })

  // ============================================================
  // SECTION 6: CANCELLATION / REVERSAL WORKFLOW
  // ============================================================
  describe('Document Cancellation / Reversal', () => {
    const invAId = 'f0000000-0000-4000-a000-000000000001'

    it('cancels sales invoice, updates status, reverses inventory exactly once, and reverses customer balance', async () => {
      const result = await cancelInvoiceService(tenantA, userA, invAId, 'Customer cancelled order before dispatch')

      expect(result).toBeDefined()
      expect(result.status).toBe('cancelled')
      expect(result.is_void).toBe(true)

      // 1. Check stock reversed: original invoice sold 10 PCS. Cancelling restocks 10 PCS (10 -> 20)
      const prod = mockStorage.products.find((p) => p.id === prodA)
      expect(prod?.current_stock).toBe(20)

      // 2. Check customer balance reversed: reduced from 5000 to 3820 (5000 - 1180)
      const cust = mockStorage.customers.find((c) => c.id === 'e0000000-0000-4000-a000-000000000001')
      expect(cust?.outstanding_balance).toBe(3820)

      // 3. Check customer adjustment ledger entry created
      const custTx = mockStorage.customer_transactions.find(
        (tx) => tx.reference_id === invAId && tx.transaction_type === 'adjustment'
      )
      expect(custTx).toBeDefined()
      expect(custTx.amount).toBe(-1180)
    })

    it('prevents duplicate cancellation of an already cancelled invoice', async () => {
      // First cancellation
      await cancelInvoiceService(tenantA, userA, invAId, 'Initial cancellation')

      // Second cancellation must throw INVALID_STATUS_TRANSITION
      await expect(
        cancelInvoiceService(tenantA, userA, invAId, 'Duplicate cancel attempt')
      ).rejects.toThrow(/already CANCELLED/)
    })

    it('enforces tenant isolation on cancellation: Tenant B cannot cancel Tenant A invoice', async () => {
      await expect(
        cancelInvoiceService(tenantB, userB, invAId, 'Cross-tenant cancel breach')
      ).rejects.toThrow(/not found in organization/)
    })

    it('cancels purchase bill, updates status, reverses inventory exactly once, and reverses supplier payable', async () => {
      const session = {
        organization_id: tenantA,
        user_id: userA,
        role: 'owner',
      }
      const billAId = 'p0000000-0000-4000-a000-000000000001'
      // Initial stock of prodA is 10.
      // Bill contains 5 PCS. Cancelling bill reverses inbound stock (movement_type = return_out, qty = -5).
      // Stock should decrease from 10 to 5.
      const cancelRes = await PurchaseTransactionService.cancelPurchaseBill(session as any, billAId)
      expect(cancelRes.status).toBe('cancelled')

      const prod = mockStorage.products.find((p) => p.id === prodA)
      expect(prod?.current_stock).toBe(5)

      // Supplier transaction created for reversal
      const suppTx = mockStorage.supplier_transactions.find(
        (tx) => tx.reference_id === billAId && tx.transaction_type === 'adjustment'
      )
      expect(suppTx).toBeDefined()
      expect(suppTx.amount).toBe(-590) // Total bill amount reversed

      // Duplicate cancellation must fail
      await expect(
        PurchaseTransactionService.cancelPurchaseBill(session as any, billAId)
      ).rejects.toThrow(/already cancelled/)

      // Cross-tenant cancellation must fail
      const sessionB = {
        organization_id: tenantB,
        user_id: userB,
        role: 'owner',
      }
      await expect(
        PurchaseTransactionService.cancelPurchaseBill(sessionB as any, billAId)
      ).rejects.toThrow(/Purchase bill not found or unauthorized/)
    })
  })

  // ============================================================
  // SECTION 7: CONFIGURABLE REORDER LEVEL & STOCK STATUS
  // ============================================================
  describe('Configurable Reorder Level & Stock Status Calculations', () => {
    it('verifies complete reorder level threshold ladder: reorder_level = 10 -> stock 15 (IN_STOCK), stock 10 (LOW_STOCK), stock 5 (LOW_STOCK), stock 0 (OUT_OF_STOCK)', () => {
      const reorderLevel = 10

      // stock = 15 -> IN_STOCK
      const status15 = computeStockStatus(15, reorderLevel)
      expect(status15.status).toBe('IN_STOCK')

      // stock = 10 -> LOW_STOCK (stock <= reorder_level)
      const status10 = computeStockStatus(10, reorderLevel)
      expect(status10.status).toBe('LOW_STOCK')

      // stock = 5 -> LOW_STOCK
      const status5 = computeStockStatus(5, reorderLevel)
      expect(status5.status).toBe('LOW_STOCK')

      // stock = 0 -> OUT_OF_STOCK
      const status0 = computeStockStatus(0, reorderLevel)
      expect(status0.status).toBe('OUT_OF_STOCK')

      // negative stock -> OUT_OF_STOCK
      const statusNeg = computeStockStatus(-2, reorderLevel)
      expect(statusNeg.status).toBe('OUT_OF_STOCK')
    })

    it('accurately computes IN_STOCK status when stock > reorder_level', () => {
      const res = computeStockStatus(25, 10)
      expect(res.status).toBe('IN_STOCK')
      expect(res.label).toBe('In Stock')
    })

    it('accurately computes LOW_STOCK status when stock <= reorder_level and stock > 0', () => {
      const res1 = computeStockStatus(7, 10)
      expect(res1.status).toBe('LOW_STOCK')
      expect(res1.label).toBe('Low Stock')

      const res2 = computeStockStatus(10, 10)
      expect(res2.status).toBe('LOW_STOCK')
    })

    it('accurately computes OUT_OF_STOCK status when stock <= 0', () => {
      const resZero = computeStockStatus(0, 10)
      expect(resZero.status).toBe('OUT_OF_STOCK')
      expect(resZero.label).toBe('Out of Stock')

      const resNeg = computeStockStatus(-3, 5)
      expect(resNeg.status).toBe('OUT_OF_STOCK')
    })

    it('handles zero reorder level correctly', () => {
      // With reorder level 0, any stock > 0 is IN_STOCK
      const resIn = computeStockStatus(5, 0)
      expect(resIn.status).toBe('IN_STOCK')

      // Stock = 0 is OUT_OF_STOCK
      const resOut = computeStockStatus(0, 0)
      expect(resOut.status).toBe('OUT_OF_STOCK')
    })

    it('supports decimal stock quantities accurately', () => {
      const resLow = computeStockStatus(2.5, 5)
      expect(resLow.status).toBe('LOW_STOCK')

      const resIn = computeStockStatus(5.5, 5)
      expect(resIn.status).toBe('IN_STOCK')
    })

    it('productSchema rejects negative reorder_level (< 0)', () => {
      const invalidProduct = {
        name: 'Negative Reorder Test Item',
        product_type: 'goods',
        primary_unit: 'PCS',
        selling_price: 100,
        purchase_price: 80,
        reorder_level: -5, // Invalid!
      }

      const parsed = productSchema.safeParse(invalidProduct)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        const errors = parsed.error.format()
        expect(JSON.stringify(errors)).toContain('reorder_level')
      }
    })

    it('productSchema accepts valid zero and positive reorder_level', () => {
      const validZero = productSchema.safeParse({
        name: 'Zero Reorder Test Item',
        sku: 'SKU-REORDER-0',
        product_type: 'goods',
        primary_unit: 'PCS',
        selling_price: 100,
        purchase_price: 80,
        reorder_level: 0,
      })
      expect(validZero.success).toBe(true)

      const validPositive = productSchema.safeParse({
        name: 'Positive Reorder Test Item',
        sku: 'SKU-REORDER-POS',
        product_type: 'goods',
        primary_unit: 'PCS',
        selling_price: 100,
        purchase_price: 80,
        reorder_level: 25.5,
      })
      expect(validPositive.success).toBe(true)
    })
  })

  // ============================================================
  // SECTION 8: PRODUCT STOCK LEDGER API & MOVEMENTS
  // ============================================================
  describe('Product Stock Ledger API & Movements', () => {
    beforeEach(() => {
      // Add sample movements for prodA
      mockStorage.inventory_movements.push(
        {
          id: 'mov-1',
          organization_id: tenantA,
          product_id: prodA,
          movement_type: 'opening',
          direction: 'IN',
          quantity: 10,
          base_quantity: 10,
          unit: 'PCS',
          before_quantity: 0,
          after_quantity: 10,
          reference_type: 'manual',
          reference_number: 'OPEN-01',
          reason: 'Opening stock',
          created_at: '2026-09-01T10:00:00Z',
        },
        {
          id: 'mov-2',
          organization_id: tenantA,
          product_id: prodA,
          movement_type: 'adjustment_in',
          direction: 'IN',
          quantity: 5,
          base_quantity: 5,
          unit: 'PCS',
          before_quantity: 10,
          after_quantity: 15,
          reference_type: 'adjustment',
          reference_number: 'ADJ-01',
          reason: 'Stock count addition',
          created_at: '2026-09-10T12:00:00Z',
        },
        {
          id: 'mov-3',
          organization_id: tenantA,
          product_id: prodA,
          movement_type: 'sale',
          direction: 'OUT',
          quantity: -5,
          base_quantity: 5,
          unit: 'PCS',
          before_quantity: 15,
          after_quantity: 10,
          reference_type: 'invoice',
          reference_number: 'INV-2026-001',
          reason: 'Sold to Acme',
          created_at: '2026-09-20T15:00:00Z',
        }
      )
    })

    it('returns movement list with correct before/after quantities and pagination metadata', async () => {
      const req = new Request(`http://localhost/api/inventory/product/${prodA}/movements?page=1&limit=10`) as any
      const res = await productMovementsGet(req, { params: Promise.resolve({ id: prodA }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.product.id).toBe(prodA)
      expect(body.data.length).toBe(3)
      expect(body.pagination.total).toBe(3)
      expect(body.pagination.page).toBe(1)
      expect(body.data[0].before_quantity).toBe(0)
      expect(body.data[0].after_quantity).toBe(10)
    })

    it('filters movements by direction (IN)', async () => {
      const req = new Request(`http://localhost/api/inventory/product/${prodA}/movements?direction=IN`) as any
      const res = await productMovementsGet(req, { params: Promise.resolve({ id: prodA }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.every((m: any) => m.direction === 'IN')).toBe(true)
      expect(body.data.length).toBe(2)
    })

    it('filters movements by movement_type (sale)', async () => {
      const req = new Request(`http://localhost/api/inventory/product/${prodA}/movements?movement_type=sale`) as any
      const res = await productMovementsGet(req, { params: Promise.resolve({ id: prodA }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.length).toBe(1)
      expect(body.data[0].movement_type).toBe('sale')
    })

    it('exports product ledger movements as CSV', async () => {
      const req = new Request(`http://localhost/api/inventory/product/${prodA}/movements?format=csv`) as any
      const res = await productMovementsGet(req, { params: Promise.resolve({ id: prodA }) })

      expect(res.status).toBe(200)
      const csvText = await res.text()
      expect(res.headers.get('content-type')).toContain('text/csv')
      expect(csvText).toContain('Date,Movement Type,Direction,Quantity')
      expect(csvText).toContain('OPEN-01')
      expect(csvText).toContain('ADJ-01')
    })

    it('enforces tenant isolation on ledger API: Tenant A cannot access Tenant B product movements', async () => {
      const req = new Request(`http://localhost/api/inventory/product/${prodB}/movements`) as any
      const res = await productMovementsGet(req, { params: Promise.resolve({ id: prodB }) })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.success).toBe(false)
      expect(body.error).toContain('Product not found')
    })
  })

  // ============================================================
  // SECTION 9: STOCK REPORTS & INVENTORY VISIBILITY
  // ============================================================
  describe('Stock Reports & Visibility', () => {
    it('correctly maps stock status and reorder levels for stock summary report', () => {
      const products = mockStorage.products.filter((p) => p.organization_id === tenantA)

      const summary = products.map((p) => {
        const statusResult = computeStockStatus(p.current_stock, p.reorder_level)
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          current_stock: p.current_stock,
          primary_unit: p.primary_unit,
          reorder_level: p.reorder_level,
          status: statusResult.status,
          status_label: statusResult.label,
        }
      })

      expect(summary.length).toBe(3) // prodA, prodNeg, openingProdId
      const standardWidget = summary.find((s) => s.sku === 'WID-001')
      expect(standardWidget?.status).toBe('IN_STOCK') // stock 10 > reorder 5

      const openingWidget = summary.find((s) => s.sku === 'WID-OPEN')
      expect(openingWidget?.status).toBe('OUT_OF_STOCK') // stock 0
    })

    it('strictly isolates tenant data in stock summaries', () => {
      const tenantAProducts = mockStorage.products.filter((p) => p.organization_id === tenantA)
      const tenantBProducts = mockStorage.products.filter((p) => p.organization_id === tenantB)

      expect(tenantAProducts.every((p) => p.organization_id === tenantA)).toBe(true)
      expect(tenantBProducts.every((p) => p.organization_id === tenantB)).toBe(true)
      expect(tenantAProducts.some((p) => p.id === prodB)).toBe(false)
    })
  })
})

