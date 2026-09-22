import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDFDocument } from '@/components/pdf/invoice-pdf-templates'
import { PDFTemplateType } from '@/lib/constants/invoice-templates'
import { can } from '@/lib/auth/permissions'
import { getApiSession } from '@/lib/auth/api-session'

import { demoGetInvoice, demoGetOrganizationProfile } from '@/lib/services/demo-store'
import { buildUpiDeepLink, generateQrDataUrl } from '@/lib/utils/upi-qr'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getApiSession()

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!can(session.role, 'invoices.view')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const template = (searchParams.get('template') || 'standard') as PDFTemplateType
    const isDownload = searchParams.get('download') === 'true'

    const supabase = await createClient()

    // Fetch snapshot data from finalized/draft invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select(
        `*,
        customers(display_name, gstin, phone, email, state, address_line1, city),
        invoice_items(*),
        invoice_taxes(*)`
      )
      .eq('id', id)
      .eq('organization_id', session.organization_id)
      .single()

    const activeInvoice = invoice || demoGetInvoice(id)

    if (!activeInvoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 })
    }

    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', session.organization_id)
      .single()

    const activeOrg = organization || demoGetOrganizationProfile()

    // Generate Dynamic UPI QR Code Data URL
    let qrDataUrl: string | null = null
    const upiId = activeOrg.upi_id || 'billing@upi'
    if (upiId) {
      const totAmt = Number(activeInvoice.total_amount) || 0
      const paidAmt = Number(activeInvoice.amount_paid) || 0
      const dueAmt = activeInvoice.balance_due !== undefined ? Number(activeInvoice.balance_due) : Math.max(0, totAmt - paidAmt)
      const qrRequestAmt = dueAmt > 0 ? dueAmt : totAmt

      const upiLink = buildUpiDeepLink({
        pa: upiId,
        pn: activeOrg.name || 'Merchant',
        am: qrRequestAmt,
        tr: activeInvoice.invoice_number || 'BILL',
        tn: `Bill ${activeInvoice.invoice_number}`,
      })
      qrDataUrl = await generateQrDataUrl(upiLink, { width: 180, margin: 1 })
    }

    const pdfData = {
      ...activeInvoice,
      organization: activeOrg,
      qr_data_url: qrDataUrl,
    }

    // Server-side PDF rendering using @react-pdf/renderer
    const pdfElement = InvoicePDFDocument({ data: pdfData, template })
    const pdfBuffer = await renderToBuffer(pdfElement)

    const filename = `Invoice_${activeInvoice.invoice_number || 'DOC'}.pdf`
    const disposition = isDownload ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err: any) {
    console.error('[Server-Side Invoice PDF API] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate PDF document server-side' },
      { status: 500 }
    )
  }
}
