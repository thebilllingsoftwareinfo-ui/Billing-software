'use client';

import React, { useState, useEffect } from 'react';
import {
  Repeat,
  Plus,
  Play,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface RecurringTemplate {
  id: string;
  template_name: string;
  customer_id: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  next_run_date: string;
  last_run_date?: string | null;
  payment_terms_days: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  items: any[];
}

export default function RecurringInvoicesPage() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  // Form State
  const [templateName, setTemplateName] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [amount, setAmount] = useState('5000');

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const res = await fetch('/api/recurring-invoices');
      const data = await res.json();
      if (res.ok && data.data) {
        setTemplates(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: templateName,
          customer_id: 'cust-1', // Default starter customer
          frequency,
          start_date: startDate,
          payment_terms_days: Number(paymentTerms) || 0,
          status: 'active',
          items: [
            {
              product_id: 'prod-1',
              quantity: 1,
              unit_price: Number(amount) || 0,
              discount_percent: 0,
              tax_rate: 18,
            },
          ],
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTemplateName('');
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleProcessDue() {
    try {
      setProcessing(true);
      setProcessResult(null);
      const res = await fetch('/api/recurring-invoices/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_date: new Date().toISOString().split('T')[0] }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setProcessResult(`Successfully processed ${data.data.processed_count} recurring invoice(s).`);
        fetchTemplates();
      }
    } catch (err: any) {
      setProcessResult(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Repeat className="w-7 h-7 text-indigo-600" /> Recurring & Scheduled Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automate subscription billing, retainer contracts, and periodic customer invoices.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleProcessDue}
            disabled={processing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-600 text-indigo-600 font-medium hover:bg-indigo-50 transition shadow-sm disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" /> {processing ? 'Generating...' : 'Process Due Now'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Recurring Template
          </button>
        </div>
      </div>

      {processResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {processResult}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Template Name</th>
                <th className="px-5 py-3">Frequency</th>
                <th className="px-5 py-3">Next Execution</th>
                <th className="px-5 py-3">Last Run Date</th>
                <th className="px-5 py-3">Payment Terms</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">Loading templates...</td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    No recurring invoice templates defined yet.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {tpl.template_name}
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-indigo-600">
                      {tpl.frequency}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-700">
                      {tpl.next_run_date}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                      {tpl.last_run_date || 'Never'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      Net {tpl.payment_terms_days} Days
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize bg-emerald-50 text-emerald-700">
                        {tpl.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Create Recurring Invoice Template</h2>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Template / Contract Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Maintenance Retainer"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Recurring Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
