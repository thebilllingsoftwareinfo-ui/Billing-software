import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session';
import { ReportService, ReportDatePreset } from '@/lib/services/report.service';
import { generateCSV } from '@/lib/utils/csv-exporter';
import { formatCurrency } from '@/lib/utils/currency';

export async function GET(request: NextRequest) {
  try {
    const session = await getAppSession();
    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') as ReportDatePreset) || 'this_month';
    const subType = searchParams.get('subType') || 'daily';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const exportMode = searchParams.get('export');

    const data = await ReportService.getSalesReport(session, {
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

      if (subType === 'customer') {
        headers = [
          { key: 'customer_name', label: 'Customer Name' },
          { key: 'gstin', label: 'GSTIN' },
          { key: 'invoice_count', label: 'Invoices' },
          { key: 'taxable', label: 'Taxable Amount (₹)' },
          { key: 'tax', label: 'GST Tax (₹)' },
          { key: 'total', label: 'Total Sales (₹)' },
          { key: 'paid', label: 'Amount Paid (₹)' },
          { key: 'outstanding', label: 'Outstanding (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          customer_name: r.customer_name,
          gstin: r.gstin,
          invoice_count: r.invoice_count,
          taxable: (r.taxable_paise / 100).toFixed(2),
          tax: (r.tax_paise / 100).toFixed(2),
          total: (r.total_paise / 100).toFixed(2),
          paid: (r.paid_paise / 100).toFixed(2),
          outstanding: (r.outstanding_paise / 100).toFixed(2),
        }));
      } else if (subType === 'product') {
        headers = [
          { key: 'product_name', label: 'Product Name' },
          { key: 'quantity_sold', label: 'Units Sold' },
          { key: 'avg_price', label: 'Avg Price (₹)' },
          { key: 'taxable', label: 'Taxable Amount (₹)' },
          { key: 'tax', label: 'GST Tax (₹)' },
          { key: 'total', label: 'Total Revenue (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          product_name: r.product_name,
          quantity_sold: r.quantity_sold,
          avg_price: (r.avg_price_paise / 100).toFixed(2),
          taxable: (r.taxable_paise / 100).toFixed(2),
          tax: (r.tax_paise / 100).toFixed(2),
          total: (r.total_paise / 100).toFixed(2),
        }));
      } else if (subType === 'tax') {
        headers = [
          { key: 'gst_rate', label: 'GST Tax Rate (%)' },
          { key: 'item_count', label: 'Line Items' },
          { key: 'taxable', label: 'Taxable Value (₹)' },
          { key: 'cgst', label: 'CGST (₹)' },
          { key: 'sgst', label: 'SGST (₹)' },
          { key: 'igst', label: 'IGST (₹)' },
          { key: 'total_tax', label: 'Total GST (₹)' },
          { key: 'total', label: 'Grand Total (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          gst_rate: `${r.gst_rate}%`,
          item_count: r.item_count,
          taxable: (r.taxable_paise / 100).toFixed(2),
          cgst: (r.cgst_paise / 100).toFixed(2),
          sgst: (r.sgst_paise / 100).toFixed(2),
          igst: (r.igst_paise / 100).toFixed(2),
          total_tax: (r.total_tax_paise / 100).toFixed(2),
          total: (r.total_paise / 100).toFixed(2),
        }));
      } else {
        headers = [
          { key: 'period', label: 'Period Date' },
          { key: 'invoice_count', label: 'Invoices' },
          { key: 'taxable', label: 'Taxable (₹)' },
          { key: 'tax', label: 'Tax (₹)' },
          { key: 'total', label: 'Total Revenue (₹)' },
          { key: 'paid', label: 'Collected (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          period: r.period,
          invoice_count: r.invoice_count,
          taxable: (r.taxable_paise / 100).toFixed(2),
          tax: (r.tax_paise / 100).toFixed(2),
          total: (r.total_paise / 100).toFixed(2),
          paid: (r.paid_paise / 100).toFixed(2),
        }));
      }

      const csvString = generateCSV(headers, formattedRows);
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sales_report_${subType}_${data.dateRange.startDate}_${data.dateRange.endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'REPORT_ERROR', message: err.message }, { status: 500 });
  }
}
