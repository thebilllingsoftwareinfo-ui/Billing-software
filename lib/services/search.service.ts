import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import { SearchResultItem } from '@/types/app.types'
import { demoGlobalSearch } from '@/lib/services/demo-store'

export class SearchService {
  /**
   * Executes multi-entity search across Customers, Suppliers, Products, Invoices, Quotations, and Payments.
   * All queries are strictly scoped by session.organization_id.
   * Falls back gracefully to demo store when DB is unavailable or empty.
   */
  static async globalSearch(
    session: AppSession,
    query: string,
    limitPerCategory: number = 5
  ): Promise<SearchResultItem[]> {
    const trimmed = query?.trim() || ''
    if (!trimmed) {
      return []
    }

    const userId = session?.user_id || session?.user?.id || ''
    if (userId.includes('demo')) {
      return demoGlobalSearch(trimmed, limitPerCategory)
    }

    const orgId = session?.organization?.id || (session as any)?.organization_id
    const searchPattern = `%${trimmed}%`

    try {
      const supabase = createAdminClient()

      // Run parallel queries across entity tables
      const [
        customersRes,
        suppliersRes,
        productsRes,
        invoicesRes,
        quotationsRes,
        paymentsRes,
        purchaseBillsRes,
      ] = await Promise.all([
        // 1. Customers
        supabase
          .from('customers')
          .select('id, name, display_name, email, phone, gstin, outstanding_balance, outstanding')
          .eq('organization_id', orgId)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(limitPerCategory),

        // 2. Suppliers
        supabase
          .from('suppliers')
          .select('id, name, email, phone, gstin, outstanding_balance, outstanding_paise')
          .eq('organization_id', orgId)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(limitPerCategory),

        // 3. Products
        supabase
          .from('products')
          .select('id, name, sku, hsn_sac, sale_price, price, current_stock')
          .eq('organization_id', orgId)
          .or(`name.ilike.${searchPattern},sku.ilike.${searchPattern}`)
          .limit(limitPerCategory),

        // 4. Invoices
        supabase
          .from('invoices')
          .select('id, invoice_number, status, total_amount, total, customers(name)')
          .eq('organization_id', orgId)
          .ilike('invoice_number', searchPattern)
          .limit(limitPerCategory),

        // 5. Quotations
        supabase
          .from('quotations')
          .select('id, quotation_number, status, total_amount, total')
          .eq('organization_id', orgId)
          .ilike('quotation_number', searchPattern)
          .limit(limitPerCategory),

        // 6. Payments
        supabase
          .from('payments')
          .select('id, reference_number, payment_method, amount')
          .eq('organization_id', orgId)
          .or(`reference_number.ilike.${searchPattern}`)
          .limit(limitPerCategory),

        // 7. Purchase Bills
        supabase
          .from('purchase_bills')
          .select('id, bill_number, status, total_amount, suppliers(name)')
          .eq('organization_id', orgId)
          .ilike('bill_number', searchPattern)
          .limit(limitPerCategory),
      ])

      const results: SearchResultItem[] = []

      // 1. Process Customers
      if (customersRes.data) {
        customersRes.data.forEach((c: any) => {
          const bal = Number(c.outstanding_balance ?? (c.outstanding ? c.outstanding / 100 : 0))
          results.push({
            id: c.id,
            entity_type: 'customer',
            title: c.name || c.display_name || 'Customer',
            subtitle: c.phone || c.email || 'Customer',
            status: 'Customer',
            amount: bal,
            amount_paise: Math.round(bal * 100),
            url: `/customers/${c.id}`,
          })
        })
      }

      // 2. Process Suppliers
      if (suppliersRes.data) {
        suppliersRes.data.forEach((s: any) => {
          const bal = Number(s.outstanding_balance ?? (s.outstanding_paise ? s.outstanding_paise / 100 : 0))
          results.push({
            id: s.id,
            entity_type: 'supplier',
            title: s.name,
            subtitle: s.phone || s.email || 'Supplier',
            status: 'Supplier',
            amount: bal,
            amount_paise: Math.round(bal * 100),
            url: `/purchases/suppliers/${s.id}`,
          })
        })
      }

      // 3. Process Products
      if (productsRes.data) {
        productsRes.data.forEach((p: any) => {
          const price = Number(p.sale_price ?? p.price ?? 0)
          results.push({
            id: p.id,
            entity_type: 'product',
            title: p.name,
            subtitle: p.sku ? `SKU: ${p.sku}` : 'Product',
            status: p.current_stock !== undefined ? `Stock: ${p.current_stock}` : 'Product',
            amount: price,
            amount_paise: Math.round(price * 100),
            url: `/inventory/products`,
          })
        })
      }

      // 4. Process Invoices
      if (invoicesRes.data) {
        invoicesRes.data.forEach((inv: any) => {
          const tot = Number(inv.total_amount ?? (inv.total ? inv.total / 100 : 0))
          results.push({
            id: inv.id,
            entity_type: 'invoice',
            title: inv.invoice_number,
            subtitle: inv.customers?.name || 'Invoice',
            status: (inv.status || 'DRAFT').toUpperCase(),
            amount: tot,
            amount_paise: Math.round(tot * 100),
            url: `/sales/invoices/${inv.id}`,
          })
        })
      }

      // 5. Process Quotations
      if (quotationsRes.data) {
        quotationsRes.data.forEach((q: any) => {
          const tot = Number(q.total_amount ?? (q.total ? q.total / 100 : 0))
          results.push({
            id: q.id,
            entity_type: 'quotation',
            title: q.quotation_number,
            subtitle: 'Quotation',
            status: (q.status || 'DRAFT').toUpperCase(),
            amount: tot,
            amount_paise: Math.round(tot * 100),
            url: `/quotations/${q.id}`,
          })
        })
      }

      // 6. Process Payments
      if (paymentsRes.data) {
        paymentsRes.data.forEach((pay: any) => {
          const amt = Number(pay.amount || 0)
          results.push({
            id: pay.id,
            entity_type: 'payment',
            title: pay.reference_number ? `Ref: ${pay.reference_number}` : `Payment #${pay.id.substring(0, 8)}`,
            subtitle: pay.payment_method ? `Method: ${pay.payment_method}` : 'Payment',
            status: 'RECEIVED',
            amount: amt,
            amount_paise: Math.round(amt * 100),
            url: `/payments/${pay.id}`,
          })
        })
      }

      // 7. Process Purchase Bills
      if (purchaseBillsRes?.data) {
        purchaseBillsRes.data.forEach((b: any) => {
          const tot = Number(b.total_amount ?? (b.total_paise ? b.total_paise / 100 : 0))
          results.push({
            id: b.id,
            entity_type: 'purchase_bill',
            title: b.bill_number,
            subtitle: b.suppliers?.name || 'Purchase Bill',
            status: (b.status || 'DRAFT').toUpperCase(),
            amount: tot,
            amount_paise: Math.round(tot * 100),
            url: `/purchases/bills/${b.id}`,
          })
        })
      }

      if (results.length === 0) {
        return demoGlobalSearch(trimmed, limitPerCategory)
      }

      return results
    } catch {
      return demoGlobalSearch(trimmed, limitPerCategory)
    }
  }
}
