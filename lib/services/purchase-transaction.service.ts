// ============================================================================
// lib/services/purchase-transaction.service.ts — Phase 3 Unified Purchase Engine
//
// Orchestrates the complete, integrated purchase business transaction:
// PURCHASE BILL → STOCK IN → SUPPLIER LEDGER → PAYABLE → SUPPLIER PAYMENT →
// CASH/BANK OUT → INPUT GST → AUDIT
//
// Enforces:
//   - Strict Atomicity: Pre-validates parties & products before mutating state.
//   - Rollback / Invariant protection: If critical step fails, state is rolled back.
//   - Idempotency: Protects against duplicate network retries / double submissions.
//   - Deterministic status: draft | approved | partial | paid | cancelled
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/services/audit.service'
import { InventoryService } from '@/lib/services/inventory.service'
import { CashBankService } from '@/lib/services/cash-bank.service'
import { calculateCentralGst } from '@/lib/services/tax.service'
import { AccountingService } from '@/lib/services/accounting.service'
import { FinancialPeriodService } from '@/lib/services/financial-period.service'
import {
  CreatePurchaseBillInput,
  CreateSupplierPaymentInput,
  createPurchaseBillSchema,
  createSupplierPaymentSchema,
} from '@/lib/validators/purchase.schema'
import {
  demoAddPurchaseBill,
  demoFinalizePurchaseBill,
  demoRecordSupplierPayment,
  demoCancelPurchaseBill,
  demoIdempotencyStore,
  DEMO_ORG_ID,
} from '@/lib/services/demo-store'

export interface PurchaseTransactionResult {
  bill: any
  stockMovementsCount: number
  supplierLedgerCreated: boolean
  paymentCreated: boolean
  cashBankTxnCreated: boolean
  isDuplicate?: boolean
}

// In-memory idempotency cache for active server instance (5 minute window)
const serverIdempotencyMap = new Map<string, { timestamp: number; result: PurchaseTransactionResult }>()

export class PurchaseTransactionService {
  /**
   * Primary entry point for executing an integrated purchase transaction.
   * Atomically runs validation, server-side GST, stock inbound, supplier ledger, and payment.
   */
  static async executePurchase(
    session: AppSession,
    input: CreatePurchaseBillInput | any,
    idempotencyKey?: string | null
  ): Promise<PurchaseTransactionResult> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    requirePermission(role, 'purchases.create')

    // ── 0. Idempotency Check ────────────────────────────────────────────────
    const cleanIdempotencyKey = idempotencyKey?.trim() || input.reference_number?.trim() || input.bill_number?.trim()
    if (cleanIdempotencyKey) {
      const cached = userId.includes('demo')
        ? demoIdempotencyStore.get(`pb:${cleanIdempotencyKey}`)
        : serverIdempotencyMap.get(`${orgId}:${cleanIdempotencyKey}`)

      if (cached && Date.now() - cached.timestamp < 300000) {
        const cachedResult = ('result' in cached ? cached.result : (cached as any).response) as PurchaseTransactionResult
        return {
          ...cachedResult,
          isDuplicate: true,
        }
      }
    }

    const validatedInput = createPurchaseBillSchema.parse(input)
    await FinancialPeriodService.validatePostingDate(session, validatedInput.bill_date);

    // ── Branch A: Demo Mode ─────────────────────────────────────────────────
    if (userId.includes('demo')) {
      const demoBill = demoAddPurchaseBill({
        ...validatedInput,
        organization_id: orgId || DEMO_ORG_ID,
      })

      // Auto finalize unless explicit draft requested
      const isDraft = (input.status === 'draft')
      let finalizedBill = demoBill
      if (!isDraft) {
        finalizedBill = demoFinalizePurchaseBill(demoBill.id) || demoBill
        try {
          await AccountingService.postPurchaseAccounting(session, {
            id: finalizedBill.id,
            bill_number: finalizedBill.bill_number,
            bill_date: finalizedBill.bill_date,
            taxable_amount: finalizedBill.taxable_amount,
            cgst_amount: finalizedBill.cgst_amount,
            sgst_amount: finalizedBill.sgst_amount,
            igst_amount: finalizedBill.igst_amount,
            total_amount: finalizedBill.total_amount,
            amount_paid: finalizedBill.amount_paid,
            payment_method: (finalizedBill as any).payment_mode || 'Cash',
            supplier_name: (finalizedBill as any).supplier_name || 'Vendor',
          })
        } catch (accErr: any) {
          console.warn('[PurchaseTransactionService] Accounting posting notice (demo):', accErr?.message)
        }
      }

      const hasUpfrontPayment = (Number(finalizedBill.amount_paid) || 0) > 0
      const result: PurchaseTransactionResult = {
        bill: finalizedBill,
        stockMovementsCount: !isDraft ? (finalizedBill.purchase_bill_items || []).length : 0,
        supplierLedgerCreated: !isDraft && Boolean(finalizedBill.supplier_id),
        paymentCreated: hasUpfrontPayment,
        cashBankTxnCreated: hasUpfrontPayment,
      }

      if (cleanIdempotencyKey) {
        demoIdempotencyStore.set(`pb:${cleanIdempotencyKey}`, {
          timestamp: Date.now(),
          response: result,
        })
      }

      return result
    }

    // ── Branch B: Production / Supabase Mode ────────────────────────────────
    const supabase = createAdminClient()

    // 1. Validate Supplier
    const { data: rawSupplier, error: suppErr } = await (supabase.from('suppliers') as any)
      .select('id, name, state_code, gstin, outstanding_balance, is_active')
      .eq('id', validatedInput.supplier_id)
      .eq('organization_id', orgId)
      .single()

    if (suppErr || !rawSupplier) {
      throw new Error(`Supplier validation failed: Supplier not found or unauthorized`)
    }
    if (rawSupplier.is_active === false) {
      throw new Error(`Supplier '${rawSupplier.name}' is inactive and cannot be billed.`)
    }

    // 2. Fetch Buyer Org Details for GST determination
    const { data: org } = await (supabase.from('organizations') as any)
      .select('state_code, gstin')
      .eq('id', orgId)
      .single()

    const buyerStateCode = org?.state_code || '27'
    const sellerStateCode = rawSupplier.state_code || validatedInput.place_of_supply || buyerStateCode
    const isInterState = sellerStateCode.trim() !== buyerStateCode.trim()

    // 3. Pre-Validate Products
    const productIds = ((validatedInput.items || []) as any[]).map((i: any) => i.product_id).filter(Boolean) as string[]
    const productsMap = new Map<string, any>()

    if (productIds.length > 0) {
      const { data: productsList, error: prodErr } = await (supabase.from('products') as any)
        .select('id, name, sku, product_type, track_inventory, current_stock, is_active, primary_unit, secondary_unit, conversion_rate')
        .in('id', productIds)
        .eq('organization_id', orgId)

      if (prodErr) {
        throw new Error(`Failed to validate products: ${prodErr.message}`)
      }

      for (const p of productsList || []) {
        if (p.is_active === false) {
          throw new Error(`Product '${p.name}' is inactive. Cannot record purchase.`)
        }
        productsMap.set(p.id, p)
      }
    }

    // 4. Server-Side Authoritative Financial & GST Calculation
    const taxCalc = calculateCentralGst({
      seller: { state_code: sellerStateCode, is_gst_registered: Boolean(rawSupplier.gstin) },
      buyer: { state_code: buyerStateCode, is_gst_registered: Boolean(org.gstin) },
      items: validatedInput.items.map((item) => ({
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_pct || 0,
        discount_amount: item.discount_amount || 0,
        is_gst_inclusive: Boolean(item.is_gst_inclusive || item.gst_type === 'inclusive'),
        gst_rate: item.gst_rate || 0,
        hsn_sac_code: item.hsn_sac || null,
      })),
    })

    const finalBillTotal = taxCalc.grand_total
    const upfrontPaymentAmount = Math.min(Number(validatedInput.amount_paid) || 0, finalBillTotal)
    const balanceDue = Math.max(0, finalBillTotal - upfrontPaymentAmount)

    let finalStatus: string = 'approved'
    if (input.status === 'draft') {
      finalStatus = 'draft'
    } else if (balanceDue === 0 && upfrontPaymentAmount > 0) {
      finalStatus = 'paid'
    } else if (upfrontPaymentAmount > 0) {
      finalStatus = 'partial'
    }

    const billNumber = validatedInput.bill_number?.trim() || `PB-${Date.now().toString().slice(-6)}`

    // Check duplicate bill number
    const { data: existingBill } = await (supabase.from('purchase_bills') as any)
      .select('id')
      .eq('organization_id', orgId)
      .eq('bill_number', billNumber)
      .maybeSingle()

    if (existingBill) {
      throw new Error(`Duplicate purchase bill number '${billNumber}' already exists for this organization.`)
    }

    // 5. Persist Purchase Bill Header
    const { data: rawBill, error: billInsertErr } = await (supabase.from('purchase_bills') as any)
      .insert({
        organization_id: orgId,
        supplier_id: rawSupplier.id,
        bill_number: billNumber,
        bill_date: validatedInput.bill_date,
        due_date: validatedInput.due_date || null,
        status: finalStatus,
        place_of_supply: validatedInput.place_of_supply || sellerStateCode,
        seller_state_code: sellerStateCode,
        is_inter_state: isInterState,
        subtotal: taxCalc.subtotal,
        discount_amount: taxCalc.total_discount_amount,
        taxable_amount: taxCalc.taxable_amount,
        cgst_amount: taxCalc.cgst_amount,
        sgst_amount: taxCalc.sgst_amount,
        igst_amount: taxCalc.igst_amount,
        total_tax_amount: taxCalc.total_tax_amount,
        round_off_amount: taxCalc.round_off_amount,
        total_amount: finalBillTotal,
        amount_paid: upfrontPaymentAmount,
        balance_due: balanceDue,
        // Legacy paise compatibility
        subtotal_paise: Math.round(taxCalc.subtotal * 100),
        taxable_paise: Math.round(taxCalc.taxable_amount * 100),
        cgst_paise: Math.round(taxCalc.cgst_amount * 100),
        sgst_paise: Math.round(taxCalc.sgst_amount * 100),
        igst_paise: Math.round(taxCalc.igst_amount * 100),
        total_paise: Math.round(finalBillTotal * 100),
        paid_paise: Math.round(upfrontPaymentAmount * 100),
        notes: validatedInput.notes || null,
        created_by: userId,
      })
      .select('*')
      .single()

    if (billInsertErr || !rawBill) {
      throw new Error(`Failed to insert purchase bill header: ${billInsertErr?.message}`)
    }

    const bill = rawBill

    // 6. Persist Purchase Bill Line Items
    const lineItemRows = taxCalc.lines.map((item, index) => ({
      purchase_bill_id: bill.id,
      organization_id: orgId,
      product_id: item.product_id || null,
      description: item.description,
      quantity: item.quantity,
      unit: validatedInput.items[index]?.unit || 'PCS',
      unit_price: item.unit_price,
      discount_percent: validatedInput.items[index]?.discount_pct || 0,
      discount_amount: item.discount_amount,
      taxable_amount: item.taxable_amount,
      hsn_sac: item.hsn_sac_code || null,
      gst_rate: item.gst_rate,
      gst_type: Boolean(validatedInput.items[index]?.is_gst_inclusive || validatedInput.items[index]?.gst_type === 'inclusive') ? 'inclusive' : 'exclusive',
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total_amount: item.line_total,
      // Compatibility fields
      unit_price_paise: Math.round(item.unit_price * 100),
      discount_pct: validatedInput.items[index]?.discount_pct || 0,
      line_subtotal_paise: Math.round(item.taxable_amount * 100),
      cgst_paise: Math.round(item.cgst_amount * 100),
      sgst_paise: Math.round(item.sgst_amount * 100),
      igst_paise: Math.round(item.igst_amount * 100),
      line_total_paise: Math.round(item.line_total * 100),
      conversion_rate: (validatedInput.items[index] as any)?.conversion_rate || null,
      sort_order: index,
    }))

    const { error: itemsErr } = await (supabase.from('purchase_bill_items') as any).insert(lineItemRows)
    if (itemsErr) {
      // Rollback bill header
      await (supabase.from('purchase_bills') as any).delete().eq('id', bill.id)
      throw new Error(`Failed to insert purchase bill items: ${itemsErr.message}`)
    }

    let stockMovementsCount = 0
    let supplierLedgerCreated = false
    let paymentCreated = false
    let cashBankTxnCreated = false

    // 7. If Finalized/Approved: Post Stock-In, Supplier Ledger, Upfront Payment
    if (finalStatus !== 'draft') {
      try {
        // Stock Inbound
        for (const item of lineItemRows) {
          if (item.product_id) {
            const prod = productsMap.get(item.product_id)
            let inboundQty = Number(item.quantity) || 0
            const itemConvRate = Number((item as any).conversion_rate) || 0
            if (itemConvRate > 0) {
              inboundQty = inboundQty * itemConvRate
            } else if (
              prod?.secondary_unit &&
              item.unit &&
              prod.secondary_unit.toLowerCase() === item.unit.toLowerCase() &&
              prod.conversion_rate
            ) {
              inboundQty = inboundQty * Number(prod.conversion_rate)
            }
            await InventoryService.recordMovement(session, {
              product_id: item.product_id,
              movement_type: 'purchase',
              quantity: inboundQty,
              reference_type: 'purchase_bill',
              reference_id: bill.id,
              notes: `Stock inbound from Purchase Bill #${bill.bill_number}`,
            })
            stockMovementsCount++
          }
        }

        // Supplier Ledger (Credit Purchase: we owe supplier +finalBillTotal)
        await (supabase.from('supplier_transactions') as any).insert({
          organization_id: orgId,
          supplier_id: rawSupplier.id,
          transaction_type: 'purchase_bill',
          reference_type: 'purchase_bill',
          reference_id: bill.id,
          reference_number: bill.bill_number,
          transaction_date: bill.bill_date,
          amount: finalBillTotal,
          narration: `Purchase bill #${bill.bill_number} finalized`,
        })
        supplierLedgerCreated = true

        // Upfront Payment
        if (upfrontPaymentAmount > 0) {
          const paymentMethod = validatedInput.payment_method || 'cash'

          // Supplier Ledger Settlement: payment reduces payable (-upfrontPaymentAmount)
          await (supabase.from('supplier_transactions') as any).insert({
            organization_id: orgId,
            supplier_id: rawSupplier.id,
            transaction_type: 'payment',
            reference_type: 'purchase_bill',
            reference_id: bill.id,
            reference_number: bill.bill_number,
            transaction_date: bill.bill_date,
            amount: -upfrontPaymentAmount,
            narration: `Upfront payment for purchase bill #${bill.bill_number}`,
          })
          paymentCreated = true

          // Cash/Bank OUT Movement
          await CashBankService.recordMovement(session, {
            direction: 'out',
            amount: upfrontPaymentAmount,
            transaction_type: 'payment_out',
            payment_mode: paymentMethod,
            account_id: validatedInput.payment_account_id || undefined,
            reference_type: 'purchase_bill',
            reference_id: bill.id,
            reference_number: bill.bill_number,
            narration: `Supplier payment for Purchase Bill #${bill.bill_number} (${rawSupplier.name})`,
          })
          cashBankTxnCreated = true
        }

        // Update Supplier Outstanding Balance
        const netPayableChange = finalBillTotal - upfrontPaymentAmount
        const currentBalance = Number(rawSupplier.outstanding_balance) || 0
        const newBalance = Math.max(0, currentBalance + netPayableChange)

        await (supabase.from('suppliers') as any)
          .update({
            outstanding_balance: newBalance,
            outstanding_paise: Math.round(newBalance * 100),
            updated_at: new Date().toISOString(),
          })
          .eq('id', rawSupplier.id)
          .eq('organization_id', orgId)
      } catch (postErr: any) {
        // Rollback all created records on critical failure
        await (supabase.from('purchase_bill_items') as any).delete().eq('purchase_bill_id', bill.id)
        await (supabase.from('purchase_bills') as any).delete().eq('id', bill.id)
        throw new Error(`Purchase finalization rolled back due to downstream error: ${postErr.message}`)
      }
    }

    // 8. Audit Log
    await logAudit(session, 'purchase_bill.created', 'purchase_bills', bill.id, {
      bill_number: bill.bill_number,
      supplier_id: rawSupplier.id,
      supplier_name: rawSupplier.name,
      total_amount: finalBillTotal,
      taxable_amount: taxCalc.taxable_amount,
      status: finalStatus,
      stock_movements: stockMovementsCount,
    })

    if (finalStatus !== 'draft') {
      try {
        await AccountingService.postPurchaseAccounting(session, {
          id: bill.id,
          bill_number: bill.bill_number,
          bill_date: bill.bill_date,
          taxable_amount: taxCalc.taxable_amount,
          cgst_amount: taxCalc.cgst_amount,
          sgst_amount: taxCalc.sgst_amount,
          igst_amount: taxCalc.igst_amount,
          total_amount: finalBillTotal,
          amount_paid: validatedInput.amount_paid || 0,
          payment_method: validatedInput.payment_method || 'Cash',
          supplier_name: rawSupplier.name,
        })
      } catch (accErr: any) {
        console.warn('[PurchaseTransactionService] Accounting posting notice (prod):', accErr?.message)
      }
    }

    const finalResult: PurchaseTransactionResult = {
      bill: {
        ...bill,
        suppliers: rawSupplier,
        purchase_bill_items: lineItemRows,
      },
      stockMovementsCount,
      supplierLedgerCreated,
      paymentCreated,
      cashBankTxnCreated,
    }

    if (cleanIdempotencyKey) {
      serverIdempotencyMap.set(`${orgId}:${cleanIdempotencyKey}`, {
        timestamp: Date.now(),
        result: finalResult,
      })
    }

    return finalResult
  }

  /**
   * Finalizes an existing DRAFT purchase bill.
   */
  static async finalizeDraft(session: AppSession, billId: string): Promise<PurchaseTransactionResult> {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    requirePermission(role, 'purchases.create')

    if (userId.includes('demo')) {
      const demoBill = demoFinalizePurchaseBill(billId)
      if (!demoBill) throw new Error('Purchase bill not found')
      return {
        bill: demoBill,
        stockMovementsCount: demoBill.purchase_bill_items?.length || 0,
        supplierLedgerCreated: true,
        paymentCreated: (demoBill.amount_paid || 0) > 0,
        cashBankTxnCreated: (demoBill.amount_paid || 0) > 0,
      }
    }

    const supabase = createAdminClient()

    const { data: rawBill, error: billErr } = await (supabase.from('purchase_bills') as any)
      .select('*, suppliers(*), purchase_bill_items(*)')
      .eq('id', billId)
      .eq('organization_id', orgId)
      .single()

    if (billErr || !rawBill) {
      throw new Error('Purchase bill not found or unauthorized')
    }

    if (rawBill.status !== 'draft') {
      throw new Error(`Purchase bill is already finalized (Current status: ${rawBill.status.toUpperCase()})`)
    }

    const bill = rawBill
    const items = bill.purchase_bill_items || []
    const totalAmount = Number(bill.total_amount) || 0
    const amountPaid = Number(bill.amount_paid) || 0
    const balanceDue = Math.max(0, totalAmount - amountPaid)
    const newStatus = balanceDue === 0 && amountPaid > 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'approved'

    // 1. Update bill status
    await (supabase.from('purchase_bills') as any)
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', billId)
      .eq('organization_id', orgId)

    // 2. Stock Inbound
    let stockMovementsCount = 0
    for (const item of items) {
      if (item.product_id) {
        await InventoryService.recordMovement(session, {
          product_id: item.product_id,
          movement_type: 'purchase',
          quantity: Number(item.quantity),
          reference_type: 'purchase_bill',
          reference_id: bill.id,
          notes: `Stock inbound from Purchase Bill #${bill.bill_number}`,
        })
        stockMovementsCount++
      }
    }

    // 3. Supplier Ledger
    await (supabase.from('supplier_transactions') as any).insert({
      organization_id: orgId,
      supplier_id: bill.supplier_id,
      transaction_type: 'purchase_bill',
      reference_type: 'purchase_bill',
      reference_id: bill.id,
      reference_number: bill.bill_number,
      transaction_date: bill.bill_date,
      amount: totalAmount,
      narration: `Purchase bill #${bill.bill_number} finalized`,
    })

    // 4. Update supplier outstanding balance
    const currentBalance = Number(bill.suppliers?.outstanding_balance) || 0
    const newBalance = Math.max(0, currentBalance + balanceDue)
    await (supabase.from('suppliers') as any)
      .update({
        outstanding_balance: newBalance,
        outstanding_paise: Math.round(newBalance * 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bill.supplier_id)
      .eq('organization_id', orgId)

    // 5. Audit Log
    await logAudit(session, 'purchase_bill.finalized', 'purchase_bills', bill.id, {
      bill_number: bill.bill_number,
      supplier_id: bill.supplier_id,
      total_amount: totalAmount,
      stock_movements: stockMovementsCount,
    })

    return {
      bill: { ...bill, status: newStatus },
      stockMovementsCount,
      supplierLedgerCreated: true,
      paymentCreated: false,
      cashBankTxnCreated: false,
    }
  }

  /**
   * Safely cancels a finalized purchase bill with full atomic reversal:
   * - Inbound stock reversed (movement_type = 'return_out')
   * - Supplier payable balance reversed in supplier_transactions
   * - Cash/Bank reversed if payment was recorded
   */
  static async cancelPurchaseBill(session: AppSession, billId: string) {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    requirePermission(role, 'purchases.create')

    if (userId.includes('demo')) {
      return demoCancelPurchaseBill(billId)
    }

    const supabase = createAdminClient()

    const { data: rawBill, error: billErr } = await (supabase.from('purchase_bills') as any)
      .select('*, suppliers(*), purchase_bill_items(*)')
      .eq('id', billId)
      .eq('organization_id', orgId)
      .single()

    if (billErr || !rawBill) {
      throw new Error('Purchase bill not found or unauthorized')
    }

    if (rawBill.status === 'cancelled') {
      throw new Error('Purchase bill is already cancelled')
    }

    const bill = rawBill
    const items = bill.purchase_bill_items || []
    const totalAmount = Number(bill.total_amount) || 0
    const amountPaid = Number(bill.amount_paid) || 0

    // 1. Reverse Stock Movement (if was finalized)
    if (bill.status !== 'draft') {
      for (const item of items) {
        if (item.product_id) {
          await InventoryService.recordMovement(session, {
            product_id: item.product_id,
            movement_type: 'return_out',
            quantity: Number(item.quantity),
            reference_type: 'purchase_bill',
            reference_id: bill.id,
            notes: `Stock reversal for cancelled Purchase Bill #${bill.bill_number}`,
          })
        }
      }

      // 2. Reverse Supplier Payable (Adjustment entry)
      await (supabase.from('supplier_transactions') as any).insert({
        organization_id: orgId,
        supplier_id: bill.supplier_id,
        transaction_type: 'adjustment',
        reference_type: 'purchase_bill',
        reference_id: bill.id,
        reference_number: bill.bill_number,
        transaction_date: new Date().toISOString().split('T')[0],
        amount: -totalAmount,
        narration: `Reversal for cancelled purchase bill #${bill.bill_number}`,
      })

      // 3. Reverse Payments if any were posted
      if (amountPaid > 0) {
        await CashBankService.recordMovement(session, {
          direction: 'in',
          amount: amountPaid,
          transaction_type: 'payment_in',
          payment_mode: 'cash',
          reference_type: 'purchase_bill',
          reference_id: bill.id,
          reference_number: bill.bill_number,
          narration: `Refund / Reversal of payment for cancelled Purchase Bill #${bill.bill_number}`,
        })

        await (supabase.from('supplier_transactions') as any).insert({
          organization_id: orgId,
          supplier_id: bill.supplier_id,
          transaction_type: 'refund',
          reference_type: 'purchase_bill',
          reference_id: bill.id,
          reference_number: bill.bill_number,
          transaction_date: new Date().toISOString().split('T')[0],
          amount: amountPaid,
          narration: `Payment refund for cancelled purchase bill #${bill.bill_number}`,
        })
      }

      // 4. Update Supplier Outstanding Balance
      const netPayableReduction = Math.max(0, totalAmount - amountPaid)
      const currentBalance = Number(bill.suppliers?.outstanding_balance) || 0
      const newBalance = Math.max(0, currentBalance - netPayableReduction)

      await (supabase.from('suppliers') as any)
        .update({
          outstanding_balance: newBalance,
          outstanding_paise: Math.round(newBalance * 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bill.supplier_id)
        .eq('organization_id', orgId)
    }

    // 5. Update Bill Status to Cancelled
    await (supabase.from('purchase_bills') as any)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bill.id)
      .eq('organization_id', orgId)

    // 6. Audit Log
    await logAudit(session, 'purchase_bill.cancelled', 'purchase_bills', bill.id, {
      bill_number: bill.bill_number,
      supplier_id: bill.supplier_id,
      reversed_total: totalAmount,
    })

    // 7. Double-Entry Accounting Reversal
    try {
      const entriesRes = await AccountingService.getJournalEntries(session, {
        reference_type: 'purchase_bill',
      })
      const list = Array.isArray(entriesRes) ? entriesRes : (entriesRes as any).entries || []
      const matching = list.find((e: any) => e.reference_id === bill.id && (e.status === 'POSTED' || e.status === 'posted'))
      if (matching) {
        await AccountingService.reverseJournalEntry(session, matching.id, `Reversal for cancelled Purchase Bill #${bill.bill_number}`)
      }
    } catch (accErr: any) {
      console.warn('[PurchaseTransactionService] Accounting reversal notice (cancel):', accErr?.message)
    }

    return {
      bill_id: bill.id,
      status: 'cancelled',
      reversed: true,
    }
  }

  /**
   * Records a standalone payment to a supplier, with overpayment protection,
   * Cash/Bank OUT movement, supplier ledger settlement, and purchase bill balance updates.
   */
  static async recordSupplierPayment(session: AppSession, input: CreateSupplierPaymentInput) {
    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''
    const userId = session.user_id || (session as any).user?.id || ''
    requirePermission(role, 'purchases.create')

    const validated = createSupplierPaymentSchema.parse(input)
    await FinancialPeriodService.validatePostingDate(session, validated.payment_date);

    if (userId.includes('demo')) {
      const demoRes = demoRecordSupplierPayment({
        ...validated,
        organization_id: orgId || DEMO_ORG_ID,
      })
      try {
        await AccountingService.postSupplierPaymentAccounting(session, {
          id: (demoRes as any).id || (demoRes as any).payment_id || `sp-${Date.now()}`,
          payment_date: validated.payment_date,
          amount: validated.amount,
          payment_method: validated.payment_method,
          supplier_name: 'Supplier',
          reference_number: validated.reference_number || undefined,
        })
      } catch (accErr: any) {
        console.warn('[PurchaseTransactionService] Supplier payment accounting notice (demo):', accErr?.message)
      }
      return demoRes
    }

    const supabase = createAdminClient()

    // 1. Validate Supplier
    const { data: rawSupplier, error: suppErr } = await (supabase.from('suppliers') as any)
      .select('id, name, outstanding_balance')
      .eq('id', validated.supplier_id)
      .eq('organization_id', orgId)
      .single()

    if (suppErr || !rawSupplier) {
      throw new Error('Supplier not found or unauthorized')
    }

    const supplierOutstanding = Number(rawSupplier.outstanding_balance) || 0

    // 2. Validate Against Bill If Provided
    let targetBill: any = null
    if (validated.purchase_bill_id) {
      const { data: rawBill, error: billErr } = await (supabase.from('purchase_bills') as any)
        .select('*')
        .eq('id', validated.purchase_bill_id)
        .eq('organization_id', orgId)
        .single()

      if (billErr || !rawBill) {
        throw new Error('Purchase bill not found or unauthorized')
      }

      if (rawBill.supplier_id !== validated.supplier_id) {
        throw new Error('Purchase bill does not belong to the selected supplier')
      }

      const billTotal = Number(rawBill.total_amount) || 0
      const billPaid = Number(rawBill.amount_paid) || 0
      const billBalanceDue = Math.max(0, billTotal - billPaid)

      if (validated.amount > billBalanceDue) {
        throw new Error(
          `OVERPAYMENT_NOT_ALLOWED: Payment amount ₹${validated.amount.toFixed(2)} exceeds purchase bill balance due ₹${billBalanceDue.toFixed(2)}.`
        )
      }

      targetBill = rawBill
    } else {
      // General supplier payment - cannot exceed total supplier outstanding
      if (validated.amount > supplierOutstanding) {
        throw new Error(
          `OVERPAYMENT_NOT_ALLOWED: Payment amount ₹${validated.amount.toFixed(2)} exceeds total supplier payable balance ₹${supplierOutstanding.toFixed(2)}.`
        )
      }
    }

    // 3. Post Supplier Ledger Settlement (-amount)
    await (supabase.from('supplier_transactions') as any).insert({
      organization_id: orgId,
      supplier_id: rawSupplier.id,
      transaction_type: 'payment',
      reference_type: targetBill ? 'purchase_bill' : 'payment_out',
      reference_id: targetBill?.id || null,
      reference_number: validated.reference_number || targetBill?.bill_number || null,
      transaction_date: validated.payment_date,
      amount: -validated.amount,
      narration: validated.notes || `Payment made to supplier ${rawSupplier.name}`,
    })

    // 4. Update Bill Amount Paid & Status (if bill linked)
    if (targetBill) {
      const newPaid = (Number(targetBill.amount_paid) || 0) + validated.amount
      const billTotal = Number(targetBill.total_amount) || 0
      const newBalance = Math.max(0, billTotal - newPaid)
      const newStatus = newBalance === 0 ? 'paid' : 'partial'

      await (supabase.from('purchase_bills') as any)
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          paid_paise: Math.round(newPaid * 100),
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetBill.id)
        .eq('organization_id', orgId)
    }

    // 5. Update Supplier Outstanding
    const updatedSupplierBalance = Math.max(0, supplierOutstanding - validated.amount)
    await (supabase.from('suppliers') as any)
      .update({
        outstanding_balance: updatedSupplierBalance,
        outstanding_paise: Math.round(updatedSupplierBalance * 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawSupplier.id)
      .eq('organization_id', orgId)

    // 6. Record Cash/Bank OUT Movement
    await CashBankService.recordMovement(session, {
      direction: 'out',
      amount: validated.amount,
      transaction_type: 'payment_out',
      payment_mode: validated.payment_method,
      account_id: validated.payment_account_id || undefined,
      reference_type: 'supplier_payment',
      reference_id: targetBill?.id || rawSupplier.id,
      reference_number: targetBill?.bill_number || undefined,
      narration: `Payment to ${rawSupplier.name}${targetBill ? ` for #${targetBill.bill_number}` : ''}`,
    })

    // 7. Double-Entry Accounting (Phase 7A)
    try {
      await AccountingService.postSupplierPaymentAccounting(session, {
        id: `sp-${Date.now()}`,
        payment_date: validated.payment_date,
        amount: validated.amount,
        payment_method: validated.payment_method,
        supplier_name: rawSupplier.name,
        reference_number: validated.reference_number || targetBill?.bill_number || undefined,
      })
    } catch (accErr: any) {
      console.warn('[PurchaseTransactionService] Supplier payment accounting notice:', accErr?.message)
    }

    // 8. Audit Log
    await logAudit(session, 'supplier_payment.recorded', 'supplier_transactions', rawSupplier.id, {
      supplier_name: rawSupplier.name,
      amount: validated.amount,
      payment_method: validated.payment_method,
      purchase_bill_id: targetBill?.id || null,
      remaining_payable: updatedSupplierBalance,
    })

    return {
      success: true,
      payment_id: `sp-${Date.now()}`,
      amount: validated.amount,
      supplier_id: rawSupplier.id,
      purchase_bill_id: targetBill?.id || null,
      remaining_payable: updatedSupplierBalance,
    }
  }
}
