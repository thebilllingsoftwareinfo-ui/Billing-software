'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
} from 'lucide-react';

interface Salesperson {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  commission_rate: number;
  is_active: boolean;
}

interface Commission {
  id: string;
  salesperson_id: string;
  invoice_id: string;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  paid_at?: string;
  created_at: string;
}

export default function CommissionsPage() {
  const [activeTab, setActiveTab] = useState<'commissions' | 'salespersons'>('commissions');
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Salesperson form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionRate, setCommissionRate] = useState('5.0');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [spRes, commRes] = await Promise.all([
        fetch('/api/salespersons'),
        fetch('/api/commissions'),
      ]);
      const spData = await spRes.json();
      const commData = await commRes.json();

      if (spData.data) setSalespersons(spData.data);
      if (commData.data) setCommissions(commData.data);
    } catch (err: any) {
      console.error('Error fetching commission data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSalesperson(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/salespersons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          email: email || undefined,
          phone: phone || undefined,
          commission_rate: Number(commissionRate) || 0,
          is_active: true,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setName('');
        setCode('');
        setEmail('');
        setPhone('');
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/commissions/${id}/approve`, { method: 'POST' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePay(id: string) {
    try {
      const res = await fetch(`/api/commissions/${id}/pay`, { method: 'POST' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  const getSalespersonName = (id: string) => {
    const sp = salespersons.find((s) => s.id === id);
    return sp ? sp.name : id;
  };

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
  const paidCommissions = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" /> Sales Commission & Agents
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track sales performance, automate commission accruals, and manage payouts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Salesperson
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Accrued</span>
            <div className="text-xl font-bold text-gray-900 mt-0.5">₹{totalCommissions.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pending Approval</span>
            <div className="text-xl font-bold text-amber-600 mt-0.5">₹{pendingCommissions.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Paid Out</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">₹{paidCommissions.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('commissions')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'commissions'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Commission Ledger ({commissions.length})
        </button>
        <button
          onClick={() => setActiveTab('salespersons')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'salespersons'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Salespersons Directory ({salespersons.length})
        </button>
      </div>

      {/* Tab Content: Commissions */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3">Salesperson</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3 text-right">Sale Amount</th>
                  <th className="px-5 py-3 text-right">Rate %</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No commission records logged yet.
                    </td>
                  </tr>
                ) : (
                  commissions.map((comm) => (
                    <tr key={comm.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {getSalespersonName(comm.salesperson_id)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-indigo-600">
                        {comm.invoice_id}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-800">
                        ₹{Number(comm.sale_amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-600">
                        {comm.commission_rate}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                        ₹{Number(comm.commission_amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                            comm.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : comm.status === 'approved'
                              ? 'bg-blue-50 text-blue-700'
                              : comm.status === 'reversed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {comm.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {comm.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(comm.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            Approve
                          </button>
                        )}
                        {comm.status === 'approved' && (
                          <button
                            onClick={() => handlePay(comm.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Salespersons */}
      {activeTab === 'salespersons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salespersons.map((sp) => (
            <div key={sp.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">
                      {sp.code}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">{sp.name}</h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {sp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                  <div>Email: {sp.email || 'None'}</div>
                  <div>Phone: {sp.phone || 'None'}</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-500">Default Commission:</span>
                <span className="text-indigo-600 font-bold text-sm">{sp.commission_rate}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Salesperson Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Add Salesperson / Agent</h2>
            <form onSubmit={handleCreateSalesperson} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Sales Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SP-003"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Commission Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
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
                  {submitting ? 'Saving...' : 'Add Salesperson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
