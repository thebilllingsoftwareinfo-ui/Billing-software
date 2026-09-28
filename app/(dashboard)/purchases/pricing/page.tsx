'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  History,
  Plus,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building,
} from 'lucide-react';

interface SupplierRate {
  id: string;
  supplier_id: string;
  product_id: string;
  unit: string;
  purchase_rate: number;
  min_quantity: number;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
}

interface PriceHistory {
  id: string;
  supplier_id: string;
  product_id: string;
  old_price?: number;
  new_price: number;
  reason?: string;
  created_at: string;
}

export default function SupplierPricingPage() {
  const [rates, setRates] = useState<SupplierRate[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('sup-1');
  const [productId, setProductId] = useState('prod-1');
  const [rate, setRate] = useState('450');
  const [minQty, setMinQty] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [ratesRes, histRes] = await Promise.all([
        fetch('/api/pricing/supplier-rates'),
        fetch('/api/pricing/purchase-history'),
      ]);
      const ratesData = await ratesRes.json();
      const histData = await histRes.json();

      if (ratesData.data) setRates(ratesData.data);
      if (histData.data) setHistory(histData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetRate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/pricing/supplier-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId,
          product_id: productId,
          unit: 'PCS',
          purchase_rate: Number(rate) || 0,
          min_quantity: Number(minQty) || 1,
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNotes('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Building className="w-7 h-7 text-indigo-600" /> Supplier Purchase Rates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Contractual purchase pricing, volume discounts from vendors, and price change history.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Set Supplier Rate
        </button>
      </div>

      {/* Main Section: Current Contract Rates */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Active Contract Rates</h2>
          <span className="text-xs text-gray-500">{rates.length} rates active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Supplier ID</th>
                <th className="px-5 py-3">Product ID</th>
                <th className="px-5 py-3 text-right">Min Qty</th>
                <th className="px-5 py-3 text-right">Contract Rate</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">Loading rates...</td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No supplier rates configured yet. Rates default to product purchase price.
                  </td>
                </tr>
              ) : (
                rates.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{r.supplier_id}</td>
                    <td className="px-5 py-3.5 font-medium text-indigo-600">{r.product_id}</td>
                    <td className="px-5 py-3.5 text-right">{r.min_quantity} {r.unit}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                      ₹{Number(r.purchase_rate).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{r.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Audit Trail */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Purchase Price Change History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-right">Old Price</th>
                <th className="px-5 py-3 text-right">New Price</th>
                <th className="px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    No historical rate changes logged yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-500">
                      {h.created_at ? new Date(h.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{h.product_id}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-500">
                      ₹{Number(h.old_price || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-indigo-600">
                      ₹{Number(h.new_price).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{h.reason || 'Contract update'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set Rate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Set Supplier Contract Rate</h2>
            <form onSubmit={handleSetRate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Supplier *</label>
                <input
                  type="text"
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Product *</label>
                <input
                  type="text"
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Min Quantity Slab</label>
                  <input
                    type="number"
                    min="1"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Contract Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Notes / Contract Reference</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Annual Q4 Rate Lock"
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
                  {submitting ? 'Saving...' : 'Save Contract Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
