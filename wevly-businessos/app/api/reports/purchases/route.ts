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
    const subType = searchParams.get('subType') || 'supplier';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const exportMode = searchParams.get('export');

    const data = await ReportService.getPurchasesReport(session, {
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

      if (subType === 'product') {
        headers = [
          { key: 'description', label: 'Item Description' },
          { key: 'quantity_purchased', label: 'Qty Purchased' },
          { key: 'avg_cost', label: 'Avg Unit Cost (₹)' },
          { key: 'taxable', label: 'Taxable Amount (₹)' },
          { key: 'tax', label: 'Input GST (₹)' },
          { key: 'total', label: 'Total Purchase (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          description: r.description,
          quantity_purchased: r.quantity_purchased,
          avg_cost: (r.avg_unit_cost_paise / 100).toFixed(2),
          taxable: (r.taxable_paise / 100).toFixed(2),
          tax: (r.tax_paise / 100).toFixed(2),
          total: (r.total_paise / 100).toFixed(2),
        }));
      } else {
        headers = [
          { key: 'supplier_name', label: 'Supplier / Vendor' },
          { key: 'bill_count', label: 'Bills' },
          { key: 'taxable', label: 'Taxable Amount (₹)' },
          { key: 'gst', label: 'Input GST (₹)' },
          { key: 'total', label: 'Total Purchase (₹)' },
          { key: 'outstanding', label: 'Payable Balance (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          supplier_name: r.supplier_name,
          bill_count: r.bill_count,
          taxable: (r.taxable_paise / 100).toFixed(2),
          gst: (r.gst_paise / 100).toFixed(2),
          total: (r.total_paise / 100).toFixed(2),
          outstanding: (r.payable_outstanding_paise / 100).toFixed(2),
        }));
      }

      const csvString = generateCSV(headers, formattedRows);
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="purchases_report_${subType}_${data.dateRange.startDate}_${data.dateRange.endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'REPORT_ERROR', message: err.message }, { status: 500 });
  }
}
