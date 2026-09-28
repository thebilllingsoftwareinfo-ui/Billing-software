import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { QuotationService } from '@/lib/services/quotation.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const target = body?.target || 'invoice';

    let result;
    if (target === 'sales_order') {
      result = await QuotationService.convertQuotationToSalesOrder(session, id);
    } else if (target === 'proforma' || target === 'proforma_invoice') {
      result = await QuotationService.convertQuotationToProforma(session, id);
    } else {
      result = await QuotationService.convertQuotationToInvoice(session, id);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to convert quotation' },
      { status: 400 }
    );
  }
}
