import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getServerSession } from '@/lib/auth/session';
import { QuotationService } from '@/lib/services/quotation.service';
import { QuotationPDFDocument } from '@/components/pdf/quotation-pdf-template';

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
    const quotation = await QuotationService.getQuotationDetails(session, id);

    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    const pdfElement = React.createElement(QuotationPDFDocument, { quotation });
    const buffer = await renderToBuffer(pdfElement as any);

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length.toString(),
      'Content-Disposition': download
        ? `attachment; filename="Quotation_${quotation.quotation_number}.pdf"`
        : `inline; filename="Quotation_${quotation.quotation_number}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    return new NextResponse(buffer as unknown as BodyInit, { headers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate quotation PDF' },
      { status: 500 }
    );
  }
}
