import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { ReportService, ReportDatePreset } from '@/lib/services/report.service';
import { generateCSV } from '@/lib/utils/csv-exporter';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as ReportDatePreset) || 'this_month';
    const subType = searchParams.get('subType') || 'receivables';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const exportMode = searchParams.get('export');

    const data = await ReportService.getFinancialReport(session, {
      range,
      subType,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    if (exportMode === 'csv') {
      let headers: { key: string; label: string }[] = [];
      let formattedRows: Record<string, any>[] = [];

      if (subType === 'receivables') {
        headers = [
          { key: 'invoice_number', label: 'Invoice #' },
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'invoice_date', label: 'Date' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'total', label: 'Invoice Total (₹)' },
          { key: 'paid', label: 'Paid Amount (₹)' },
          { key: 'balance', label: 'Outstanding Balance (₹)' },
          { key: 'days_overdue', label: 'Days Overdue' },
          { key: 'aging_category', label: 'Aging Status' },
        ];
        formattedRows = (data.rows || []).map((r: any) => ({
          invoice_number: r.invoice_number,
          customer_name: r.customer_name,
          invoice_date: r.invoice_date,
          due_date: r.due_date,
          total: (r.total_paise / 100).toFixed(2),
          paid: (r.paid_paise / 100).toFixed(2),
          balance: (r.balance_paise / 100).toFixed(2),
          days_overdue: r.days_overdue,
          aging_category: r.aging_category,
        }));
      } else if (subType === 'payables') {
        headers = [
          { key: 'supplier_bill_number', label: 'Supplier Bill #' },
          { key: 'vendor_name', label: 'Vendor / Supplier' },
          { key: 'bill_date', label: 'Bill Date' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'total', label: 'Total Amount (₹)' },
          { key: 'paid', label: 'Paid (₹)' },
          { key: 'balance', label: 'Payable Balance (₹)' },
          { key: 'days_overdue', label: 'Days Overdue' },
        ];
        formattedRows = (data.rows || []).map((r: any) => ({
          supplier_bill_number: r.supplier_bill_number,
          vendor_name: r.vendor_name,
          bill_date: r.bill_date,
          due_date: r.due_date,
          total: (r.total_paise / 100).toFixed(2),
          paid: (r.paid_paise / 100).toFixed(2),
          balance: (r.balance_paise / 100).toFixed(2),
          days_overdue: r.days_overdue,
        }));
      } else if (subType === 'expenses') {
        headers = [
          { key: 'expense_date', label: 'Date' },
          { key: 'category', label: 'Category' },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'payment_method', label: 'Method' },
          { key: 'amount', label: 'Expense Amount (₹)' },
          { key: 'gst', label: 'Input GST (₹)' },
          { key: 'notes', label: 'Notes' },
        ];
        formattedRows = (data.rows || []).map((r: any) => ({
          expense_date: r.expense_date,
          category: r.category,
          vendor_name: r.vendor_name,
          payment_method: r.payment_method,
          amount: (r.amount_paise / 100).toFixed(2),
          gst: (r.gst_paise / 100).toFixed(2),
          notes: r.notes,
        }));
      } else {
        // Estimated Gross Profit
        const s = data.financialSummary || {
          salesRevenuePaise: 0,
          purchasesCostPaise: 0,
          grossProfitPaise: 0,
          operatingExpensesPaise: 0,
          netProfitPaise: 0,
          profitMarginPercent: 0,
        };
        headers = [
          { key: 'metric', label: 'P&L Line Item' },
          { key: 'amount', label: 'Amount (₹)' },
        ];
        formattedRows = [
          { metric: 'Sales Revenue (Invoices)', amount: (s.salesRevenuePaise / 100).toFixed(2) },
          { metric: 'Less: Cost of Purchases', amount: `-${(s.purchasesCostPaise / 100).toFixed(2)}` },
          { metric: 'Estimated Gross Trading Margin', amount: (s.grossProfitPaise / 100).toFixed(2) },
          { metric: 'Less: Operating Expenses', amount: `-${(s.operatingExpensesPaise / 100).toFixed(2)}` },
          { metric: 'Estimated Net Operating Profit', amount: (s.netProfitPaise / 100).toFixed(2) },
          { metric: 'Net Profit Margin Percentage', amount: `${s.profitMarginPercent}%` },
        ];
      }

      const csvString = generateCSV(headers, formattedRows);
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial_report_${subType}_${data.dateRange.startDate}_${data.dateRange.endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'REPORT_ERROR', message: err.message }, { status: 500 });
  }
}
