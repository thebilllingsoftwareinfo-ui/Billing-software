// ============================================================
// lib/services/crm.service.ts — Phase 7B CRM & Financial Relationship Service
// Complete 360° Profile, Statement, Notes, Follow-ups & Timeline Engine
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import type { ApiSession } from '@/lib/auth/api-session'
import { requirePermission } from '@/lib/auth/permissions'

export type CrmSession = AppSession | ApiSession
import { logAudit } from '@/lib/services/audit.service'
import {
  CreateNoteInput,
  UpdateNoteInput,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  createNoteSchema,
  updateNoteSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
} from '@/lib/validators/crm.schema'
import {
  demoGetCustomer,
  demoGetCustomerDetails,
  demoGetSupplier,
  demoGetSuppliers,
  demoGetInvoices,
  demoGetPayments,
  demoTransactions,
  demoPurchaseBills,
  demoGetCrmNotes,
  demoAddCrmNote,
  demoUpdateCrmNote,
  demoDeleteCrmNote,
  demoGetCrmFollowUps,
  demoAddCrmFollowUp,
  demoUpdateCrmFollowUp,
  demoDeleteCrmFollowUp,
  demoSalesOrders,
  demoProformaInvoices,
  demoDeliveryChallans,
  demoPurchaseOrders,
  DemoCrmNote,
  DemoCrmFollowUp,
} from '@/lib/services/demo-store'

export interface CrmTimelineItem {
  id: string
  date: string
  type: string
  title: string
  reference?: string | null
  amount?: number | null
  status?: string | null
  description?: string | null
  link?: string | null
}

export interface Customer360Profile {
  customer: any
  summary: {
    totalSales: number
    totalInvoiced: number
    totalPaid: number
    totalOutstanding: number
    overdueAmount: number
    openInvoicesCount: number
    paidInvoicesCount: number
    partialInvoicesCount: number
    creditLimit: number
  }
  invoices: any[]
  payments: any[]
  quotations: any[]
  transactions: any[]
  notes: DemoCrmNote[]
  followups: DemoCrmFollowUp[]
  timeline: CrmTimelineItem[]
}

export interface Supplier360Profile {
  supplier: any
  summary: {
    totalPurchases: number
    totalPurchaseBills: number
    totalPaid: number
    totalPayable: number
    overduePayable: number
    openBillsCount: number
    paidBillsCount: number
    partialBillsCount: number
  }
  purchases: any[]
  payments: any[]
  transactions: any[]
  notes: DemoCrmNote[]
  followups: DemoCrmFollowUp[]
  timeline: CrmTimelineItem[]
}

export interface StatementLineItem {
  id: string
  date: string
  type: string
  reference: string
  description?: string | null
  debit: number
  credit: number
  running_balance: number
}

export interface PartyStatementResult {
  party: any
  party_type: 'customer' | 'supplier'
  start_date?: string | null
  end_date?: string | null
  opening_balance: number
  total_debits: number
  total_credits: number
  closing_balance: number
  lines: StatementLineItem[]
}

export class CrmService {
  /**
   * Generates complete 360° Profile for a Customer.
   */
  static async getCustomer360(session: CrmSession, customerId: string): Promise<Customer360Profile> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    requirePermission(role, 'customers.view')

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    let customer: any = null
    let invoices: any[] = []
    let payments: any[] = []
    let quotations: any[] = []
    let transactions: any[] = []

    if (userId.includes('demo') || !isValidUUID(customerId)) {
      const details = demoGetCustomerDetails(customerId)
      if (!details || (details.customer.organization_id && details.customer.organization_id !== orgId)) {
        throw new Error('Customer not found')
      }
      customer = details.customer
      invoices = details.invoices || []
      payments = details.payments || []
      quotations = details.quotations || []
      transactions = details.transactions || []
    } else {
      const supabase = createAdminClient()
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('*, customer_addresses(*)')
        .eq('id', customerId)
        .eq('organization_id', orgId)
        .single()

      if (custErr || !cust) {
        throw new Error('Customer not found')
      }
      customer = cust

      const [invRes, payRes, quotRes, txnRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customerId)
          .eq('organization_id', orgId)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customerId)
          .eq('organization_id', orgId)
          .order('payment_date', { ascending: false }),
        supabase
          .from('quotations')
          .select('*')
          .eq('customer_id', customerId)
          .eq('organization_id', orgId)
          .order('quotation_date', { ascending: false }),
        supabase
          .from('customer_transactions')
          .select('*')
          .eq('customer_id', customerId)
          .eq('organization_id', orgId)
          .order('transaction_date', { ascending: false }),
      ])

      invoices = invRes.data || []
      payments = payRes.data || []
      quotations = quotRes.data || []
      transactions = txnRes.data || []
    }

    const todayStr = new Date().toISOString().split('T')[0]

    // Canonical financial calculations
    const activeInvoices = invoices.filter((i) => i.status !== 'cancelled' && i.status !== 'draft' && i.status !== 'void')
    const totalSales = activeInvoices.reduce((sum, inv) => sum + Number(inv.total_amount ?? (inv.total ? inv.total / 100 : 0)), 0)
    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount ?? (inv.total ? inv.total / 100 : 0)), 0)
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount ?? (p.amount_paise ? p.amount_paise / 100 : 0)), 0)
    const totalOutstanding = Number(customer.outstanding_balance ?? (customer.outstanding ? customer.outstanding / 100 : 0)) || Math.max(0, totalSales - totalPaid)

    let overdueAmount = 0
    let openCount = 0
    let paidCount = 0
    let partialCount = 0

    for (const inv of activeInvoices) {
      const tot = Number(inv.total_amount ?? (inv.total ? inv.total / 100 : 0))
      const paid = Number(inv.amount_paid ?? inv.paid_amount ?? (inv.paid ? inv.paid / 100 : 0))
      const bal = Number(inv.balance_due ?? (tot - paid))

      if (bal <= 0 || inv.status === 'paid') {
        paidCount++
      } else if (paid > 0 && bal > 0) {
        partialCount++
        openCount++
      } else {
        openCount++
      }

      if (bal > 0 && inv.due_date && inv.due_date < todayStr) {
        overdueAmount += bal
      }
    }

    // Notes and follow-ups
    const notes = await this.getNotes(session, 'customer', customerId)
    const followups = await this.getFollowUps(session, { entityType: 'customer', entityId: customerId })

    // Build Chronological Timeline
    const timeline: CrmTimelineItem[] = []

    // 1. Customer created
    if (customer.created_at) {
      timeline.push({
        id: `timeline-cust-${customer.id}`,
        date: customer.created_at,
        type: 'customer_created',
        title: 'Customer Profile Created',
        reference: customer.display_name,
        description: `Customer account registered with initial balance ₹${customer.opening_balance || 0}`,
      })
    }

    // 2. Invoices
    for (const inv of invoices) {
      timeline.push({
        id: `timeline-inv-${inv.id}`,
        date: inv.invoice_date || inv.created_at,
        type: inv.status === 'cancelled' ? 'invoice_cancelled' : 'invoice_created',
        title: inv.status === 'cancelled' ? `Invoice Cancelled (${inv.invoice_number})` : `Invoice Created (${inv.invoice_number})`,
        reference: inv.invoice_number,
        amount: Number(inv.total_amount ?? (inv.total ? inv.total / 100 : 0)),
        status: inv.status,
        description: `Total: ₹${inv.total_amount || 0} • Status: ${inv.status}`,
        link: `/sales/invoices/${inv.id}`,
      })
    }

    // 3. Payments
    for (const p of payments) {
      timeline.push({
        id: `timeline-pay-${p.id}`,
        date: p.payment_date || p.created_at,
        type: 'payment_received',
        title: `Payment Received (${p.payment_number || 'Receipt'})`,
        reference: p.payment_number || p.reference_number,
        amount: Number(p.amount || 0),
        status: 'completed',
        description: `Mode: ${p.payment_mode || p.payment_method || 'Cash/Bank'} • Amount: ₹${p.amount || 0}`,
        link: `/sales/payments/${p.id}`,
      })
    }

    // 4. Quotations
    for (const q of quotations) {
      timeline.push({
        id: `timeline-q-${q.id}`,
        date: q.quotation_date || q.created_at,
        type: q.status === 'converted' ? 'quotation_converted' : 'quotation_created',
        title: q.status === 'converted' ? `Quotation Converted (${q.quotation_number})` : `Quotation Created (${q.quotation_number})`,
        reference: q.quotation_number,
        amount: Number(q.total_amount || 0),
        status: q.status,
        description: `Estimated: ₹${q.total_amount || 0} • Status: ${q.status}`,
        link: `/sales/quotations/${q.id}`,
      })
    }

    // 5. Notes
    for (const n of notes) {
      timeline.push({
        id: `timeline-note-${n.id}`,
        date: n.created_at,
        type: 'note_added',
        title: 'Internal CRM Note Added',
        reference: n.created_by_name || 'Staff',
        description: n.note_text,
      })
    }

    // 6. Follow-ups
    for (const f of followups) {
      timeline.push({
        id: `timeline-fup-${f.id}`,
        date: f.created_at,
        type: f.status === 'completed' ? 'followup_completed' : 'followup_created',
        title: `Follow-up: ${f.purpose} (${f.status})`,
        reference: f.followup_type.toUpperCase(),
        status: f.status,
        description: `Scheduled: ${f.followup_date} ${f.followup_time || ''} • ${f.notes || ''}`,
      })
    }

    // 7. Sales Orders
    const custOrders = (userId.includes('demo') || !isValidUUID(customerId))
      ? demoSalesOrders.filter((o) => o.customer_id === customerId)
      : []
    for (const so of custOrders) {
      timeline.push({
        id: `timeline-so-${so.id}`,
        date: so.order_date || so.created_at,
        type: 'sales_order_created',
        title: `Sales Order Placed (${so.order_number})`,
        reference: so.order_number,
        amount: Number(so.total_amount || 0),
        status: so.status,
        description: `Order Total: ₹${so.total_amount || 0} • Status: ${so.status}`,
        link: `/sales/orders/${so.id}`,
      })
    }

    // 8. Proforma Invoices
    const custPIs = (userId.includes('demo') || !isValidUUID(customerId))
      ? demoProformaInvoices.filter((p) => p.customer_id === customerId)
      : []
    for (const pi of custPIs) {
      timeline.push({
        id: `timeline-pi-${pi.id}`,
        date: pi.proforma_date || pi.created_at,
        type: 'proforma_created',
        title: `Proforma Invoice Issued (${pi.proforma_number})`,
        reference: pi.proforma_number,
        amount: Number(pi.total_amount || 0),
        status: pi.status,
        description: `Proforma Total: ₹${pi.total_amount || 0} • Status: ${pi.status}`,
        link: `/sales/proforma-invoices/${pi.id}`,
      })
    }

    // 9. Delivery Challans
    const custDCs = (userId.includes('demo') || !isValidUUID(customerId))
      ? demoDeliveryChallans.filter((d) => d.customer_id === customerId)
      : []
    for (const dc of custDCs) {
      timeline.push({
        id: `timeline-dc-${dc.id}`,
        date: dc.challan_date || dc.created_at,
        type: 'delivery_challan_created',
        title: `Delivery Challan (${dc.challan_number})`,
        reference: dc.challan_number,
        amount: Number(dc.total_amount || 0),
        status: dc.status,
        description: `Type: ${dc.challan_type} • Status: ${dc.status}`,
        link: `/sales/challans/${dc.id}`,
      })
    }

    // Sort timeline descending by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      customer,
      summary: {
        totalSales,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        overdueAmount,
        openInvoicesCount: openCount,
        paidInvoicesCount: paidCount,
        partialInvoicesCount: partialCount,
        creditLimit: Number(customer.credit_limit || 0),
      },
      invoices,
      payments,
      quotations,
      transactions,
      notes,
      followups,
      timeline,
    }
  }

  /**
   * Generates complete 360° Profile for a Supplier / Vendor.
   */
  static async getSupplier360(session: CrmSession, supplierId: string): Promise<Supplier360Profile> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    requirePermission(role, 'suppliers.view')

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    let supplier: any = null
    let purchases: any[] = []
    let payments: any[] = []
    let transactions: any[] = []

    if (userId.includes('demo') || !isValidUUID(supplierId)) {
      supplier = demoGetSupplier(supplierId)
      if (!supplier || (supplier.organization_id && supplier.organization_id !== orgId)) {
        throw new Error('Supplier not found')
      }
      const demoBills = demoPurchaseBills.filter((b) => b.supplier_id === supplierId)
      purchases = demoBills
      payments = demoTransactions.filter((t) => t.supplier_id === supplierId && t.transaction_type === 'payment')
      transactions = demoTransactions.filter((t) => t.supplier_id === supplierId)
    } else {
      const supabase = createAdminClient()
      const { data: supp, error: suppErr } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .eq('organization_id', orgId)
        .single()

      if (suppErr || !supp) {
        throw new Error('Supplier not found')
      }
      supplier = supp

      const [billsRes, payRes, txnRes] = await Promise.all([
        supabase
          .from('purchase_bills')
          .select('*')
          .eq('supplier_id', supplierId)
          .eq('organization_id', orgId)
          .order('bill_date', { ascending: false }),
        supabase
          .from('supplier_transactions')
          .select('*')
          .eq('supplier_id', supplierId)
          .eq('organization_id', orgId)
          .eq('transaction_type', 'payment')
          .order('transaction_date', { ascending: false }),
        supabase
          .from('supplier_transactions')
          .select('*')
          .eq('supplier_id', supplierId)
          .eq('organization_id', orgId)
          .order('transaction_date', { ascending: false }),
      ])

      purchases = billsRes.data || []
      payments = payRes.data || []
      transactions = txnRes.data || []
    }

    const todayStr = new Date().toISOString().split('T')[0]

    // Canonical calculations
    const activeBills = purchases.filter((b) => b.status !== 'cancelled' && b.status !== 'draft' && b.status !== 'void')
    const totalPurchases = activeBills.reduce((sum, b) => sum + Number(b.total_amount ?? (b.total ? b.total / 100 : 0)), 0)
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
    const totalPayable = Number(supplier.outstanding_balance ?? (supplier.outstanding ? supplier.outstanding / 100 : 0)) || Math.max(0, totalPurchases - totalPaid)

    let overduePayable = 0
    let openCount = 0
    let paidCount = 0
    let partialCount = 0

    for (const b of activeBills) {
      const tot = Number(b.total_amount ?? (b.total ? b.total / 100 : 0))
      const paid = Number(b.paid_amount ?? b.amount_paid ?? 0)
      const bal = Number(b.balance_due ?? (tot - paid))

      if (bal <= 0 || b.status === 'paid') {
        paidCount++
      } else if (paid > 0 && bal > 0) {
        partialCount++
        openCount++
      } else {
        openCount++
      }

      if (bal > 0 && b.due_date && b.due_date < todayStr) {
        overduePayable += bal
      }
    }

    // Notes & follow-ups
    const notes = await this.getNotes(session, 'supplier', supplierId)
    const followups = await this.getFollowUps(session, { entityType: 'supplier', entityId: supplierId })

    // Build timeline
    const timeline: CrmTimelineItem[] = []

    // 1. Supplier registered
    if (supplier.created_at) {
      timeline.push({
        id: `timeline-supp-${supplier.id}`,
        date: supplier.created_at,
        type: 'supplier_created',
        title: 'Supplier Account Registered',
        reference: supplier.display_name || supplier.name,
        description: `Vendor profile created with balance ₹${supplier.outstanding_balance || 0}`,
      })
    }

    // 2. Purchases
    for (const b of purchases) {
      timeline.push({
        id: `timeline-bill-${b.id}`,
        date: b.bill_date || b.created_at,
        type: b.status === 'cancelled' ? 'purchase_cancelled' : 'purchase_created',
        title: b.status === 'cancelled' ? `Purchase Bill Cancelled (${b.bill_number})` : `Purchase Bill Inbound (${b.bill_number})`,
        reference: b.bill_number,
        amount: Number(b.total_amount || 0),
        status: b.status,
        description: `Total: ₹${b.total_amount || 0} • Status: ${b.status}`,
        link: `/purchases/bills/${b.id}`,
      })
    }

    // 3. Payments made
    for (const p of payments) {
      timeline.push({
        id: `timeline-supp-pay-${p.id}`,
        date: p.transaction_date || p.created_at,
        type: 'payment_made',
        title: `Supplier Payment Made (${p.reference_number || 'Txn'})`,
        reference: p.reference_number,
        amount: Number(p.amount || 0),
        status: 'completed',
        description: `Disbursed ₹${p.amount || 0} towards vendor balance`,
      })
    }

    // 4. Notes
    for (const n of notes) {
      timeline.push({
        id: `timeline-note-${n.id}`,
        date: n.created_at,
        type: 'note_added',
        title: 'Supplier CRM Note Added',
        reference: n.created_by_name || 'Staff',
        description: n.note_text,
      })
    }

    // 5. Follow-ups
    for (const f of followups) {
      timeline.push({
        id: `timeline-fup-${f.id}`,
        date: f.created_at,
        type: f.status === 'completed' ? 'followup_completed' : 'followup_created',
        title: `Vendor Follow-up: ${f.purpose} (${f.status})`,
        reference: f.followup_type.toUpperCase(),
        status: f.status,
        description: `Scheduled: ${f.followup_date} ${f.followup_time || ''} • ${f.notes || ''}`,
      })
    }

    // 6. Purchase Orders
    const suppPOs = (userId.includes('demo') || !isValidUUID(supplierId))
      ? demoPurchaseOrders.filter((p) => p.supplier_id === supplierId)
      : []
    for (const po of suppPOs) {
      timeline.push({
        id: `timeline-po-${po.id}`,
        date: po.order_date || po.created_at,
        type: 'purchase_order_created',
        title: `Purchase Order Issued (${po.po_number})`,
        reference: po.po_number,
        amount: Number(po.total_amount || 0),
        status: po.status,
        description: `PO Total: ₹${po.total_amount || 0} • Status: ${po.status}`,
        link: `/purchases/orders/${po.id}`,
      })
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      supplier,
      summary: {
        totalPurchases,
        totalPurchaseBills: purchases.length,
        totalPaid,
        totalPayable,
        overduePayable,
        openBillsCount: openCount,
        paidBillsCount: paidCount,
        partialBillsCount: partialCount,
      },
      purchases,
      payments,
      transactions,
      notes,
      followups,
      timeline,
    }
  }

  /**
   * Alias for getCustomer360
   */
  static async getCustomerProfile(session: CrmSession, customerId: string): Promise<Customer360Profile> {
    return this.getCustomer360(session, customerId)
  }

  /**
   * Alias for getSupplier360
   */
  static async getSupplierProfile(session: CrmSession, supplierId: string): Promise<Supplier360Profile> {
    return this.getSupplier360(session, supplierId)
  }

  /**
   * Generates Customer Statement of Account with opening balance, debits, credits and closing balance.
   */
  static async getCustomerStatement(
    session: CrmSession,
    customerId: string,
    options?: { startDate?: string; endDate?: string }
  ): Promise<PartyStatementResult> {
    const role = session.role || (session as any).member?.role || 'sales'
    requirePermission(role, 'customer_statements.view')

    const p360 = await this.getCustomer360(session, customerId)
    const { customer, invoices, payments, transactions } = p360

    const startDate = options?.startDate
    const endDate = options?.endDate

    // Build raw transaction rows from invoices and payments
    const rawEvents: Array<{
      id: string
      date: string
      type: string
      reference: string
      description?: string
      debit: number
      credit: number
    }> = []

    for (const inv of invoices) {
      if (inv.status !== 'cancelled' && inv.status !== 'void') {
        rawEvents.push({
          id: `inv-${inv.id}`,
          date: inv.invoice_date || inv.created_at,
          type: 'Invoice',
          reference: inv.invoice_number || 'INV',
          description: `Sales Tax Invoice ${inv.invoice_number || ''}`,
          debit: Number(inv.total_amount ?? (inv.total ? inv.total / 100 : 0)),
          credit: 0,
        })
      }
    }

    for (const p of payments) {
      rawEvents.push({
        id: `pay-${p.id}`,
        date: p.payment_date || p.created_at,
        type: 'Payment',
        reference: p.payment_number || p.reference_number || 'REC',
        description: `Payment Receipt (${p.payment_mode || 'Cash/Bank'})`,
        debit: 0,
        credit: Number(p.amount || 0),
      })
    }

    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let openingBalance = Number(customer.opening_balance || 0)
    const filteredLines: StatementLineItem[] = []
    let runningBalance = openingBalance

    for (const ev of rawEvents) {
      const isBeforeStart = startDate && ev.date < startDate
      const isAfterEnd = endDate && ev.date > endDate

      if (isBeforeStart) {
        // Prior transactions accumulate into opening balance
        openingBalance += (ev.debit - ev.credit)
        runningBalance = openingBalance
      } else if (!isAfterEnd) {
        runningBalance += (ev.debit - ev.credit)
        filteredLines.push({
          id: ev.id,
          date: ev.date,
          type: ev.type,
          reference: ev.reference,
          description: ev.description,
          debit: ev.debit,
          credit: ev.credit,
          running_balance: runningBalance,
        })
      }
    }

    const totalDebits = filteredLines.reduce((s, l) => s + l.debit, 0)
    const totalCredits = filteredLines.reduce((s, l) => s + l.credit, 0)
    const closingBalance = openingBalance + totalDebits - totalCredits

    return {
      party: customer,
      party_type: 'customer',
      start_date: startDate || null,
      end_date: endDate || null,
      opening_balance: openingBalance,
      total_debits: totalDebits,
      total_credits: totalCredits,
      closing_balance: closingBalance,
      lines: filteredLines,
    }
  }

  /**
   * Generates Supplier Statement of Account with opening balance, debits, credits and closing balance.
   */
  static async getSupplierStatement(
    session: CrmSession,
    supplierId: string,
    options?: { startDate?: string; endDate?: string }
  ): Promise<PartyStatementResult> {
    const role = session.role || (session as any).member?.role || 'sales'
    requirePermission(role, 'supplier_statements.view')

    const s360 = await this.getSupplier360(session, supplierId)
    const { supplier, purchases, payments } = s360

    const startDate = options?.startDate
    const endDate = options?.endDate

    const rawEvents: Array<{
      id: string
      date: string
      type: string
      reference: string
      description?: string
      debit: number
      credit: number
    }> = []

    for (const b of purchases) {
      if (b.status !== 'cancelled' && b.status !== 'void') {
        rawEvents.push({
          id: `bill-${b.id}`,
          date: b.bill_date || b.created_at,
          type: 'Purchase Bill',
          reference: b.bill_number || 'BILL',
          description: `Purchase Bill ${b.bill_number || ''}`,
          debit: 0,
          credit: Number(b.total_amount || 0), // Increases payable
        })
      }
    }

    for (const p of payments) {
      rawEvents.push({
        id: `supp-pay-${p.id}`,
        date: p.transaction_date || p.created_at,
        type: 'Supplier Payment',
        reference: p.reference_number || 'TXN',
        description: `Disbursement to Vendor`,
        debit: Number(p.amount || 0), // Decreases payable
        credit: 0,
      })
    }

    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let openingBalance = Number(supplier.opening_balance || 0)
    const filteredLines: StatementLineItem[] = []
    let runningBalance = openingBalance

    for (const ev of rawEvents) {
      const isBeforeStart = startDate && ev.date < startDate
      const isAfterEnd = endDate && ev.date > endDate

      if (isBeforeStart) {
        openingBalance += (ev.credit - ev.debit)
        runningBalance = openingBalance
      } else if (!isAfterEnd) {
        runningBalance += (ev.credit - ev.debit)
        filteredLines.push({
          id: ev.id,
          date: ev.date,
          type: ev.type,
          reference: ev.reference,
          description: ev.description,
          debit: ev.debit,
          credit: ev.credit,
          running_balance: runningBalance,
        })
      }
    }

    const totalDebits = filteredLines.reduce((s, l) => s + l.debit, 0)
    const totalCredits = filteredLines.reduce((s, l) => s + l.credit, 0)
    const closingBalance = openingBalance + totalCredits - totalDebits

    return {
      party: supplier,
      party_type: 'supplier',
      start_date: startDate || null,
      end_date: endDate || null,
      opening_balance: openingBalance,
      total_debits: totalDebits,
      total_credits: totalCredits,
      closing_balance: closingBalance,
      lines: filteredLines,
    }
  }

  // ------------------------------------------------------------------
  // CRM Notes CRUD
  // ------------------------------------------------------------------

  static async createNote(session: CrmSession, input: CreateNoteInput): Promise<DemoCrmNote> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    const userName = (session as any).user?.full_name || (session as any).user?.email || 'Staff'

    if (input.entity_type === 'customer') {
      requirePermission(role, 'customers.notes.create')
    } else {
      requirePermission(role, 'suppliers.notes.create')
    }

    const validated = createNoteSchema.parse(input)

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      const note = demoAddCrmNote({
        organization_id: orgId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        note_text: validated.note_text,
        created_by: userId,
        created_by_name: userName,
      })

      await logAudit({
        organizationId: orgId,
        userId,
        action: 'create',
        resourceType: 'crm_notes',
        resourceId: note.id,
        metadata: { entity_type: validated.entity_type, entity_id: validated.entity_id },
      })

      return note
    }

    const supabase = createAdminClient()
    const { data: note, error } = await (supabase as any)
      .from('crm_notes')
      .insert({
        organization_id: orgId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        note_text: validated.note_text,
        created_by: userId,
        created_by_name: userName,
      })
      .select()
      .single()

    if (error || !note) {
      // Fallback to demo store
      return demoAddCrmNote({
        organization_id: orgId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        note_text: validated.note_text,
        created_by: userId,
        created_by_name: userName,
      })
    }

    await logAudit({
      organizationId: orgId,
      userId,
      action: 'create',
      resourceType: 'crm_notes',
      resourceId: note.id,
      metadata: { entity_type: validated.entity_type, entity_id: validated.entity_id },
    })

    return note
  }

  static async getNotes(
    session: CrmSession,
    entityType: 'customer' | 'supplier',
    entityId: string
  ): Promise<DemoCrmNote[]> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''

    if (entityType === 'customer') {
      requirePermission(role, 'customers.notes.view')
    } else {
      requirePermission(role, 'suppliers.notes.view')
    }

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      return demoGetCrmNotes(orgId, entityType, entityId)
    }

    const supabase = createAdminClient()
    const { data, error } = await (supabase as any)
      .from('crm_notes')
      .select('*')
      .eq('organization_id', orgId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return demoGetCrmNotes(orgId, entityType, entityId)
    }

    return data
  }

  static async updateNote(session: CrmSession, noteId: string, input: UpdateNoteInput): Promise<DemoCrmNote> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''

    const validated = updateNoteSchema.parse(input)

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      const updated = demoUpdateCrmNote(orgId, noteId, validated.note_text)
      if (!updated) throw new Error('Note not found')
      if (updated.entity_type === 'customer') {
        requirePermission(role, 'customers.notes.edit')
      } else {
        requirePermission(role, 'suppliers.notes.edit')
      }
      return updated
    }

    const supabase = createAdminClient()
    // First check permission based on entity_type
    const { data: existing } = await (supabase as any)
      .from('crm_notes')
      .select('*')
      .eq('id', noteId)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      const demoNote = demoUpdateCrmNote(orgId, noteId, validated.note_text)
      if (demoNote) return demoNote
      throw new Error('Note not found')
    }

    if (existing.entity_type === 'customer') {
      requirePermission(role, 'customers.notes.edit')
    } else {
      requirePermission(role, 'suppliers.notes.edit')
    }

    const { data: updated, error } = await (supabase as any)
      .from('crm_notes')
      .update({ note_text: validated.note_text, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error || !updated) {
      throw new Error('Failed to update note')
    }

    await logAudit({
      organizationId: orgId,
      userId,
      action: 'update',
      resourceType: 'crm_notes',
      resourceId: noteId,
    })

    return updated
  }

  static async deleteNote(session: CrmSession, noteId: string): Promise<boolean> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      const deleted = demoDeleteCrmNote(orgId, noteId)
      if (!deleted) throw new Error('Note not found')
      return true
    }

    const supabase = createAdminClient()
    const { data: existing } = await (supabase as any)
      .from('crm_notes')
      .select('entity_type')
      .eq('id', noteId)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      const demoDeleted = demoDeleteCrmNote(orgId, noteId)
      if (demoDeleted) return true
      throw new Error('Note not found')
    }

    if (existing.entity_type === 'customer') {
      requirePermission(role, 'customers.notes.delete')
    } else {
      requirePermission(role, 'suppliers.notes.delete')
    }

    const { error } = await (supabase as any)
      .from('crm_notes')
      .delete()
      .eq('id', noteId)
      .eq('organization_id', orgId)

    if (error) {
      throw new Error('Failed to delete note')
    }

    await logAudit({
      organizationId: orgId,
      userId,
      action: 'delete',
      resourceType: 'crm_notes',
      resourceId: noteId,
    })

    return true
  }

  // ------------------------------------------------------------------
  // CRM Follow-ups CRUD
  // ------------------------------------------------------------------

  static async createFollowUp(session: CrmSession, input: CreateFollowUpInput): Promise<DemoCrmFollowUp> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    const userName = (session as any).user?.full_name || (session as any).user?.email || 'Staff'

    if (input.entity_type === 'customer') {
      requirePermission(role, 'customers.followups.create')
    } else {
      requirePermission(role, 'suppliers.followups.create')
    }

    const validated = createFollowUpSchema.parse(input)

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      const fup = demoAddCrmFollowUp({
        organization_id: orgId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        followup_date: validated.followup_date,
        followup_time: validated.followup_time,
        followup_type: validated.followup_type,
        purpose: validated.purpose,
        notes: validated.notes,
        created_by: userId,
        created_by_name: userName,
      })

      await logAudit({
        organizationId: orgId,
        userId,
        action: 'create',
        resourceType: 'crm_followups',
        resourceId: fup.id,
        metadata: { entity_type: validated.entity_type, entity_id: validated.entity_id },
      })

      return fup
    }

    const supabase = createAdminClient()
    const { data: fup, error } = await (supabase as any)
      .from('crm_followups')
      .insert({
        organization_id: orgId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        followup_date: validated.followup_date,
        followup_time: validated.followup_time,
        followup_type: validated.followup_type,
        purpose: validated.purpose,
        notes: validated.notes,
        status: 'pending',
        created_by: userId,
        created_by_name: userName,
      })
      .select()
      .single()

    if (error || !fup) {
      return demoAddCrmFollowUp({
        organization_id: orgId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        followup_date: validated.followup_date,
        followup_time: validated.followup_time,
        followup_type: validated.followup_type,
        purpose: validated.purpose,
        notes: validated.notes,
        created_by: userId,
        created_by_name: userName,
      })
    }

    await logAudit({
      organizationId: orgId,
      userId,
      action: 'create',
      resourceType: 'crm_followups',
      resourceId: fup.id,
      metadata: { entity_type: validated.entity_type, entity_id: validated.entity_id },
    })

    return fup
  }

  static async getFollowUps(
    session: CrmSession,
    filters?: {
      entityType?: 'customer' | 'supplier'
      entityId?: string
      status?: string
      overdueOnly?: boolean
    }
  ): Promise<DemoCrmFollowUp[]> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''

    if (filters?.entityType === 'customer') {
      requirePermission(role, 'customers.followups.view')
    } else if (filters?.entityType === 'supplier') {
      requirePermission(role, 'suppliers.followups.view')
    }

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    const todayStr = new Date().toISOString().split('T')[0]

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      let list = demoGetCrmFollowUps(orgId, filters?.entityType, filters?.entityId)
      if (filters?.status) {
        list = list.filter((f) => f.status === filters.status)
      }
      if (filters?.overdueOnly) {
        list = list.filter((f) => f.status === 'pending' && f.followup_date < todayStr)
      }
      return list
    }

    const supabase = createAdminClient()
    let query = (supabase as any)
      .from('crm_followups')
      .select('*')
      .eq('organization_id', orgId)

    if (filters?.entityType) query = query.eq('entity_type', filters.entityType)
    if (filters?.entityId) query = query.eq('entity_id', filters.entityId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.overdueOnly) {
      query = query.eq('status', 'pending').lt('followup_date', todayStr)
    }

    query = query.order('followup_date', { ascending: true })

    const { data, error } = await query

    if (error || !data) {
      let list = demoGetCrmFollowUps(orgId, filters?.entityType, filters?.entityId)
      if (filters?.status) {
        list = list.filter((f) => f.status === filters.status)
      }
      if (filters?.overdueOnly) {
        list = list.filter((f) => f.status === 'pending' && f.followup_date < todayStr)
      }
      return list
    }

    return data
  }

  static async updateFollowUp(
    session: CrmSession,
    followUpId: string,
    input: UpdateFollowUpInput
  ): Promise<DemoCrmFollowUp> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''

    const validated = updateFollowUpSchema.parse(input)

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      const updated = demoUpdateCrmFollowUp(orgId, followUpId, validated)
      if (!updated) throw new Error('Follow-up not found')
      if (updated.entity_type === 'customer') {
        requirePermission(role, 'customers.followups.edit')
      } else {
        requirePermission(role, 'suppliers.followups.edit')
      }
      return updated
    }

    const supabase = createAdminClient()
    const { data: existing } = await (supabase as any)
      .from('crm_followups')
      .select('*')
      .eq('id', followUpId)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      const demoFup = demoUpdateCrmFollowUp(orgId, followUpId, validated)
      if (demoFup) return demoFup
      throw new Error('Follow-up not found')
    }

    if (existing.entity_type === 'customer') {
      requirePermission(role, 'customers.followups.edit')
    } else {
      requirePermission(role, 'suppliers.followups.edit')
    }

    const updatePayload: any = {
      ...validated,
      updated_at: new Date().toISOString(),
    }
    if (validated.status === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    } else if (validated.status === 'cancelled') {
      updatePayload.cancelled_at = new Date().toISOString()
    }

    const { data: updated, error } = await (supabase as any)
      .from('crm_followups')
      .update(updatePayload)
      .eq('id', followUpId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error || !updated) {
      throw new Error('Failed to update follow-up')
    }

    await logAudit({
      organizationId: orgId,
      userId,
      action: 'update',
      resourceType: 'crm_followups',
      resourceId: followUpId,
      metadata: { status: validated.status },
    })

    return updated
  }

  static async deleteFollowUp(session: CrmSession, followUpId: string): Promise<boolean> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''

    const isValidUUID = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))

    if (userId.includes('demo') || !isValidUUID(orgId)) {
      const deleted = demoDeleteCrmFollowUp(orgId, followUpId)
      if (!deleted) throw new Error('Follow-up not found')
      return true
    }

    const supabase = createAdminClient()
    const { data: existing } = await (supabase as any)
      .from('crm_followups')
      .select('entity_type')
      .eq('id', followUpId)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      const demoDeleted = demoDeleteCrmFollowUp(orgId, followUpId)
      if (demoDeleted) return true
      throw new Error('Follow-up not found')
    }

    if (existing.entity_type === 'customer') {
      requirePermission(role, 'customers.followups.edit')
    } else {
      requirePermission(role, 'suppliers.followups.edit')
    }

    const { error } = await (supabase as any)
      .from('crm_followups')
      .delete()
      .eq('id', followUpId)
      .eq('organization_id', orgId)

    if (error) {
      throw new Error('Failed to delete follow-up')
    }

    await logAudit({
      organizationId: orgId,
      userId,
      action: 'delete',
      resourceType: 'crm_followups',
      resourceId: followUpId,
    })

    return true
  }

  /**
   * Generates CRM Dashboard metrics (overdue parties and pending follow-ups).
   */
  static async getCrmDashboardMetrics(session: AppSession) {
    const role = session.role || session.member?.role || 'sales'
    const orgId = session.organization_id || session.organization?.id || ''
    const todayStr = new Date().toISOString().split('T')[0]

    // Follow-ups due today & overdue
    const followups = await this.getFollowUps(session, { status: 'pending' })
    const dueTodayFollowUps = followups.filter((f) => f.followup_date === todayStr)
    const overdueFollowUps = followups.filter((f) => f.followup_date < todayStr)

    return {
      due_today_followups: dueTodayFollowUps,
      overdue_followups: overdueFollowUps,
      due_today_count: dueTodayFollowUps.length,
      overdue_count: overdueFollowUps.length,
    }
  }
}
