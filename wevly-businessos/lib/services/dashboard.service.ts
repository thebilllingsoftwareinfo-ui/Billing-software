import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';

export type DateRangePreset = 'today' | '7days' | 'this_month' | 'last_month' | 'custom';

export interface DashboardMetricsFilter {
  range?: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export class DashboardService {
  /**
   * Evaluates start and end dates based on selected date range preset.
   */
  static getDateBoundaries(preset: DateRangePreset = 'this_month', customStart?: string, customEnd?: string) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }

    if (preset === '7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }

    if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: firstDayLastMonth.toISOString().split('T')[0],
        endDate: lastDayLastMonth.toISOString().split('T')[0],
      };
    }

    if (preset === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }

    // Default: this_month
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: firstDayThisMonth.toISOString().split('T')[0],
      endDate: todayStr,
    };
  }

  /**
   * Optimized batch query fetching all production dashboard metrics using real DB queries.
   * Avoids N+1 queries by parallelizing Supabase calls across indexed tables.
   */
  static async getDashboardMetrics(session: AppSession, filter: DashboardMetricsFilter = {}) {
    const role = session.role || session.member?.role || 'accountant';
    const orgId = session.organization_id || session.organization?.id || '';
    requirePermission(role, 'reports.view');
    const supabase = createAdminClient();

    const { startDate, endDate } = this.getDateBoundaries(filter.range, filter.startDate, filter.endDate);
    const todayStr = new Date().toISOString().split('T')[0];

    // Execute all dashboard queries in parallel (0 N+1 overhead)
    const [
      todaySalesRes,
      rangeSalesRes,
      receivablesRes,
      purchasesRes,
      expensesRes,
      recentInvoicesRes,
      recentPaymentsRes,
      overdueInvoicesRes,
      lowStockProductsRes,
      pendingQuotationsRes,
    ] = await Promise.all([
      // 1. Today's Sales
      supabase
        .from('invoices')
        .select('total_paise')
        .eq('organization_id', orgId)
        .eq('invoice_date', todayStr)
        .not('status', 'in', '("draft","void","cancelled")'),

      // 2. Sales in Selected Range
      supabase
        .from('invoices')
        .select('invoice_date, total_paise, taxable_paise')
        .eq('organization_id', orgId)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .not('status', 'in', '("draft","void","cancelled")'),

      // 3. Outstanding Receivables
      supabase
        .from('invoices')
        .select('total_paise, paid_paise')
        .eq('organization_id', orgId)
        .not('status', 'in', '("draft","paid","void","cancelled")'),

      // 4. Purchases in Selected Range
      supabase
        .from('purchase_bills')
        .select('total_paise')
        .eq('organization_id', orgId)
        .gte('bill_date', startDate)
        .lte('bill_date', endDate)
        .not('status', 'in', '("draft","void","cancelled")'),

      // 5. Operating Expenses in Selected Range
      supabase
        .from('expenses')
        .select('amount_paise')
        .eq('organization_id', orgId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .eq('is_archived', false),

      // 6. Recent Invoices (limit 5)
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_paise, status, customers(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5),

      // 7. Recent Payments (limit 5)
      supabase
        .from('payments')
        .select('id, payment_date, amount_paise, payment_method, customers(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5),

      // 8. Overdue Invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total_paise, paid_paise, customers(name)')
        .eq('organization_id', orgId)
        .lt('due_date', todayStr)
        .not('status', 'in', '("draft","paid","void","cancelled")')
        .order('due_date', { ascending: true })
        .limit(5),

      // 9. Low Stock Products
      supabase
        .from('products')
        .select('id, name, sku, current_stock, min_stock, unit')
        .eq('organization_id', orgId)
        .eq('is_archived', false)
        .limit(10),

      // 10. Pending Quotations
      supabase
        .from('quotations')
        .select('id, quotation_number, quotation_date, total_paise, status, customers(name)')
        .eq('organization_id', orgId)
        .in('status', ['draft', 'sent'])
        .order('quotation_date', { ascending: false })
        .limit(5),
    ]);

    // Calculate Aggregations
    const todaySalesList = (todaySalesRes.data || []) as any[];
    const todaySalesPaise = todaySalesList.reduce(
      (sum, i) => sum + Number(i.total_paise || 0),
      0
    );

    const rangeSalesList = (rangeSalesRes.data || []) as any[];
    const monthlySalesPaise = rangeSalesList.reduce(
      (sum, i) => sum + Number(i.total_paise || 0),
      0
    );

    const receivablesList = (receivablesRes.data || []) as any[];
    const receivablesPaise = receivablesList.reduce((sum, i) => {
      const total = Number(i.total_paise || 0);
      const paid = Number(i.paid_paise || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    const purchasesList = (purchasesRes.data || []) as any[];
    const purchasesPaise = purchasesList.reduce(
      (sum, b) => sum + Number(b.total_paise || 0),
      0
    );

    const expensesList = (expensesRes.data || []) as any[];
    const expensesPaise = expensesList.reduce(
      (sum, e) => sum + Number(e.amount_paise || 0),
      0
    );

    // Estimated Gross Profit = Range Sales Revenue - Purchases - Operating Expenses
    const estimatedGrossProfitPaise = monthlySalesPaise - purchasesPaise - expensesPaise;

    // Daily Sales Trend Time-Series
    const salesTrendMap = new Map<string, number>();
    for (const inv of rangeSalesList) {
      const dateKey = inv.invoice_date;
      salesTrendMap.set(dateKey, (salesTrendMap.get(dateKey) || 0) + Number(inv.total_paise || 0));
    }

    const salesTrend = Array.from(salesTrendMap.entries())
      .map(([date, totalPaise]) => ({ date, totalPaise }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Filter low stock products (current_stock <= min_stock)
    const rawLowStock = (lowStockProductsRes.data || []) as any[];
    const lowStockProducts = rawLowStock.filter(
      (p) => Number(p.current_stock || 0) <= Number(p.min_stock || 0)
    );

    return {
      dateRange: {
        preset: filter.range || 'this_month',
        startDate,
        endDate,
      },
      metrics: {
        todaySalesPaise,
        monthlySalesPaise,
        receivablesPaise,
        purchasesPaise,
        expensesPaise,
        estimatedGrossProfitPaise,
      },
      salesTrend,
      recentInvoices: recentInvoicesRes.data || [],
      recentPayments: recentPaymentsRes.data || [],
      attentionItems: {
        overdueInvoices: overdueInvoicesRes.data || [],
        lowStockProducts,
        pendingQuotations: pendingQuotationsRes.data || [],
      },
    };
  }
}
