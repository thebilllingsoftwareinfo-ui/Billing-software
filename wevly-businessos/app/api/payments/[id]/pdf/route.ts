import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getServerSession } from '@/lib/auth/session';
import { PaymentService } from '@/lib/services/payment.service';
import { PaymentReceiptPDFDocument } from '@/components/pdf/payment-receipt-pdf-template';

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
    const payment = await PaymentService.getPaymentDetails(session, id);

    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    // Render PDF buffer using @react-pdf/renderer
    const pdfElement = React.createElement(PaymentReceiptPDFDocument, { payment });
    const buffer = await renderToBuffer(pdfElement as any);

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length.toString(),
      'Content-Disposition': download
        ? `attachment; filename="Payment_Receipt_${payment.id.slice(0, 8)}.pdf"`
        : `inline; filename="Payment_Receipt_${payment.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    return new NextResponse(buffer as unknown as BodyInit, { headers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate payment receipt PDF' },
      { status: 500 }
    );
  }
}
