import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatRupeeWords } from '@/lib/utils/number-to-words';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 36,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  quotationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'right',
  },
  subText: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 9,
    color: '#0F172A',
    marginBottom: 2,
  },
  table: {
    width: '100%',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'solid',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    borderBottomStyle: 'solid',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderBottomStyle: 'solid',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 8.5,
    color: '#0F172A',
  },
  colDesc: { width: '40%' },
  colHsn: { width: '15%' },
  colQty: { width: '12%', textAlign: 'right' },
  colRate: { width: '15%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  wordsBox: {
    width: '55%',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 4,
  },
  totalsBox: {
    width: '40%',
  },
  totLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  grandTot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    borderTopStyle: 'solid',
    marginTop: 4,
  },
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signBox: {
    width: 160,
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    borderTopStyle: 'solid',
    paddingTop: 4,
    alignItems: 'center',
  },
});

export interface QuotationPDFProps {
  quotation: {
    id: string;
    quotation_number: string;
    quotation_date: string;
    valid_until?: string | null;
    status: string;
    subtotal_paise: number;
    discount_paise: number;
    taxable_paise: number;
    cgst_paise: number;
    sgst_paise: number;
    igst_paise: number;
    total_paise: number;
    notes?: string | null;
    terms?: string | null;
    organization?: {
      name: string;
      legal_name?: string | null;
      gstin?: string | null;
      billing_address?: any;
    } | null;
    customers?: {
      name: string;
      email?: string | null;
      phone?: string | null;
      gstin?: string | null;
      billing_address?: any;
    } | null;
    quotation_line_items?: Array<{
      description: string;
      hsn_sac?: string | null;
      quantity: number;
      unit?: string | null;
      unit_price_paise: number;
      line_total_paise: number;
      gst_rate?: number;
    }>;
  };
}

export const QuotationPDFDocument: React.FC<QuotationPDFProps> = ({ quotation }) => {
  const org = quotation.organization;
  const customer = quotation.customers;
  const totalRupees = quotation.total_paise / 100;
  const words = formatRupeeWords(quotation.total_paise);

  return (
    <Document title={`Quotation_${quotation.quotation_number}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyTitle}>{org?.legal_name || org?.name || 'BUSINESS ORGANISATION'}</Text>
            {org?.gstin && <Text style={styles.subText}>GSTIN: {org.gstin}</Text>}
          </View>

          <View>
            <Text style={styles.quotationTitle}>QUOTATION / ESTIMATE</Text>
            <Text style={styles.subText}>Quotation #: {quotation.quotation_number}</Text>
            <Text style={styles.subText}>Date: {quotation.quotation_date}</Text>
            {quotation.valid_until && (
              <Text style={styles.subText}>Valid Until: {quotation.valid_until}</Text>
            )}
          </View>
        </View>

        {/* Customer & Quote Meta */}
        <View style={styles.sectionRow}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quotation To</Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0F172A' }}>{customer?.name}</Text>
            {customer?.gstin && <Text style={styles.cardText}>GSTIN: {customer.gstin}</Text>}
            {customer?.phone && <Text style={styles.cardText}>Phone: {customer.phone}</Text>}
            {customer?.email && <Text style={styles.cardText}>Email: {customer.email}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary Details</Text>
            <Text style={styles.cardText}>
              <Text style={{ fontWeight: 'bold' }}>Status: </Text>
              {quotation.status.toUpperCase()}
            </Text>
            <Text style={styles.cardText}>
              <Text style={{ fontWeight: 'bold' }}>Total Amount: </Text>
              ₹{totalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN/SAC</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate (₹)</Text>
            <Text style={[styles.th, styles.colTotal]}>Amount (₹)</Text>
          </View>

          {(quotation.quotation_line_items || []).map((item, idx) => {
            const lineAmt = item.line_total_paise / 100;
            const unitRate = item.unit_price_paise / 100;

            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
                <Text style={[styles.td, styles.colHsn]}>{item.hsn_sac || '—'}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit || ''}</Text>
                <Text style={[styles.td, styles.colRate]}>₹{unitRate.toFixed(2)}</Text>
                <Text style={[styles.td, styles.colTotal]}>₹{lineAmt.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary & Totals */}
        <View style={styles.summaryRow}>
          <View style={styles.wordsBox}>
            <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
              Amount in Rupee Words:
            </Text>
            <Text style={{ fontSize: 8.5, color: '#1E293B', fontStyle: 'italic', marginTop: 3 }}>
              {words}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totLine}>
              <Text style={{ fontSize: 8.5, color: '#64748B' }}>Subtotal:</Text>
              <Text style={{ fontSize: 8.5, color: '#0F172A' }}>
                ₹{(quotation.subtotal_paise / 100).toFixed(2)}
              </Text>
            </View>

            {quotation.cgst_paise > 0 && (
              <View style={styles.totLine}>
                <Text style={{ fontSize: 8.5, color: '#64748B' }}>CGST:</Text>
                <Text style={{ fontSize: 8.5, color: '#0F172A' }}>
                  ₹{(quotation.cgst_paise / 100).toFixed(2)}
                </Text>
              </View>
            )}

            {quotation.sgst_paise > 0 && (
              <View style={styles.totLine}>
                <Text style={{ fontSize: 8.5, color: '#64748B' }}>SGST:</Text>
                <Text style={{ fontSize: 8.5, color: '#0F172A' }}>
                  ₹{(quotation.sgst_paise / 100).toFixed(2)}
                </Text>
              </View>
            )}

            {quotation.igst_paise > 0 && (
              <View style={styles.totLine}>
                <Text style={{ fontSize: 8.5, color: '#64748B' }}>IGST:</Text>
                <Text style={{ fontSize: 8.5, color: '#0F172A' }}>
                  ₹{(quotation.igst_paise / 100).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.grandTot}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0F172A' }}>Grand Total:</Text>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2563EB' }}>
                ₹{totalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {quotation.terms && (
          <View style={{ marginTop: 16, padding: 8, backgroundColor: '#F8FAFC', borderRadius: 4 }}>
            <Text style={{ fontSize: 8, color: '#475569', fontWeight: 'bold' }}>Terms & Conditions:</Text>
            <Text style={{ fontSize: 8, color: '#334155', marginTop: 2 }}>{quotation.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={{ fontSize: 7.5, color: '#94A3B8' }}>
              This estimate is non-binding until accepted. Generated via Wevly BusinessOS.
            </Text>
          </View>
          <View style={styles.signBox}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#475569' }}>Authorized Signatory</Text>
            <Text style={{ fontSize: 7, color: '#94A3B8', marginTop: 2 }}>{org?.name}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
