import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCSV } from '@/lib/utils/csv-exporter'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.role || (session as any).member?.role || 'sales'
    const orgId = session.organization_id || (session as any).organization?.id || ''

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'receivables' // 'receivables' | 'payables'
    const search = searchParams.get('search')?.toLowerCase() || ''
    const status = searchParams.get('status') || 'all' // 'all' | 'unpaid' | 'partial' | 'overdue'
    const agingBucket = searchParams.get('aging') || 'all' // 'current' | '1_30' | '31_60' | '61_90' | '90_plus'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const exportMode = searchParams.get('export') === 'csv'

    const todayStr = new Date().toISOString().split('T')[0]
    const today = new Date(todayStr).getTime()

    const supabase = createAdminClient()

    if (type === 'receivables') {
      requirePermission(role, 'receivables.view')

      // Query Invoices with customer joins
      let query = (supabase.from('invoices') as any)
        .select('*, customers(id, name, phone, email)')
        .eq('organization_id', orgId)
        .neq('status', 'cancelled')
        .neq('status', 'void')
        .neq('status', 'draft')

      if (startDate) query = query.gte('invoice_date', startDate)
      if (endDate) query = query.lte('invoice_date', endDate)

      const { data: rawInvoices, error } = await query.order('invoice_date', { ascending: false })

      if (error) {
        throw new Error(`Failed to load receivables: ${error.message}`)
      }

      let rows = (rawInvoices || []).map((inv: any) => {
        const total = Number(inv.total_amount ?? (inv.total ? inv.total : (inv.total_paise ? inv.total_paise / 100 : 0)))
        const paid = Number(inv.amount_paid ?? (inv.paid ? inv.paid : (inv.paid_paise ? inv.paid_paise / 100 : 0)))
        const balance = inv.balance_due !== undefined ? Number(inv.balance_due) : Math.max(0, total - paid)

        const dueDateStr = inv.due_date || inv.invoice_date
        const dueTime = new Date(dueDateStr).getTime()
        const diffDays = Math.floor((today - dueTime) / (1000 * 60 * 60 * 24))
        const isOverdue = diffDays > 0 && balance > 0

        let agingCategory = 'current'
        if (isOverdue) {
          if (diffDays <= 30) agingCategory = '1_30'
          else if (diffDays <= 60) agingCategory = '31_60'
          else if (diffDays <= 90) agingCategory = '61_90'
          else agingCategory = '90_plus'
        }

        let computedStatus = inv.status
        if (balance <= 0) computedStatus = 'paid'
        else if (isOverdue) computedStatus = 'overdue'
        else if (paid > 0) computedStatus = 'partial'
        else computedStatus = 'unpaid'

        return {
          id: inv.id,
          document_number: inv.invoice_number,
          party_id: inv.customer_id,
          party_name: inv.customers?.name || 'Customer',
          date: inv.invoice_date,
          due_date: inv.due_date || null,
          total_amount: total,
          paid_amount: paid,
          balance_due: balance,
          days_overdue: Math.max(0, diffDays),
          is_overdue: isOverdue,
          aging_category: agingCategory,
          status: computedStatus,
        }
      })

      // Filters
      if (search) {
        rows = rows.filter(
          (r: any) =>
            r.document_number.toLowerCase().includes(search) ||
            r.party_name.toLowerCase().includes(search)
        )
      }

      if (status !== 'all') {
        if (status === 'overdue') rows = rows.filter((r: any) => r.is_overdue)
        else if (status === 'unpaid') rows = rows.filter((r: any) => r.paid_amount === 0 && r.balance_due > 0)
        else if (status === 'partial') rows = rows.filter((r: any) => r.paid_amount > 0 && r.balance_due > 0)
        else if (status === 'paid') rows = rows.filter((r: any) => r.balance_due <= 0)
      }

      if (agingBucket !== 'all') {
        rows = rows.filter((r: any) => r.aging_category === agingBucket)
      }

      // KPIs
      const totalReceivable = rows.reduce((sum: number, r: any) => sum + r.balance_due, 0)
      const overdueAmount = rows.filter((r: any) => r.is_overdue).reduce((sum: number, r: any) => sum + r.balance_due, 0)
      const currentAmount = rows.filter((r: any) => !r.is_overdue && r.balance_due > 0).reduce((sum: number, r: any) => sum + r.balance_due, 0)

      if (exportMode) {
        const headers = [
          { key: 'doc', label: 'Invoice Number' },
          { key: 'party', label: 'Customer' },
          { key: 'date', label: 'Date' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'total', label: 'Total (₹)' },
          { key: 'paid', label: 'Paid (₹)' },
          { key: 'balance', label: 'Balance Due (₹)' },
          { key: 'days', label: 'Days Overdue' },
          { key: 'status', label: 'Status' },
        ]
        const csvRows = rows.map((r: any) => ({
          doc: r.document_number,
          party: r.party_name,
          date: r.date,
          due_date: r.due_date || 'N/A',
          total: r.total_amount.toFixed(2),
          paid: r.paid_amount.toFixed(2),
          balance: r.balance_due.toFixed(2),
          days: r.days_overdue,
          status: r.status.toUpperCase(),
        }))
        const csv = generateCSV(headers, csvRows)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="customer-receivables-${todayStr}.csv"`,
          },
        })
      }

      return NextResponse.json({
        success: true,
        type: 'receivables',
        kpis: {
          totalOutstanding: totalReceivable,
          overdueAmount,
          currentAmount,
          count: rows.length,
        },
        data: rows,
      })
    } else {
      // Payables
      requirePermission(role, 'payables.view')

      let query = (supabase.from('purchase_bills') as any)
        .select('*, suppliers(id, name, phone, email)')
        .eq('organization_id', orgId)
        .neq('status', 'cancelled')
        .neq('status', 'void')
        .neq('status', 'draft')

      if (startDate) query = query.gte('bill_date', startDate)
      if (endDate) query = query.lte('bill_date', endDate)

      const { data: rawBills, error } = await query.order('bill_date', { ascending: false })

      if (error) {
        throw new Error(`Failed to load payables: ${error.message}`)
      }

      let rows = (rawBills || []).map((bill: any) => {
        const total = Number(bill.total_amount ?? (bill.total_paise ? bill.total_paise / 100 : 0))
        const paid = Number(bill.amount_paid ?? (bill.paid_paise ? bill.paid_paise / 100 : 0))
        const balance = bill.balance_due !== undefined ? Number(bill.balance_due) : Math.max(0, total - paid)

        const dueDateStr = bill.due_date || bill.bill_date
        const dueTime = new Date(dueDateStr).getTime()
        const diffDays = Math.floor((today - dueTime) / (1000 * 60 * 60 * 24))
        const isOverdue = diffDays > 0 && balance > 0

        let agingCategory = 'current'
        if (isOverdue) {
          if (diffDays <= 30) agingCategory = '1_30'
          else if (diffDays <= 60) agingCategory = '31_60'
          else if (diffDays <= 90) agingCategory = '61_90'
          else agingCategory = '90_plus'
        }

        let computedStatus = bill.status
        if (balance <= 0) computedStatus = 'paid'
        else if (isOverdue) computedStatus = 'overdue'
        else if (paid > 0) computedStatus = 'partial'
        else computedStatus = 'unpaid'

        return {
          id: bill.id,
          document_number: bill.bill_number,
          party_id: bill.supplier_id,
          party_name: bill.suppliers?.name || 'Supplier',
          date: bill.bill_date,
          due_date: bill.due_date || null,
          total_amount: total,
          paid_amount: paid,
          balance_due: balance,
          days_overdue: Math.max(0, diffDays),
          is_overdue: isOverdue,
          aging_category: agingCategory,
          status: computedStatus,
        }
      })

      // Filters
      if (search) {
        rows = rows.filter(
          (r: any) =>
            r.document_number.toLowerCase().includes(search) ||
            r.party_name.toLowerCase().includes(search)
        )
      }

      if (status !== 'all') {
        if (status === 'overdue') rows = rows.filter((r: any) => r.is_overdue)
        else if (status === 'unpaid') rows = rows.filter((r: any) => r.paid_amount === 0 && r.balance_due > 0)
        else if (status === 'partial') rows = rows.filter((r: any) => r.paid_amount > 0 && r.balance_due > 0)
        else if (status === 'paid') rows = rows.filter((r: any) => r.balance_due <= 0)
      }

      if (agingBucket !== 'all') {
        rows = rows.filter((r: any) => r.aging_category === agingBucket)
      }

      // KPIs
      const totalPayable = rows.reduce((sum: number, r: any) => sum + r.balance_due, 0)
      const overdueAmount = rows.filter((r: any) => r.is_overdue).reduce((sum: number, r: any) => sum + r.balance_due, 0)
      const currentAmount = rows.filter((r: any) => !r.is_overdue && r.balance_due > 0).reduce((sum: number, r: any) => sum + r.balance_due, 0)

      if (exportMode) {
        const headers = [
          { key: 'doc', label: 'Bill Number' },
          { key: 'party', label: 'Supplier' },
          { key: 'date', label: 'Date' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'total', label: 'Total (₹)' },
          { key: 'paid', label: 'Paid (₹)' },
          { key: 'balance', label: 'Balance Due (₹)' },
          { key: 'days', label: 'Days Overdue' },
          { key: 'status', label: 'Status' },
        ]
        const csvRows = rows.map((r: any) => ({
          doc: r.document_number,
          party: r.party_name,
          date: r.date,
          due_date: r.due_date || 'N/A',
          total: r.total_amount.toFixed(2),
          paid: r.paid_amount.toFixed(2),
          balance: r.balance_due.toFixed(2),
          days: r.days_overdue,
          status: r.status.toUpperCase(),
        }))
        const csv = generateCSV(headers, csvRows)
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="supplier-payables-${todayStr}.csv"`,
          },
        })
      }

      return NextResponse.json({
        success: true,
        type: 'payables',
        kpis: {
          totalOutstanding: totalPayable,
          overdueAmount,
          currentAmount,
          count: rows.length,
        },
        data: rows,
      })
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process outstanding query' },
      { status: err.message?.includes('Permission') ? 403 : 500 }
    )
  }
}
