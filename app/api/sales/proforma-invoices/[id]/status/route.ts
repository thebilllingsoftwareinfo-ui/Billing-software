// ============================================================
// app/api/sales/proforma-invoices/[id]/status/route.ts — Proforma Status Update API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ProformaInvoiceService } from '@/lib/services/proforma-invoice.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();
    const result = await ProformaInvoiceService.updateProformaInvoiceStatus(session, id, status);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update proforma invoice status' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
