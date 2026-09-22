import { createAdminClient } from '@/lib/supabase/admin'
import { AppSession } from '@/lib/auth/session'
import { SearchResultItem } from '@/types/app.types'

export class SearchService {
  /**
   * Executes multi-entity search across Customers, Suppliers, Products, Invoices, Quotations, and Payments.
   * All queries are strictly scoped by session.organization_id.
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

    const supabase = createAdminClient()
    const orgId = session.organization?.id || (session as any).organization_id
    const searchPattern = `%${trimmed}%`

    // Run parallel queries across all 6 entity tables
    const [
      customersRes,
      suppliersRes,
      productsRes,
      invoicesRes,
      quotationsRes,
      paymentsRes,
    ] = await Promise.all([
      // 1. Customers
      supabase
        .from('customers')
        .select('id, name, email, phone, gstin, outstanding_balance_paise')
        .eq('organization_id', orgId)
        .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},gstin.ilike.${searchPattern}`)
        .limit(limitPerCategory),

      // 2. Suppliers
      supabase
        .from('suppliers')
        .select('id, name, email, phone, gstin, payable_balance_paise')
        .eq('organization_id', orgId)
        .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},gstin.ilike.${searchPattern}`)
        .limit(limitPerCategory),

      // 3. Products
      supabase
        .from('products')
        .select('id, name, sku, hsn_sac, selling_price_paise, current_stock')
        .eq('organization_id', orgId)
        .or(`name.ilike.${searchPattern},sku.ilike.${searchPattern},hsn_sac.ilike.${searchPattern}`)
        .limit(limitPerCategory),

      // 4. Invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, customer_name, status, total_amount_paise')
        .eq('organization_id', orgId)
        .or(`invoice_number.ilike.${searchPattern},customer_name.ilike.${searchPattern}`)
        .limit(limitPerCategory),

      // 5. Quotations
      supabase
        .from('quotations')
        .select('id, quotation_number, customer_name, status, total_amount_paise')
        .eq('organization_id', orgId)
        .or(`quotation_number.ilike.${searchPattern},customer_name.ilike.${searchPattern}`)
        .limit(limitPerCategory),

      // 6. Payments
      supabase
        .from('payments')
        .select('id, payment_number, reference_number, customer_name, payment_method, amount_paise')
        .eq('organization_id', orgId)
        .or(`payment_number.ilike.${searchPattern},reference_number.ilike.${searchPattern},customer_name.ilike.${searchPattern}`)
        .limit(limitPerCategory),
    ])

    const results: SearchResultItem[] = []

    // 1. Process Customers
    if (customersRes.data) {
      customersRes.data.forEach((c: any) => {
        results.push({
          id: c.id,
          entity_type: 'customer',
          title: c.name,
          subtitle: c.email || c.phone || 'Customer',
          status: 'Customer',
          amount_paise: c.outstanding_balance_paise,
          url: `/customers/${c.id}`,
        })
      })
    }

    // 2. Process Suppliers
    if (suppliersRes.data) {
      suppliersRes.data.forEach((s: any) => {
        results.push({
          id: s.id,
          entity_type: 'supplier',
          title: s.name,
          subtitle: s.email || s.phone || 'Supplier',
          status: 'Supplier',
          amount_paise: s.payable_balance_paise,
          url: `/purchases/suppliers/${s.id}`,
        })
      })
    }

    // 3. Process Products
    if (productsRes.data) {
      productsRes.data.forEach((p: any) => {
        results.push({
          id: p.id,
          entity_type: 'product',
          title: p.name,
          subtitle: p.sku ? `SKU: ${p.sku}` : 'Product',
          status: p.current_stock !== undefined ? `Stock: ${p.current_stock}` : 'Product',
          amount_paise: p.selling_price_paise,
          url: `/products/${p.id}`,
        })
      })
    }

    // 4. Process Invoices
    if (invoicesRes.data) {
      invoicesRes.data.forEach((inv: any) => {
        results.push({
          id: inv.id,
          entity_type: 'invoice',
          title: inv.invoice_number,
          subtitle: inv.customer_name || 'Invoice',
          status: (inv.status || 'DRAFT').toUpperCase(),
          amount_paise: inv.total_amount_paise,
          url: `/sales/invoices/${inv.id}`,
        })
      })
    }

    // 5. Process Quotations
    if (quotationsRes.data) {
      quotationsRes.data.forEach((q: any) => {
        results.push({
          id: q.id,
          entity_type: 'quotation',
          title: q.quotation_number,
          subtitle: q.customer_name || 'Quotation',
          status: (q.status || 'DRAFT').toUpperCase(),
          amount_paise: q.total_amount_paise,
          url: `/quotations/${q.id}`,
        })
      })
    }

    // 6. Process Payments
    if (paymentsRes.data) {
      paymentsRes.data.forEach((pay: any) => {
        results.push({
          id: pay.id,
          entity_type: 'payment',
          title: pay.payment_number,
          subtitle: pay.customer_name || pay.reference_number || 'Payment',
          status: (pay.payment_method || 'Payment').toUpperCase(),
          amount_paise: pay.amount_paise,
          url: `/payments/${pay.id}`,
        })
      })
    }

    return results
  }
}
