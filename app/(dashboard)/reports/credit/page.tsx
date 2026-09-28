'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit2,
  CreditCard,
  Building,
} from 'lucide-react';

interface CustomerCreditItem {
  id: string;
  name: string;
  phone?: string;
  credit_limit: number;
  current_balance: number;
  default_payment_terms_days?: number;
}

export default function CreditExposurePage() {
  const [customers, setCustomers] = useState<CustomerCreditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCreditItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLimit, setNewLimit] = useState('100000');
  const [newTerms, setNewTerms] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok && data.data) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(cust: CustomerCreditItem) {
    setSelectedCustomer(cust);
    setNewLimit(String(cust.credit_limit || 0));
    setNewTerms(String(cust.default_payment_terms_days || 0));
    setIsModalOpen(true);
  }

  async function handleUpdateCredit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/credit/customer/${selectedCustomer.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credit_limit: Number(newLimit) || 0,
          payment_terms_days: Number(newTerms) || 0,
          reason: 'Manual limit adjustment from Credit Exposure Report',
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = customers.filter((c) => {
    const custName = (c.name || (c as any).display_name || '').toLowerCase();
    const custPhone = c.phone || (c as any).mobile || '';
    const term = searchTerm.toLowerCase();
    return custName.includes(term) || custPhone.includes(term);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-600" /> Customer Credit Control & Exposure
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor customer credit limits, outstanding exposure, and manage sales order approval thresholds.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search customer by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Exposure Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3 text-right">Credit Limit</th>
                <th className="px-5 py-3 text-right">Outstanding Due</th>
                <th className="px-5 py-3 text-right">Available Credit</th>
                <th className="px-5 py-3 text-right">Utilization %</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">Loading customer credit profiles...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">No customers found.</td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const limit = Number(cust.credit_limit || 0);
                  const due = Number(cust.current_balance || 0);
                  const avail = limit > 0 ? Math.max(0, limit - due) : 0;
                  const util = limit > 0 ? Math.min(100, Math.round((due / limit) * 100)) : 0;

                  let status = 'OK';
                  let badgeClass = 'bg-emerald-50 text-emerald-700';
                  if (limit > 0) {
                    if (due > limit) {
                      status = 'EXCEEDED';
                      badgeClass = 'bg-rose-50 text-rose-700';
                    } else if (due >= limit * 0.8) {
                      status = 'NEAR LIMIT';
                      badgeClass = 'bg-amber-50 text-amber-700';
                    }
                  }

                  return (
                    <tr key={cust.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div>{cust.name || (cust as any).display_name || 'Customer'}</div>
                        {cust.phone && <div className="text-xs text-gray-400">{cust.phone}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                        {limit > 0 ? `₹${limit.toLocaleString()}` : <span className="text-gray-400">Unlimited / None</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                        ₹{due.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-600">
                        {limit > 0 ? `₹${avail.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold">
                        {limit > 0 ? `${util}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openEditModal(cust)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                          <Edit2 className="w-3 h-3" /> Set Limit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Limit Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Update Credit Limit: {selectedCustomer.name || (selectedCustomer as any).display_name || 'Customer'}</h2>
            <form onSubmit={handleUpdateCredit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Credit Limit (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-gray-400 mt-1 block">Set 0 for unlimited / cash-only sale terms.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Default Payment Terms (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={newTerms}
                  onChange={(e) => setNewTerms(e.target.value)}
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
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  {submitting ? 'Saving...' : 'Update Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
