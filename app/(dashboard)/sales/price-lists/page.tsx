'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Layers,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

interface PriceListItem {
  id: string;
  product_id: string;
  unit: string;
  min_quantity: number;
  max_quantity?: number | null;
  fixed_price?: number | null;
  discount_percent?: number;
}

interface PriceList {
  id: string;
  name: string;
  code: string;
  description?: string;
  currency: string;
  customer_group?: string;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  items?: PriceListItem[];
}

export default function PriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [customerGroup, setCustomerGroup] = useState('wholesale');
  const [fixedPrice, setFixedPrice] = useState('500');
  const [minQty, setMinQty] = useState('1');

  useEffect(() => {
    fetchPriceLists();
  }, []);

  async function fetchPriceLists() {
    try {
      setLoading(true);
      const res = await fetch('/api/pricing/price-lists');
      const data = await res.json();
      if (res.ok && data.data) {
        setPriceLists(data.data);
      }
    } catch (err: any) {
      console.error('Failed to load price lists:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePriceList(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    try {
      setSubmitting(true);
      const res = await fetch('/api/pricing/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          description,
          customer_group: customerGroup,
          currency: 'INR',
          is_active: true,
          items: [
            {
              product_id: 'prod-1', // Default starter product demo link
              unit: 'PCS',
              min_quantity: Number(minQty) || 1,
              fixed_price: Number(fixedPrice) || 0,
              discount_percent: 0,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create price list');

      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      fetchPriceLists();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredLists = priceLists.filter(
    (pl) =>
      pl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pl.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pl.customer_group && pl.customer_group.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-indigo-600" /> Price Lists & Slabs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure tiered pricing, wholesale rates, and customer group price lists.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Price List
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search price lists by name, code, or customer group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Price Lists */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading price lists...</div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 p-8">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No price lists configured</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create custom price lists to apply wholesale, distributor, or seasonal discounts automatically.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Create First Price List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map((pl) => (
            <div
              key={pl.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {pl.code}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">{pl.name}</h3>
                  </div>
                  {pl.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                      <XCircle className="w-3.5 h-3.5" /> Inactive
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {pl.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer Group:</span>
                    <span className="font-medium capitalize text-gray-800">{pl.customer_group || 'General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Currency:</span>
                    <span className="font-medium text-gray-800">{pl.currency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-400">Deterministic Tier</span>
                <span className="text-indigo-600 font-semibold flex items-center gap-1">
                  Tier Active <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Price List</h2>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePriceList} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Price List Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Wholesale Slab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Price List Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PL-VIP-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Customer Group</label>
                <select
                  value={customerGroup}
                  onChange={(e) => setCustomerGroup(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="wholesale">Wholesale</option>
                  <option value="retail">Retail</option>
                  <option value="distributor">Distributor</option>
                  <option value="vip">VIP Customers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or terms..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
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
                  <label className="block text-xs font-medium text-gray-700">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
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
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Create Price List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
