'use client';

import React, { useState } from 'react';
import { UserPlus, X, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrgRole } from '@/types/app.types';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<OrgRole>('sales');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          full_name: fullName || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to invite team member');
      }

      setEmail('');
      setFullName('');
      setRole('sales');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending invitation');
    } fontFinally: {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invite Team Member</h2>
            <p className="text-xs text-gray-500">Assign role and granular access permissions</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 border border-gray-300 rounded-lg px-3 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Full Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-9 border border-gray-300 rounded-lg px-3 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Assign Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
              className="w-full h-9 border border-gray-300 rounded-lg px-3 text-gray-900 bg-white font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="admin">ADMIN — Full management access</option>
              <option value="manager">MANAGER — Operations, sales & inventory manager</option>
              <option value="sales">SALES — Invoices, quotations & customer management</option>
              <option value="inventory">INVENTORY — Product catalog & stock adjustments</option>
              <option value="accountant">ACCOUNTANT — Payments, expenses & financial reports</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border text-[11px] text-gray-600 space-y-1">
            <div className="font-semibold text-gray-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Role Scope Summary:
            </div>
            {role === 'admin' && <p>Admins can access everything except owner billing settings.</p>}
            {role === 'manager' && <p>Managers handle sales, purchases, inventory, and expenses.</p>}
            {role === 'sales' && <p>Sales staff can create invoices, manage customers & estimates.</p>}
            {role === 'inventory' && <p>Inventory staff can adjust stock ledger and edit product catalogs.</p>}
            {role === 'accountant' && <p>Accountants manage payment collections, expenses & reports.</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
