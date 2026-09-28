// ============================================================
// tests/phase7b-crm.test.ts
// Phase 7B: Customer & Supplier CRM + Financial Relationship Management
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CrmService } from '../lib/services/crm.service'
import { AppSession } from '../lib/auth/session'

// ── In-Memory Database Simulator for Supabase ───────────────────
let mockDb: {
  customers: any[]
  customer_addresses: any[]
  customer_transactions: any[]
  invoices: any[]
  payments: any[]
  quotations: any[]
  suppliers: any[]
  supplier_transactions: any[]
  purchase_bills: any[]
  crm_notes: any[]
  crm_followups: any[]
  audit_logs: any[]
}

const ORG_A = '11111111-1111-4000-a000-000000000001'
const ORG_B = '22222222-2222-4000-a000-000000000002'

const CUST_A = 'c0000001-1111-4000-a000-000000000001'
const CUST_B = 'c0000002-2222-4000-a000-000000000002'
const SUPP_A = 'e0000001-1111-4000-a000-000000000001'
const SUPP_B = 'e0000002-2222-4000-a000-000000000002'
const INV_A = 'f0000001-1111-4000-a000-000000000001'
const BILL_A = 'b0000001-1111-4000-a000-000000000001'
const PAY_A = 'd0000001-1111-4000-a000-000000000001'

const sessionOrgA: AppSession = {
  user_id: 'user-a-01',
  role: 'owner',
  organization_id: ORG_A,
  user: { id: 'user-a-01', email: 'owner@org-a.com', full_name: 'Owner A', avatar_url: null },
  organization: { id: ORG_A, name: 'Org A Corp', gstin: '27AABCU9603R1ZM', logo_url: null, business_category: 'retail' },
  member: { id: 'mem-a-01', role: 'owner', status: 'active' },
}

const sessionOrgB: AppSession = {
  user_id: 'user-b-01',
  role: 'owner',
  organization_id: ORG_B,
  user: { id: 'user-b-01', email: 'owner@org-b.com', full_name: 'Owner B', avatar_url: null },
  organization: { id: ORG_B, name: 'Org B Corp', gstin: '29ABCDE1234F1Z5', logo_url: null, business_category: 'retail' },
  member: { id: 'mem-b-01', role: 'owner', status: 'active' },
}

const sessionStaffNoPerms: AppSession = {
  user_id: 'user-staff-01',
  role: 'inventory',
  organization_id: ORG_A,
  user: { id: 'user-staff-01', email: 'inventory@org-a.com', full_name: 'Inventory Staff', avatar_url: null },
  organization: { id: ORG_A, name: 'Org A Corp', gstin: '27AABCU9603R1ZM', logo_url: null, business_category: 'retail' },
  member: { id: 'mem-staff-01', role: 'inventory', status: 'active' },
}

function resetMockDb() {
  mockDb = {
    customers: [
      {
        id: CUST_A,
        organization_id: ORG_A,
        name: 'Acme Customer Pvt Ltd',
        phone: '9876543210',
        email: 'acme@customer.com',
        outstanding_balance: 15000,
        credit_limit: 50000,
        created_at: '2026-08-01T10:00:00Z',
      },
      {
        id: CUST_B,
        organization_id: ORG_B,
        name: 'Beta Customer Ltd',
        phone: '9876543211',
        email: 'beta@customer.com',
        outstanding_balance: 5000,
        credit_limit: 25000,
        created_at: '2026-08-05T10:00:00Z',
      },
    ],
    customer_addresses: [
      {
        id: 'addr-01',
        customer_id: CUST_A,
        address_line1: '123 Market Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    ],
    customer_transactions: [
      {
        id: 'ctxn-01',
        organization_id: ORG_A,
        customer_id: CUST_A,
        transaction_date: '2026-09-01',
        transaction_type: 'invoice',
        amount: 25000,
        reference_id: INV_A,
      },
      {
        id: 'ctxn-02',
        organization_id: ORG_A,
        customer_id: CUST_A,
        transaction_date: '2026-09-10',
        transaction_type: 'payment',
        amount: 10000,
        reference_id: PAY_A,
      },
    ],
    invoices: [
      {
        id: INV_A,
        organization_id: ORG_A,
        invoice_number: 'INV-2026-001',
        customer_id: CUST_A,
        invoice_date: '2026-09-01',
        due_date: '2026-09-15',
        total_amount: 25000,
        amount_paid: 10000,
        balance_due: 15000,
        status: 'partially_paid',
        created_at: '2026-09-01T10:00:00Z',
      },
    ],
    payments: [
      {
        id: PAY_A,
        organization_id: ORG_A,
        payment_number: 'REC-2026-001',
        customer_id: CUST_A,
        payment_date: '2026-09-10',
        amount: 10000,
        payment_mode: 'bank',
        created_at: '2026-09-10T14:00:00Z',
      },
    ],
    quotations: [
      {
        id: 'quot-01',
        organization_id: ORG_A,
        quotation_number: 'QT-2026-001',
        customer_id: CUST_A,
        quotation_date: '2026-08-25',
        total_amount: 30000,
        status: 'accepted',
        created_at: '2026-08-25T11:00:00Z',
      },
    ],
    suppliers: [
      {
        id: SUPP_A,
        organization_id: ORG_A,
        name: 'Apex Raw Materials Ltd',
        phone: '9123456780',
        email: 'apex@supplier.com',
        outstanding_balance: 30000,
        created_at: '2026-08-01T09:00:00Z',
      },
      {
        id: SUPP_B,
        organization_id: ORG_B,
        name: 'Delta Supplier Co',
        phone: '9123456781',
        email: 'delta@supplier.com',
        outstanding_balance: 12000,
        created_at: '2026-08-05T09:00:00Z',
      },
    ],
    supplier_transactions: [
      {
        id: 'stxn-01',
        organization_id: ORG_A,
        supplier_id: SUPP_A,
        transaction_date: '2026-09-02',
        transaction_type: 'bill',
        amount: 40000,
        reference_id: BILL_A,
      },
      {
        id: 'stxn-02',
        organization_id: ORG_A,
        supplier_id: SUPP_A,
        transaction_date: '2026-09-12',
        transaction_type: 'payment',
        amount: 10000,
        reference_id: 'stxn-pay-01',
      },
    ],
    purchase_bills: [
      {
        id: BILL_A,
        organization_id: ORG_A,
        bill_number: 'PB-2026-001',
        supplier_id: SUPP_A,
        bill_date: '2026-09-02',
        due_date: '2026-09-12',
        total_amount: 40000,
        paid_amount: 10000,
        balance_due: 30000,
        status: 'partially_paid',
        created_at: '2026-09-02T10:00:00Z',
      },
    ],
    crm_notes: [],
    crm_followups: [],
    audit_logs: [],
  }
}

// ── Supabase Admin Mock Engine ──────────────────────────────────
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    return {
      from: (table: string) => {
        let currentTable = (mockDb as any)[table] || []
        let filters: Array<(row: any) => boolean> = []
        let pendingUpdate: any = null
        let isSingle = false
        let pendingInserted: any = null

        const queryObj: any = {
          select: (fields = '*') => queryObj,
          eq: (column: string, value: any) => {
            filters.push((row) => row[column] === value)
            return queryObj
          },
          neq: (column: string, value: any) => {
            filters.push((row) => row[column] !== value)
            return queryObj
          },
          gte: (column: string, value: any) => {
            filters.push((row) => row[column] >= value)
            return queryObj
          },
          lte: (column: string, value: any) => {
            filters.push((row) => row[column] <= value)
            return queryObj
          },
          lt: (column: string, value: any) => {
            filters.push((row) => row[column] < value)
            return queryObj
          },
          in: (column: string, values: any[]) => {
            filters.push((row) => values.includes(row[column]))
            return queryObj
          },
          order: (column: string, opts?: any) => queryObj,
          limit: (n: number) => queryObj,
          single: () => {
            isSingle = true
            return queryObj
          },
          insert: (data: any | any[]) => {
            const rows = Array.isArray(data) ? data : [data]
            const inserted = rows.map((r) => {
              const row = {
                id: r.id || `${table}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...r,
              }
              currentTable.push(row)
              return row
            })
            pendingInserted = isSingle ? inserted[0] : (rows.length === 1 ? inserted[0] : inserted)
            return queryObj
          },
          update: (data: any) => {
            pendingUpdate = data
            return queryObj
          },
          delete: () => {
            return {
              eq: (col: string, val: any) => {
                return {
                  eq: (col2: string, val2: any) => {
                    const idx = currentTable.findIndex((r: any) => r[col] === val && r[col2] === val2)
                    if (idx !== -1) currentTable.splice(idx, 1)
                    return Promise.resolve({ data: null, error: null })
                  },
                  then: (resolve: any) => {
                    const idx = currentTable.findIndex((r: any) => r[col] === val)
                    if (idx !== -1) currentTable.splice(idx, 1)
                    resolve({ data: null, error: null })
                  }
                }
              },
            }
          },
          then: (resolve: any) => {
            if (pendingInserted !== null) {
              const result = pendingInserted
              pendingInserted = null
              resolve({ data: result, error: null })
              return
            }

            let result = currentTable.filter((row: any) =>
              filters.every((f) => f(row))
            )

            // If an update was queued, apply it
            if (pendingUpdate) {
              result.forEach((row: any) => {
                Object.assign(row, pendingUpdate)
              })
              resolve({ data: isSingle ? result[0] : result, error: null })
              return
            }

            if (table === 'customers') {
              result = result.map((c: any) => ({
                ...c,
                customer_addresses: mockDb.customer_addresses.filter((a) => a.customer_id === c.id),
              }))
            }

            resolve({ data: isSingle ? (result[0] || null) : result, error: null })
          },
        }

        return queryObj
      },
    }
  },
}))

vi.mock('@/lib/services/audit.service', () => ({
  logAudit: (log: any) => {
    mockDb.audit_logs.push(log)
    return Promise.resolve()
  },
}))

// ============================================================
// TEST SUITE
// ============================================================

describe('Phase 7B: Customer & Supplier CRM + Financial Relationship Management', () => {
  beforeEach(() => {
    resetMockDb()
  })

  // ------------------------------------------------------------
  // SECTION 1: Customer 360° Profile
  // ------------------------------------------------------------
  describe('1. Customer 360° Profile', () => {
    it('generates a complete 360 profile with financial summaries, invoices, payments, quotations & timeline', async () => {
      const p360 = await CrmService.getCustomer360(sessionOrgA, CUST_A)

      expect(p360).toBeDefined()
      expect(p360.customer.id).toBe(CUST_A)
      expect(p360.customer.name).toBe('Acme Customer Pvt Ltd')

      // Summary checks
      expect(p360.summary.totalSales).toBe(25000)
      expect(p360.summary.totalInvoiced).toBe(25000)
      expect(p360.summary.totalPaid).toBe(10000)
      expect(p360.summary.totalOutstanding).toBe(15000)
      expect(p360.summary.creditLimit).toBe(50000)
      expect(p360.summary.partialInvoicesCount).toBe(1)

      // Related records
      expect(p360.invoices).toHaveLength(1)
      expect(p360.payments).toHaveLength(1)
      expect(p360.quotations).toHaveLength(1)

      // Timeline events
      expect(p360.timeline.length).toBeGreaterThanOrEqual(3)
      const types = p360.timeline.map((t) => t.type)
      expect(types).toContain('customer_created')
      expect(types).toContain('invoice_created')
      expect(types).toContain('payment_received')
    })

    it('enforces multi-tenant isolation when requesting customer profile', async () => {
      // Org A cannot see Org B's customer
      await expect(
        CrmService.getCustomer360(sessionOrgA, CUST_B)
      ).rejects.toThrow('Customer not found')
    })
  })

  // ------------------------------------------------------------
  // SECTION 2: Supplier 360° Profile
  // ------------------------------------------------------------
  describe('2. Supplier 360° Profile', () => {
    it('generates a complete supplier 360 profile with purchase summaries and timeline', async () => {
      const s360 = await CrmService.getSupplier360(sessionOrgA, SUPP_A)

      expect(s360).toBeDefined()
      expect(s360.supplier.id).toBe(SUPP_A)
      expect(s360.supplier.name).toBe('Apex Raw Materials Ltd')

      // Summary checks
      expect(s360.summary.totalPurchases).toBe(40000)
      expect(s360.summary.totalPurchaseBills).toBe(1)
      expect(s360.summary.totalPaid).toBe(10000)
      expect(s360.summary.totalPayable).toBe(30000)
      expect(s360.summary.partialBillsCount).toBe(1)

      // Purchases & Payments
      expect(s360.purchases).toHaveLength(1)
      expect(s360.payments).toHaveLength(1)

      // Timeline
      const types = s360.timeline.map((t) => t.type)
      expect(types).toContain('supplier_created')
      expect(types).toContain('purchase_created')
      expect(types).toContain('payment_made')
    })

    it('enforces multi-tenant isolation on supplier profile', async () => {
      await expect(
        CrmService.getSupplier360(sessionOrgA, SUPP_B)
      ).rejects.toThrow('Supplier not found')
    })
  })

  // ------------------------------------------------------------
  // SECTION 3: Customer Statement of Account
  // ------------------------------------------------------------
  describe('3. Customer Statement of Account', () => {
    it('calculates opening balance, debits, credits and running closing balance correctly', async () => {
      const statement = await CrmService.getCustomerStatement(sessionOrgA, CUST_A)

      expect(statement).toBeDefined()
      expect(statement.party_type).toBe('customer')
      expect(statement.party.name).toBe('Acme Customer Pvt Ltd')
      expect(statement.total_debits).toBe(25000)
      expect(statement.total_credits).toBe(10000)
      expect(statement.closing_balance).toBe(15000)

      expect(statement.lines).toHaveLength(2)
      // First line: Invoice (debit)
      expect(statement.lines[0].type).toBe('Invoice')
      expect(statement.lines[0].debit).toBe(25000)
      expect(statement.lines[0].running_balance).toBe(25000)

      // Second line: Payment (credit)
      expect(statement.lines[1].type).toBe('Payment')
      expect(statement.lines[1].credit).toBe(10000)
      expect(statement.lines[1].running_balance).toBe(15000)
    })

    it('filters statement lines within a specified date window', async () => {
      const filtered = await CrmService.getCustomerStatement(sessionOrgA, CUST_A, {
        startDate: '2026-09-05',
        endDate: '2026-09-20',
      })

      // The 2026-09-01 invoice should be part of opening balance
      expect(filtered.opening_balance).toBe(25000)
      // Only the 2026-09-10 payment falls inside the window
      expect(filtered.lines).toHaveLength(1)
      expect(filtered.lines[0].type).toBe('Payment')
      expect(filtered.closing_balance).toBe(15000)
    })

    it('enforces multi-tenant isolation when requesting customer statement', async () => {
      await expect(
        CrmService.getCustomerStatement(sessionOrgA, CUST_B)
      ).rejects.toThrow('Customer not found')
    })
  })

  // ------------------------------------------------------------
  // SECTION 4: Supplier Statement of Account
  // ------------------------------------------------------------
  describe('4. Supplier Statement of Account', () => {
    it('calculates supplier statement with bills (credits/payable) and payments (debits)', async () => {
      const statement = await CrmService.getSupplierStatement(sessionOrgA, SUPP_A)

      expect(statement).toBeDefined()
      expect(statement.party_type).toBe('supplier')
      expect(statement.party.name).toBe('Apex Raw Materials Ltd')
      expect(statement.total_debits).toBe(10000)
      expect(statement.total_credits).toBe(40000)
      expect(statement.closing_balance).toBe(30000)

      expect(statement.lines).toHaveLength(2)
      expect(statement.lines[0].type).toBe('Purchase Bill')
      expect(statement.lines[0].credit).toBe(40000)
      expect(statement.lines[1].type).toBe('Supplier Payment')
      expect(statement.lines[1].debit).toBe(10000)
    })

    it('filters supplier statement lines within a specified date window', async () => {
      const filtered = await CrmService.getSupplierStatement(sessionOrgA, SUPP_A, {
        startDate: '2026-09-08',
        endDate: '2026-09-25',
      })
      expect(filtered.opening_balance).toBe(40000)
      expect(filtered.lines).toHaveLength(1)
      expect(filtered.lines[0].type).toBe('Supplier Payment')
      expect(filtered.closing_balance).toBe(30000)
    })

    it('enforces multi-tenant isolation when requesting supplier statement', async () => {
      await expect(
        CrmService.getSupplierStatement(sessionOrgA, SUPP_B)
      ).rejects.toThrow('Supplier not found')
    })
  })

  // ------------------------------------------------------------
  // SECTION 5: CRM Notes CRUD & Permissions
  // ------------------------------------------------------------
  describe('5. CRM Notes CRUD', () => {
    it('creates a customer note and records an audit log', async () => {
      const note = await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'Discussed Q4 bulk pricing agreement. Follow up next week.',
      })

      expect(note).toBeDefined()
      expect(note.entity_type).toBe('customer')
      expect(note.entity_id).toBe(CUST_A)
      expect(note.note_text).toContain('bulk pricing agreement')

      // Verify audit log
      expect(mockDb.audit_logs.some((a) => a.resourceType === 'crm_notes' && a.action === 'create')).toBe(true)
    })

    it('rejects creating a note with empty text', async () => {
      await expect(
        CrmService.createNote(sessionOrgA, {
          entity_type: 'customer',
          entity_id: CUST_A,
          note_text: '',
        })
      ).rejects.toThrow()
    })

    it('lists notes for an entity', async () => {
      await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'First note',
      })
      await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'Second note',
      })

      const notes = await CrmService.getNotes(sessionOrgA, 'customer', CUST_A)
      expect(notes.length).toBeGreaterThanOrEqual(2)
    })

    it('updates a note successfully', async () => {
      const created = await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'Initial text',
      })

      const updated = await CrmService.updateNote(sessionOrgA, created.id, {
        note_text: 'Updated note text with new info',
      })

      expect(updated.note_text).toBe('Updated note text with new info')
    })

    it('deletes a note successfully', async () => {
      const created = await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'Temporary note to delete',
      })

      const deleted = await CrmService.deleteNote(sessionOrgA, created.id)
      expect(deleted).toBe(true)

      const remaining = await CrmService.getNotes(sessionOrgA, 'customer', CUST_A)
      expect(remaining.find((n) => n.id === created.id)).toBeUndefined()
    })

    it('enforces RBAC permission on creating note', async () => {
      await expect(
        CrmService.createNote(sessionStaffNoPerms, {
          entity_type: 'customer',
          entity_id: CUST_A,
          note_text: 'Unauthorized note',
        })
      ).rejects.toThrow(/FORBIDDEN/i)
    })
  })

  // ------------------------------------------------------------
  // SECTION 6: CRM Follow-ups CRUD & Workflow
  // ------------------------------------------------------------
  describe('6. CRM Follow-ups CRUD', () => {
    it('creates a customer follow-up schedule and records audit log', async () => {
      const fup = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-09-30',
        followup_time: '15:00',
        followup_type: 'payment',
        purpose: 'Follow up on remaining ₹15,000 balance payment',
        notes: 'Spoke with accounts manager Mr. Sharma.',
      })

      expect(fup).toBeDefined()
      expect(fup.status).toBe('pending')
      expect(fup.purpose).toBe('Follow up on remaining ₹15,000 balance payment')
      expect(fup.followup_type).toBe('payment')

      // Verify audit log
      expect(mockDb.audit_logs.some((a) => a.resourceType === 'crm_followups' && a.action === 'create')).toBe(true)
    })

    it('rejects creating a follow-up with invalid date format', async () => {
      await expect(
        CrmService.createFollowUp(sessionOrgA, {
          entity_type: 'customer',
          entity_id: CUST_A,
          followup_date: 'invalid-date',
          followup_type: 'general',
          purpose: 'Call customer',
        })
      ).rejects.toThrow()
    })

    it('rejects creating a follow-up with empty purpose', async () => {
      await expect(
        CrmService.createFollowUp(sessionOrgA, {
          entity_type: 'customer',
          entity_id: CUST_A,
          followup_date: '2026-09-30',
          followup_type: 'general',
          purpose: '',
        })
      ).rejects.toThrow()
    })

    it('updates follow-up status to completed', async () => {
      const created = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-09-28',
        followup_type: 'quotation',
        purpose: 'Review quotation QT-2026-001',
      })

      const updated = await CrmService.updateFollowUp(sessionOrgA, created.id, {
        status: 'completed',
        notes: 'Customer accepted the revised terms.',
      })

      expect(updated.status).toBe('completed')
    })

    it('filters follow-ups by status and entityType', async () => {
      await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-09-28',
        followup_type: 'payment',
        purpose: 'Pending payment call',
      })
      const f2 = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-09-27',
        followup_type: 'sales',
        purpose: 'Sales pitch completed',
      })
      await CrmService.updateFollowUp(sessionOrgA, f2.id, { status: 'completed' })

      const pendingOnly = await CrmService.getFollowUps(sessionOrgA, {
        entityType: 'customer',
        status: 'pending',
      })

      expect(pendingOnly.every((f) => f.status === 'pending')).toBe(true)
    })

    it('deletes a follow-up successfully', async () => {
      const created = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-10-05',
        followup_type: 'general',
        purpose: 'Check feedback',
      })

      const deleted = await CrmService.deleteFollowUp(sessionOrgA, created.id)
      expect(deleted).toBe(true)
    })

    it('enforces RBAC permission on creating follow-up', async () => {
      await expect(
        CrmService.createFollowUp(sessionStaffNoPerms, {
          entity_type: 'customer',
          entity_id: CUST_A,
          followup_date: '2026-09-30',
          followup_type: 'payment',
          purpose: 'Unauthorized follow-up',
        })
      ).rejects.toThrow(/FORBIDDEN/i)
    })
  })

  // ------------------------------------------------------------
  // SECTION 7: Outstanding Integration & Financial Reconciliation
  // ------------------------------------------------------------
  describe('7. Outstanding Integration & Balance Reconciliation', () => {
    it('reconciles Customer 360 outstanding with canonical invoice balance due', async () => {
      const profile = await CrmService.getCustomerProfile(sessionOrgA, CUST_A)
      expect(profile).toBeDefined()
      // Canonical formula: totalSales - totalPaid = totalOutstanding
      const expectedOutstanding = profile.summary.totalSales - profile.summary.totalPaid
      expect(profile.summary.totalOutstanding).toBe(expectedOutstanding)
      expect(profile.summary.totalOutstanding).toBe(15000)
    })

    it('reconciles Supplier 360 payable with canonical purchase bills balance due', async () => {
      const profile = await CrmService.getSupplierProfile(sessionOrgA, SUPP_A)
      expect(profile).toBeDefined()
      // Canonical formula: totalPurchases - totalPaid = totalPayable
      const expectedPayable = profile.summary.totalPurchases - profile.summary.totalPaid
      expect(profile.summary.totalPayable).toBe(expectedPayable)
      expect(profile.summary.totalPayable).toBe(30000)
    })

    it('verifies credit limit calculation and headroom for customer', async () => {
      const profile = await CrmService.getCustomerProfile(sessionOrgA, CUST_A)
      expect(profile.summary.creditLimit).toBe(50000)
      const headroom = profile.summary.creditLimit - profile.summary.totalOutstanding
      expect(headroom).toBe(35000)
      expect(profile.summary.totalOutstanding).toBeLessThanOrEqual(profile.summary.creditLimit)
    })

    it('validates open, paid, and partial invoice counts in customer summary', async () => {
      const profile = await CrmService.getCustomer360(sessionOrgA, CUST_A)
      expect(profile.summary.openInvoicesCount).toBe(1)
      expect(profile.summary.partialInvoicesCount).toBe(1)
      expect(profile.summary.paidInvoicesCount).toBe(0)
    })
  })

  // ------------------------------------------------------------
  // SECTION 8: Follow-up Lifecycle & Overdue Detection
  // ------------------------------------------------------------
  describe('8. Follow-up Lifecycle & Overdue Detection', () => {
    it('detects past-due follow-ups as overdue when status is pending', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const fup = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: yesterday,
        followup_type: 'payment',
        purpose: 'Past-due collection call',
      })

      const allPending = await CrmService.getFollowUps(sessionOrgA, {
        entityType: 'customer',
        entityId: CUST_A,
        status: 'pending',
      })

      const todayStr = new Date().toISOString().split('T')[0]
      const overdueList = allPending.filter((f) => f.status === 'pending' && f.followup_date < todayStr)
      expect(overdueList.some((f) => f.id === fup.id)).toBe(true)
    })

    it('verifies completed follow-ups do NOT remain overdue even if date is past', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0]
      const fup = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: pastDate,
        followup_type: 'sales',
        purpose: 'Completed sales follow-up',
      })

      await CrmService.updateFollowUp(sessionOrgA, fup.id, {
        status: 'completed',
        notes: 'Order placed by client.',
      })

      const allFollowups = await CrmService.getFollowUps(sessionOrgA, {
        entityType: 'customer',
        entityId: CUST_A,
      })

      const updated = allFollowups.find((f) => f.id === fup.id)
      expect(updated).toBeDefined()
      expect(updated!.status).toBe('completed')
      // Only pending follow-ups should be classified as overdue
      const isOverdue = updated!.status === 'pending' && updated!.followup_date < new Date().toISOString().split('T')[0]
      expect(isOverdue).toBe(false)
    })

    it('verifies cancelled follow-ups do NOT remain overdue even if date is past', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]
      const fup = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: pastDate,
        followup_type: 'general',
        purpose: 'Cancelled call',
      })

      await CrmService.updateFollowUp(sessionOrgA, fup.id, {
        status: 'cancelled',
        notes: 'Client postponed indefinitely.',
      })

      const allFollowups = await CrmService.getFollowUps(sessionOrgA, {
        entityType: 'customer',
        entityId: CUST_A,
      })

      const updated = allFollowups.find((f) => f.id === fup.id)
      expect(updated).toBeDefined()
      expect(updated!.status).toBe('cancelled')
      const isOverdue = updated!.status === 'pending' && updated!.followup_date < new Date().toISOString().split('T')[0]
      expect(isOverdue).toBe(false)
    })

    it('allows rescheduling a follow-up with updated date and time', async () => {
      const original = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-09-25',
        followup_time: '10:00',
        followup_type: 'payment',
        purpose: 'Original schedule',
      })

      const rescheduled = await CrmService.updateFollowUp(sessionOrgA, original.id, {
        followup_date: '2026-10-02',
        followup_time: '14:30',
        notes: 'Rescheduled per client request',
      })

      expect(rescheduled.followup_date).toBe('2026-10-02')
      expect(rescheduled.followup_time).toBe('14:30')
      expect(rescheduled.notes).toContain('Rescheduled per client request')
    })
  })

  // ------------------------------------------------------------
  // SECTION 9: Supplier CRM Notes CRUD & IDOR Defense
  // ------------------------------------------------------------
  describe('9. Supplier CRM Notes & Tenant Isolation (IDOR)', () => {
    it('creates, fetches, and deletes supplier-specific notes', async () => {
      const note = await CrmService.createNote(sessionOrgA, {
        entity_type: 'supplier',
        entity_id: SUPP_A,
        note_text: 'Negotiated 5% prompt payment discount for next quarter raw material delivery.',
      })

      expect(note).toBeDefined()
      expect(note.entity_type).toBe('supplier')
      expect(note.entity_id).toBe(SUPP_A)

      const suppNotes = await CrmService.getNotes(sessionOrgA, 'supplier', SUPP_A)
      expect(suppNotes.some((n) => n.id === note.id)).toBe(true)

      const deleted = await CrmService.deleteNote(sessionOrgA, note.id)
      expect(deleted).toBe(true)
    })

    it('strictly rejects cross-tenant access to supplier notes (IDOR defense)', async () => {
      const noteA = await CrmService.createNote(sessionOrgA, {
        entity_type: 'supplier',
        entity_id: SUPP_A,
        note_text: 'Confidential supplier pricing terms for Org A.',
      })

      // Org B should not see Org A notes
      const notesOrgB = await CrmService.getNotes(sessionOrgB, 'supplier', SUPP_A)
      expect(notesOrgB.some((n) => n.id === noteA.id)).toBe(false)

      // Org B should not be able to delete Org A note
      await expect(CrmService.deleteNote(sessionOrgB, noteA.id)).rejects.toThrow()
    })

    it('rejects note deletion from unauthorized role without permission', async () => {
      const note = await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'Protected customer note.',
      })

      await expect(CrmService.deleteNote(sessionStaffNoPerms, note.id)).rejects.toThrow(/FORBIDDEN/i)
    })
  })

  // ------------------------------------------------------------
  // SECTION 10: Follow-up Tenant Isolation (IDOR Defense) & RBAC
  // ------------------------------------------------------------
  describe('10. Follow-up IDOR & Security', () => {
    it('strictly prevents Org B from modifying Org A follow-up', async () => {
      const fupA = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-10-10',
        followup_type: 'payment',
        purpose: 'Org A customer collection',
      })

      // Org B attempts to update Org A follow-up
      await expect(
        CrmService.updateFollowUp(sessionOrgB, fupA.id, {
          status: 'completed',
        })
      ).rejects.toThrow()
    })

    it('rejects follow-up deletion from unauthorized staff role', async () => {
      const fup = await CrmService.createFollowUp(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        followup_date: '2026-10-12',
        followup_type: 'general',
        purpose: 'Staff RBAC test follow-up',
      })

      await expect(CrmService.deleteFollowUp(sessionStaffNoPerms, fup.id)).rejects.toThrow(/FORBIDDEN/i)
    })
  })

  // ------------------------------------------------------------
  // SECTION 11: Statement Export & CSV Structure
  // ------------------------------------------------------------
  describe('11. Statement Export & Data Structure', () => {
    it('generates customer statement lines suitable for CSV export', async () => {
      const stmt = await CrmService.getCustomerStatement(sessionOrgA, CUST_A)
      expect(stmt).toBeDefined()
      expect(stmt.lines.length).toBeGreaterThan(0)

      // Verify every statement line has exportable fields
      stmt.lines.forEach((line) => {
        expect(line).toHaveProperty('date')
        expect(line).toHaveProperty('type')
        expect(line).toHaveProperty('reference')
        expect(line).toHaveProperty('debit')
        expect(line).toHaveProperty('credit')
        expect(line).toHaveProperty('running_balance')
      })
    })

    it('generates supplier statement lines suitable for CSV export', async () => {
      const stmt = await CrmService.getSupplierStatement(sessionOrgA, SUPP_A)
      expect(stmt).toBeDefined()
      expect(stmt.lines.length).toBeGreaterThan(0)

      stmt.lines.forEach((line) => {
        expect(line).toHaveProperty('date')
        expect(line).toHaveProperty('type')
        expect(line).toHaveProperty('reference')
        expect(line).toHaveProperty('debit')
        expect(line).toHaveProperty('credit')
        expect(line).toHaveProperty('running_balance')
      })
    })
  })

  // ------------------------------------------------------------
  // SECTION 12: Activity Timeline Chronological Interleaving
  // ------------------------------------------------------------
  describe('12. Activity Timeline Interleaving', () => {
    it('chronologically interleaves invoices, payments, and CRM interactions in timeline', async () => {
      await CrmService.createNote(sessionOrgA, {
        entity_type: 'customer',
        entity_id: CUST_A,
        note_text: 'Timeline validation note',
      })

      const profile = await CrmService.getCustomerProfile(sessionOrgA, CUST_A)
      expect(profile.timeline).toBeDefined()
      expect(profile.timeline.length).toBeGreaterThanOrEqual(3)

      // Timeline must be sorted descending by date (most recent first)
      for (let i = 0; i < profile.timeline.length - 1; i++) {
        const currentDate = new Date(profile.timeline[i].date).getTime()
        const nextDate = new Date(profile.timeline[i + 1].date).getTime()
        expect(currentDate).toBeGreaterThanOrEqual(nextDate)
      }
    })

    it('includes quotations in customer timeline when available', async () => {
      const profile = await CrmService.getCustomer360(sessionOrgA, CUST_A)
      const quoteItems = profile.timeline.filter(t => t.type === 'quotation_created')
      expect(quoteItems.length).toBeGreaterThanOrEqual(1)
      expect(quoteItems[0].title).toContain('Quotation')
    })
  })
})
