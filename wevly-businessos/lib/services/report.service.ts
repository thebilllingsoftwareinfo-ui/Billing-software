import { createAdminClient } from '@/lib/supabase/admin';
import { AppSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';

export type ReportDatePreset = 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  range?: ReportDatePreset;
  subType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ReportService {
  /**
   * Calculates ISO start and end dates based on report date presets.
   */
  static getDateBoundaries(preset: ReportDatePreset = 'this_month', customStart?: string, customEnd?: string) {
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

    if (preset === '30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
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

    if (preset === 'this_year') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: firstDayYear.toISOString().split('T')[0],
        endDate: todayStr,
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

  // =========================================================================
  // 1. SALES REPORTS ENGINE
  // =========================================================================
  static async getSalesReport(session: AppSession, filter: ReportFilterOptions = {}) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'reports.view');
    const supabase = createAdminClient();
    const orgId = session.organization?.id || (session as any).organization_id;
    const { startDate, endDate } = this.getDateBoundaries(filter.range, filter.startDate, filter.endDate);
    const subType = filter.subType || 'daily';
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    if (subType === 'customer') {
      // Customer-wise Sales Aggregation
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, customer_id, total_paise, paid_paise, taxable_paise, total_tax_paise, customers(name, gstin)')
        .eq('organization_id', orgId)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .not('status', 'in', '("draft","void","cancelled")');

      if (error) throw new Error(`Sales customer report failed: ${error.message}`);

      const customerMap = new Map<string, {
        customer_id: string;
        customer_name: string;
        gstin: string;
        invoice_count: number;
        taxable_paise: number;
        tax_paise: number;
        total_paise: number;
        paid_paise: number;
        outstanding_paise: number;
      }>();

      for (const inv of (invoices || []) as any[]) {
        const custId = inv.customer_id || 'unknown';
        const custName = (inv.customers as any)?.name || 'Guest / Unassigned';
        const gstin = (inv.customers as any)?.gstin || 'N/A';

        const existing = customerMap.get(custId) || {
          customer_id: custId,
          customer_name: custName,
          gstin,
          invoice_count: 0,
          taxable_paise: 0,
          tax_paise: 0,
          total_paise: 0,
          paid_paise: 0,
          outstanding_paise: 0,
        };

        const total = Number(inv.total_paise || 0);
        const paid = Number(inv.paid_paise || 0);

        existing.invoice_count += 1;
        existing.taxable_paise += Number(inv.taxable_paise || 0);
        existing.tax_paise += Number(inv.total_tax_paise || 0);
        existing.total_paise += total;
        existing.paid_paise += paid;
        existing.outstanding_paise += Math.max(0, total - paid);

        customerMap.set(custId, existing);
      }

      let aggregatedRows = Array.from(customerMap.values());
      if (filter.search) {
        const q = filter.search.toLowerCase();
        aggregatedRows = aggregatedRows.filter(
          (r) => r.customer_name.toLowerCase().includes(q) || r.gstin.toLowerCase().includes(q)
        );
      }

      aggregatedRows.sort((a, b) => b.total_paise - a.total_paise);

      const totalCount = aggregatedRows.length;
      const paginatedRows = aggregatedRows.slice((page - 1) * limit, page * limit);

      const grandTotals = aggregatedRows.reduce(
        (acc, r) => {
          acc.total_paise += r.total_paise;
          acc.taxable_paise += r.taxable_paise;
          acc.tax_paise += r.tax_paise;
          acc.paid_paise += r.paid_paise;
          acc.outstanding_paise += r.outstanding_paise;
          return acc;
        },
        { total_paise: 0, taxable_paise: 0, tax_paise: 0, paid_paise: 0, outstanding_paise: 0 }
      );

      return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount, page, limit, rows: paginatedRows };
    }

    if (subType === 'product') {
      // Product-wise Sales Aggregation
      const { data: invoiceItems, error } = await supabase
        .from('invoice_items')
        .select('product_id, product_name, quantity, line_total_paise, taxable_paise, total_tax_paise, invoices!inner(organization_id, invoice_date, status)')
        .eq('invoices.organization_id', orgId)
        .gte('invoices.invoice_date', startDate)
        .lte('invoices.invoice_date', endDate)
        .not('invoices.status', 'in', '("draft","void","cancelled")');

      if (error) throw new Error(`Sales product report failed: ${error.message}`);

      const productMap = new Map<string, {
        product_id: string;
        product_name: string;
        quantity_sold: number;
        taxable_paise: number;
        tax_paise: number;
        total_paise: number;
        avg_price_paise: number;
      }>();

      for (const item of (invoiceItems || []) as any[]) {
        const prodId = item.product_id || item.product_name;
        const existing = productMap.get(prodId) || {
          product_id: prodId,
          product_name: item.product_name || 'Unassigned Product',
          quantity_sold: 0,
          taxable_paise: 0,
          tax_paise: 0,
          total_paise: 0,
          avg_price_paise: 0,
        };

        const qty = Number(item.quantity || 0);
        existing.quantity_sold += qty;
        existing.taxable_paise += Number(item.taxable_paise || 0);
        existing.tax_paise += Number(item.total_tax_paise || 0);
        existing.total_paise += Number(item.line_total_paise || 0);

        productMap.set(prodId, existing);
      }

      let aggregatedRows = Array.from(productMap.values()).map((r) => ({
        ...r,
        avg_price_paise: r.quantity_sold > 0 ? Math.round(r.total_paise / r.quantity_sold) : 0,
      }));

      if (filter.search) {
        const q = filter.search.toLowerCase();
        aggregatedRows = aggregatedRows.filter((r) => r.product_name.toLowerCase().includes(q));
      }

      aggregatedRows.sort((a, b) => b.total_paise - a.total_paise);

      const totalCount = aggregatedRows.length;
      const paginatedRows = aggregatedRows.slice((page - 1) * limit, page * limit);

      const grandTotals = aggregatedRows.reduce(
        (acc, r) => {
          acc.quantity_sold += r.quantity_sold;
          acc.total_paise += r.total_paise;
          acc.taxable_paise += r.taxable_paise;
          acc.tax_paise += r.tax_paise;
          return acc;
        },
        { quantity_sold: 0, total_paise: 0, taxable_paise: 0, tax_paise: 0 }
      );

      return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount, page, limit, rows: paginatedRows };
    }

    if (subType === 'tax') {
      // Tax-wise GST Breakdown Aggregation
      const { data: invoiceItems, error } = await supabase
        .from('invoice_items')
        .select('gst_rate, taxable_paise, cgst_paise, sgst_paise, igst_paise, total_tax_paise, line_total_paise, invoices!inner(organization_id, invoice_date, status)')
        .eq('invoices.organization_id', orgId)
        .gte('invoices.invoice_date', startDate)
        .lte('invoices.invoice_date', endDate)
        .not('invoices.status', 'in', '("draft","void","cancelled")');

      if (error) throw new Error(`Tax report failed: ${error.message}`);

      const taxMap = new Map<number, {
        gst_rate: number;
        item_count: number;
        taxable_paise: number;
        cgst_paise: number;
        sgst_paise: number;
        igst_paise: number;
        total_tax_paise: number;
        total_paise: number;
      }>();

      for (const item of (invoiceItems || []) as any[]) {
        const rate = Number(item.gst_rate || 0);
        const existing = taxMap.get(rate) || {
          gst_rate: rate,
          item_count: 0,
          taxable_paise: 0,
          cgst_paise: 0,
          sgst_paise: 0,
          igst_paise: 0,
          total_tax_paise: 0,
          total_paise: 0,
        };

        existing.item_count += 1;
        existing.taxable_paise += Number(item.taxable_paise || 0);
        existing.cgst_paise += Number(item.cgst_paise || 0);
        existing.sgst_paise += Number(item.sgst_paise || 0);
        existing.igst_paise += Number(item.igst_paise || 0);
        existing.total_tax_paise += Number(item.total_tax_paise || 0);
        existing.total_paise += Number(item.line_total_paise || 0);

        taxMap.set(rate, existing);
      }

      const aggregatedRows = Array.from(taxMap.values()).sort((a, b) => a.gst_rate - b.gst_rate);

      const grandTotals = aggregatedRows.reduce(
        (acc, r) => {
          acc.taxable_paise += r.taxable_paise;
          acc.cgst_paise += r.cgst_paise;
          acc.sgst_paise += r.sgst_paise;
          acc.igst_paise += r.igst_paise;
          acc.total_tax_paise += r.total_tax_paise;
          acc.total_paise += r.total_paise;
          return acc;
        },
        { taxable_paise: 0, cgst_paise: 0, sgst_paise: 0, igst_paise: 0, total_tax_paise: 0, total_paise: 0 }
      );

      return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount: aggregatedRows.length, page: 1, limit: 100, rows: aggregatedRows };
    }

    // Default: Time-series (Daily / Weekly / Monthly)
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('invoice_date, total_paise, taxable_paise, total_tax_paise, paid_paise')
      .eq('organization_id', orgId)
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .not('status', 'in', '("draft","void","cancelled")')
      .order('invoice_date', { ascending: true });

    if (error) throw new Error(`Sales time-series report failed: ${error.message}`);

    const dateMap = new Map<string, {
      period: string;
      invoice_count: number;
      taxable_paise: number;
      tax_paise: number;
      total_paise: number;
      paid_paise: number;
    }>();

    for (const inv of (invoices || []) as any[]) {
      let periodKey = inv.invoice_date;

      if (subType === 'weekly') {
        const d = new Date(inv.invoice_date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        const monday = new Date(d.setDate(diff));
        periodKey = `Week of ${monday.toISOString().split('T')[0]}`;
      } else if (subType === 'monthly') {
        periodKey = inv.invoice_date.substring(0, 7); // YYYY-MM
      }

      const existing = dateMap.get(periodKey) || {
        period: periodKey,
        invoice_count: 0,
        taxable_paise: 0,
        tax_paise: 0,
        total_paise: 0,
        paid_paise: 0,
      };

      existing.invoice_count += 1;
      existing.taxable_paise += Number(inv.taxable_paise || 0);
      existing.tax_paise += Number(inv.total_tax_paise || 0);
      existing.total_paise += Number(inv.total_paise || 0);
      existing.paid_paise += Number(inv.paid_paise || 0);

      dateMap.set(periodKey, existing);
    }

    const aggregatedRows = Array.from(dateMap.values());
    const grandTotals = aggregatedRows.reduce(
      (acc, r) => {
        acc.invoice_count += r.invoice_count;
        acc.taxable_paise += r.taxable_paise;
        acc.tax_paise += r.tax_paise;
        acc.total_paise += r.total_paise;
        acc.paid_paise += r.paid_paise;
        return acc;
      },
      { invoice_count: 0, taxable_paise: 0, tax_paise: 0, total_paise: 0, paid_paise: 0 }
    );

    const totalCount = aggregatedRows.length;
    const paginatedRows = aggregatedRows.slice((page - 1) * limit, page * limit);

    return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount, page, limit, rows: paginatedRows };
  }

  // =========================================================================
  // 2. PURCHASES REPORTS ENGINE
  // =========================================================================
  static async getPurchasesReport(session: AppSession, filter: ReportFilterOptions = {}) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'reports.view');
    const supabase = createAdminClient();
    const orgId = session.organization?.id || (session as any).organization_id;
    const { startDate, endDate } = this.getDateBoundaries(filter.range, filter.startDate, filter.endDate);
    const subType = filter.subType || 'supplier';
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    if (subType === 'product') {
      // Product-wise Purchases Aggregation
      const { data: purchaseItems, error } = await supabase
        .from('purchase_items')
        .select('product_id, description, quantity, total_paise, taxable_paise, tax_paise, purchase_bills!inner(organization_id, bill_date, status)')
        .eq('purchase_bills.organization_id', orgId)
        .gte('purchase_bills.bill_date', startDate)
        .lte('purchase_bills.bill_date', endDate)
        .not('purchase_bills.status', 'in', '("draft","void","cancelled")');

      if (error) throw new Error(`Purchases product report failed: ${error.message}`);

      const productMap = new Map<string, {
        product_id: string;
        description: string;
        quantity_purchased: number;
        taxable_paise: number;
        tax_paise: number;
        total_paise: number;
        avg_unit_cost_paise: number;
      }>();

      for (const item of (purchaseItems || []) as any[]) {
        const prodId = item.product_id || item.description;
        const existing = productMap.get(prodId) || {
          product_id: prodId,
          description: item.description || 'Unassigned Purchase Product',
          quantity_purchased: 0,
          taxable_paise: 0,
          tax_paise: 0,
          total_paise: 0,
          avg_unit_cost_paise: 0,
        };

        const qty = Number(item.quantity || 0);
        existing.quantity_purchased += qty;
        existing.taxable_paise += Number(item.taxable_paise || 0);
        existing.tax_paise += Number(item.tax_paise || 0);
        existing.total_paise += Number(item.total_paise || 0);

        productMap.set(prodId, existing);
      }

      let aggregatedRows = Array.from(productMap.values()).map((r) => ({
        ...r,
        avg_unit_cost_paise: r.quantity_purchased > 0 ? Math.round(r.total_paise / r.quantity_purchased) : 0,
      }));

      if (filter.search) {
        const q = filter.search.toLowerCase();
        aggregatedRows = aggregatedRows.filter((r) => r.description.toLowerCase().includes(q));
      }

      aggregatedRows.sort((a, b) => b.total_paise - a.total_paise);

      const totalCount = aggregatedRows.length;
      const paginatedRows = aggregatedRows.slice((page - 1) * limit, page * limit);

      const grandTotals = aggregatedRows.reduce(
        (acc, r) => {
          acc.quantity_purchased += r.quantity_purchased;
          acc.total_paise += r.total_paise;
          acc.taxable_paise += r.taxable_paise;
          acc.tax_paise += r.tax_paise;
          return acc;
        },
        { quantity_purchased: 0, total_paise: 0, taxable_paise: 0, tax_paise: 0 }
      );

      return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount, page, limit, rows: paginatedRows };
    }

    // Default: Supplier-wise Purchase Aggregation
    const { data: bills, error } = await supabase
      .from('purchase_bills')
      .select('id, supplier_id, vendor_name, total_paise, taxable_paise, gst_paise, paid_paise')
      .eq('organization_id', orgId)
      .gte('bill_date', startDate)
      .lte('bill_date', endDate)
      .not('status', 'in', '("draft","void","cancelled")');

    if (error) throw new Error(`Supplier purchase report failed: ${error.message}`);

    const supplierMap = new Map<string, {
      supplier_name: string;
      bill_count: number;
      taxable_paise: number;
      gst_paise: number;
      total_paise: number;
      paid_paise: number;
      payable_outstanding_paise: number;
    }>();

    for (const bill of (bills || []) as any[]) {
      const suppName = bill.vendor_name || 'Vendor / Unassigned';
      const existing = supplierMap.get(suppName) || {
        supplier_name: suppName,
        bill_count: 0,
        taxable_paise: 0,
        gst_paise: 0,
        total_paise: 0,
        paid_paise: 0,
        payable_outstanding_paise: 0,
      };

      const total = Number(bill.total_paise || 0);
      const paid = Number(bill.paid_paise || 0);

      existing.bill_count += 1;
      existing.taxable_paise += Number(bill.taxable_paise || 0);
      existing.gst_paise += Number(bill.gst_paise || 0);
      existing.total_paise += total;
      existing.paid_paise += paid;
      existing.payable_outstanding_paise += Math.max(0, total - paid);

      supplierMap.set(suppName, existing);
    }

    let aggregatedRows = Array.from(supplierMap.values());
    if (filter.search) {
      const q = filter.search.toLowerCase();
      aggregatedRows = aggregatedRows.filter((r) => r.supplier_name.toLowerCase().includes(q));
    }

    aggregatedRows.sort((a, b) => b.total_paise - a.total_paise);

    const totalCount = aggregatedRows.length;
    const paginatedRows = aggregatedRows.slice((page - 1) * limit, page * limit);

    const grandTotals = aggregatedRows.reduce(
      (acc, r) => {
        acc.bill_count += r.bill_count;
        acc.total_paise += r.total_paise;
        acc.taxable_paise += r.taxable_paise;
        acc.gst_paise += r.gst_paise;
        acc.payable_outstanding_paise += r.payable_outstanding_paise;
        return acc;
      },
      { bill_count: 0, total_paise: 0, taxable_paise: 0, gst_paise: 0, payable_outstanding_paise: 0 }
    );

    return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount, page, limit, rows: paginatedRows };
  }

  // =========================================================================
  // 3. INVENTORY REPORTS ENGINE
  // =========================================================================
  static async getInventoryReport(session: AppSession, filter: ReportFilterOptions = {}) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'reports.view');
    const supabase = createAdminClient();
    const orgId = session.organization?.id || (session as any).organization_id;
    const { startDate, endDate } = this.getDateBoundaries(filter.range, filter.startDate, filter.endDate);
    const subType = filter.subType || 'current_stock';
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    if (subType === 'movement') {
      // Stock Movement Log Report
      let query = supabase
        .from('inventory_movements')
        .select('id, created_at, movement_type, quantity, reference_type, reference_number, notes, products(name, sku, unit)', { count: 'exact' })
        .eq('organization_id', orgId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: false });

      const from = (page - 1) * limit;
      const to = page * limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw new Error(`Stock movement report failed: ${error.message}`);

      const rows = (data || []).map((m: any) => ({
        id: m.id,
        date: m.created_at.split('T')[0],
        product_name: m.products?.name || 'Unassigned Item',
        sku: m.products?.sku || 'N/A',
        movement_type: m.movement_type,
        quantity: m.quantity,
        reference: m.reference_number || m.reference_type || 'N/A',
        notes: m.notes || '-',
      }));

      return { subType, dateRange: { startDate, endDate }, totalCount: count || 0, page, limit, rows };
    }

    // Current Stock / Low Stock / Stock Valuation Reports
    const prodQuery = supabase
      .from('products')
      .select('id, name, sku, category, unit, current_stock, min_stock, purchase_price_paise, selling_price_paise')
      .eq('organization_id', orgId)
      .eq('is_archived', false);

    if (subType === 'low_stock') {
      // Filter for items where current_stock <= min_stock
    }

    const { data: products, error } = await prodQuery;
    if (error) throw new Error(`Inventory report failed: ${error.message}`);

    let filtered: any[] = products || [];

    if (subType === 'low_stock') {
      filtered = filtered.filter((p) => Number(p.current_stock || 0) <= Number(p.min_stock || 0));
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    const reportRows = filtered.map((p) => {
      const stock = Number(p.current_stock || 0);
      const purchasePrice = Number(p.purchase_price_paise || 0);
      const sellingPrice = Number(p.selling_price_paise || 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        category: p.category || 'General',
        unit: p.unit || 'pcs',
        current_stock: stock,
        min_stock: Number(p.min_stock || 0),
        purchase_price_paise: purchasePrice,
        selling_price_paise: sellingPrice,
        cost_valuation_paise: stock * purchasePrice,
        retail_valuation_paise: stock * sellingPrice,
      };
    });

    reportRows.sort((a, b) => b.cost_valuation_paise - a.cost_valuation_paise);

    const grandTotals = reportRows.reduce(
      (acc, r) => {
        acc.total_units += r.current_stock;
        acc.cost_valuation_paise += r.cost_valuation_paise;
        acc.retail_valuation_paise += r.retail_valuation_paise;
        return acc;
      },
      { total_units: 0, cost_valuation_paise: 0, retail_valuation_paise: 0 }
    );

    const totalCount = reportRows.length;
    const paginatedRows = reportRows.slice((page - 1) * limit, page * limit);

    return { subType, dateRange: { startDate, endDate }, grandTotals, totalCount, page, limit, rows: paginatedRows };
  }

  // =========================================================================
  // 4. FINANCIAL REPORTS ENGINE
  // =========================================================================
  static async getFinancialReport(session: AppSession, filter: ReportFilterOptions = {}) {
    const role = session.role || session.member?.role || 'VIEWER';
    requirePermission(role, 'reports.view');
    const supabase = createAdminClient();
    const orgId = session.organization?.id || (session as any).organization_id;
    const { startDate, endDate } = this.getDateBoundaries(filter.range, filter.startDate, filter.endDate);
    const subType = filter.subType || 'receivables';
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    if (subType === 'receivables') {
      // Outstanding Customer Invoices & Aging Breakdown
      const today = new Date();
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, due_date, total_paise, paid_paise, customers(name)')
        .eq('organization_id', orgId)
        .not('status', 'in', '("draft","void","cancelled","paid")');

      if (error) throw new Error(`Receivables report failed: ${error.message}`);

      let totalOutstandingPaise = 0;
      let currentPaise = 0;
      let days1to30Paise = 0;
      let days31to60Paise = 0;
      let days61PlusPaise = 0;

      const rows = ((invoices || []) as any[]).map((inv) => {
        const total = Number(inv.total_paise || 0);
        const paid = Number(inv.paid_paise || 0);
        const balance = Math.max(0, total - paid);
        totalOutstandingPaise += balance;

        const dueDate = new Date(inv.due_date || inv.invoice_date);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        let agingCategory = 'Current';
        if (diffDays <= 0) {
          currentPaise += balance;
        } else if (diffDays <= 30) {
          agingCategory = '1-30 Days';
          days1to30Paise += balance;
        } else if (diffDays <= 60) {
          agingCategory = '31-60 Days';
          days31to60Paise += balance;
        } else {
          agingCategory = '61+ Days Overdue';
          days61PlusPaise += balance;
        }

        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          customer_name: (inv.customers as any)?.name || 'Guest',
          invoice_date: inv.invoice_date,
          due_date: inv.due_date || inv.invoice_date,
          total_paise: total,
          paid_paise: paid,
          balance_paise: balance,
          days_overdue: Math.max(0, diffDays),
          aging_category: agingCategory,
        };
      });

      rows.sort((a, b) => b.days_overdue - a.days_overdue);

      return {
        subType,
        dateRange: { startDate, endDate },
        agingSummary: {
          totalOutstandingPaise,
          currentPaise,
          days1to30Paise,
          days31to60Paise,
          days61PlusPaise,
        },
        totalCount: rows.length,
        page,
        limit,
        rows: rows.slice((page - 1) * limit, page * limit),
      };
    }

    if (subType === 'payables') {
      // Supplier Payables Aging Breakdown
      const today = new Date();
      const { data: bills, error } = await supabase
        .from('purchase_bills')
        .select('id, supplier_bill_number, vendor_name, bill_date, due_date, total_paise, paid_paise')
        .eq('organization_id', orgId)
        .not('status', 'in', '("draft","void","cancelled","paid")');

      if (error) throw new Error(`Payables report failed: ${error.message}`);

      let totalPayablesPaise = 0;
      const rows = ((bills || []) as any[]).map((b) => {
        const total = Number(b.total_paise || 0);
        const paid = Number(b.paid_paise || 0);
        const balance = Math.max(0, total - paid);
        totalPayablesPaise += balance;

        const dueDate = new Date(b.due_date || b.bill_date);
        const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        return {
          id: b.id,
          supplier_bill_number: b.supplier_bill_number || 'N/A',
          vendor_name: b.vendor_name || 'Vendor',
          bill_date: b.bill_date,
          due_date: b.due_date || b.bill_date,
          total_paise: total,
          paid_paise: paid,
          balance_paise: balance,
          days_overdue: Math.max(0, diffDays),
        };
      });

      rows.sort((a, b) => b.balance_paise - a.balance_paise);

      return {
        subType,
        dateRange: { startDate, endDate },
        totalPayablesPaise,
        totalCount: rows.length,
        page,
        limit,
        rows: rows.slice((page - 1) * limit, page * limit),
      };
    }

    if (subType === 'expenses') {
      // Expenses Breakdown
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('id, expense_date, vendor_name, amount_paise, gst_paise, payment_method, description, expense_categories(name)')
        .eq('organization_id', orgId)
        .eq('is_archived', false)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

      if (error) throw new Error(`Expenses report failed: ${error.message}`);

      const rows = ((expenses || []) as any[]).map((e) => ({
        id: e.id,
        expense_date: e.expense_date,
        category: (e.expense_categories as any)?.name || 'General',
        vendor_name: e.vendor_name || '-',
        payment_method: e.payment_method || 'cash',
        amount_paise: Number(e.amount_paise || 0),
        gst_paise: Number(e.gst_paise || 0),
        notes: e.description || '-',
      }));

      const totalAmountPaise = rows.reduce((sum, r) => sum + r.amount_paise, 0);
      const totalGstPaise = rows.reduce((sum, r) => sum + r.gst_paise, 0);

      return {
        subType,
        dateRange: { startDate, endDate },
        totals: { totalAmountPaise, totalGstPaise },
        totalCount: rows.length,
        page,
        limit,
        rows: rows.slice((page - 1) * limit, page * limit),
      };
    }

    // Default: Estimated Gross Profit Statement
    const [salesRes, purchasesRes, expensesRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('total_paise, taxable_paise, total_tax_paise')
        .eq('organization_id', orgId)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .not('status', 'in', '("draft","void","cancelled")'),

      supabase
        .from('purchase_bills')
        .select('total_paise, taxable_paise, gst_paise')
        .eq('organization_id', orgId)
        .gte('bill_date', startDate)
        .lte('bill_date', endDate)
        .not('status', 'in', '("draft","void","cancelled")'),

      supabase
        .from('expenses')
        .select('amount_paise')
        .eq('organization_id', orgId)
        .eq('is_archived', false)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate),
    ]);

    const salesRevenuePaise = ((salesRes.data || []) as any[]).reduce((sum, i) => sum + Number(i.total_paise || 0), 0);
    const purchasesCostPaise = ((purchasesRes.data || []) as any[]).reduce((sum, b) => sum + Number(b.total_paise || 0), 0);
    const operatingExpensesPaise = ((expensesRes.data || []) as any[]).reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);

    const grossProfitPaise = salesRevenuePaise - purchasesCostPaise;
    const netProfitPaise = grossProfitPaise - operatingExpensesPaise;
    const profitMarginPercent = salesRevenuePaise > 0 ? ((netProfitPaise / salesRevenuePaise) * 100).toFixed(1) : '0.0';

    return {
      subType: 'gross_profit',
      dateRange: { startDate, endDate },
      financialSummary: {
        salesRevenuePaise,
        purchasesCostPaise,
        operatingExpensesPaise,
        grossProfitPaise,
        netProfitPaise,
        profitMarginPercent,
      },
    };
  }
}
