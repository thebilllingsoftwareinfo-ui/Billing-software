'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FolderPlus, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageCategoriesModal({ isOpen, onClose, onSuccess }: ManageCategoriesModalProps) {
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  async function fetchCategories() {
    try {
      setLoading(true);
      const res = await fetch('/api/expenses/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setAdding(true);
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create category');
      }

      toast.success('New expense category added!');
      setNewCategoryName('');
      fetchCategories();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error adding category');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FolderPlus className="w-5 h-5 text-indigo-600" />
            Manage Expense Categories
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAddCategory} className="space-y-3 pt-2">
          <div className="flex gap-2">
            <Input
              placeholder="New Category Name (e.g. Licensing Fees)..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
            />
            <Button type="submit" disabled={adding || !newCategoryName.trim()} className="bg-indigo-600">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add
            </Button>
          </div>
        </form>

        <div className="border-t pt-4 space-y-2 max-h-64 overflow-y-auto">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Existing Categories</Label>

          {loading ? (
            <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-slate-400">No categories found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 p-2 bg-slate-50 border rounded-md text-xs font-medium text-slate-800"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
