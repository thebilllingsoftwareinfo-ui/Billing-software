'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Building,
  CheckCircle,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface Suggestion {
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  pending_sales_demand: number;
  pending_purchase_supply: number;
  suggested_quantity: number;
  preferred_supplier_id?: string | null;
  preferred_supplier_name?: string | null;
  estimated_unit_cost: number;
  estimated_total_cost: number;
}

export default function ProcurementPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement/suggestions');
      const data = await res.json();
      if (res.ok && data.data) {
        setSuggestions(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalReplenishmentCost = suggestions.reduce(
    (sum, s) => sum + Number(s.estimated_total_cost || 0),
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-indigo-600" /> Reorder & Procurement Suggestions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Intelligent replenishment triggers factoring available stock, pending sales orders, and supplier lead times.
          </p>
        </div>
        <Link
          href="/purchases/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" /> Create Purchase Order
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Items Below Reorder Level
          </span>
          <div className="text-2xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            {suggestions.length} Products
            {suggestions.length > 0 && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                Action Recommended
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Est. Replenishment Capital
          </span>
          <div className="text-2xl font-bold text-indigo-600 mt-0.5">
            ₹{totalReplenishmentCost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Suggestions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Product / SKU</th>
                <th className="px-5 py-3">Warehouse</th>
                <th className="px-5 py-3 text-right">Available</th>
                <th className="px-5 py-3 text-right">Reorder Threshold</th>
                <th className="px-5 py-3 text-right">Suggested Order</th>
                <th className="px-5 py-3">Preferred Supplier</th>
                <th className="px-5 py-3 text-right">Est. Unit Cost</th>
                <th className="px-5 py-3 text-right">Est. Cost</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">Loading recommendations...</td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    All inventory items are well-stocked above reorder thresholds.
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => (
                  <tr key={`${s.product_id}-${s.warehouse_id}`} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      <div>{s.product_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.sku}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700">{s.warehouse_name}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-amber-600">
                      {s.available_stock}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-gray-500">
                      {s.reorder_level}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-indigo-600">
                      +{s.suggested_quantity}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700">
                      {s.preferred_supplier_name || 'Standard Vendor'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-600">
                      ₹{s.estimated_unit_cost}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                      ₹{s.estimated_total_cost.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/purchases/orders/new?product_id=${s.product_id}&qty=${s.suggested_quantity}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      >
                        Order <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
