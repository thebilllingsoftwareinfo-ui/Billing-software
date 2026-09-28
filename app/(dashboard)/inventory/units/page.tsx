'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Scale,
  Search,
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowRightLeft,
  Sparkles,
  Layers,
  AlertCircle,
  HelpCircle,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { STANDARD_UNITS, UnitDefinition, validateConversionRatio } from '@/lib/services/unit.service'

interface ConversionRuleItem {
  id: string
  primaryUnit: string
  secondaryUnit: string
  rate: number
  description: string
}

const DEFAULT_CONVERSION_RULES: ConversionRuleItem[] = [
  { id: 'c-1', primaryUnit: 'Pcs', secondaryUnit: 'Box', rate: 10, description: '1 Box = 10 Pcs' },
  { id: 'c-2', primaryUnit: 'Gms', secondaryUnit: 'Kg', rate: 1000, description: '1 Kg = 1,000 Gms' },
  { id: 'c-3', primaryUnit: 'Pcs', secondaryUnit: 'Doz', rate: 12, description: '1 Dozen = 12 Pcs' },
  { id: 'c-4', primaryUnit: 'Ml', secondaryUnit: 'Ltr', rate: 1000, description: '1 Liter = 1,000 Ml' },
  { id: 'c-5', primaryUnit: 'Kg', secondaryUnit: 'Qtl', rate: 100, description: '1 Quintal = 100 Kg' },
]

export default function UnitManagementPage() {
  const [units, setUnits] = useState<UnitDefinition[]>([])
  const [conversionRules, setConversionRules] = useState<ConversionRuleItem[]>(DEFAULT_CONVERSION_RULES)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Unit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitDefinition | null>(null)
  const [unitName, setUnitName] = useState('')
  const [shortName, setShortName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [category, setCategory] = useState<string>('packaging')
  const [decimalsAllowed, setDecimalsAllowed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Conversion Builder Modal State
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false)
  const [convPrimaryUnit, setConvPrimaryUnit] = useState('Pcs')
  const [convSecondaryUnit, setConvSecondaryUnit] = useState('Box')
  const [convRate, setConvRate] = useState<number | ''>(10)

  // Fetch Units
  const fetchUnits = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/units')
      const data = await res.json()
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
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

  // Open Add/Edit Modal
  const openUnitModal = (unit?: UnitDefinition) => {
    if (unit) {
      setEditingUnit(unit)
      setUnitName(unit.name)
      setShortName(unit.short_name)
      setSymbol(unit.symbol || '')
      setCategory(unit.category || 'packaging')
      setDecimalsAllowed(unit.decimals_allowed)
    } else {
      setEditingUnit(null)
      setUnitName('')
      setShortName('')
      setSymbol('')
      setCategory('packaging')
      setDecimalsAllowed(false)
    }
    setIsModalOpen(true)
  }

  // Save Unit
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitName.trim() || !shortName.trim()) {
      toast.error('Unit name and short name/symbol are required')
      return
    }

    setIsSubmitting(true)
    const payload = {
      name: unitName.trim(),
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
      const result = await res.json()

      if (result.success) {
        toast.success(editingUnit ? 'Unit updated successfully' : 'Custom unit created successfully')
        setIsModalOpen(false)
        fetchUnits()
      } else {
        throw new Error(result.error || 'Failed to save unit')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving unit')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Active State
  const handleToggleActive = async (unit: UnitDefinition) => {
    const updatedStatus = !unit.is_active
    try {
      const res = await fetch('/api/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...unit, is_active: updatedStatus }),
      })
      if (res.ok) {
        setUnits((prev) =>
          prev.map((u) => (u.id === unit.id ? { ...u, is_active: updatedStatus } : u))
        )
        toast.success(`Unit ${unit.short_name} ${updatedStatus ? 'activated' : 'deactivated'}`)
      } else {
        throw new Error('Update failed')
      }
    } catch {
      // Local fallback
      setUnits((prev) =>
        prev.map((u) => (u.id === unit.id ? { ...u, is_active: updatedStatus } : u))
      )
      toast.success(`Unit ${unit.short_name} ${updatedStatus ? 'activated' : 'deactivated'}`)
    }
  }

  // Delete/Deactivate Unit
  const handleDeleteUnit = async (unit: UnitDefinition) => {
    if (unit.is_standard) {
      toast.error('Standard statutory units cannot be deleted. You can deactivate them instead.')
      return
    }

    if (!confirm(`Are you sure you want to delete custom unit "${unit.name}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/units?id=${unit.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setUnits((prev) => prev.filter((u) => u.id !== unit.id))
        toast.success('Custom unit removed successfully')
      } else {
        throw new Error(data.error || 'Deletion failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Cannot delete unit referenced by items')
    }
  }

  // Save Unit Conversion Rule
  const handleSaveConversion = (e: React.FormEvent) => {
    e.preventDefault()
    const rate = Number(convRate)
    const val = validateConversionRatio(convPrimaryUnit, convSecondaryUnit, rate)
    if (!val.valid) {
      toast.error(val.error)
      return
    }

    const newRule: ConversionRuleItem = {
      id: `c-${Date.now()}`,
      primaryUnit: convPrimaryUnit,
      secondaryUnit: convSecondaryUnit,
      rate,
      description: `1 ${convSecondaryUnit} = ${rate.toLocaleString()} ${convPrimaryUnit}`,
    }

    setConversionRules((prev) => [newRule, ...prev])
    setIsConversionModalOpen(false)
    toast.success(`Conversion added: ${newRule.description}`)
  }

  // Filter Units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.symbol && u.symbol.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCat =
        selectedCategory === 'all' ||
        (selectedCategory === 'decimal' && u.decimals_allowed) ||
        (selectedCategory === 'integer' && !u.decimals_allowed) ||
        (selectedCategory === 'custom' && !u.is_standard) ||
        (selectedCategory === 'standard' && u.is_standard)

      return matchesSearch && matchesCat
    })
  }, [units, searchQuery, selectedCategory])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Unit Management & Conversion Engine</h1>
            <p className="text-xs text-gray-500">
              Manage statutory primary/secondary units, custom packaging groups, and decimal precision rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsConversionModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
            <span>Unit Conversion Builder</span>
          </button>
          <button
            type="button"
            onClick={() => openUnitModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Custom Unit</span>
          </button>
        </div>
      </div>

      {/* ── METRIC TILES ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Units</span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">
            {units.filter((u) => u.is_active).length}
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {units.filter((u) => u.is_standard).length} Standard Statutory Units
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Custom Units</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {units.filter((u) => !u.is_standard).length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">User-defined packaging groups</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Decimal Precision Allowed</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {units.filter((u) => u.decimals_allowed).length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Weight, volume & fractional units</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Conversions</span>
          <span className="text-2xl font-black text-purple-600 mt-1 block">
            {conversionRules.length}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Automatic inventory base deduction</span>
        </div>
      </div>

      {/* ── CONVERSION RULES QUICK BAR ──────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Active Unit Conversion Ratios</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsConversionModalOpen(true)}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            + New Conversion Rule
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {conversionRules.map((rule) => (
            <div
              key={rule.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-gray-800"
            >
              <span className="font-bold text-blue-700">{rule.description}</span>
              <button
                type="button"
                onClick={() => setConversionRules((prev) => prev.filter((r) => r.id !== rule.id))}
                className="text-slate-400 hover:text-red-500 cursor-pointer"
                title="Remove rule"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search units (e.g. Kg, Box, Gram)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'All Units' },
            { id: 'standard', label: 'Standard (GST)' },
            { id: 'custom', label: 'Custom' },
            { id: 'decimal', label: 'Decimal Allowed' },
            { id: 'integer', label: 'Integer Only' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── UNITS TABLE ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>Loading unit master registry...</span>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
            <p className="font-semibold text-gray-700">No units found matching &quot;{searchQuery}&quot;</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
              className="px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-md font-bold hover:bg-blue-100 transition-colors"
            >
              Clear Search Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-slate-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Unit Name</th>
                  <th className="py-3 px-4">Short Code</th>
                  <th className="py-3 px-4">Symbol / UQC</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Decimal Precision</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                      <span>{unit.name}</span>
                      {unit.is_standard && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-200/50">
                          GST Standard
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-800">
                      {unit.short_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {unit.symbol || unit.code || unit.short_name.toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-gray-600 font-medium">
                        {unit.category || (unit.is_standard ? 'Standard' : 'Packaging')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {unit.decimals_allowed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Decimals Allowed (e.g. 1.25)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <span>Integer Only</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(unit)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          unit.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {unit.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openUnitModal(unit)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit Unit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {!unit.is_standard && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUnit(unit)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Custom Unit"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: ADD / EDIT UNIT ──────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-sm font-bold">
                {editingUnit ? `Edit Unit: ${editingUnit.name}` : '+ Add Custom Unit'}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Box of 24, Carton, Bundle"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Short Name / Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B24, CTN"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold uppercase focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Symbol (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. b24"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Unit Classification</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="packaging">Packaging & Grouping (Box, Pack, Bundle)</option>
                  <option value="weight">Weight (Kg, Gram, Ton)</option>
                  <option value="volume">Volume & Liquid (Liter, Milliliter)</option>
                  <option value="length">Length & Area (Meter, Sq. Feet)</option>
                  <option value="count">Count (Piece, Pair, Dozen)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={decimalsAllowed}
                    onChange={(e) => setDecimalsAllowed(e.target.checked)}
                    className="rounded text-blue-600 border-gray-300 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">Allow Decimal Quantities</span>
                    <span className="text-[11px] text-gray-500 block">
                      Enable if this unit can be bought/sold in fractional quantities (e.g. 1.5 Box)
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: UNIT CONVERSION BUILDER ───────────────────────── */}
      {isConversionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-purple-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                <span className="text-sm font-bold">Configure Unit Conversion Rule</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConversionModalOpen(false)}
                className="text-purple-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConversion} className="p-5 space-y-4 text-xs">
              <p className="text-gray-500 text-[11px]">
                Define conversion ratios between primary and secondary packaging units to automatically adjust
                inventory in purchases and sales without quantity discrepancies.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Secondary Packaging Unit (e.g. Box)
                  </label>
                  <select
                    value={convSecondaryUnit}
                    onChange={(e) => setConvSecondaryUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.short_name}>
                        {u.name} ({u.short_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Primary Base Unit (e.g. Pcs)
                  </label>
                  <select
                    value={convPrimaryUnit}
                    onChange={(e) => setConvPrimaryUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.short_name}>
                        {u.name} ({u.short_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Conversion Factor (Quantity of Base Units in 1 Secondary Unit)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  placeholder="e.g. 10 or 1000"
                  value={convRate}
                  onChange={(e) => setConvRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-gray-900 text-sm"
                  required
                />
              </div>

              {/* Real-time Conversion Rule Preview */}
              <div className="p-3 bg-purple-50 border border-purple-200/80 rounded-xl text-purple-900">
                <span className="text-[11px] font-bold block uppercase tracking-wide text-purple-700">Live Rule Preview:</span>
                <span className="text-sm font-black mt-1 block">
                  1 {convSecondaryUnit} = {convRate ? Number(convRate).toLocaleString() : '...'} {convPrimaryUnit}
                </span>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  Selling 5 {convSecondaryUnit} will deduct{' '}
                  {convRate ? 5 * Number(convRate) : 0} {convPrimaryUnit} from stock.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsConversionModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  Apply Conversion Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
