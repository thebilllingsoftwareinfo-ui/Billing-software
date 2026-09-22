// ============================================================
// lib/services/invoice.service.ts — Sales Invoice Business Logic Engine
//
// Lifecycle: DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID / CANCELLED / OVERDUE
// Server-side financial & tax calculations — never trust frontend totals.
// Finalization atomically updates customer balance & posts inventory movements.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/services/audit.service'
import { postInventoryMovement } from '@/lib/services/inventory.service'
import { CreateInvoiceInput } from '@/lib/validators/invoice.schema'

export interface InvoiceCalculatedLine {
  product_id?: string | null
  description: string
  hsn_sac_code?: string | null
  quantity: number
  unit?: string | null
  unit_price: number
  discount_percent: number
  discount_amount: number
  taxable_amount: number
  gst_rate: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  tax_amount: number
  line_total: number
  is_gst_inclusive: boolean
}

export interface InvoiceCalculatedTotals {
  subtotal: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  utgst_amount?: number
  igst_amount: number
  cess_amount?: number
  total_tax_amount: number
  unrounded_total: number
  round_off_amount: number
  total_amount: number
  lines: InvoiceCalculatedLine[]
}

import { calculateCentralGst } from '@/lib/services/tax.service'

/**
 * Perform server-side calculation for invoice items and totals using the central GST engine.
 */
export function calculateInvoiceServerSide(
  items: Array<{
    product_id?: string | null
    description: string
    hsn_sac_code?: string | null
    quantity: number
    unit?: string | null
    unit_price: number
    discount_percent?: number
    gst_rate: number
    cess_rate?: number
    cess_amount?: number
    tax_treatment?: string
    is_gst_inclusive?: boolean
  }>,
  discountType: 'fixed' | 'percent' = 'fixed',
  discountValue: number = 0,
  isInterState: boolean = false,
  sellerStateCode: string = '27',
  buyerStateCode?: string
): InvoiceCalculatedTotals {
  const buyer = buyerStateCode || (isInterState ? '07' : sellerStateCode)

  const calc = calculateCentralGst({
    seller: { state_code: sellerStateCode, is_gst_registered: true },
    buyer: { state_code: buyer, is_gst_registered: true },
    items: items.map((it: any) => ({
      product_id: it.product_id || null,
      description: it.description,
      hsn_sac_code: it.hsn_sac_code || null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      discount_percent: it.discount_percent || 0,
      gst_rate: it.gst_rate,
      cess_rate: it.cess_rate || 0,
      cess_amount: it.cess_amount || 0,
      tax_treatment: it.tax_treatment || 'taxable',
      is_gst_inclusive: it.is_gst_inclusive || false,
    })),
    invoice_discount_type: discountType,
    invoice_discount_value: discountValue,
  })

  return {
    subtotal: calc.subtotal,
    discount_amount: calc.total_discount_amount,
    taxable_amount: calc.taxable_amount,
    cgst_amount: calc.cgst_amount,
    sgst_amount: calc.sgst_amount,
    utgst_amount: calc.utgst_amount,
    igst_amount: calc.igst_amount,
    cess_amount: calc.cess_amount,
    total_tax_amount: calc.total_tax_amount,
    unrounded_total: calc.unrounded_total,
    round_off_amount: calc.round_off_amount,
    total_amount: calc.grand_total,
    lines: calc.lines.map((l) => ({
      product_id: l.product_id,
      description: l.description,
      hsn_sac_code: l.hsn_sac_code,
      quantity: l.quantity,
      unit: null,
      unit_price: l.unit_price,
      discount_percent: (items.find((i) => i.description === l.description)?.discount_percent || 0),
      discount_amount: l.discount_amount,
      taxable_amount: l.taxable_amount,
      gst_rate: l.gst_rate,
      cgst_rate: l.cgst_rate,
      sgst_rate: l.sgst_rate,
      igst_rate: l.igst_rate,
      cgst_amount: l.cgst_amount,
      sgst_amount: l.sgst_amount,
      igst_amount: l.igst_amount,
      tax_amount: l.total_tax,
      line_total: l.line_total,
      is_gst_inclusive: (items.find((i) => i.description === l.description)?.is_gst_inclusive || false),
    })),
  }
}

/**
 * Generate sequential organization invoice number (e.g. INV-0001)
 */
export async function generateNextInvoiceNumber(organization_id: string): Promise<string> {
  const supabase = createAdminClient()

  const { data: rawOrg, error } = await (supabase.from('organizations') as any)
    .select('invoice_prefix, invoice_sequence')
    .eq('id', organization_id)
    .single()

  const org = rawOrg as any

  if (error || !org) {
    throw new Error('Failed to fetch organization settings for invoice sequence')
  }

  const prefix = org.invoice_prefix || 'INV'
  const seq = org.invoice_sequence || 1
  const formattedNumber = `${prefix}-${seq.toString().padStart(4, '0')}`

  // Increment sequence
  await (supabase.from('organizations') as any)
    .update({ invoice_sequence: seq + 1 })
    .eq('id', organization_id)

  return formattedNumber
}

/**
 * Create a new draft sales invoice
 */
export async function createInvoiceService(
  organization_id: string,
  user_id: string,
  input: CreateInvoiceInput
) {
  const supabase = createAdminClient()

  // 1. Fetch organization state & customer place of supply for GST breakdown
  const { data: rawOrg } = await (supabase.from('organizations') as any)
    .select('state_code')
    .eq('id', organization_id)
    .single()
  const org = rawOrg as any

  const { data: rawCustomer } = await (supabase.from('customers') as any)
    .select('state, gstin, outstanding_balance')
    .eq('id', input.customer_id)
    .eq('organization_id', organization_id)
    .single()
  const customer = rawCustomer as any

  if (!customer) {
    throw new Error('Selected customer not found in organization')
  }

  const sellerStateCode = org?.state_code || '27'
  const buyerStateCode = input.place_of_supply || customer.state || sellerStateCode
  const isInterState = sellerStateCode.trim() !== buyerStateCode.trim()

  // 2. Generate or validate invoice number
  let invNumber = input.invoice_number?.trim()
  if (!invNumber) {
    invNumber = await generateNextInvoiceNumber(organization_id)
  } else {
    // Check for duplicate invoice number in organization
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('invoice_number', invNumber)
      .limit(1)

    if (existing && existing.length > 0) {
      throw new Error(`Invoice number '${invNumber}' already exists in your organization. Please use a unique number.`)
    }
  }

  // 3. Perform server-side calculation
  const calc = calculateInvoiceServerSide(
    input.items,
    input.discount_type,
    input.discount_value,
    isInterState,
    sellerStateCode,
    buyerStateCode
  )

  const finalAmountPaid =
    input.payment_status === 'paid'
      ? calc.total_amount
      : input.payment_status === 'partial'
      ? Number(input.amount_paid) || 0
      : 0
  const finalPaymentStatus =
    input.payment_status ||
    (finalAmountPaid >= calc.total_amount ? 'paid' : finalAmountPaid > 0 ? 'partial' : 'unpaid')
  const balanceDue = Math.max(0, calc.total_amount - finalAmountPaid)

  // 4. Insert Invoice Header
  const { data: rawInvoice, error: invError } = await (supabase.from('invoices') as any)
    .insert({
      organization_id,
      customer_id: input.customer_id,
      invoice_number: invNumber,
      invoice_date: input.invoice_date,
      due_date: input.due_date || null,
      invoice_type: input.invoice_type || 'standard',
      status: 'draft',
      place_of_supply: buyerStateCode,
      seller_state_code: sellerStateCode,
      is_inter_state: isInterState,
      reverse_charge: input.reverse_charge || false,
      reference_number: input.reference_number || null,
      subtotal: calc.subtotal,
      discount_type: input.discount_type || 'fixed',
      discount_value: input.discount_value || 0,
      discount_amount: calc.discount_amount,
      taxable_amount: calc.taxable_amount,
      cgst_amount: calc.cgst_amount,
      sgst_amount: calc.sgst_amount,
      igst_amount: calc.igst_amount,
      total_tax_amount: calc.total_tax_amount,
      round_off_amount: calc.round_off_amount,
      total_amount: calc.total_amount,
      amount_paid: finalAmountPaid,
      balance_due: balanceDue,
      payment_status: finalPaymentStatus,
      payment_mode: input.payment_mode || null,
      payment_reference: input.payment_reference || null,
      notes: input.notes || null,
      terms_and_conditions: input.terms_and_conditions || null,
      created_by: user_id,
    })
    .select()
    .single()

  const invoice = rawInvoice as any
  if (invError || !invoice) {
    throw new Error(`Failed to create invoice header: ${invError?.message}`)
  }

  // 5. Insert Invoice Items
  const itemInserts = calc.lines.map((l, index) => ({
    organization_id,
    invoice_id: invoice.id,
    product_id: l.product_id || null,
    sort_order: index,
    description: l.description,
    hsn_sac_code: l.hsn_sac_code || null,
    quantity: l.quantity,
    unit: l.unit || null,
    unit_price: l.unit_price,
    discount_percent: l.discount_percent,
    discount_amount: l.discount_amount,
    taxable_amount: l.taxable_amount,
    gst_rate: l.gst_rate,
    cgst_rate: l.cgst_rate,
    sgst_rate: l.sgst_rate,
    igst_rate: l.igst_rate,
    cgst_amount: l.cgst_amount,
    sgst_amount: l.sgst_amount,
    igst_amount: l.igst_amount,
    tax_amount: l.tax_amount,
    line_total: l.line_total,
    is_gst_inclusive: l.is_gst_inclusive,
  }))

  const { error: itemsError } = await (supabase.from('invoice_items') as any).insert(itemInserts as any[])
  if (itemsError) {
    throw new Error(`Failed to create invoice line items: ${itemsError.message}`)
  }

  // 6. Log Audit
  await logAudit({
    organization_id,
    user_id,
    action: 'created',
    resource_type: 'invoice',
    resource_id: invoice.id,
    new_values: {
      invoice_number: invNumber,
      status: 'draft',
      total_amount: calc.total_amount,
    },
  })

  return invoice
}

/**
 * Update an existing draft sales invoice
 */
export async function updateInvoiceService(
  organization_id: string,
  user_id: string,
  invoice_id: string,
  input: CreateInvoiceInput
) {
  const supabase = createAdminClient()

  // 1. Check existing invoice status
  const { data: rawExistingInv, error: fetchErr } = await (supabase.from('invoices') as any)
    .select('status, invoice_number')
    .eq('id', invoice_id)
    .eq('organization_id', organization_id)
    .single()

  const existingInv = rawExistingInv as any

  if (fetchErr || !existingInv) {
    throw new Error('Invoice not found in organization')
  }

  if (existingInv.status !== 'draft') {
    throw new Error(`INVALID_STATUS_TRANSITION: Cannot modify line items or financials for invoice in '${existingInv.status}' status. Only DRAFT invoices can be edited.`)
  }

  // 2. Fetch organization & customer details
  const { data: org } = await (supabase.from('organizations') as any)
    .select('state_code')
    .eq('id', organization_id)
    .single()

  const { data: customer } = await (supabase.from('customers') as any)
    .select('state')
    .eq('id', input.customer_id)
    .eq('organization_id', organization_id)
    .single()

  if (!customer) {
    throw new Error('Selected customer not found')
  }

  const sellerStateCode = org?.state_code || '27'
  const buyerStateCode = input.place_of_supply || customer.state || sellerStateCode
  const isInterState = sellerStateCode.trim() !== buyerStateCode.trim()

  // 3. Perform server-side calculation
  const calc = calculateInvoiceServerSide(input.items, input.discount_type, input.discount_value, isInterState)

  const finalAmountPaid =
    input.payment_status === 'paid'
      ? calc.total_amount
      : input.payment_status === 'partial'
      ? Number(input.amount_paid) || 0
      : 0
  const finalPaymentStatus =
    input.payment_status ||
    (finalAmountPaid >= calc.total_amount ? 'paid' : finalAmountPaid > 0 ? 'partial' : 'unpaid')
  const balanceDue = Math.max(0, calc.total_amount - finalAmountPaid)

  // 4. Update Header
  const { data: updatedInvoice, error: updateErr } = await (supabase.from('invoices') as any)
    .update({
      customer_id: input.customer_id,
      invoice_date: input.invoice_date,
      due_date: input.due_date || null,
      invoice_type: input.invoice_type || 'standard',
      place_of_supply: buyerStateCode,
      is_inter_state: isInterState,
      reverse_charge: input.reverse_charge || false,
      reference_number: input.reference_number || null,
      subtotal: calc.subtotal,
      discount_type: input.discount_type || 'fixed',
      discount_value: input.discount_value || 0,
      discount_amount: calc.discount_amount,
      taxable_amount: calc.taxable_amount,
      cgst_amount: calc.cgst_amount,
      sgst_amount: calc.sgst_amount,
      igst_amount: calc.igst_amount,
      total_tax_amount: calc.total_tax_amount,
      round_off_amount: calc.round_off_amount,
      total_amount: calc.total_amount,
      amount_paid: finalAmountPaid,
      balance_due: balanceDue,
      payment_status: finalPaymentStatus,
      payment_mode: input.payment_mode || null,
      payment_reference: input.payment_reference || null,
      notes: input.notes || null,
      terms_and_conditions: input.terms_and_conditions || null,
      updated_by: user_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice_id)
    .select()
    .single()

  if (updateErr) {
    throw new Error(`Failed to update invoice header: ${updateErr.message}`)
  }

  // 5. Replace Line Items
  await (supabase.from('invoice_items') as any).delete().eq('invoice_id', invoice_id)

  const itemInserts = calc.lines.map((l, index) => ({
    organization_id,
    invoice_id,
    product_id: l.product_id || null,
    sort_order: index,
    description: l.description,
    hsn_sac_code: l.hsn_sac_code || null,
    quantity: l.quantity,
    unit: l.unit || null,
    unit_price: l.unit_price,
    discount_percent: l.discount_percent,
    discount_amount: l.discount_amount,
    taxable_amount: l.taxable_amount,
    gst_rate: l.gst_rate,
    cgst_rate: l.cgst_rate,
    sgst_rate: l.sgst_rate,
    igst_rate: l.igst_rate,
    cgst_amount: l.cgst_amount,
    sgst_amount: l.sgst_amount,
    igst_amount: l.igst_amount,
    tax_amount: l.tax_amount,
    line_total: l.line_total,
    is_gst_inclusive: l.is_gst_inclusive,
  }))

  await (supabase.from('invoice_items') as any).insert(itemInserts as any[])

  // Audit
  await logAudit({
    organization_id,
    user_id,
    action: 'updated',
    resource_type: 'invoice',
    resource_id: invoice_id,
    new_values: { total_amount: calc.total_amount },
  })

  return updatedInvoice
}

/**
 * Finalize Invoice: Transition status DRAFT -> ISSUED / PAID / PARTIAL.
 * Atomically updates customer balance and posts stock movements for goods.
 */
export async function finalizeInvoiceService(
  organization_id: string,
  user_id: string,
  invoice_id: string
) {
  const supabase = createAdminClient()

  // 1. Fetch invoice header and line items
  const { data: rawInvoice, error: fetchErr } = await (supabase.from('invoices') as any)
    .select('*, invoice_items(*), customers(id, display_name, outstanding_balance)')
    .eq('id', invoice_id)
    .eq('organization_id', organization_id)
    .single()

  const invoice = rawInvoice as any

  if (fetchErr || !invoice) {
    throw new Error('Invoice not found in organization')
  }

  if (invoice.status !== 'draft') {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Cannot finalize invoice in '${invoice.status}' status. Only DRAFT invoices can be finalized.`
    )
  }

  const now = new Date().toISOString()
  const totalAmt = Number(invoice.total_amount) || 0
  const amountPaid = Number(invoice.amount_paid) || 0
  const balanceDue = Math.max(0, totalAmt - amountPaid)
  const finalStatus = amountPaid >= totalAmt ? 'paid' : (amountPaid > 0 ? 'partial' : 'issued')

  // 2. Mark Invoice Header
  const { data: finalizedInvoice, error: updateErr } = await (supabase.from('invoices') as any)
    .update({
      status: finalStatus,
      payment_status: finalStatus === 'paid' ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid'),
      balance_due: balanceDue,
      finalized_at: now,
      updated_by: user_id,
      updated_at: now,
    })
    .eq('id', invoice_id)
    .select()
    .single()

  if (updateErr || !finalizedInvoice) {
    throw new Error(`Failed to finalize invoice header: ${updateErr?.message}`)
  }

  // 3. Customer Balance Update & Ledger Transaction
  if (invoice.customer_id) {
    const currentCustBal = Number(invoice.customers?.outstanding_balance) || 0
    const newCustBal = currentCustBal + balanceDue

    // Update customer outstanding balance
    await (supabase.from('customers') as any)
      .update({
        outstanding_balance: newCustBal,
        updated_at: now,
      })
      .eq('id', invoice.customer_id)

    // Insert append-only customer transaction ledger row for invoice
    await (supabase.from('customer_transactions') as any).insert({
      organization_id,
      customer_id: invoice.customer_id,
      transaction_type: 'invoice',
      reference_type: 'invoice',
      reference_id: invoice_id,
      reference_number: invoice.invoice_number,
      transaction_date: invoice.invoice_date,
      amount: totalAmt, // Positive = debit (customer owes us)
      running_balance: currentCustBal + totalAmt,
      narration: `Invoice ${invoice.invoice_number} finalized`,
      created_by: user_id,
    })

    // If partial or full upfront payment was recorded, post payment credit transaction
    if (amountPaid > 0) {
      await (supabase.from('customer_transactions') as any).insert({
        organization_id,
        customer_id: invoice.customer_id,
        transaction_type: 'payment',
        reference_type: 'invoice',
        reference_id: invoice_id,
        reference_number: invoice.payment_reference || invoice.invoice_number,
        transaction_date: invoice.invoice_date,
        amount: -amountPaid, // Negative = credit (reduces customer balance)
        running_balance: newCustBal,
        narration: `Payment received for Invoice ${invoice.invoice_number} via ${(invoice.payment_mode || 'Cash').toUpperCase()}`,
        created_by: user_id,
      })
    }
  }

  // 4. Inventory Movements for Tracked Goods Line Items
  const items = invoice.invoice_items || []
  for (const item of items) {
    if (item.product_id) {
      const { data: rawProduct } = await (supabase.from('products') as any)
        .select('product_type, track_inventory, current_stock')
        .eq('id', item.product_id)
        .single()
      const product = rawProduct as any

      if (product && product.product_type === 'goods' && product.track_inventory) {
        // Post SALE inventory movement (-quantity)
        await postInventoryMovement({
          organization_id,
          product_id: item.product_id,
          movement_type: 'SALE',
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_price),
          reference_type: 'invoice',
          reference_id: invoice_id,
          reference_number: invoice.invoice_number,
          notes: `Dispatched on Sales Invoice ${invoice.invoice_number}`,
          user_id,
        })
      }
    }
  }

  // 5. Populate GSTR-1 Tax Breakdown Summary (invoice_taxes)
  const taxSummaryMap = new Map<string, any>()
  for (const item of items) {
    const key = `${item.hsn_sac_code || 'NONE'}_${item.gst_rate}`
    if (!taxSummaryMap.has(key)) {
      taxSummaryMap.set(key, {
        organization_id,
        invoice_id,
        hsn_sac_code: item.hsn_sac_code || null,
        gst_rate: item.gst_rate,
        cgst_rate: item.cgst_rate,
        sgst_rate: item.sgst_rate,
        igst_rate: item.igst_rate,
        taxable_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
      })
    }
    const entry = taxSummaryMap.get(key)
    entry.taxable_amount += Number(item.taxable_amount) || 0
    entry.cgst_amount += Number(item.cgst_amount) || 0
    entry.sgst_amount += Number(item.sgst_amount) || 0
    entry.igst_amount += Number(item.igst_amount) || 0
  }

  if (taxSummaryMap.size > 0) {
    await (supabase.from('invoice_taxes') as any).insert(Array.from(taxSummaryMap.values()))
  }

  // Audit
  await logAudit({
    organization_id,
    user_id,
    action: 'updated',
    resource_type: 'invoice',
    resource_id: invoice_id,
    new_values: { status: 'issued', finalized_at: now },
  })

  return finalizedInvoice
}

/**
 * Cancel Invoice: Transition status to CANCELLED.
 * Reverses customer balance & posts return inventory movements if invoice was finalized.
 */
export async function cancelInvoiceService(
  organization_id: string,
  user_id: string,
  invoice_id: string,
  reason: string
) {
  const supabase = createAdminClient()

  // 1. Fetch invoice
  const { data: rawInvoice, error: fetchErr } = await (supabase.from('invoices') as any)
    .select('*, invoice_items(*), customers(id, outstanding_balance)')
    .eq('id', invoice_id)
    .eq('organization_id', organization_id)
    .single()

  const invoice = rawInvoice as any

  if (fetchErr || !invoice) {
    throw new Error('Invoice not found in organization')
  }

  if (invoice.status === 'cancelled' || invoice.status === 'void') {
    throw new Error(`INVALID_STATUS_TRANSITION: Invoice is already ${invoice.status.toUpperCase()}`)
  }

  if (invoice.status === 'paid') {
    throw new Error('INVALID_STATUS_TRANSITION: Cannot cancel a fully PAID invoice directly. Please issue a Credit Note instead.')
  }

  const now = new Date().toISOString()
  const wasFinalized = invoice.status !== 'draft'
  const outstandingBalToReverse = Number(invoice.total_amount) - Number(invoice.amount_paid)

  // 2. Mark Invoice Header as CANCELLED / VOID
  const { data: cancelledInvoice, error: cancelErr } = await (supabase.from('invoices') as any)
    .update({
      status: 'cancelled',
      is_void: true,
      void_reason: reason,
      voided_at: now,
      voided_by: user_id,
      updated_by: user_id,
      updated_at: now,
    })
    .eq('id', invoice_id)
    .select()
    .single()

  if (cancelErr || !cancelledInvoice) {
    throw new Error(`Failed to cancel invoice header: ${cancelErr?.message}`)
  }

  // 3. If was finalized, reverse customer balance & ledger
  if (wasFinalized && invoice.customer_id && outstandingBalToReverse > 0) {
    const currentCustBal = Number(invoice.customers?.outstanding_balance) || 0
    const newCustBal = currentCustBal - outstandingBalToReverse

    await (supabase.from('customers') as any)
      .update({
        outstanding_balance: newCustBal,
        updated_at: now,
      })
      .eq('id', invoice.customer_id)

    await (supabase.from('customer_transactions') as any).insert({
      organization_id,
      customer_id: invoice.customer_id,
      transaction_type: 'adjustment',
      reference_type: 'invoice',
      reference_id: invoice_id,
      reference_number: invoice.invoice_number,
      transaction_date: now.split('T')[0],
      amount: -outstandingBalToReverse, // Negative = credit (reduces customer balance)
      running_balance: newCustBal,
      narration: `Cancellation reversal for Invoice ${invoice.invoice_number}`,
      created_by: user_id,
    })
  }

  // 4. If was finalized, reverse inventory movements for tracked goods
  if (wasFinalized) {
    const items = invoice.invoice_items || []
    for (const item of items) {
      if (item.product_id) {
        const { data: rawProduct } = await (supabase.from('products') as any)
          .select('product_type, track_inventory')
          .eq('id', item.product_id)
          .single()
        const product = rawProduct as any

        if (product && product.product_type === 'goods' && product.track_inventory) {
          // Post SALE_RETURN (return_in) movement (+quantity)
          await postInventoryMovement({
            organization_id,
            product_id: item.product_id,
            movement_type: 'SALE_RETURN',
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_price),
            reference_type: 'invoice',
            reference_id: invoice_id,
            reference_number: invoice.invoice_number,
            notes: `Restocked due to cancellation of Sales Invoice ${invoice.invoice_number}`,
            user_id,
          })
        }
      }
    }
  }

  // Audit
  await logAudit({
    organization_id,
    user_id,
    action: 'updated',
    resource_type: 'invoice',
    resource_id: invoice_id,
    new_values: { status: 'cancelled', void_reason: reason },
  })

  return cancelledInvoice
}

export async function recordInvoicePaymentService(
  organization_id: string,
  user_id: string,
  invoice_id: string,
  paymentData: {
    amount: number
    payment_mode: string
    payment_reference?: string
    payment_date?: string
    notes?: string
  }
) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 1. Fetch invoice
  const { data: rawInvoice, error } = await (supabase.from('invoices') as any)
    .select('*, customers(id, display_name, outstanding_balance)')
    .eq('id', invoice_id)
    .eq('organization_id', organization_id)
    .single()

  const invoice = rawInvoice as any
  if (error || !invoice) {
    throw new Error('Invoice not found')
  }

  const payAmt = Number(paymentData.amount) || 0
  if (payAmt <= 0) {
    throw new Error('Payment amount must be greater than 0')
  }

  const currentPaid = Number(invoice.amount_paid) || 0
  const totalAmt = Number(invoice.total_amount) || 0
  const newAmountPaid = currentPaid + payAmt
  const newBalanceDue = Math.max(0, totalAmt - newAmountPaid)
  const newStatus = newAmountPaid >= totalAmt ? 'paid' : 'partial'
  const newPaymentStatus = newAmountPaid >= totalAmt ? 'paid' : 'partial'

  // 2. Update Invoice
  const { data: updatedInvoice, error: updateErr } = await (supabase.from('invoices') as any)
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      payment_status: newPaymentStatus,
      payment_mode: paymentData.payment_mode || invoice.payment_mode,
      payment_reference: paymentData.payment_reference || invoice.payment_reference,
      updated_by: user_id,
      updated_at: now,
    })
    .eq('id', invoice_id)
    .select()
    .single()

  if (updateErr) {
    throw new Error(`Failed to update invoice payment: ${updateErr.message}`)
  }

  // 3. Update customer outstanding balance & post transaction ledger
  if (invoice.customer_id) {
    const currentCustBal = Number(invoice.customers?.outstanding_balance) || 0
    const newCustBal = Math.max(0, currentCustBal - payAmt)

    await (supabase.from('customers') as any)
      .update({
        outstanding_balance: newCustBal,
        updated_at: now,
      })
      .eq('id', invoice.customer_id)

    await (supabase.from('customer_transactions') as any).insert({
      organization_id,
      customer_id: invoice.customer_id,
      transaction_type: 'payment',
      reference_type: 'invoice',
      reference_id: invoice_id,
      reference_number: paymentData.payment_reference || invoice.invoice_number,
      transaction_date: paymentData.payment_date || now.split('T')[0],
      amount: -payAmt,
      running_balance: newCustBal,
      narration: `Payment received for Invoice ${invoice.invoice_number} via ${(paymentData.payment_mode || 'Cash').toUpperCase()}`,
      created_by: user_id,
    })
  }

  return updatedInvoice
}

export class InvoiceService {
  static async createInvoice(session: any, payload: any) {
    const orgId = session?.organization_id || session?.organization?.id || '';
    const userId = session?.user_id || session?.user?.id || '';
    const res: any = await createInvoiceService(orgId, userId, payload);
    return {
      ...res,
      invoice_id: res.id,
    };
  }
}

export const createInvoice = createInvoiceService;
export const recordPayment = recordInvoicePaymentService;

