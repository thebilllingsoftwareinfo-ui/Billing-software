// ============================================================
// app/api/sales/proforma-invoices/[id]/convert/route.ts — Convert Proforma to Invoice API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ProformaInvoiceService } from '@/lib/services/proforma-invoice.service';

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
    const result = await ProformaInvoiceService.convertToInvoice(session, id);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to convert proforma invoice to invoice' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
