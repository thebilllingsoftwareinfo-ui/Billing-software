'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, X, Package, Tag, Calculator, Layers, AlertCircle, Plus } from 'lucide-react'
import { productSchema, ProductFormInput, VALID_GST_RATES } from '@/lib/validators/product.schema'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: any
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ProductFormModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  const isEditing = Boolean(initialData?.id)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      product_type: 'goods',
      selling_price: 0,
      purchase_price: 0,
      gst_rate: 18,
      min_stock_level: 0,
      opening_stock: 0,
    },
  })

  // Fetch categories and units
  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setCategories(d.data)
        })
      fetch('/api/units')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setUnits(d.data)
        })
    }
  }, [isOpen])

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        sku: initialData.sku || '',
        barcode: initialData.barcode || '',
        category_id: initialData.category_id || '',
        unit_id: initialData.unit_id || '',
        hsn_sac_code: initialData.hsn_sac_code || '',
        product_type: initialData.product_type || 'goods',
        selling_price: Number(initialData.sale_price) || 0,
        purchase_price: Number(initialData.purchase_price) || 0,
        gst_rate: Number(initialData.gst_rate) || 18,
        min_stock_level: Number(initialData.min_stock_level) || 0,
        opening_stock: Number(initialData.opening_stock) || 0,
        description: initialData.description || '',
      })
    } else {
      reset({
        name: '',
        sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
        product_type: 'goods',
        selling_price: 0,
        purchase_price: 0,
        gst_rate: 18,
        min_stock_level: 5,
        opening_stock: 0,
      })
    }
  }, [initialData, reset])

  if (!isOpen) return null

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Category '${newCategoryName}' created!`)
        setCategories((prev) => [...prev, data.data])
        setValue('category_id', data.data.id)
        setNewCategoryName('')
        setIsAddingCategory(false)
      } else {
        toast.error(data.error || 'Failed to add category')
      }
    } catch {
      toast.error('An error occurred while adding category.')
    }
  }

  const onSubmit = async (values: ProductFormInput) => {
    setIsLoading(true)
    try {
      const url = isEditing ? `/api/products/${initialData.id}` : '/api/products'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to save product.')
        return
      }

      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully')
      onSuccess()
      onClose()
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? 'Edit Product Catalog Item' : 'Add Product to Catalog'}
              </h2>
              <p className="text-xs text-gray-500">Specify pricing, HSN code, GST rate, and reorder levels.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5" noValidate>
          {/* Section 1: Product Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">1. Product Identity & SKU</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Samsung Galaxy S24 Ultra (256GB)"
                  {...register('name')}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">
                    SKU Code <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setValue('sku', `SKU-${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    Auto Generate
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="MOB-SAM-S24U"
                  {...register('sku', {
                    setValueAs: (v: string) => v?.toUpperCase() ?? '',
                  })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.sku && <p className="text-xs text-red-500">{errors.sku.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Barcode / EAN (Optional)</label>
                <input
                  type="text"
                  placeholder="8806095000000"
                  {...register('barcode')}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">Category</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory((v) => !v)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Quick Add
                  </button>
                </div>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-xl border border-indigo-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    {...register('category_id')}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Unit of Measurement</label>
                <select
                  {...register('unit_id')}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Unit (e.g. PCS, BOX)</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Tax */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">2. Pricing & GST Tax</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="129999.00"
                  {...register('selling_price', { valueAsNumber: true })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.selling_price && <p className="text-xs text-red-500">{errors.selling_price.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Purchase Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="115000.00"
                  {...register('purchase_price', { valueAsNumber: true })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">GST Tax Rate (%)</label>
                <select
                  {...register('gst_rate', { valueAsNumber: true })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {VALID_GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}% GST
                    </option>
                  ))}
                </select>
                {errors.gst_rate && <p className="text-xs text-red-500">{errors.gst_rate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">HSN / SAC Code</label>
                <input
                  type="text"
                  placeholder="8517"
                  {...register('hsn_sac_code')}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">Product Type</label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="radio" value="goods" {...register('product_type')} className="text-indigo-600" />
                    Physical Goods (Inventory Tracked)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="radio" value="service" {...register('product_type')} className="text-indigo-600" />
                    Service (No Stock)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Inventory & Opening Stock */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">3. Stock & Inventory Alert</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Opening Stock Quantity</label>
                <input
                  type="number"
                  step="1"
                  disabled={isEditing}
                  placeholder="15"
                  {...register('opening_stock', { valueAsNumber: true })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isEditing ? (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Stock cannot be directly mutated. Use Stock Adjustments.
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400">Creates an opening inventory movement record.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  step="1"
                  placeholder="5"
                  {...register('min_stock_level', { valueAsNumber: true })}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-gray-400">Triggers low stock badge when current stock falls below this.</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
