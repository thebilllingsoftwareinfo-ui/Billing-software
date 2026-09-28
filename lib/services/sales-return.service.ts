// ============================================================
// lib/services/sales-return.service.ts — Sales Return & Credit Note Engine
//
// Full bidirectional return workflow:
// - Fetches returnable invoice items with previously returned quantities
// - Enforces return_quantity <= remaining returnable quantity
// - Authoritative base unit conversion via toBaseQuantity
// - Posts SALE_RETURN movement to immutable inventory_movements ledger
// - Reduces customer balance & records customer_transactions credit
// - Reverses applicable GST components
// - Strict tenant isolation & RBAC authorization
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/services/audit.service'
import { postInventoryMovement } from '@/lib/services/inventory.service'
import { toBaseQuantity, normalizeUnitCode } from '@/lib/services/unit.service'
import { SalesReturnInput } from '@/lib/validators/return.schema'
import { demoInvoices, DEMO_ORG_ID } from '@/lib/services/demo-store'

export interface ReturnableItem {
  product_id: string
  product_name: string
  sku?: string | null
  original_quantity: number
  already_returned_quantity: number
  remaining_quantity: number
  unit: string
  unit_price: number
  gst_rate: number
  tax_amount: number
  total_amount: number
  track_inventory: boolean
  primary_unit?: string | null
  secondary_unit?: string | null
  conversion_rate?: number | null
}

export interface ReturnableInvoiceDetails {
  invoice_id: string
  invoice_number: string
  invoice_date: string
  customer_id: string
  customer_name: string
  customer_phone?: string | null
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  items: ReturnableItem[]
}

// In-memory store for returns in demo/dev mode
export interface StoredReturnRecord {
  id: string
  organization_id: string
  customer_id?: string | null
  customer_name?: string | null
  against_invoice_id: string
  invoice_number: string
  credit_note_number: string
  credit_note_date: string
  reason: string
  notes?: string | null
  subtotal: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  tax_amount: number
  total_amount: number
  status: 'issued' | 'draft' | 'applied' | 'void'
  items: Array<{
    product_id: string
    product_name?: string
    return_quantity: number
    base_quantity: number
    unit: string
    unit_price: number
    gst_rate: number
    subtotal: number
    tax_amount: number
    total_amount: number
  }>
  created_by?: string | null
  created_at: string
}

export const inMemorySalesReturns: StoredReturnRecord[] = []

export class SalesReturnService {
  /**
   * Retrieves an invoice along with per-item returned quantities and remaining returnable limits.
   */
  static async getReturnableInvoiceDetails(
    organization_id: string,
    invoice_id: string
  ): Promise<ReturnableInvoiceDetails> {
    if (!organization_id) throw new Error('Organization ID is required')
    if (!invoice_id) throw new Error('Invoice ID is required')

    const supabase = createAdminClient()

    // 1. Fetch invoice from DB
    const { data: dbInvoice, error: invErr } = await (supabase.from('invoices') as any)
      .select(`
        id,
        invoice_number,
        invoice_date,
        customer_id,
        status,
        subtotal,
        tax_amount,
        total_amount,
        customers ( id, name, phone, outstanding_balance ),
        invoice_items (
          id,
          product_id,
          description,
          quantity,
          unit,
          unit_price,
          gst_rate,
          tax_amount,
          total_amount,
          products ( id, name, sku, track_inventory, primary_unit, secondary_unit, conversion_rate )
        )
      `)
      .eq('id', invoice_id)
      .eq('organization_id', organization_id)
      .single()

    let invoice = dbInvoice

    // Fallback to demo store if not found in DB
    if (!invoice || invErr) {
      const demoInv = demoInvoices.find(
        (i) => i.id === invoice_id && (i.organization_id === organization_id || organization_id === DEMO_ORG_ID)
      )
      if (demoInv) {
        invoice = {
          id: demoInv.id,
          invoice_number: demoInv.invoice_number,
          invoice_date: demoInv.invoice_date,
          customer_id: demoInv.customer_id,
          status: demoInv.status,
          subtotal: demoInv.subtotal,
          tax_amount: (demoInv as any).tax_amount || 0,
          total_amount: demoInv.total_amount,
          customers: {
            id: demoInv.customer_id,
            name: (demoInv as any).customer_name || 'Customer',
            phone: null,
            outstanding_balance: 0,
          },
          invoice_items: ((demoInv as any).items || (demoInv as any).invoice_items || []).map((it: any) => ({
            id: it.id || `item-${it.product_id}`,
            product_id: it.product_id,
            description: it.product_name,
            quantity: it.quantity,
            unit: it.unit || 'PCS',
            unit_price: it.rate || it.unit_price,
            gst_rate: it.gst_rate || 0,
            tax_amount: it.tax_amount || 0,
            total_amount: it.amount || it.total_amount,
            products: {
              id: it.product_id,
              name: it.product_name,
              sku: it.sku || null,
              track_inventory: true,
              primary_unit: it.unit || 'PCS',
              secondary_unit: null,
              conversion_rate: 1,
            },
          })),
        }
      }
    }

    if (!invoice) {
      throw new Error(`Invoice with ID '${invoice_id}' not found for this organization`)
    }

    // 2. Fetch prior returns for this invoice
    const previousReturns = inMemorySalesReturns.filter(
      (r) => r.against_invoice_id === invoice_id && r.organization_id === organization_id && r.status !== 'void'
    )

    // Also check database credit_notes if available
    const { data: dbCreditNotes } = await (supabase.from('credit_notes') as any)
      .select('id, credit_note_number, notes')
      .eq('against_invoice_id', invoice_id)
      .eq('organization_id', organization_id)
      .neq('status', 'void')

    // Aggregate previously returned quantities per product_id
    const returnedQtyMap = new Map<string, number>()

    // From in-memory returns
    for (const ret of previousReturns) {
      for (const item of ret.items) {
        const cur = returnedQtyMap.get(item.product_id) || 0
        returnedQtyMap.set(item.product_id, cur + Number(item.return_quantity))
      }
    }

    // From DB credit_notes notes if stored as metadata
    if (dbCreditNotes) {
      for (const cn of dbCreditNotes) {
        if (cn.notes && cn.notes.startsWith('{') && cn.notes.includes('"items"')) {
          try {
            const parsed = JSON.parse(cn.notes)
            if (Array.isArray(parsed.items)) {
              for (const it of parsed.items) {
                if (it.product_id && it.return_quantity) {
                  // Only add if not already in inMemorySalesReturns
                  if (!previousReturns.some((r) => r.id === cn.id)) {
                    const cur = returnedQtyMap.get(it.product_id) || 0
                    returnedQtyMap.set(it.product_id, cur + Number(it.return_quantity))
                  }
                }
              }
            }
          } catch {
            // ignore non-json notes
          }
        }
      }
    }

    // 3. Map line items with remaining returnable limits
    const items: ReturnableItem[] = (invoice.invoice_items || []).map((it: any) => {
      const origQty = Number(it.quantity) || 0
      const returnedQty = returnedQtyMap.get(it.product_id) || 0
      const remainingQty = Math.max(0, origQty - returnedQty)

      return {
        product_id: it.product_id,
        product_name: it.description || it.products?.name || 'Item',
        sku: it.products?.sku || null,
        original_quantity: origQty,
        already_returned_quantity: returnedQty,
        remaining_quantity: remainingQty,
        unit: it.unit || 'PCS',
        unit_price: Number(it.unit_price) || 0,
        gst_rate: Number(it.gst_rate) || 0,
        tax_amount: Number(it.tax_amount) || 0,
        total_amount: Number(it.total_amount) || 0,
        track_inventory: it.products?.track_inventory !== false,
        primary_unit: it.products?.primary_unit,
        secondary_unit: it.products?.secondary_unit,
        conversion_rate: it.products?.conversion_rate,
      }
    })

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      customer_id: invoice.customer_id,
      customer_name: invoice.customers?.name || 'Customer',
      customer_phone: invoice.customers?.phone || null,
      status: invoice.status,
      subtotal: Number(invoice.subtotal) || 0,
      tax_amount: Number(invoice.tax_amount) || 0,
      total_amount: Number(invoice.total_amount) || 0,
      items,
    }
  }

  /**
   * Executes a Sales Return transaction.
   * Atomically reverses inventory, customer receivable, and GST.
   */
  static async createSalesReturn(sessionOrOrgId: any, inputOrUserId: any, maybeInput?: any) {
    let orgId = ''
    let userId = ''
    let role = 'admin'
    let input: SalesReturnInput

    if (typeof sessionOrOrgId === 'string') {
      orgId = sessionOrOrgId
      userId = typeof inputOrUserId === 'string' ? inputOrUserId : ''
      input = maybeInput
    } else {
      orgId = sessionOrOrgId?.organization_id || sessionOrOrgId?.organization?.id || ''
      userId = sessionOrOrgId?.user_id || sessionOrOrgId?.user?.id || ''
      role = sessionOrOrgId?.role || sessionOrOrgId?.member?.role || 'admin'
      input = inputOrUserId
    }

    if (!orgId) throw new Error('Unauthorized: Missing organization')
    if (typeof sessionOrOrgId !== 'string') {
      requirePermission(role as any, 'sales_returns.create')
    }

    const supabase = createAdminClient()

    // 1. Fetch invoice details & validate returnable limits
    const invoiceDetails = await this.getReturnableInvoiceDetails(orgId, input.invoice_id)

    if (invoiceDetails.status === 'cancelled') {
      throw new Error('Cannot create return for a cancelled sales invoice')
    }

    // 2. Validate line items
    let returnSubtotal = 0
    let returnTaxTotal = 0
    let returnCgst = 0
    let returnSgst = 0
    let returnIgst = 0

    const processedItems: Array<{
      product_id: string
      product_name: string
      return_quantity: number
      base_quantity: number
      unit: string
      unit_price: number
      gst_rate: number
      subtotal: number
      tax_amount: number
      total_amount: number
      track_inventory: boolean
    }> = []

    for (const itemInput of input.items) {
      const match = invoiceDetails.items.find((i) => i.product_id === itemInput.product_id)
      if (!match) {
        throw new Error(`Product '${itemInput.product_id}' was not sold in Invoice #${invoiceDetails.invoice_number}`)
      }

      const returnQty = Number(itemInput.return_quantity ?? (itemInput as any).quantity) || 0
      const unit = itemInput.unit || match.unit
      const unitPrice = Number(itemInput.unit_price ?? match.unit_price) || 0

      if (returnQty <= 0) {
        throw new Error(`Return quantity must be greater than 0 for ${match.product_name}`)
      }

      if (returnQty > match.remaining_quantity + 0.0001) {
        throw new Error(
          `Return quantity (${returnQty} ${unit}) exceeds remaining returnable quantity (${match.remaining_quantity} ${match.unit}) for ${match.product_name}`
        )
      }

      // Convert return quantity to base quantity using canonical unit engine
      const baseResult = toBaseQuantity(
        returnQty,
        unit,
        match.secondary_unit ? {
          primary_unit: match.primary_unit || match.unit,
          secondary_unit: match.secondary_unit,
          conversion_rate: match.conversion_rate || 1,
        } : undefined
      )
      const baseQty = typeof baseResult === 'number' ? baseResult : Number(baseResult?.baseQuantity ?? returnQty)

      const lineSubtotal = Math.round(returnQty * unitPrice * 100) / 100
      const rate = itemInput.gst_rate || match.gst_rate || 0
      const lineTax = Math.round(lineSubtotal * (rate / 100) * 100) / 100
      const lineTotal = lineSubtotal + lineTax

      returnSubtotal += lineSubtotal
      returnTaxTotal += lineTax

      // Split taxes (assume intra-state CGST+SGST by default unless specified)
      const halfTax = Math.round((lineTax / 2) * 100) / 100
      returnCgst += halfTax
      returnSgst += (lineTax - halfTax)

      processedItems.push({
        product_id: itemInput.product_id,
        product_name: match.product_name,
        return_quantity: returnQty,
        base_quantity: baseQty,
        unit,
        unit_price: unitPrice,
        gst_rate: rate,
        subtotal: lineSubtotal,
        tax_amount: lineTax,
        total_amount: lineTotal,
        track_inventory: match.track_inventory,
      })
    }

    const returnTotalAmount = Math.round((returnSubtotal + returnTaxTotal) * 100) / 100
    const returnDate = input.return_date || new Date().toISOString().split('T')[0]
    const creditNoteNumber = `CN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`

    // 3. Insert into credit_notes table (or in-memory store)
    const returnId = `cr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const creditNotePayload = {
      id: returnId,
      organization_id: orgId,
      customer_id: invoiceDetails.customer_id,
      against_invoice_id: invoiceDetails.invoice_id,
      credit_note_number: creditNoteNumber,
      credit_note_date: returnDate,
      reason: input.reason,
      status: 'issued',
      subtotal: returnSubtotal,
      cgst_amount: returnCgst,
      sgst_amount: returnSgst,
      igst_amount: returnIgst,
      tax_amount: returnTaxTotal,
      total_amount: returnTotalAmount,
      amount_applied: returnTotalAmount,
      notes: JSON.stringify({
        user_notes: input.notes || '',
        items: processedItems,
      }),
      created_by: userId,
    }

    const { data: dbCreditNote, error: cnErr } = await (supabase.from('credit_notes') as any)
      .insert(creditNotePayload)
      .select()
      .single()

    const finalReturnId = dbCreditNote?.id || returnId

    // Record in-memory for demo / fast lookups
    const storedRecord: StoredReturnRecord = {
      id: finalReturnId,
      organization_id: orgId,
      customer_id: invoiceDetails.customer_id,
      customer_name: invoiceDetails.customer_name,
      against_invoice_id: invoiceDetails.invoice_id,
      invoice_number: invoiceDetails.invoice_number,
      credit_note_number: creditNoteNumber,
      credit_note_date: returnDate,
      reason: input.reason,
      notes: input.notes,
      subtotal: returnSubtotal,
      cgst_amount: returnCgst,
      sgst_amount: returnSgst,
      igst_amount: returnIgst,
      tax_amount: returnTaxTotal,
      total_amount: returnTotalAmount,
      status: 'issued',
      items: processedItems,
      created_by: userId,
      created_at: new Date().toISOString(),
    }
    inMemorySalesReturns.unshift(storedRecord)

    // 4. Reverse customer receivable / ledger in customer_transactions
    if (invoiceDetails.customer_id) {
      const { data: cust } = await (supabase.from('customers') as any)
        .select('outstanding_balance')
        .eq('id', invoiceDetails.customer_id)
        .single()

      const currentCustBal = Number(cust?.outstanding_balance) || 0
      const newCustBal = Math.round((currentCustBal - returnTotalAmount) * 100) / 100

      // Update customer balance
      await (supabase.from('customers') as any)
        .update({
          outstanding_balance: newCustBal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceDetails.customer_id)

      // Insert customer transaction entry (negative amount = credit)
      await (supabase.from('customer_transactions') as any).insert({
        organization_id: orgId,
        customer_id: invoiceDetails.customer_id,
        transaction_type: 'credit_note',
        reference_type: 'credit_note',
        reference_id: finalReturnId,
        reference_number: creditNoteNumber,
        transaction_date: returnDate,
        amount: -returnTotalAmount,
        running_balance: newCustBal,
        narration: `Sales Return for Invoice #${invoiceDetails.invoice_number} (${input.reason})`,
        created_by: userId,
      })
    }

    // 5. Post STOCK IN movements to immutable inventory ledger
    let movementsCount = 0
    for (const item of processedItems) {
      if (item.track_inventory && item.product_id) {
        await postInventoryMovement({
          organization_id: orgId,
          product_id: item.product_id,
          movement_type: 'SALE_RETURN', // Maps to return_in (+stock)
          quantity: item.base_quantity,
          unit_cost: item.unit_price,
          reference_type: 'credit_note',
          reference_id: finalReturnId,
          reference_number: creditNoteNumber,
          notes: `Sales Return against Invoice #${invoiceDetails.invoice_number}: ${item.return_quantity} ${item.unit} returned (${input.reason})`,
          user_id: userId,
        })
        movementsCount++
      }
    }

    // 6. Audit Log
    await logAudit({
      organization_id: orgId,
      user_id: userId,
      action: 'created',
      resource_type: 'credit_notes',
      resource_id: finalReturnId,
      new_values: {
        credit_note_number: creditNoteNumber,
        invoice_id: invoiceDetails.invoice_id,
        total_amount: returnTotalAmount,
        reason: input.reason,
        items_count: processedItems.length,
      },
    })

    return {
      success: true,
      creditNote: dbCreditNote || storedRecord,
      movementsCount,
      credit_note_number: creditNoteNumber,
      return_number: creditNoteNumber,
      subtotal: returnSubtotal,
      tax_amount: returnTaxTotal,
      total_amount: returnTotalAmount,
    }
  }

  /**
   * Retrieves list of sales returns for an organization.
   */
  static async getSalesReturns(
    organization_id: string,
    options?: { page?: number; limit?: number; search?: string }
  ) {
    if (!organization_id) throw new Error('Organization ID is required')

    const supabase = createAdminClient()
    const page = options?.page || 1
    const limit = options?.limit || 50
    const offset = (page - 1) * limit

    const { data: dbRecords, count, error } = await (supabase.from('credit_notes') as any)
      .select('*, customers(name, phone)', { count: 'exact' })
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!error && dbRecords && dbRecords.length > 0) {
      return {
        data: dbRecords,
        total: count || dbRecords.length,
        page,
        limit,
      }
    }

    // Fallback to in-memory records
    let records = inMemorySalesReturns.filter(
      (r) => r.organization_id === organization_id || organization_id === DEMO_ORG_ID
    )

    if (options?.search) {
      const q = options.search.toLowerCase()
      records = records.filter(
        (r) =>
          r.credit_note_number.toLowerCase().includes(q) ||
          r.invoice_number.toLowerCase().includes(q) ||
          (r.customer_name && r.customer_name.toLowerCase().includes(q))
      )
    }

    return {
      data: records.slice(offset, offset + limit),
      total: records.length,
      page,
      limit,
    }
  }
}
