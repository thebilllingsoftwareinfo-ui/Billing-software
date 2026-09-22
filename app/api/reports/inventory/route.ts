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
    const subType = searchParams.get('subType') || 'current_stock';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const exportMode = searchParams.get('export');

    const data = await ReportService.getInventoryReport(session, {
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

      if (subType === 'movement') {
        headers = [
          { key: 'date', label: 'Date' },
          { key: 'product_name', label: 'Item Name' },
          { key: 'sku', label: 'SKU' },
          { key: 'movement_type', label: 'Movement Type' },
          { key: 'quantity', label: 'Qty Delta' },
          { key: 'reference', label: 'Reference #' },
          { key: 'notes', label: 'Notes' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          date: r.date,
          product_name: r.product_name,
          sku: r.sku,
          movement_type: r.movement_type,
          quantity: r.quantity > 0 ? `+${r.quantity}` : `${r.quantity}`,
          reference: r.reference,
          notes: r.notes,
        }));
      } else {
        headers = [
          { key: 'name', label: 'Product Name' },
          { key: 'sku', label: 'SKU' },
          { key: 'category', label: 'Category' },
          { key: 'current_stock', label: 'Current Stock' },
          { key: 'min_stock', label: 'Min Stock' },
          { key: 'unit', label: 'Unit' },
          { key: 'cost_price', label: 'Cost Price (₹)' },
          { key: 'cost_val', label: 'Asset Valuation at Cost (₹)' },
          { key: 'selling_price', label: 'Selling Price (₹)' },
          { key: 'retail_val', label: 'Valuation at Retail (₹)' },
        ];
        formattedRows = data.rows.map((r: any) => ({
          name: r.name,
          sku: r.sku,
          category: r.category,
          current_stock: r.current_stock,
          min_stock: r.min_stock,
          unit: r.unit,
          cost_price: (r.purchase_price_paise / 100).toFixed(2),
          cost_val: (r.cost_valuation_paise / 100).toFixed(2),
          selling_price: (r.selling_price_paise / 100).toFixed(2),
          retail_val: (r.retail_valuation_paise / 100).toFixed(2),
        }));
      }

      const csvString = generateCSV(headers, formattedRows);
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory_report_${subType}_${data.dateRange.startDate}_${data.dateRange.endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'REPORT_ERROR', message: err.message }, { status: 500 });
  }
}
