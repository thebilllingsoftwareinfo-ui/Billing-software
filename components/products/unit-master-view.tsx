'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Scale,
  Check,
  X,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Info,
  Sparkles,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { STANDARD_UNITS, UnitDefinition } from '@/lib/services/unit.service'

export function UnitMasterView() {
  const [units, setUnits] = useState<UnitDefinition[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitDefinition | null>(null)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [category, setCategory] = useState<any>('packaging')
  const [decimalsAllowed, setDecimalsAllowed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load Units
  const fetchUnits = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/units')
      const data = await res.json()
      if (data.success && data.data && data.data.length > 0) {
        setUnits(data.data)
      } else {
        setUnits(STANDARD_UNITS)
      }
    } catch (err) {
      console.error('Failed to fetch units:', err)
      setUnits(STANDARD_UNITS)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUnits()
  }, [])

  // Open Create / Edit Modal
  const openModal = (unit?: UnitDefinition) => {
    if (unit) {
      setEditingUnit(unit)
      setName(unit.name)
      setShortName(unit.short_name)
      setSymbol(unit.symbol || '')
      setCategory(unit.category || 'packaging')
      setDecimalsAllowed(unit.decimals_allowed)
    } else {
      setEditingUnit(null)
      setName('')
      setShortName('')
      setSymbol('')
      setCategory('packaging')
      setDecimalsAllowed(false)
    }
    setIsModalOpen(true)
  }

  // Save Unit (Create or Edit)
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !shortName.trim()) {
      toast.error('Unit name and short name are required')
      return
    }

    setIsSubmitting(true)
    const payload = {
      name: name.trim(),
      short_name: shortName.trim().toUpperCase(),
      symbol: symbol.trim() || undefined,
      category,
      decimals_allowed: decimalsAllowed,
    }

    try {
      const url = '/api/units'
      const method = editingUnit ? 'PUT' : 'POST'
      const body = editingUnit ? { ...payload, id: editingUnit.id } : payload

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(
          editingUnit
            ? `Unit "${payload.short_name}" updated successfully`
            : `Custom Unit "${payload.short_name}" created successfully`
        )
        setIsModalOpen(false)
        fetchUnits()
      } else {
        toast.error(data.error || 'Failed to save unit')
      }
    } catch (err) {
      console.error('Error saving unit:', err)
      toast.error('Failed to save unit. Check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (unit: UnitDefinition) => {
    try {
      const nextStatus = !unit.is_active
      const res = await fetch('/api/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: unit.id, is_active: nextStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Unit ${unit.short_name} ${nextStatus ? 'activated' : 'deactivated'}`)
        setUnits((prev) =>
          prev.map((u) => (u.id === unit.id ? { ...u, is_active: nextStatus } : u))
        )
      } else {
        toast.error(data.error || 'Failed to update unit status')
      }
    } catch {
      toast.error('Failed to update unit status')
    }
  }

  // Delete / Archive Custom Unit
  const handleDeleteUnit = async (unit: UnitDefinition) => {
    if (unit.is_standard) {
      toast.error('Standard GST units cannot be permanently deleted. You can deactivate them instead.')
      return
    }
    if (!confirm(`Are you sure you want to delete custom unit "${unit.name}" (${unit.short_name})?`)) {
      return
    }

    try {
      const res = await fetch(`/api/units?id=${unit.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Unit ${unit.short_name} deleted`)
        setUnits((prev) => prev.filter((u) => u.id !== unit.id))
      } else {
        toast.error(data.error || 'Failed to delete unit')
      }
    } catch {
      toast.error('Failed to delete unit')
    }
  }

  // Filter Units
  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.code && u.code.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'custom' && !u.is_standard) ||
      u.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', label: 'All Units' },
    { id: 'count', label: 'Count & Pieces' },
    { id: 'weight', label: 'Weight & Mass' },
    { id: 'volume', label: 'Volume & Liquids' },
    { id: 'length', label: 'Length & Distance' },
    { id: 'area', label: 'Area' },
    { id: 'packaging', label: 'Packaging & Bundles' },
    { id: 'custom', label: 'Custom Units' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* ── TOP ACTION BAR ────────────────────────────────────── */}
      <div className="p-6 pb-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Unit Master Management
            </h1>
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {units.length} Units Available
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure primary and secondary units of measurement with decimal quantity controls and GST compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Unit</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH & CATEGORY FILTER TABS ─────────────────────── */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search unit by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>

      {/* ── UNITS TABLE CANVAS ────────────────────────────────── */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white border border-gray-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Unit Name</th>
                <th className="px-4 py-3.5">Short Name</th>
                <th className="px-4 py-3.5">GST Code</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Decimal Quantities</th>
                <th className="px-4 py-3.5">Classification</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Scale className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">No units found</p>
                    <p className="text-[11px] text-gray-400">Try adjusting your search query or category filter</p>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      !unit.is_active ? 'opacity-55 bg-gray-50/50' : ''
                    }`}
                  >
                    {/* Unit Name */}
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{unit.name}</span>
                        {unit.symbol && (
                          <span className="text-[11px] text-gray-400 font-mono">({unit.symbol})</span>
                        )}
                      </div>
                    </td>

                    {/* Short Name */}
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-700">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200/80">
                        {unit.short_name}
                      </span>
                    </td>

                    {/* GST Code */}
                    <td className="px-4 py-3.5 font-mono text-gray-600">
                      {unit.code || '—'}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 capitalize text-gray-700">
                      {unit.category || 'Standard'}
                    </td>

                    {/* Decimal Quantities */}
                    <td className="px-4 py-3.5">
                      {unit.decimals_allowed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="h-3 w-3" />
                          <span>Allowed (e.g. 1.250)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          Integers Only (1, 2, 3)
                        </span>
                      )}
                    </td>

                    {/* Classification */}
                    <td className="px-4 py-3.5">
                      {unit.is_standard ? (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                          Standard GST
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </td>

                    {/* Active Toggle */}
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(unit)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          unit.is_active
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={unit.is_active ? 'Click to deactivate unit' : 'Click to activate unit'}
                      >
                        {unit.is_active ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {!unit.is_standard && (
                          <>
                            <button
                              type="button"
                              onClick={() => openModal(unit)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Custom Unit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(unit)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Custom Unit"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT UNIT MODAL ──────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold">
                  {editingUnit ? 'Edit Unit of Measurement' : 'Add Custom Unit'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-5 space-y-4 text-xs">
              {/* Unit Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Carton, Bundle of 20"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:border-blue-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Short Name & Symbol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Short Name / Abbr *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CTN, BND"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Symbol (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ctn"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:border-blue-500 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="packaging">Packaging & Bundles</option>
                  <option value="count">Count & Pieces</option>
                  <option value="weight">Weight & Mass</option>
                  <option value="volume">Volume & Liquids</option>
                  <option value="length">Length & Distance</option>
                  <option value="area">Area & Surface</option>
                </select>
              </div>

              {/* Decimal Quantities Checkbox */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decimalsAllowed}
                    onChange={(e) => setDecimalsAllowed(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Allow Decimal Quantities
                  </span>
                </label>
                <p className="text-[11px] text-gray-500 pl-5">
                  Check this if products using this unit can be sold in fractions (e.g. 1.500 KG or 2.75 MTR). Uncheck for indivisible items.
                </p>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
