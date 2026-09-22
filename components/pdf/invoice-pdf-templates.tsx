import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { numberToRupeeWords } from '@/lib/utils/number-to-words'
import { PDFTemplateType } from '@/lib/constants/invoice-templates'

export type { PDFTemplateType }

export interface InvoicePDFData {
  invoice_number: string
  invoice_date: string
  due_date?: string | null
  status: string
  payment_status?: string
  payment_mode?: string
  payment_reference?: string
  place_of_supply?: string | null
  reference_number?: string | null
  subtotal: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_tax_amount: number
  round_off_amount: number
  total_amount: number
  amount_paid: number
  balance_due?: number
  notes?: string | null
  terms_and_conditions?: string | null
  is_inter_state: boolean
  qr_data_url?: string | null
  challan_no?: string | null
  challan_date?: string | null
  e_way_bill_no?: string | null
  transport?: string | null
  transport_id?: string | null
  customers?: {
    display_name: string
    gstin?: string | null
    phone?: string | null
    email?: string | null
    state?: string | null
    address_line1?: string | null
    city?: string | null
  } | null
  organization?: {
    name: string
    legal_name?: string | null
    trade_name?: string | null
    gstin?: string | null
    pan?: string | null
    logo_url?: string | null
    address_line1?: string | null
    address_line2?: string | null
    city?: string | null
    state_code?: string | null
    postal_code?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    bank_name?: string | null
    bank_account_name?: string | null
    bank_account_number?: string | null
    bank_ifsc?: string | null
    bank_branch?: string | null
    upi_id?: string | null
  } | null
  invoice_items: Array<{
    id?: string
    description: string
    hsn_sac_code?: string | null
    quantity: number
    unit?: string | null
    unit_price: number
    discount_percent: number
    gst_rate: number
    line_total: number
    taxable_amount: number
  }>
  invoice_taxes?: Array<{
    hsn_sac_code?: string | null
    taxable_amount: number
    gst_rate: number
    cgst_amount: number
    sgst_amount: number
    igst_amount: number
  }>
}

// ============================================================
// TEMPLATE 1: STANDARD GST PRO (TALLY / VYAPAR STYLE)
// ============================================================
const standardStyles = StyleSheet.create({
  page: { padding: 20, fontSize: 8, fontFamily: 'Helvetica', color: '#111827' },
  outerBorder: { borderWidth: 1, borderColor: '#111827', flex: 1, padding: 0 },
  topHeader: { padding: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#111827' },
  companyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  compLeft: { width: '70%' },
  compTitle: { fontSize: 16, fontWeight: 'black', textTransform: 'uppercase', color: '#1e3a8a', letterSpacing: 0.5 },
  subBanner: { backgroundColor: '#0284c7', color: '#ffffff', fontSize: 7.5, fontWeight: 'bold', padding: '2 6', marginTop: 2, alignSelf: 'flex-start', borderRadius: 2 },
  compAddress: { fontSize: 7, color: '#374151', marginTop: 3 },
  compContacts: { fontSize: 7, color: '#374151', textAlign: 'right' },
  logoImg: { width: 52, height: 42, objectFit: 'contain', alignSelf: 'flex-end', marginTop: 2 },
  taxInvoiceBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#111827', padding: '3 8' },
  panText: { fontSize: 7.5, fontWeight: 'bold' },
  docTitle: { fontSize: 11, fontWeight: 'black', letterSpacing: 1, textTransform: 'uppercase' },
  copyType: { fontSize: 7, fontWeight: 'bold', color: '#4b5563' },
  metaGrid: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827' },
  metaLeft: { width: '50%', borderRightWidth: 1, borderRightColor: '#111827', padding: 5 },
  metaRight: { width: '50%', padding: 5 },
  metaSectionHeader: { fontSize: 7.5, fontWeight: 'bold', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingBottom: 2, marginBottom: 2, textTransform: 'uppercase', color: '#1e3a8a' },
  metaLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 },
  metaLabel: { fontSize: 7, color: '#4b5563', width: '35%' },
  metaVal: { fontSize: 7, fontWeight: 'bold', color: '#111827', width: '65%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#111827', paddingVertical: 3 },
  thCell: { fontSize: 7.5, fontWeight: 'bold', textAlign: 'center', borderRightWidth: 0.5, borderRightColor: '#e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', minHeight: 14, alignItems: 'center' },
  tdCell: { fontSize: 7, paddingHorizontal: 3, borderRightWidth: 0.5, borderRightColor: '#e5e7eb' },
  colSr: { width: '6%', textAlign: 'center' },
  colDesc: { width: '44%' },
  colHsn: { width: '12%', textAlign: 'center' },
  colQty: { width: '10%', textAlign: 'right' },
  colRate: { width: '13%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right', borderRightWidth: 0 },
  tableFooterTotal: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#111827', backgroundColor: '#f9fafb', paddingVertical: 3 },
  wordsRow: { padding: '4 6', borderBottomWidth: 1, borderBottomColor: '#111827', backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between' },
  hsnTable: { borderBottomWidth: 1, borderBottomColor: '#111827' },
  hsnTh: { backgroundColor: '#f3f4f6', flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#111827', paddingVertical: 2 },
  hsnRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 1.5 },
  bottomSection: { flexDirection: 'row', flex: 1 },
  bankCol: { width: '38%', borderRightWidth: 1, borderRightColor: '#111827', padding: 5 },
  qrCol: { width: '22%', borderRightWidth: 1, borderRightColor: '#111827', padding: 4, alignItems: 'center', justifyContent: 'center' },
  signCol: { width: '40%', padding: 5, justifyContent: 'space-between' },
  termsBox: { borderTopWidth: 1, borderTopColor: '#111827', padding: 4, fontSize: 6.5, color: '#4b5563' },
})

function StandardGSTInvoicePDF({ data }: { data: InvoicePDFData }) {
  const org = data.organization || { name: 'Your Business Name' }
  const cust = data.customers || { display_name: 'Walk-in Customer' }
  const total = Number(data.total_amount) || 0
  const words = numberToRupeeWords(total)
  const totalQty = data.invoice_items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
  const taxes = data.invoice_taxes || []
  const hasLogo = Boolean(org.logo_url && (org.logo_url.startsWith('data:image') || org.logo_url.startsWith('http')))
  const totalTaxAmount = Number(data.total_tax_amount || 0)
  const taxWords = numberToRupeeWords(totalTaxAmount)

  return (
    <Document title={`Invoice_${data.invoice_number}`}>
      <Page size="A4" style={standardStyles.page}>
        <View style={standardStyles.outerBorder}>
          {/* Top Company Header */}
          <View style={standardStyles.topHeader}>
            <View style={standardStyles.companyRow}>
              <View style={standardStyles.compLeft}>
                <Text style={standardStyles.compTitle}>{org.name}</Text>
                {org.legal_name && org.legal_name !== org.name && (
                  <Text style={standardStyles.subBanner}>{org.legal_name}</Text>
                )}
                <Text style={standardStyles.compAddress}>
                  {org.address_line1 || 'Registered Office Address'}{org.address_line2 ? `, ${org.address_line2}` : ''}
                  {org.city ? `, ${org.city}` : ''}{org.state_code ? ` - ${org.state_code}` : ''}{org.postal_code ? ` (${org.postal_code})` : ''}
                </Text>
              </View>
              <View style={{ width: '30%', alignItems: 'flex-end' }}>
                {hasLogo && <Image src={org.logo_url!} style={standardStyles.logoImg} />}
                <Text style={standardStyles.compContacts}>{org.phone ? `Tel: ${org.phone}` : ''}</Text>
                <Text style={standardStyles.compContacts}>{org.email ? `Email: ${org.email}` : ''}</Text>
                {org.website && <Text style={standardStyles.compContacts}>{org.website}</Text>}
              </View>
            </View>
          </View>

          {/* PAN & TAX INVOICE BAR */}
          <View style={standardStyles.taxInvoiceBar}>
            <Text style={standardStyles.panText}>PAN : {org.pan || '—'}</Text>
            <Text style={standardStyles.docTitle}>TAX INVOICE</Text>
            <Text style={standardStyles.copyType}>ORIGINAL FOR RECIPIENT</Text>
          </View>

          {/* 2-COLUMN METADATA GRID */}
          <View style={standardStyles.metaGrid}>
            <View style={standardStyles.metaLeft}>
              <Text style={standardStyles.metaSectionHeader}>Customer Detail</Text>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>M/S:</Text>
                <Text style={standardStyles.metaVal}>{cust.display_name}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Address:</Text>
                <Text style={standardStyles.metaVal}>
                  {cust.address_line1 || cust.city || cust.state || '—'}
                </Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Phone:</Text>
                <Text style={standardStyles.metaVal}>{cust.phone || '—'}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>GSTIN:</Text>
                <Text style={standardStyles.metaVal}>{cust.gstin || 'Unregistered'}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Place of Supply:</Text>
                <Text style={standardStyles.metaVal}>{data.place_of_supply || cust.state || '—'}</Text>
              </View>
            </View>

            <View style={standardStyles.metaRight}>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Invoice No:</Text>
                <Text style={standardStyles.metaVal}>{data.invoice_number}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Invoice Date:</Text>
                <Text style={standardStyles.metaVal}>{data.invoice_date}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Challan / PO No:</Text>
                <Text style={standardStyles.metaVal}>{data.reference_number || data.challan_no || '—'}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>E-Way Bill No:</Text>
                <Text style={standardStyles.metaVal}>{data.e_way_bill_no || '—'}</Text>
              </View>
              <View style={standardStyles.metaLine}>
                <Text style={standardStyles.metaLabel}>Payment:</Text>
                <Text style={standardStyles.metaVal}>
                  {data.payment_mode ? data.payment_mode.toUpperCase() : 'CASH'} ({data.payment_status ? data.payment_status.toUpperCase() : (Number(data.amount_paid) > 0 ? 'PARTIAL' : 'UNPAID')})
                </Text>
              </View>
              {Number(data.amount_paid) > 0 && (
                <View style={standardStyles.metaLine}>
                  <Text style={standardStyles.metaLabel}>Amount Paid:</Text>
                  <Text style={[standardStyles.metaVal, { color: '#059669' }]}>
                    ₹{Number(data.amount_paid).toFixed(2)}
                  </Text>
                </View>
              )}
              {Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)) > 0 && (
                <View style={standardStyles.metaLine}>
                  <Text style={standardStyles.metaLabel}>Balance Due:</Text>
                  <Text style={[standardStyles.metaVal, { color: '#dc2626' }]}>
                    ₹{Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ITEMS TABLE */}
          <View style={standardStyles.tableHeader}>
            <Text style={[standardStyles.thCell, standardStyles.colSr]}>Sr.</Text>
            <Text style={[standardStyles.thCell, standardStyles.colDesc]}>Name of Product / Service</Text>
            <Text style={[standardStyles.thCell, standardStyles.colHsn]}>HSN / SAC</Text>
            <Text style={[standardStyles.thCell, standardStyles.colQty]}>Qty</Text>
            <Text style={[standardStyles.thCell, standardStyles.colRate]}>Rate (₹)</Text>
            <Text style={[standardStyles.thCell, standardStyles.colTotal]}>Taxable Value (₹)</Text>
          </View>

          {data.invoice_items.map((item, idx) => (
            <View key={idx} style={standardStyles.tableRow}>
              <Text style={[standardStyles.tdCell, standardStyles.colSr]}>{idx + 1}</Text>
              <Text style={[standardStyles.tdCell, standardStyles.colDesc, { fontWeight: 'bold' }]}>{item.description}</Text>
              <Text style={[standardStyles.tdCell, standardStyles.colHsn]}>{item.hsn_sac_code || '—'}</Text>
              <Text style={[standardStyles.tdCell, standardStyles.colQty]}>{item.quantity} {item.unit || 'NOS'}</Text>
              <Text style={[standardStyles.tdCell, standardStyles.colRate]}>{Number(item.unit_price).toFixed(2)}</Text>
              <Text style={[standardStyles.tdCell, standardStyles.colTotal, { fontWeight: 'bold' }]}>
                {Number(item.taxable_amount || item.line_total).toFixed(2)}
              </Text>
            </View>
          ))}

          {/* Tax line entry if single line rate */}
          <View style={[standardStyles.tableRow, { backgroundColor: '#fafafa' }]}>
            <Text style={[standardStyles.tdCell, standardStyles.colSr]}></Text>
            <Text style={[standardStyles.tdCell, standardStyles.colDesc, { fontStyle: 'italic', color: '#4b5563' }]}>
              {data.is_inter_state ? `Integrated Tax (IGST)` : `Central Tax (CGST) + State Tax (SGST)`}
            </Text>
            <Text style={[standardStyles.tdCell, standardStyles.colHsn]}></Text>
            <Text style={[standardStyles.tdCell, standardStyles.colQty]}></Text>
            <Text style={[standardStyles.tdCell, standardStyles.colRate]}></Text>
            <Text style={[standardStyles.tdCell, standardStyles.colTotal, { fontWeight: 'bold' }]}>
              ₹{totalTaxAmount.toFixed(2)}
            </Text>
          </View>

          {/* Table Footer Total */}
          <View style={standardStyles.tableFooterTotal}>
            <Text style={[standardStyles.thCell, { width: '62%', textAlign: 'right', paddingRight: 8 }]}>Total</Text>
            <Text style={[standardStyles.thCell, standardStyles.colQty]}>{totalQty} NOS</Text>
            <Text style={[standardStyles.thCell, standardStyles.colRate]}></Text>
            <Text style={[standardStyles.thCell, standardStyles.colTotal, { fontWeight: 'black', fontSize: 8.5 }]}>
              ₹{total.toFixed(2)}
            </Text>
          </View>

          {/* Partial Payment Summary Row */}
          {Number(data.amount_paid) > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderBottomWidth: 0.5, borderBottomColor: '#111827', padding: '2 6', backgroundColor: '#f0fdf4' }}>
              <Text style={{ fontSize: 7, color: '#166534', fontWeight: 'bold', marginRight: 14 }}>
                Amount Paid ({data.payment_mode ? data.payment_mode.toUpperCase() : 'PAID'}): ₹{Number(data.amount_paid).toFixed(2)}
              </Text>
              <Text style={{ fontSize: 7, color: Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)) > 0 ? '#b91c1c' : '#166534', fontWeight: 'black' }}>
                Balance Due: ₹{Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Total in Words */}
          <View style={standardStyles.wordsRow}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#111827' }}>
              Total in words: <Text style={{ textTransform: 'uppercase' }}>{words}</Text>
            </Text>
            <Text style={{ fontSize: 6.5, color: '#6b7280' }}>(E & O.E.)</Text>
          </View>

          {/* HSN / SAC TAX SUMMARY TABLE */}
          {taxes.length > 0 && (
            <View style={standardStyles.hsnTable}>
              <View style={standardStyles.hsnTh}>
                <Text style={{ width: '25%', fontSize: 6.5, fontWeight: 'bold', textAlign: 'center' }}>HSN / SAC</Text>
                <Text style={{ width: '25%', fontSize: 6.5, fontWeight: 'bold', textAlign: 'right' }}>Taxable Value (₹)</Text>
                <Text style={{ width: '25%', fontSize: 6.5, fontWeight: 'bold', textAlign: 'right' }}>GST Amount (₹)</Text>
                <Text style={{ width: '25%', fontSize: 6.5, fontWeight: 'bold', textAlign: 'right', paddingRight: 6 }}>Total Tax (₹)</Text>
              </View>
              {taxes.map((t, idx) => (
                <View key={idx} style={standardStyles.hsnRow}>
                  <Text style={{ width: '25%', fontSize: 6.5, textAlign: 'center' }}>{t.hsn_sac_code || 'N/A'}</Text>
                  <Text style={{ width: '25%', fontSize: 6.5, textAlign: 'right' }}>{Number(t.taxable_amount).toFixed(2)}</Text>
                  <Text style={{ width: '25%', fontSize: 6.5, textAlign: 'right' }}>
                    {(Number(t.cgst_amount) + Number(t.sgst_amount) + Number(t.igst_amount)).toFixed(2)} ({t.gst_rate}%)
                  </Text>
                  <Text style={{ width: '25%', fontSize: 6.5, textAlign: 'right', paddingRight: 6, fontWeight: 'bold' }}>
                    {(Number(t.cgst_amount) + Number(t.sgst_amount) + Number(t.igst_amount)).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={{ padding: '2 6', backgroundColor: '#f9fafb' }}>
                <Text style={{ fontSize: 6.5, color: '#374151' }}>
                  Total Tax in words: <Text style={{ fontWeight: 'bold' }}>{taxWords}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* 3-COLUMN BOTTOM SECTION: BANK DETAILS + UPI QR + SIGNATORY */}
          <View style={standardStyles.bottomSection}>
            {/* 1. Bank Details */}
            <View style={standardStyles.bankCol}>
              <Text style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2, color: '#1e3a8a' }}>
                Bank Details
              </Text>
              <Text style={{ fontSize: 6.5, color: '#374151' }}>Name: {org.bank_name || 'ICICI Bank'}</Text>
              {org.bank_branch && <Text style={{ fontSize: 6.5, color: '#374151' }}>Branch: {org.bank_branch}</Text>}
              <Text style={{ fontSize: 6.5, color: '#374151', fontWeight: 'bold' }}>
                Acc. Number: {org.bank_account_number || '—'}
              </Text>
              <Text style={{ fontSize: 6.5, color: '#374151' }}>IFSC: {org.bank_ifsc || '—'}</Text>
              {org.upi_id && (
                <Text style={{ fontSize: 6.5, color: '#0284c7', fontWeight: 'bold', marginTop: 1 }}>
                  UPI ID: {org.upi_id}
                </Text>
              )}
            </View>

            {/* 2. QR Code for UPI */}
            <View style={standardStyles.qrCol}>
              {data.qr_data_url ? (
                <Image src={data.qr_data_url} style={{ width: 50, height: 50 }} />
              ) : (
                <View style={{ width: 46, height: 46, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 6, color: '#6b7280' }}>UPI QR</Text>
                </View>
              )}
              <Text style={{ fontSize: 6, fontWeight: 'bold', marginTop: 2, color: '#111827' }}>Pay using UPI</Text>
            </View>

            {/* 3. Authorized Signatory & Cert */}
            <View style={standardStyles.signCol}>
              <Text style={{ fontSize: 5.5, color: '#4b5563', textAlign: 'center' }}>
                Certified that the particulars given above are true and correct.
              </Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', textAlign: 'center', marginTop: 1 }}>
                For {org.name}
              </Text>
              <View style={{ alignItems: 'center', marginVertical: 3 }}>
                <Text style={{ fontSize: 6, color: '#9ca3af', fontStyle: 'italic' }}>
                  This is a computer generated invoice.
                </Text>
              </View>
              <Text style={{ fontSize: 6.5, color: '#374151', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#d1d5db', paddingTop: 2 }}>
                Authorized Signatory
              </Text>
            </View>
          </View>

          {/* Terms & Conditions Footer */}
          <View style={standardStyles.termsBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 1, color: '#111827' }}>Terms and Conditions:</Text>
            <Text>{data.terms_and_conditions || '1. Goods once sold will not be taken back. 2. Subject to local jurisdiction.'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
              <Text style={{ fontWeight: 'bold', color: '#111827' }}>Customer Signature: __________________</Text>
              <Text style={{ fontStyle: 'italic', color: '#1e3a8a', fontWeight: 'bold' }}>Thank you for shopping with us!</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================
// TEMPLATE 2: MODERN EXECUTIVE (A4)
// ============================================================
const modernStyles = StyleSheet.create({
  page: { padding: 26, fontSize: 8.5, fontFamily: 'Helvetica', color: '#0f172a' },
  banner: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 6, color: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', width: '65%' },
  logo: { width: 44, height: 44, objectFit: 'contain', marginRight: 10, borderRadius: 4, backgroundColor: '#ffffff', padding: 2 },
  bannerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  bannerSubtitle: { fontSize: 7.5, color: '#c7d2fe', marginTop: 1.5 },
  bannerRight: { textAlign: 'right' },
  invBadge: { fontSize: 11, fontWeight: 'bold', color: '#ffffff' },
  metaGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  card: { flex: 1, backgroundColor: '#f1f5f9', padding: 7, borderRadius: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#312e81', padding: 5, borderRadius: 3 },
  tableHeaderCell: { color: '#ffffff', fontSize: 7.5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 4.5, paddingHorizontal: 3 },
  bankCard: { backgroundColor: '#eef2ff', padding: 6, borderRadius: 4, borderWidth: 1, borderColor: '#c7d2fe' },
  summaryRight: { width: '44%', backgroundColor: '#eef2ff', padding: 8, borderRadius: 6 },
  grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: '#312e81' },
  grandTotalVal: { fontSize: 11, fontWeight: 'bold', color: '#4f46e5' },
})

function ModernInvoicePDF({ data }: { data: InvoicePDFData }) {
  const org = data.organization || { name: 'Your Business Name' }
  const cust = data.customers || { display_name: 'Walk-in Customer' }
  const total = Number(data.total_amount) || 0
  const words = numberToRupeeWords(total)
  const hasLogo = Boolean(org.logo_url && (org.logo_url.startsWith('data:image') || org.logo_url.startsWith('http')))

  return (
    <Document title={`Invoice_${data.invoice_number}`}>
      <Page size="A4" style={modernStyles.page}>
        <View style={modernStyles.banner}>
          <View style={modernStyles.bannerLeft}>
            {hasLogo && <Image src={org.logo_url!} style={modernStyles.logo} />}
            <View>
              <Text style={modernStyles.bannerTitle}>{org.name}</Text>
              <Text style={modernStyles.bannerSubtitle}>
                {org.gstin ? `GSTIN: ${org.gstin}` : 'Tax Invoice'}{org.pan ? ` | PAN: ${org.pan}` : ''}
              </Text>
              {org.address_line1 && (
                <Text style={modernStyles.bannerSubtitle}>
                  {org.address_line1}{org.city ? `, ${org.city}` : ''}
                </Text>
              )}
            </View>
          </View>
          <View style={modernStyles.bannerRight}>
            <Text style={{ fontSize: 9, textTransform: 'uppercase', color: '#c7d2fe' }}>TAX INVOICE</Text>
            <Text style={modernStyles.invBadge}>{data.invoice_number}</Text>
          </View>
        </View>

        <View style={modernStyles.metaGrid}>
          <View style={modernStyles.card}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Billed To</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 'bold', marginTop: 1.5 }}>{cust.display_name}</Text>
            {cust.gstin && <Text style={{ fontSize: 7.5, color: '#475569' }}>GSTIN: {cust.gstin}</Text>}
            {cust.phone && <Text style={{ fontSize: 7.5, color: '#475569' }}>Phone: {cust.phone}</Text>}
          </View>

          <View style={modernStyles.card}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Invoice & Payment</Text>
            <Text style={{ fontSize: 7.5, color: '#334155', marginTop: 1.5 }}>Date: {data.invoice_date} | Due: {data.due_date || 'On Receipt'}</Text>
            {data.payment_mode && (
              <Text style={{ fontSize: 7.5, color: '#4f46e5', fontWeight: 'bold', marginTop: 1 }}>
                Payment Mode: {data.payment_mode.toUpperCase()} ({data.payment_status || 'PAID'})
              </Text>
            )}
          </View>
        </View>

        <View style={{ marginBottom: 10 }}>
          <View style={modernStyles.tableHeader}>
            <Text style={[{ width: '5%' }, modernStyles.tableHeaderCell]}>#</Text>
            <Text style={[{ width: '35%' }, modernStyles.tableHeaderCell]}>Description</Text>
            <Text style={[{ width: '15%' }, modernStyles.tableHeaderCell]}>HSN/SAC</Text>
            <Text style={[{ width: '10%', textAlign: 'right' }, modernStyles.tableHeaderCell]}>Qty</Text>
            <Text style={[{ width: '15%', textAlign: 'right' }, modernStyles.tableHeaderCell]}>Price</Text>
            <Text style={[{ width: '20%', textAlign: 'right' }, modernStyles.tableHeaderCell]}>Total (₹)</Text>
          </View>

          {data.invoice_items.map((item, idx) => (
            <View key={idx} style={modernStyles.tableRow}>
              <Text style={{ width: '5%' }}>{idx + 1}</Text>
              <Text style={{ width: '35%', fontWeight: 'bold' }}>{item.description}</Text>
              <Text style={{ width: '15%' }}>{item.hsn_sac_code || '—'}</Text>
              <Text style={{ width: '10%', textAlign: 'right' }}>{item.quantity}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>₹{Number(item.unit_price).toFixed(2)}</Text>
              <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>₹{Number(item.line_total).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ width: '52%' }}>
            <View style={[modernStyles.bankCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ width: '70%' }}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#4338ca', marginBottom: 2 }}>BANK & UPI SETTLEMENT</Text>
                {org.bank_name && <Text style={{ fontSize: 7, color: '#3730a3' }}>Bank: {org.bank_name}</Text>}
                {org.bank_account_number && <Text style={{ fontSize: 7, color: '#3730a3' }}>A/C: {org.bank_account_number} ({org.bank_ifsc})</Text>}
                {org.upi_id && <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#4f46e5' }}>UPI ID: {org.upi_id}</Text>}
              </View>
              {data.qr_data_url && (
                <View style={{ alignItems: 'center' }}>
                  <Image src={data.qr_data_url} style={{ width: 44, height: 44 }} />
                  <Text style={{ fontSize: 5.5, color: '#4338ca', fontWeight: 'bold', marginTop: 1 }}>Scan UPI</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#4f46e5', marginTop: 4 }}>{words}</Text>
          </View>

          <View style={modernStyles.summaryRight}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 7.5, color: '#475569' }}>Taxable Base</Text>
              <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>₹{Number(data.taxable_amount).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 7.5, color: '#475569' }}>Total GST</Text>
              <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>₹{Number(data.total_tax_amount).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#c7d2fe', paddingTop: 3 }}>
              <Text style={modernStyles.grandTotalLabel}>Grand Total</Text>
              <Text style={modernStyles.grandTotalVal}>₹{total.toFixed(2)}</Text>
            </View>
            {Number(data.amount_paid) > 0 && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <Text style={{ fontSize: 7, color: '#059669' }}>Amount Paid ({data.payment_mode ? data.payment_mode.toUpperCase() : 'PAID'})</Text>
                  <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#059669' }}>₹{Number(data.amount_paid).toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1, borderTopWidth: 0.5, borderTopColor: '#c7d2fe', paddingTop: 1 }}>
                  <Text style={{ fontSize: 7.5, color: Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)) > 0 ? '#dc2626' : '#059669', fontWeight: 'bold' }}>
                    Balance Due
                  </Text>
                  <Text style={{ fontSize: 7.5, fontWeight: 'black', color: Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)) > 0 ? '#dc2626' : '#059669' }}>
                    ₹{Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================
// TEMPLATE 3: COMPACT A5 (HALF-PAGE SIZE)
// ============================================================
const a5Styles = StyleSheet.create({
  page: { padding: 14, fontSize: 7, fontFamily: 'Helvetica', color: '#1f2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#0284c7', paddingBottom: 4, marginBottom: 6 },
  orgTitle: { fontSize: 11, fontWeight: 'bold', color: '#0369a1' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 4, borderRadius: 3, marginBottom: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0284c7', padding: 3, borderRadius: 2 },
  thCell: { color: '#ffffff', fontSize: 6.5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 2.5 },
  tdCell: { fontSize: 6.5 },
})

function CompactA5InvoicePDF({ data }: { data: InvoicePDFData }) {
  const org = data.organization || { name: 'Your Business Name' }
  const cust = data.customers || { display_name: 'Walk-in Customer' }
  const total = Number(data.total_amount) || 0

  return (
    <Document title={`Invoice_${data.invoice_number}`}>
      <Page size="A5" style={a5Styles.page}>
        <View style={a5Styles.header}>
          <View style={{ width: '60%' }}>
            <Text style={a5Styles.orgTitle}>{org.name}</Text>
            <Text style={{ fontSize: 6, color: '#4b5563' }}>GSTIN: {org.gstin || '—'} | Ph: {org.phone || '—'}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 9, fontWeight: 'black', color: '#0369a1' }}>TAX INVOICE (A5)</Text>
            <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>{data.invoice_number}</Text>
          </View>
        </View>

        <View style={a5Styles.metaRow}>
          <View style={{ width: '50%' }}>
            <Text style={{ fontSize: 6, color: '#64748b', fontWeight: 'bold' }}>CUSTOMER</Text>
            <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>{cust.display_name}</Text>
            {cust.gstin && <Text style={{ fontSize: 6 }}>GSTIN: {cust.gstin}</Text>}
          </View>
          <View style={{ width: '50%', textAlign: 'right' }}>
            <Text style={{ fontSize: 6, color: '#64748b', fontWeight: 'bold' }}>DETAILS</Text>
            <Text style={{ fontSize: 6.5 }}>Date: {data.invoice_date}</Text>
            <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#0284c7' }}>
              Mode: {data.payment_mode ? data.payment_mode.toUpperCase() : 'CASH'}
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: 6 }}>
          <View style={a5Styles.tableHeader}>
            <Text style={[{ width: '6%' }, a5Styles.thCell]}>#</Text>
            <Text style={[{ width: '44%' }, a5Styles.thCell]}>Item</Text>
            <Text style={[{ width: '15%' }, a5Styles.thCell]}>HSN</Text>
            <Text style={[{ width: '10%', textAlign: 'right' }, a5Styles.thCell]}>Qty</Text>
            <Text style={[{ width: '12%', textAlign: 'right' }, a5Styles.thCell]}>Rate</Text>
            <Text style={[{ width: '13%', textAlign: 'right' }, a5Styles.thCell]}>Total</Text>
          </View>
          {data.invoice_items.map((item, idx) => (
            <View key={idx} style={a5Styles.tableRow}>
              <Text style={[{ width: '6%' }, a5Styles.tdCell]}>{idx + 1}</Text>
              <Text style={[{ width: '44%', fontWeight: 'bold' }, a5Styles.tdCell]}>{item.description}</Text>
              <Text style={[{ width: '15%' }, a5Styles.tdCell]}>{item.hsn_sac_code || '—'}</Text>
              <Text style={[{ width: '10%', textAlign: 'right' }, a5Styles.tdCell]}>{item.quantity}</Text>
              <Text style={[{ width: '12%', textAlign: 'right' }, a5Styles.tdCell]}>₹{Number(item.unit_price).toFixed(2)}</Text>
              <Text style={[{ width: '13%', textAlign: 'right', fontWeight: 'bold' }, a5Styles.tdCell]}>
                ₹{Number(item.line_total).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 5, borderRadius: 3 }}>
          <View style={{ width: '55%' }}>
            {org.upi_id && <Text style={{ fontSize: 6.5, color: '#0369a1', fontWeight: 'bold' }}>UPI: {org.upi_id}</Text>}
            {Number(data.amount_paid) > 0 && (
              <Text style={{ fontSize: 6, color: '#059669', fontWeight: 'bold' }}>
                Paid: ₹{Number(data.amount_paid).toFixed(2)} | Due: ₹{Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)).toFixed(2)}
              </Text>
            )}
            <Text style={{ fontSize: 5.5, color: '#475569' }}>Thank you for your business!</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 6.5, color: '#475569' }}>Tax: ₹{Number(data.total_tax_amount).toFixed(2)}</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 'black', color: '#0369a1' }}>Grand Total: ₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================
// TEMPLATE 4: POS THERMAL RECEIPT (80MM / 3-INCH ROLL)
// ============================================================
const posStyles = StyleSheet.create({
  page: { padding: 10, fontSize: 7.5, fontFamily: 'Courier', color: '#000000' },
  center: { textAlign: 'center' },
  shopTitle: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' },
  dashedLine: { borderBottomWidth: 1, borderBottomColor: '#000000', borderStyle: 'dashed', marginVertical: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 },
  bold: { fontWeight: 'bold' },
})

function ThermalPOSInvoicePDF({ data }: { data: InvoicePDFData }) {
  const org = data.organization || { name: 'STORE RECEIPT' }
  const cust = data.customers || { display_name: 'Walk-in Customer' }
  const total = Number(data.total_amount) || 0

  return (
    <Document title={`Receipt_${data.invoice_number}`}>
      <Page size={[226, 750]} style={posStyles.page}>
        <Text style={posStyles.shopTitle}>{org.name}</Text>
        {org.address_line1 && <Text style={posStyles.center}>{org.address_line1}</Text>}
        {org.gstin && <Text style={posStyles.center}>GSTIN: {org.gstin}</Text>}
        {org.phone && <Text style={posStyles.center}>Tel: {org.phone}</Text>}

        <View style={posStyles.dashedLine} />
        <View style={posStyles.row}>
          <Text>BILL NO: {data.invoice_number}</Text>
          <Text>{data.invoice_date}</Text>
        </View>
        <View style={posStyles.row}>
          <Text>CUST: {cust.display_name.slice(0, 16)}</Text>
          <Text>{data.payment_mode ? data.payment_mode.toUpperCase() : 'PAID'}</Text>
        </View>
        <View style={posStyles.dashedLine} />

        {/* Item List */}
        <View style={[posStyles.row, posStyles.bold]}>
          <Text style={{ width: '50%' }}>ITEM</Text>
          <Text style={{ width: '20%', textAlign: 'right' }}>QTY</Text>
          <Text style={{ width: '30%', textAlign: 'right' }}>AMT</Text>
        </View>
        <View style={posStyles.dashedLine} />

        {data.invoice_items.map((item, idx) => (
          <View key={idx} style={{ marginBottom: 2 }}>
            <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{item.description}</Text>
            <View style={posStyles.row}>
              <Text style={{ fontSize: 6.5, color: '#333333' }}>{item.quantity} x ₹{Number(item.unit_price).toFixed(2)}</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold' }}>₹{Number(item.line_total).toFixed(2)}</Text>
            </View>
          </View>
        ))}

        <View style={posStyles.dashedLine} />
        <View style={posStyles.row}>
          <Text>Subtotal:</Text>
          <Text>₹{Number(data.subtotal).toFixed(2)}</Text>
        </View>
        <View style={posStyles.row}>
          <Text>GST Tax:</Text>
          <Text>₹{Number(data.total_tax_amount).toFixed(2)}</Text>
        </View>
        <View style={[posStyles.row, { fontSize: 10, fontWeight: 'bold', marginTop: 2 }]}>
          <Text>TOTAL:</Text>
          <Text>₹{total.toFixed(2)}</Text>
        </View>

        {Number(data.amount_paid) > 0 && (
          <>
            <View style={posStyles.row}>
              <Text>PAID ({data.payment_mode ? data.payment_mode.toUpperCase() : 'CASH'}):</Text>
              <Text>₹{Number(data.amount_paid).toFixed(2)}</Text>
            </View>
            <View style={[posStyles.row, { fontWeight: 'bold' }]}>
              <Text>BALANCE DUE:</Text>
              <Text>₹{Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)).toFixed(2)}</Text>
            </View>
          </>
        )}

        {data.qr_data_url && (
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <Image src={data.qr_data_url} style={{ width: 64, height: 64 }} />
            <Text style={{ fontSize: 6.5, fontWeight: 'bold', marginTop: 2 }}>SCAN & PAY UPI</Text>
          </View>
        )}

        <View style={posStyles.dashedLine} />
        <Text style={[posStyles.center, { fontSize: 6.5, marginTop: 2 }]}>*** THANK YOU VISIT AGAIN ***</Text>
      </Page>
    </Document>
  )
}

// ============================================================
// TEMPLATE 5: MINIMAL MONOCHROME (A4)
// ============================================================
const minimalStyles = StyleSheet.create({
  page: { padding: 30, fontSize: 8.5, fontFamily: 'Helvetica', color: '#18181b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#18181b', paddingBottom: 8, marginBottom: 15 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 38, height: 38, objectFit: 'contain', marginRight: 8 },
  docTitle: { fontSize: 15, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#18181b', paddingBottom: 4, marginBottom: 4 },
  tableHeaderCell: { fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e4e4e7', paddingVertical: 4 },
  summaryRight: { width: '40%', borderTopWidth: 1, borderTopColor: '#18181b', paddingTop: 3 },
  grandTotalVal: { fontSize: 10.5, fontWeight: 'bold' },
})

function MinimalInvoicePDF({ data }: { data: InvoicePDFData }) {
  const org = data.organization || { name: 'Your Business Name' }
  const cust = data.customers || { display_name: 'Walk-in Customer' }
  const total = Number(data.total_amount) || 0
  const hasLogo = Boolean(org.logo_url && (org.logo_url.startsWith('data:image') || org.logo_url.startsWith('http')))

  return (
    <Document title={`Invoice_${data.invoice_number}`}>
      <Page size="A4" style={minimalStyles.page}>
        <View style={minimalStyles.header}>
          <View style={minimalStyles.headerLeft}>
            {hasLogo && <Image src={org.logo_url!} style={minimalStyles.logo} />}
            <View>
              <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{org.name}</Text>
              <Text style={{ fontSize: 7.5, color: '#71717a', marginTop: 1 }}>
                GSTIN: {org.gstin || '—'}{org.pan ? ` | PAN: ${org.pan}` : ''}
              </Text>
            </View>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={minimalStyles.docTitle}>{data.invoice_number}</Text>
            <Text style={{ fontSize: 7.5, color: '#71717a' }}>Date: {data.invoice_date}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 7, color: '#71717a', textTransform: 'uppercase' }}>Billed To</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 'bold', marginTop: 1 }}>{cust.display_name}</Text>
            {cust.gstin && <Text style={{ fontSize: 7.5, color: '#52525b' }}>GSTIN: {cust.gstin}</Text>}
          </View>
          {data.payment_mode && (
            <View style={{ textAlign: 'right' }}>
              <Text style={{ fontSize: 7, color: '#71717a', textTransform: 'uppercase' }}>Payment Mode</Text>
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', marginTop: 1 }}>{data.payment_mode.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={{ marginBottom: 16 }}>
          <View style={minimalStyles.tableHeader}>
            <Text style={[{ width: '45%' }, minimalStyles.tableHeaderCell]}>Item</Text>
            <Text style={[{ width: '15%', textAlign: 'right' }, minimalStyles.tableHeaderCell]}>Qty</Text>
            <Text style={[{ width: '20%', textAlign: 'right' }, minimalStyles.tableHeaderCell]}>Rate</Text>
            <Text style={[{ width: '20%', textAlign: 'right' }, minimalStyles.tableHeaderCell]}>Amount</Text>
          </View>

          {data.invoice_items.map((item, idx) => (
            <View key={idx} style={minimalStyles.tableRow}>
              <Text style={{ width: '45%' }}>{item.description}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>{item.quantity}</Text>
              <Text style={{ width: '20%', textAlign: 'right' }}>₹{Number(item.unit_price).toFixed(2)}</Text>
              <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>₹{Number(item.line_total).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={minimalStyles.summaryRight}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 7.5, color: '#71717a' }}>Taxable</Text>
              <Text style={{ fontSize: 7.5 }}>₹{Number(data.taxable_amount).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 7.5, color: '#71717a' }}>GST</Text>
              <Text style={{ fontSize: 7.5 }}>₹{Number(data.total_tax_amount).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#18181b', paddingTop: 3 }}>
              <Text style={{ fontSize: 9.5, fontWeight: 'bold' }}>Total</Text>
              <Text style={minimalStyles.grandTotalVal}>₹{total.toFixed(2)}</Text>
            </View>
            {Number(data.amount_paid) > 0 && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <Text style={{ fontSize: 7.5, color: '#71717a' }}>Paid</Text>
                  <Text style={{ fontSize: 7.5 }}>₹{Number(data.amount_paid).toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>Balance Due</Text>
                  <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>
                    ₹{Number(data.balance_due !== undefined ? data.balance_due : total - Number(data.amount_paid)).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ============================================================
// TEMPLATE 6: VYAPAR GOLD & JEWELLERY SPECIAL (A4)
// ============================================================
const jewelryStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, color: '#1c1917', backgroundColor: '#FFFFFF' },
  headerBox: {
    borderWidth: 1.5,
    borderColor: '#b45309',
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#92400e', marginBottom: 2 },
  goldBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  table: { borderWidth: 1, borderColor: '#d97706', marginBottom: 8, borderRadius: 2 },
  th: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#d97706',
    padding: 4,
    fontWeight: 'bold',
    color: '#78350f',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#fde68a',
    padding: 4,
  },
  hallmarkBox: {
    borderWidth: 1,
    borderColor: '#d97706',
    borderStyle: 'dashed',
    backgroundColor: '#fffbeb',
    padding: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
})

export function JewelrySpecialInvoicePDF({ data }: { data: InvoicePDFData }) {
  const org = (data.organization || {}) as any
  const items = data.invoice_items || []
  const total = Number(data.total_amount) || 0

  return (
    <Document title={`Jewellery_Bill_${data.invoice_number}`}>
      <Page size="A4" style={jewelryStyles.page}>
        {/* Header */}
        <View style={jewelryStyles.headerBox}>
          <View style={{ flex: 1 }}>
            <Text style={jewelryStyles.shopName}>{org.name || 'Jewellers & Bullion Merchants'}</Text>
            <Text style={{ fontSize: 8, color: '#78350f' }}>
              {org.address_line1}, {org.city} {org.state_code ? `(State Code: ${org.state_code})` : ''}
            </Text>
            <Text style={{ fontSize: 8, color: '#78350f' }}>
              GSTIN: {org.gstin || '27AABCU9603R1ZM'} | Contact: {org.phone || '+91 98220 12345'}
            </Text>
            <View style={jewelryStyles.goldBadge}>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#92400e' }}>
                ✦ BIS 100% HALLMARKED GOLD & SILVER ORNAMENTS ✦
              </Text>
            </View>
          </View>
          <View style={{ textAlign: 'right', minWidth: 140 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#b45309' }}>JEWELLERY TAX BILL</Text>
            <Text style={{ fontSize: 8, marginTop: 3 }}>Bill No: {data.invoice_number}</Text>
            <Text style={{ fontSize: 8 }}>Date: {data.invoice_date}</Text>
            {data.place_of_supply && <Text style={{ fontSize: 8 }}>POS: {data.place_of_supply}</Text>}
          </View>
        </View>

        {/* Customer Box */}
        <View style={{ borderWidth: 1, borderColor: '#fde68a', padding: 6, marginBottom: 8, backgroundColor: '#fafaf9' }}>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#78350f' }}>
            Customer: {data.customers?.display_name || 'Counter Retail Buyer'}
          </Text>
          <Text style={{ fontSize: 7.5, color: '#57534e' }}>
            Phone: {data.customers?.phone || 'N/A'} | State: {data.customers?.state || 'Maharashtra'} {data.customers?.gstin ? `| GSTIN: ${data.customers.gstin}` : ''}
          </Text>
        </View>

        {/* Table */}
        <View style={jewelryStyles.table}>
          <View style={jewelryStyles.th}>
            <Text style={{ width: '6%', fontSize: 7.5 }}>#</Text>
            <Text style={{ width: '38%', fontSize: 7.5 }}>Ornament Description & Purity</Text>
            <Text style={{ width: '12%', fontSize: 7.5 }}>HSN</Text>
            <Text style={{ width: '12%', fontSize: 7.5, textAlign: 'right' }}>Qty/Weight</Text>
            <Text style={{ width: '16%', fontSize: 7.5, textAlign: 'right' }}>Rate / Making</Text>
            <Text style={{ width: '16%', fontSize: 7.5, textAlign: 'right' }}>Amount (₹)</Text>
          </View>
          {items.map((it, idx) => (
            <View key={idx} style={jewelryStyles.tr}>
              <Text style={{ width: '6%', fontSize: 7.5 }}>{idx + 1}</Text>
              <View style={{ width: '38%' }}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold' }}>{it.description}</Text>
                <Text style={{ fontSize: 6.5, color: '#78350f' }}>22K / 916 Hallmarked Gold</Text>
              </View>
              <Text style={{ width: '12%', fontSize: 7.5 }}>{it.hsn_sac_code || '7113'}</Text>
              <Text style={{ width: '12%', fontSize: 7.5, textAlign: 'right' }}>{it.quantity} {it.unit || 'g'}</Text>
              <Text style={{ width: '16%', fontSize: 7.5, textAlign: 'right' }}>₹{Number(it.unit_price).toFixed(2)}</Text>
              <Text style={{ width: '16%', fontSize: 7.5, textAlign: 'right', fontWeight: 'bold' }}>
                ₹{Number(it.line_total).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* BIS Hallmarking & HUID Guarantee Box */}
        <View style={jewelryStyles.hallmarkBox}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#92400e' }}>
            ✦ BIS Hallmarking & HUID Quality Guarantee
          </Text>
          <Text style={{ fontSize: 7, color: '#78350f', marginTop: 2 }}>
            Every piece of gold sold conforms to Bureau of Indian Standards (BIS) specifications.
            Hallmark verification stamps include: BIS logo, Purity Mark (916/750), Assaying Centre & Unique 6-character HUID.
          </Text>
        </View>

        {/* Totals & Settlement */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '55%' }}>
            <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#78350f' }}>Bank & UPI Settlement:</Text>
            <Text style={{ fontSize: 7 }}>Bank: {org.bank_name || 'HDFC Bank'} | A/C: {org.bank_account_number || '50200098765432'}</Text>
            <Text style={{ fontSize: 7 }}>IFSC: {org.bank_ifsc || 'HDFC0001234'} | UPI: {org.upi_id || 'jeweller@upi'}</Text>
            <Text style={{ fontSize: 7, marginTop: 4, fontStyle: 'italic', color: '#78716c' }}>
              Amount in words: {numberToRupeeWords(total)}
            </Text>
          </View>
          <View style={{ width: '40%', borderWidth: 1, borderColor: '#d97706', padding: 6, backgroundColor: '#fef3c7' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 8 }}>Subtotal:</Text>
              <Text style={{ fontSize: 8 }}>₹{Number(data.subtotal).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 8 }}>GST (3% Jewellery Rate):</Text>
              <Text style={{ fontSize: 8 }}>₹{Number(data.total_tax_amount).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#b45309', paddingTop: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#92400e' }}>Grand Total:</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#92400e' }}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Main Template Router Component
 */
export function InvoicePDFDocument({
  data,
  template = 'standard',
}: {
  data: InvoicePDFData
  template?: PDFTemplateType
}) {
  switch (template) {
    case 'jewelry_gold':
      return <JewelrySpecialInvoicePDF data={data} />
    case 'modern':
    case 'vyapar_modern':
      return <ModernInvoicePDF data={data} />
    case 'compact_a5':
      return <CompactA5InvoicePDF data={data} />
    case 'thermal_pos':
      return <ThermalPOSInvoicePDF data={data} />
    case 'minimal':
      return <MinimalInvoicePDF data={data} />
    case 'standard':
    case 'classic':
    case 'vyapar_classic':
    default:
      return <StandardGSTInvoicePDF data={data} />
  }
}
