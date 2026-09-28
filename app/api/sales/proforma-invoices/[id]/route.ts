// ============================================================
// app/api/sales/proforma-invoices/[id]/route.ts — Proforma Invoice Detail & Delete API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ProformaInvoiceService } from '@/lib/services/proforma-invoice.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pi = await ProformaInvoiceService.getProformaInvoice(session, id);

    return NextResponse.json(pi);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get proforma invoice' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await ProformaInvoiceService.deleteProformaInvoice(session, id);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete proforma invoice' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
