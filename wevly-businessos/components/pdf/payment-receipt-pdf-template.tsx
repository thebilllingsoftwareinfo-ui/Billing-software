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
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  receiptTitle: {
    fontSize: 16,
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
  cardBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  amountCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginVertical: 4,
  },
  amountWords: {
    fontSize: 8.5,
    color: '#1E40AF',
    fontStyle: 'italic',
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
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
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
    color: '#475569',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 8.5,
    color: '#0F172A',
  },
  colInvNum: { width: '25%' },
  colDate: { width: '20%' },
  colTotal: { width: '20%', textAlign: 'right' },
  colAllocated: { width: '20%', textAlign: 'right' },
  colBalance: { width: '15%', textAlign: 'right' },
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
  signText: {
    fontSize: 8,
    color: '#475569',
    fontWeight: 'bold',
  },
});

export interface PaymentReceiptPDFProps {
  payment: {
    id: string;
    payment_date: string;
    amount_paise: number;
    payment_method: string;
    reference_number?: string | null;
    notes?: string | null;
    organization?: {
      name: string;
      legal_name?: string | null;
      gstin?: string | null;
      billing_address?: any;
    } | null;
    customers?: {
      name?: string;
      display_name?: string | null;
      email?: string | null;
      phone?: string | null;
      gstin?: string | null;
    } | null;
    allocations?: Array<{
      allocated_paise: number;
      invoices?: {
        id: string;
        invoice_number: string;
        invoice_date: string;
        total_paise: number;
        paid_paise: number;
        status: string;
      } | null;
    }>;
  };
}

export const PaymentReceiptPDFDocument: React.FC<PaymentReceiptPDFProps> = ({ payment }) => {
  const amountRupees = payment.amount_paise / 100;
  const words = formatRupeeWords(payment.amount_paise);
  const org = payment.organization;
  const customer = payment.customers;

  return (
    <Document title={`Payment Receipt #${payment.id.slice(0, 8).toUpperCase()}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyTitle}>{org?.legal_name || org?.name || 'BUSINESS ORGANISATION'}</Text>
            {org?.gstin && <Text style={styles.subText}>GSTIN: {org.gstin}</Text>}
          </View>
          <View>
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
            <Text style={styles.subText}>Receipt ID: REC-{payment.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.subText}>Date: {payment.payment_date}</Text>
          </View>
        </View>

        {/* Amount Banner */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>AMOUNT RECEIVED</Text>
          <Text style={styles.amountValue}>₹{amountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.amountWords}>{words}</Text>
        </View>

        {/* Customer & Payment Meta Details */}
        <View style={styles.sectionRow}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Received From</Text>
            <Text style={styles.cardBold}>{customer?.display_name || customer?.name || 'Valued Customer'}</Text>
            {customer?.gstin && <Text style={styles.cardText}>GSTIN: {customer.gstin}</Text>}
            {customer?.phone && <Text style={styles.cardText}>Phone: {customer.phone}</Text>}
            {customer?.email && <Text style={styles.cardText}>Email: {customer.email}</Text>}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            <Text style={styles.cardText}>
              <Text style={{ fontWeight: 'bold' }}>Method: </Text>
              {payment.payment_method.toUpperCase()}
            </Text>
            {payment.reference_number && (
              <Text style={styles.cardText}>
                <Text style={{ fontWeight: 'bold' }}>Ref / Txn #: </Text>
                {payment.reference_number}
              </Text>
            )}
            <Text style={styles.cardText}>
              <Text style={{ fontWeight: 'bold' }}>Status: </Text>
              CONFIRMED
            </Text>
          </View>
        </View>

        {/* Allocated Invoices Table */}
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>
            Invoice Allocations
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colInvNum]}>Invoice #</Text>
            <Text style={[styles.th, styles.colDate]}>Invoice Date</Text>
            <Text style={[styles.th, styles.colTotal]}>Invoice Total</Text>
            <Text style={[styles.th, styles.colAllocated]}>Allocated</Text>
            <Text style={[styles.th, styles.colBalance]}>Balance</Text>
          </View>

          {(payment.allocations || []).map((alloc, idx) => {
            const inv = alloc.invoices;
            const invTotal = (inv?.total_paise || 0) / 100;
            const allocatedAmt = alloc.allocated_paise / 100;
            const remainingBal = Math.max(0, (inv?.total_paise || 0) - (inv?.paid_paise || 0)) / 100;

            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.td, styles.colInvNum]}>{inv?.invoice_number || 'N/A'}</Text>
                <Text style={[styles.td, styles.colDate]}>{inv?.invoice_date || 'N/A'}</Text>
                <Text style={[styles.td, styles.colTotal]}>₹{invTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                <Text style={[styles.td, styles.colAllocated]}>₹{allocatedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                <Text style={[styles.td, styles.colBalance]}>₹{remainingBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
            );
          })}
        </View>

        {payment.notes && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#F8FAFC', borderRadius: 4 }}>
            <Text style={{ fontSize: 8, color: '#64748B', fontWeight: 'bold' }}>Notes:</Text>
            <Text style={{ fontSize: 8.5, color: '#334155', marginTop: 2 }}>{payment.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={{ fontSize: 7.5, color: '#94A3B8' }}>
              Computer generated payment receipt. Built with Wevly BusinessOS.
            </Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signText}>Authorized Signatory</Text>
            <Text style={{ fontSize: 7, color: '#94A3B8', marginTop: 2 }}>{org?.name}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
