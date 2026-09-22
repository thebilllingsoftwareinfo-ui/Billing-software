'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils/currency';
import { formatRupeeWords } from '@/lib/utils/number-to-words';
import {
  ArrowLeft,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  XCircle,
  Send,
  ArrowRightLeft,
  Loader2,
  FileText,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  async function fetchQuotation() {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuotation(data);
      } else {
        toast.error('Failed to load quotation details');
      }
    } catch (err) {
      toast.error('Error fetching quotation');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/quotations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Quotation status updated to ${newStatus.toUpperCase()}`);
        fetchQuotation();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  }

  // 1-Click Convert to Sales Invoice
  // Preserves original quotation intact, creates new Sales Invoice, links converted_invoice_id
  async function handleConvertToInvoice() {
    try {
      setConverting(true);
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to convert quotation');
      }

      toast.success(`Converted to Sales Invoice #${data.invoice_number}! Original quotation preserved.`);
      fetchQuotation();
      router.push(`/sales/invoices/${data.invoice_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  }

  function handleCopyShareLink() {
    const url = `${window.location.origin}/api/quotations/${id}/pdf`;
    navigator.clipboard.writeText(url);
    toast.success('Shareable PDF link copied to clipboard!');
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">DRAFT</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">SENT</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">ACCEPTED</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">REJECTED</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">EXPIRED</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">CONVERTED</Badge>;
      default:
        return <Badge variant="outline">{status?.toUpperCase()}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading quotation details...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-6 text-center text-slate-500 space-y-3">
        <p>Quotation record not found.</p>
        <Link href="/sales/quotations">
          <Button variant="outline">Back to Quotations</Button>
        </Link>
      </div>
    );
  }

  const isConverted = quotation.status === 'converted' || !!quotation.converted_invoice_id;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales/quotations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {quotation.quotation_number}
              </h1>
              {getStatusBadge(quotation.status)}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {quotation.quotation_date} {quotation.valid_until ? `· Valid until ${quotation.valid_until}` : ''}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {quotation.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange('sent')}>
              <Send className="w-4 h-4 mr-1.5 text-blue-600" /> Mark Sent
            </Button>
          )}

          {(quotation.status === 'draft' || quotation.status === 'sent') && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('accepted')}>
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Mark Accepted
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('rejected')}>
                <XCircle className="w-4 h-4 mr-1.5 text-red-600" /> Mark Rejected
              </Button>
            </>
          )}

          {/* 1-Click Convert to Invoice Button */}
          {!isConverted && (
            <Button
              variant="default"
              size="sm"
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {converting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              )}
              Convert to Sales Invoice
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <FileText className="w-4 h-4 mr-1.5 text-slate-600" /> Preview PDF
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)}>
            <Share2 className="w-4 h-4 mr-1.5 text-slate-600" /> Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/quotations/${id}/pdf?download=true`, '_blank')}
          >
            <Download className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Converted Alert Banner */}
      {isConverted && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between text-indigo-900">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold">Original Quotation Preserved & Converted</p>
              <p className="text-xs text-indigo-700">
                This estimate was converted into a Sales Invoice. The original quotation record remains preserved.
              </p>
            </div>
          </div>
          {quotation.converted_invoice_id && (
            <Link href={`/sales/invoices/${quotation.converted_invoice_id}`}>
              <Button size="sm" variant="outline" className="bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                View Converted Invoice <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        {/* Customer & Organization Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quotation For</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{quotation.customers?.name}</p>
            {quotation.customers?.gstin && (
              <p className="text-xs text-slate-600 mt-0.5">GSTIN: {quotation.customers.gstin}</p>
            )}
            {quotation.customers?.phone && (
              <p className="text-xs text-slate-600 mt-0.5">Phone: {quotation.customers.phone}</p>
            )}
            {quotation.customers?.email && (
              <p className="text-xs text-slate-600 mt-0.5">Email: {quotation.customers.email}</p>
            )}
          </div>

          <div className="md:text-right">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Total</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">
              {formatCurrency(quotation.total_paise)}
            </p>
            <p className="text-xs text-slate-600 italic mt-1">
              {formatRupeeWords(quotation.total_paise)}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Quotation Items & Tax Breakdown
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">HSN/SAC</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-28 text-right">Unit Price</TableHead>
                  <TableHead className="w-20 text-right">Disc %</TableHead>
                  <TableHead className="w-24 text-right">GST %</TableHead>
                  <TableHead className="w-32 text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(quotation.quotation_line_items || []).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-slate-900">{item.description}</TableCell>
                    <TableCell className="text-slate-600">{item.hsn_sac || '—'}</TableCell>
                    <TableCell className="text-right">{item.quantity} {item.unit || ''}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price_paise)}</TableCell>
                    <TableCell className="text-right">{item.discount_pct || 0}%</TableCell>
                    <TableCell className="text-right">{item.gst_rate || 0}%</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(item.line_total_paise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Financial Totals Breakdown */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
          <div className="space-y-3 w-full md:w-1/2 text-xs text-slate-600">
            {quotation.notes && (
              <div>
                <span className="font-bold text-slate-700">Notes: </span>
                <span>{quotation.notes}</span>
              </div>
            )}
            {quotation.terms && (
              <div>
                <span className="font-bold text-slate-700">Terms & Conditions: </span>
                <span>{quotation.terms}</span>
              </div>
            )}
          </div>

          <div className="w-full md:w-72 bg-slate-50 p-4 rounded-lg border space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(quotation.subtotal_paise)}</span>
            </div>
            {quotation.discount_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-{formatCurrency(quotation.discount_paise)}</span>
              </div>
            )}
            {quotation.cgst_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>CGST:</span>
                <span>{formatCurrency(quotation.cgst_paise)}</span>
              </div>
            )}
            {quotation.sgst_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>SGST:</span>
                <span>{formatCurrency(quotation.sgst_paise)}</span>
              </div>
            )}
            {quotation.igst_paise > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>IGST:</span>
                <span>{formatCurrency(quotation.igst_paise)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-indigo-600">{formatCurrency(quotation.total_paise)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DialogTitle className="text-lg font-bold">
              Quotation PDF Preview — #{quotation.quotation_number}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/api/quotations/${id}/pdf`, '_blank')}
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => window.open(`/api/quotations/${id}/pdf?download=true`, '_blank')}
              >
                <Download className="w-4 h-4 mr-1.5" /> Download PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-slate-100 rounded-md overflow-hidden">
            <iframe
              src={`/api/quotations/${id}/pdf`}
              className="w-full h-full border-none"
              title="Quotation PDF Document"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Quotation Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600">
              Copy the direct URL link below to share this quotation PDF document with your customer.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                className="w-full text-xs font-mono bg-slate-50 border rounded-md p-2"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/quotations/${id}/pdf`}
              />
              <Button size="sm" onClick={handleCopyShareLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
