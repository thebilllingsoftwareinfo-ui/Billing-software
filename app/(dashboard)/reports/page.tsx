'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ShoppingBag, Package, PieChart, ShieldAlert } from 'lucide-react';
import { ReportFilterBar } from '@/components/reports/report-filter-bar';
import { ReportTable, ColumnDef } from '@/components/reports/report-table';
import { ReportDatePreset } from '@/lib/services/report.service';
import { formatCurrency } from '@/lib/utils/currency';
import { generatePDFReportHTML } from '@/lib/utils/pdf-report-generator';

type MainTab = 'sales' | 'purchases' | 'inventory' | 'financial';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('sales');
  const [range, setRange] = useState<ReportDatePreset>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [subType, setSubType] = useState('daily');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // Sub-type option configurations for each main report domain
  const subTypeOptionsMap: Record<MainTab, { value: string; label: string }[]> = {
    sales: [
      { value: 'daily', label: 'Daily Sales' },
      { value: 'weekly', label: 'Weekly Sales' },
      { value: 'monthly', label: 'Monthly Sales' },
      { value: 'customer', label: 'Customer-wise' },
      { value: 'product', label: 'Product-wise' },
      { value: 'tax', label: 'Tax-wise (GST)' },
    ],
    purchases: [
      { value: 'supplier', label: 'Supplier-wise' },
      { value: 'product', label: 'Product-wise' },
    ],
    inventory: [
      { value: 'current_stock', label: 'Current Stock' },
      { value: 'movement', label: 'Stock Movement' },
      { value: 'low_stock', label: 'Low Stock' },
      { value: 'valuation', label: 'Stock Valuation' },
    ],
    financial: [
      { value: 'receivables', label: 'Receivables Aging' },
      { value: 'payables', label: 'Payables Aging' },
      { value: 'expenses', label: 'Expenses' },
      { value: 'gross_profit', label: 'Estimated Gross Profit' },
    ],
  };

  // Reset sub-type when main tab changes
  useEffect(() => {
    const defaultSub = subTypeOptionsMap[activeTab][0].value;
    setSubType(defaultSub);
    setPage(1);
    setSearch('');
  }, [activeTab]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [range, startDate, endDate, subType, search]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('range', range);
      params.set('subType', subType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search) params.set('search', search);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/reports/${activeTab}?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to load report data');
      }

      const json = await res.json();
      setReportData(json);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching reports');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, range, subType, startDate, endDate, search, page, limit]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle CSV Export
  const handleExportCSV = () => {
    const params = new URLSearchParams();
    params.set('range', range);
    params.set('subType', subType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (search) params.set('search', search);
    params.set('export', 'csv');

    window.open(`/api/reports/${activeTab}?${params.toString()}`, '_blank');
  };

  // Handle Printable PDF Export
  const handleExportPDF = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const subObj = subTypeOptionsMap[activeTab].find((o) => o.value === subType);
    const title = `${activeTab.toUpperCase()} REPORT - ${subObj?.label || subType}`;
    const dateStr = `${reportData.dateRange?.startDate || ''} to ${reportData.dateRange?.endDate || ''}`;

    let printHeaders: { key: string; label: string; align?: 'left' | 'right' | 'center' }[] = [];
    let printRows: Record<string, any>[] = [];

    // Format rows for print window
    if (columns.length > 0) {
      printHeaders = columns.map((c) => ({ key: c.key, label: c.label, align: c.align }));
      printRows = (reportData.rows || []).map((row: any) => {
        const obj: Record<string, any> = {};
        for (const col of columns) {
          obj[col.key] = row[col.key] !== undefined ? row[col.key] : '-';
        }
        return obj;
      });
    }

    const htmlContent = generatePDFReportHTML(
      title,
      'Wevly BusinessOS Enterprise',
      dateStr,
      printHeaders,
      printRows
    );

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Columns & Summary Definitions based on domain & sub-type
  let columns: ColumnDef[] = [];
  let summaryRow: Record<string, any> | undefined = undefined;

  if (activeTab === 'sales') {
    if (subType === 'customer') {
      columns = [
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'invoice_count', label: 'Invoices', align: 'center' },
        { key: 'taxable_paise', label: 'Taxable (₹)', align: 'right', render: (r) => formatCurrency(r.taxable_paise) },
        { key: 'tax_paise', label: 'Tax (₹)', align: 'right', render: (r) => formatCurrency(r.tax_paise) },
        { key: 'total_paise', label: 'Total Sales (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
        { key: 'paid_paise', label: 'Paid (₹)', align: 'right', render: (r) => formatCurrency(r.paid_paise) },
        { key: 'outstanding_paise', label: 'Outstanding (₹)', align: 'right', render: (r) => <span className="text-amber-600 font-bold">{formatCurrency(r.outstanding_paise)}</span> },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          invoice_count: '-',
          taxable_paise: formatCurrency(reportData.grandTotals.taxable_paise),
          tax_paise: formatCurrency(reportData.grandTotals.tax_paise),
          total_paise: formatCurrency(reportData.grandTotals.total_paise),
          paid_paise: formatCurrency(reportData.grandTotals.paid_paise),
          outstanding_paise: formatCurrency(reportData.grandTotals.outstanding_paise),
        };
      }
    } else if (subType === 'product') {
      columns = [
        { key: 'product_name', label: 'Product Name' },
        { key: 'quantity_sold', label: 'Units Sold', align: 'center' },
        { key: 'avg_price_paise', label: 'Avg Price (₹)', align: 'right', render: (r) => formatCurrency(r.avg_price_paise) },
        { key: 'taxable_paise', label: 'Taxable Value (₹)', align: 'right', render: (r) => formatCurrency(r.taxable_paise) },
        { key: 'tax_paise', label: 'GST Tax (₹)', align: 'right', render: (r) => formatCurrency(r.tax_paise) },
        { key: 'total_paise', label: 'Total Revenue (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          quantity_sold: reportData.grandTotals.quantity_sold,
          avg_price_paise: '-',
          taxable_paise: formatCurrency(reportData.grandTotals.taxable_paise),
          tax_paise: formatCurrency(reportData.grandTotals.tax_paise),
          total_paise: formatCurrency(reportData.grandTotals.total_paise),
        };
      }
    } else if (subType === 'tax') {
      columns = [
        { key: 'gst_rate', label: 'GST Rate', render: (r) => `${r.gst_rate}%` },
        { key: 'item_count', label: 'Items', align: 'center' },
        { key: 'taxable_paise', label: 'Taxable Base (₹)', align: 'right', render: (r) => formatCurrency(r.taxable_paise) },
        { key: 'cgst_paise', label: 'CGST (₹)', align: 'right', render: (r) => formatCurrency(r.cgst_paise) },
        { key: 'sgst_paise', label: 'SGST (₹)', align: 'right', render: (r) => formatCurrency(r.sgst_paise) },
        { key: 'igst_paise', label: 'IGST (₹)', align: 'right', render: (r) => formatCurrency(r.igst_paise) },
        { key: 'total_tax_paise', label: 'Total Tax (₹)', align: 'right', render: (r) => formatCurrency(r.total_tax_paise) },
        { key: 'total_paise', label: 'Grand Total (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          item_count: '-',
          taxable_paise: formatCurrency(reportData.grandTotals.taxable_paise),
          cgst_paise: formatCurrency(reportData.grandTotals.cgst_paise),
          sgst_paise: formatCurrency(reportData.grandTotals.sgst_paise),
          igst_paise: formatCurrency(reportData.grandTotals.igst_paise),
          total_tax_paise: formatCurrency(reportData.grandTotals.total_tax_paise),
          total_paise: formatCurrency(reportData.grandTotals.total_paise),
        };
      }
    } else {
      columns = [
        { key: 'period', label: 'Date Period' },
        { key: 'invoice_count', label: 'Invoices', align: 'center' },
        { key: 'taxable_paise', label: 'Taxable (₹)', align: 'right', render: (r) => formatCurrency(r.taxable_paise) },
        { key: 'tax_paise', label: 'Tax (₹)', align: 'right', render: (r) => formatCurrency(r.tax_paise) },
        { key: 'total_paise', label: 'Total Revenue (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
        { key: 'paid_paise', label: 'Collected (₹)', align: 'right', render: (r) => formatCurrency(r.paid_paise) },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          invoice_count: reportData.grandTotals.invoice_count,
          taxable_paise: formatCurrency(reportData.grandTotals.taxable_paise),
          tax_paise: formatCurrency(reportData.grandTotals.tax_paise),
          total_paise: formatCurrency(reportData.grandTotals.total_paise),
          paid_paise: formatCurrency(reportData.grandTotals.paid_paise),
        };
      }
    }
  } else if (activeTab === 'purchases') {
    if (subType === 'product') {
      columns = [
        { key: 'description', label: 'Item Description' },
        { key: 'quantity_purchased', label: 'Qty Purchased', align: 'center' },
        { key: 'avg_unit_cost_paise', label: 'Avg Unit Cost (₹)', align: 'right', render: (r) => formatCurrency(r.avg_unit_cost_paise) },
        { key: 'taxable_paise', label: 'Taxable (₹)', align: 'right', render: (r) => formatCurrency(r.taxable_paise) },
        { key: 'tax_paise', label: 'Input GST (₹)', align: 'right', render: (r) => formatCurrency(r.tax_paise) },
        { key: 'total_paise', label: 'Total Purchase (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          quantity_purchased: reportData.grandTotals.quantity_purchased,
          avg_unit_cost_paise: '-',
          taxable_paise: formatCurrency(reportData.grandTotals.taxable_paise),
          tax_paise: formatCurrency(reportData.grandTotals.tax_paise),
          total_paise: formatCurrency(reportData.grandTotals.total_paise),
        };
      }
    } else {
      columns = [
        { key: 'supplier_name', label: 'Supplier / Vendor' },
        { key: 'bill_count', label: 'Bills', align: 'center' },
        { key: 'taxable_paise', label: 'Taxable (₹)', align: 'right', render: (r) => formatCurrency(r.taxable_paise) },
        { key: 'gst_paise', label: 'Input GST (₹)', align: 'right', render: (r) => formatCurrency(r.gst_paise) },
        { key: 'total_paise', label: 'Total Purchase (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
        { key: 'payable_outstanding_paise', label: 'Payable Balance (₹)', align: 'right', render: (r) => <span className="text-red-600 font-bold">{formatCurrency(r.payable_outstanding_paise)}</span> },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          bill_count: reportData.grandTotals.bill_count,
          taxable_paise: formatCurrency(reportData.grandTotals.taxable_paise),
          gst_paise: formatCurrency(reportData.grandTotals.gst_paise),
          total_paise: formatCurrency(reportData.grandTotals.total_paise),
          payable_outstanding_paise: formatCurrency(reportData.grandTotals.payable_outstanding_paise),
        };
      }
    }
  } else if (activeTab === 'inventory') {
    if (subType === 'movement') {
      columns = [
        { key: 'date', label: 'Date' },
        { key: 'product_name', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'movement_type', label: 'Type', render: (r) => <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[11px]">{r.movement_type}</span> },
        { key: 'quantity', label: 'Qty Delta', align: 'center', render: (r) => <span className={r.quantity > 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</span> },
        { key: 'reference', label: 'Reference #' },
        { key: 'notes', label: 'Notes' },
      ];
    } else {
      columns = [
        { key: 'name', label: 'Product Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'category', label: 'Category' },
        { key: 'current_stock', label: 'Current Stock', align: 'center', render: (r) => <span className={r.current_stock <= r.min_stock ? 'text-red-600 font-bold' : 'text-gray-800'}>{r.current_stock} {r.unit}</span> },
        { key: 'min_stock', label: 'Min Stock', align: 'center' },
        { key: 'purchase_price_paise', label: 'Cost Price (₹)', align: 'right', render: (r) => formatCurrency(r.purchase_price_paise) },
        { key: 'cost_valuation_paise', label: 'Valuation at Cost (₹)', align: 'right', render: (r) => formatCurrency(r.cost_valuation_paise) },
        { key: 'selling_price_paise', label: 'Retail Price (₹)', align: 'right', render: (r) => formatCurrency(r.selling_price_paise) },
        { key: 'retail_valuation_paise', label: 'Valuation at Retail (₹)', align: 'right', render: (r) => formatCurrency(r.retail_valuation_paise) },
      ];
      if (reportData?.grandTotals) {
        summaryRow = {
          current_stock: `${reportData.grandTotals.total_units} items`,
          cost_valuation_paise: formatCurrency(reportData.grandTotals.cost_valuation_paise),
          retail_valuation_paise: formatCurrency(reportData.grandTotals.retail_valuation_paise),
        };
      }
    }
  } else if (activeTab === 'financial') {
    if (subType === 'receivables') {
      columns = [
        { key: 'invoice_number', label: 'Invoice #' },
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'total_paise', label: 'Total (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
        { key: 'paid_paise', label: 'Paid (₹)', align: 'right', render: (r) => formatCurrency(r.paid_paise) },
        { key: 'balance_paise', label: 'Outstanding (₹)', align: 'right', render: (r) => <span className="text-amber-600 font-bold">{formatCurrency(r.balance_paise)}</span> },
        { key: 'days_overdue', label: 'Days Overdue', align: 'center', render: (r) => r.days_overdue > 0 ? <span className="text-red-600 font-bold">{r.days_overdue} days</span> : <span className="text-emerald-600">On Time</span> },
        { key: 'aging_category', label: 'Aging Status' },
      ];
    } else if (subType === 'payables') {
      columns = [
        { key: 'supplier_bill_number', label: 'Bill #' },
        { key: 'vendor_name', label: 'Vendor' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'total_paise', label: 'Total (₹)', align: 'right', render: (r) => formatCurrency(r.total_paise) },
        { key: 'paid_paise', label: 'Paid (₹)', align: 'right', render: (r) => formatCurrency(r.paid_paise) },
        { key: 'balance_paise', label: 'Payable (₹)', align: 'right', render: (r) => <span className="text-red-600 font-bold">{formatCurrency(r.balance_paise)}</span> },
        { key: 'days_overdue', label: 'Days Overdue', align: 'center' },
      ];
    } else if (subType === 'expenses') {
      columns = [
        { key: 'expense_date', label: 'Date' },
        { key: 'category', label: 'Category' },
        { key: 'vendor_name', label: 'Vendor' },
        { key: 'payment_method', label: 'Method' },
        { key: 'amount_paise', label: 'Amount (₹)', align: 'right', render: (r) => formatCurrency(r.amount_paise) },
        { key: 'gst_paise', label: 'Input GST (₹)', align: 'right', render: (r) => formatCurrency(r.gst_paise) },
      ];
      if (reportData?.totals) {
        summaryRow = {
          amount_paise: formatCurrency(reportData.totals.totalAmountPaise),
          gst_paise: formatCurrency(reportData.totals.totalGstPaise),
        };
      }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time server-side business reporting, analytics, CSV data exports, and PDF printouts.
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Sales Reports
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'purchases'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Purchases Reports
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Inventory Reports
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'financial'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Financial Reports
        </button>
      </div>

      {/* Filter Control Bar */}
      <ReportFilterBar
        range={range}
        setRange={setRange}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        subType={subType}
        setSubType={setSubType}
        subTypeOptions={subTypeOptionsMap[activeTab]}
        search={search}
        setSearch={setSearch}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        isLoading={isLoading}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Gross Profit Special Card View */}
      {activeTab === 'financial' && subType === 'gross_profit' && reportData?.financialSummary ? (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-3">Estimated Gross Profit Statement</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Sales Revenue</span>
              <p className="text-2xl font-extrabold text-blue-950 mt-1">{formatCurrency(reportData.financialSummary.salesRevenuePaise)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Purchases Cost</span>
              <p className="text-2xl font-extrabold text-purple-950 mt-1">{formatCurrency(reportData.financialSummary.purchasesCostPaise)}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Operating Expenses</span>
              <p className="text-2xl font-extrabold text-amber-950 mt-1">{formatCurrency(reportData.financialSummary.operatingExpensesPaise)}</p>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-700 rounded-xl text-white shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Estimated Net Operating Profit</span>
              <p className="text-3xl font-black mt-1">{formatCurrency(reportData.financialSummary.netProfitPaise)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-100">Profit Margin</span>
              <p className="text-3xl font-bold">{reportData.financialSummary.profitMarginPercent}%</p>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Paginated Report Table */
        <ReportTable
          columns={columns}
          rows={reportData?.rows || []}
          isLoading={isLoading}
          totalCount={reportData?.totalCount || 0}
          page={page}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          summaryRow={summaryRow}
        />
      )}
    </div>
  );
}
