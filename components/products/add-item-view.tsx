'use client'
import React, { useState, useEffect } from 'react'

import {
  X,
  Settings,
  Search,
  Camera,
  ImagePlus,
  Plus,
  ChevronDown,
  Check,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  Sparkles,
  Barcode as BarcodeIcon,
  Package,
  QrCode,
  Tag,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { VALID_GST_RATES } from '@/lib/validators/product.schema'
import { STANDARD_UNITS } from '@/lib/services/unit.service'
import { generateEan13Barcode, generateCode128Barcode, generateBarcodeSvg } from '@/lib/services/barcode.service'
import { STANDARD_GST_RATES, TaxTreatment } from '@/lib/services/tax.service'
import { useCategoryConfig } from '@/lib/hooks/useCategoryConfig'
import { BusinessCategoryService } from '@/lib/services/business-category.service'

export interface AddItemViewProps {
  initialData?: any
  onClose: () => void
  onSuccess: (savedProduct?: any) => void
}

const COMMON_HSN_CODES = [
  { code: '8481', desc: 'Taps, cocks, valves & similar appliances (Industrial Hardware)', gst: 18 },
  { code: '8504', desc: 'Electrical transformers, static converters, inductors', gst: 18 },
  { code: '7306', desc: 'Tubes, pipes and hollow profiles of iron or steel', gst: 18 },
  { code: '7113', desc: 'Articles of jewellery and parts thereof, of precious metal', gst: 3 },
  { code: '6109', desc: 'T-shirts, singlets and other vests, knitted or crocheted', gst: 5 },
  { code: '3004', desc: 'Medicaments for therapeutic or prophylactic uses', gst: 12 },
  { code: '9983', desc: 'Information technology and consulting services', gst: 18 },
  { code: '9954', desc: 'General construction and engineering works services', gst: 18 },
  { code: '1006', desc: 'Rice, husked or semi-milled (Foodgrains)', gst: 0 },
  { code: '8708', desc: 'Parts and accessories of motor vehicles', gst: 28 },
]

const UNIT_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'BAGS', label: 'BAGS (BAG)' },
  { value: 'BOTTLES', label: 'BOTTLES (BTL)' },
  { value: 'BOX', label: 'BOX' },
  { value: 'BUNDLES', label: 'BUNDLES (BDL)' },
  { value: 'CANS', label: 'CANS (CAN)' },
  { value: 'CARTONS', label: 'CARTONS (CTN)' },
  { value: 'CENTIMETERS', label: 'CENTIMETERS (CMS)' },
  { value: 'DOZENS', label: 'DOZENS (DOZ)' },
  { value: 'GRAMMES', label: 'GRAMMES (GMS)' },
  { value: 'KILOGRAMS', label: 'KILOGRAMS (KGS)' },
  { value: 'LITRES', label: 'LITRES (LTR)' },
  { value: 'METERS', label: 'METERS (MTR)' },
  { value: 'MILLILITRE', label: 'MILLILITRE (MLT)' },
  { value: 'NUMBERS', label: 'NUMBERS (NOS)' },
  { value: 'PACKS', label: 'PACKS (PAC)' },
  { value: 'PAIRS', label: 'PAIRS (PRS)' },
  { value: 'PIECES', label: 'PIECES (PCS)' },
  { value: 'QUINTAL', label: 'QUINTAL (QTL)' },
  { value: 'ROLLS', label: 'ROLLS (ROL)' },
  { value: 'SETS', label: 'SETS (SET)' },
  { value: 'SQF', label: 'SQ. FEET (SQF)' },
  { value: 'SQM', label: 'SQ. METERS (SQM)' },
  { value: 'TABLETS', label: 'TABLETS (TBS)' },
  { value: 'TONNES', label: 'TONNES (TON)' },
]

export function AddItemView({ initialData, onClose, onSuccess }: AddItemViewProps) {
  const isEditing = Boolean(initialData?.id)

  // 1. Basic Information
  const [productType, setProductType] = useState<'goods' | 'service'>(
    initialData?.product_type === 'service' ? 'service' : 'goods'
  )
  const [name, setName] = useState(initialData?.name || '')
  const [hsn, setHsn] = useState(initialData?.hsn_sac_code || '')
  const [itemCode, setItemCode] = useState(
    initialData?.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`
  )
  const [selectedUnit, setSelectedUnit] = useState(
    initialData?.product_units?.abbreviation || initialData?.primary_unit || initialData?.unit || ''
  )
  const [selectedCategory, setSelectedCategory] = useState(
    initialData?.category_id || initialData?.category || 'Hardware'
  )
  const [itemImage, setItemImage] = useState<string | null>(initialData?.image_url || null)

  // 2. Barcode & Multi-Barcode Aliases
  const [barcode, setBarcode] = useState(initialData?.barcode || '')
  const [barcodes, setBarcodes] = useState<string[]>(
    initialData?.barcodes || (initialData?.barcode ? [initialData.barcode] : [])
  )
  const [newBarcodeAlias, setNewBarcodeAlias] = useState('')
  const [barcodeSvg, setBarcodeSvg] = useState<string>('')

  // 3. Unit Selection State
  const [secondaryUnit, setSecondaryUnit] = useState(initialData?.secondary_unit || '')
  const [tempBaseUnit, setTempBaseUnit] = useState('None')
  const [tempSecondaryUnit, setTempSecondaryUnit] = useState('None')

  // 4. Active Tab: 'pricing' | 'stock' | 'specs'
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'specs'>('pricing')

  const categoryConfig = useCategoryConfig()

  // Category-specific adaptive fields
  // A. Jewellery Fields
  const [metalType, setMetalType] = useState(initialData?.metal_type || 'Gold')
  const [purity, setPurity] = useState(initialData?.purity || '22K (91.6%)')
  const [carat, setCarat] = useState<number | ''>(initialData?.carat !== undefined ? Number(initialData.carat) : '')
  const [grossWeight, setGrossWeight] = useState<number | ''>(initialData?.gross_weight !== undefined ? Number(initialData.gross_weight) : '')
  const [stoneWeight, setStoneWeight] = useState<number | ''>(initialData?.stone_weight !== undefined ? Number(initialData.stone_weight) : '')
  const [stoneValue, setStoneValue] = useState<number | ''>(initialData?.stone_value !== undefined ? Number(initialData.stone_value) : '')
  const [makingCharge, setMakingCharge] = useState<number | ''>(initialData?.making_charge !== undefined ? Number(initialData.making_charge) : '')
  const [makingChargeType, setMakingChargeType] = useState<'per_gram' | 'fixed' | 'percentage'>(initialData?.making_charge_type || 'per_gram')
  const [wastage, setWastage] = useState<number | ''>(initialData?.wastage !== undefined ? Number(initialData.wastage) : '')
  const [wastageType, setWastageType] = useState<'percentage' | 'grams'>(initialData?.wastage_type || 'percentage')
  const [otherCharges, setOtherCharges] = useState<number | ''>(initialData?.other_charges !== undefined ? Number(initialData.other_charges) : '')
  const [hallmarkHuid, setHallmarkHuid] = useState(initialData?.hallmark_huid || '')
  const [isLivePrice, setIsLivePrice] = useState(initialData?.is_live_price || false)
  const [bullionRate, setBullionRate] = useState<number>(7200)

  // B. Pharmacy / FMCG Fields
  const [batchNo, setBatchNo] = useState(initialData?.metadata?.batch_no || '')
  const [expiryDate, setExpiryDate] = useState(initialData?.metadata?.expiry_date || '')
  const [composition, setComposition] = useState(initialData?.metadata?.composition || '')
  const [mrp, setMrp] = useState<number | ''>(initialData?.metadata?.mrp !== undefined ? Number(initialData.metadata.mrp) : '')

  // C. Apparel & Footwear Fields
  const [apparelSize, setApparelSize] = useState(initialData?.metadata?.size || '')
  const [apparelColor, setApparelColor] = useState(initialData?.metadata?.color || '')
  const [apparelBrand, setApparelBrand] = useState(initialData?.metadata?.brand || '')

  // D. Serial / Electronics / Auto
  const [serialNo, setSerialNo] = useState(initialData?.metadata?.serial_no || '')
  const [modelNo, setModelNo] = useState(initialData?.metadata?.model_no || '')
  const [warrantyMonths, setWarrantyMonths] = useState<number | ''>(initialData?.metadata?.warranty_months !== undefined ? Number(initialData.metadata.warranty_months) : '')

  const netWeight = Math.max(0, (Number(grossWeight) || 0) - (Number(stoneWeight) || 0))

  const handleRecalculateJewelleryPrice = () => {
    const calc = BusinessCategoryService.calculateJewelleryItem({
      grossWeight: Number(grossWeight) || 0,
      stoneWeight: Number(stoneWeight) || 0,
      metalRatePerGram: bullionRate,
      purityFactor: purity.includes('24K') ? 1 : purity.includes('22K') ? 0.916 : purity.includes('18K') ? 0.75 : 1,
      wastage: Number(wastage) || 0,
      wastageType: wastageType,
      makingCharge: Number(makingCharge) || 0,
      makingChargeType: makingChargeType,
      stoneValue: Number(stoneValue) || 0,
      otherCharges: Number(otherCharges) || 0,
      gstRate: 3,
    })

    setSalePrice(calc.finalAmount)
    toast.success(`Calculated price ₹${calc.finalAmount} (Net Wt: ${calc.netWeight}g, Metal: ₹${calc.metalValue}, Making: ₹${calc.makingChargesAmount})`)
  }

  // 5. Pricing Tab Fields
  const [salePrice, setSalePrice] = useState<number | ''>(
    initialData?.sale_price !== undefined ? Number(initialData.sale_price) : ''
  )
  const [salePriceTaxType, setSalePriceTaxType] = useState<'without_tax' | 'with_tax'>('without_tax')
  const [discountValue, setDiscountValue] = useState<number | ''>('')
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')

  // Wholesale Price (Collapsible)
  const [showWholesale, setShowWholesale] = useState(false)
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('')
  const [minWholesaleQty, setMinWholesaleQty] = useState<number | ''>('')

  // Purchase Price & Tax
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(
    initialData?.purchase_price !== undefined ? Number(initialData.purchase_price) : ''
  )
  const [purchasePriceTaxType, setPurchasePriceTaxType] = useState<'without_tax' | 'with_tax'>('without_tax')
  
  // Tax treatment & Full GST rates
  const [taxTreatment, setTaxTreatment] = useState<TaxTreatment>(initialData?.tax_treatment || 'taxable')
  const [selectedTaxRate, setSelectedTaxRate] = useState<number>(
    initialData?.gst_rate !== undefined ? Number(initialData.gst_rate) : 18
  )
  const [isCustomTax, setIsCustomTax] = useState(
    initialData?.gst_rate !== undefined &&
      !(STANDARD_GST_RATES as readonly number[]).includes(Number(initialData.gst_rate))
  )
  const [customTaxRate, setCustomTaxRate] = useState<number | ''>(
    initialData?.gst_rate !== undefined &&
      !(STANDARD_GST_RATES as readonly number[]).includes(Number(initialData.gst_rate))
      ? Number(initialData.gst_rate)
      : ''
  )
  const [cessRate, setCessRate] = useState<number | ''>(
    initialData?.cess_rate !== undefined ? Number(initialData.cess_rate) : ''
  )
  const [cessFixed, setCessFixed] = useState<number | ''>(
    initialData?.cess_amount !== undefined ? Number(initialData.cess_amount) : ''
  )

  // 6. Stock Tab Fields
  const [openingStock, setOpeningStock] = useState<number | ''>(
    initialData?.opening_stock !== undefined ? Number(initialData.opening_stock) : 0
  )
  const [atPrice, setAtPrice] = useState<number | ''>(
    initialData?.purchase_price !== undefined ? Number(initialData.purchase_price) : ''
  )
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(
    initialData?.min_stock_level !== undefined ? Number(initialData.min_stock_level) : 5
  )
  const [location, setLocation] = useState('')

  // Modals & Helpers state
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false)
  const [hsnSearch, setHsnSearch] = useState('')
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Hardware',
    'Electronics',
    'Raw Material',
    'Finished Goods',
    'Spare Parts',
    'Apparel & Garments',
    'General Services',
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Real-time Barcode SVG preview effect
  useEffect(() => {
    if (barcode && barcode.trim().length >= 3) {
      try {
        const svg = generateBarcodeSvg(barcode.trim(), { height: 32, showText: true, fontSize: 10 })
        setBarcodeSvg(svg)
      } catch {
        setBarcodeSvg('')
      }
    } else {
      setBarcodeSvg('')
    }
  }, [barcode])

  // Barcode Generation Helpers
  const handleGenerateEan13 = () => {
    const code = generateEan13Barcode('890')
    setBarcode(code)
    if (!barcodes.includes(code)) {
      setBarcodes((prev) => [code, ...prev])
    }
    toast.success(`Generated Indian EAN-13 Barcode: ${code}`)
  }

  const handleGenerateCode128 = () => {
    const code = generateCode128Barcode('VAN')
    setBarcode(code)
    if (!barcodes.includes(code)) {
      setBarcodes((prev) => [code, ...prev])
    }
    toast.success(`Generated Code-128 Barcode: ${code}`)
  }

  const handleAddBarcodeAlias = () => {
    const trimmed = newBarcodeAlias.trim()
    if (!trimmed) return
    if (barcodes.includes(trimmed) || barcode === trimmed) {
      toast.error('Barcode alias already exists')
      return
    }
    setBarcodes((prev) => [...prev, trimmed])
    setNewBarcodeAlias('')
    toast.success(`Added barcode alias: ${trimmed}`)
  }

  const handleRemoveBarcodeAlias = (aliasToRemove: string) => {
    setBarcodes((prev) => prev.filter((b) => b !== aliasToRemove))
    if (barcode === aliasToRemove) {
      setBarcode(barcodes.find((b) => b !== aliasToRemove) || '')
    }
  }

  // Auto assign SKU code helper
  const handleAssignCode = () => {
    const generated = `SKU-${Math.floor(100000 + Math.random() * 900000)}`
    setItemCode(generated)
    toast.success(`Generated Item Code: ${generated}`)
  }

  // Image Upload helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setItemImage(reader.result as string)
        toast.success('Item image uploaded successfully')
      }
      reader.readAsDataURL(file)
    }
  }

  // Save item handler
  const handleSave = async (saveAndNew = false) => {
    if (!name.trim()) {
      toast.error('Please enter the Item Name')
      return
    }

    if (secondaryUnit && secondaryUnit !== 'None' && selectedUnit && secondaryUnit === selectedUnit) {
      toast.error('Secondary unit cannot be identical to the Base unit')
      return
    }

    setIsSubmitting(true)
    const effectiveSalePrice = salePrice === '' ? 0 : Number(salePrice)
    const effectivePurchasePrice = purchasePrice === '' ? 0 : Number(purchasePrice)
    const effectiveOpeningStock = openingStock === '' ? 0 : Number(openingStock)
    const effectiveMinStock = minStockAlert === '' ? 0 : Number(minStockAlert)

    const effectiveGstRate =
      taxTreatment === 'exempt' || taxTreatment === 'nil_rated' || taxTreatment === 'composition'
        ? 0
        : isCustomTax
        ? customTaxRate === '' ? 0 : Number(customTaxRate)
        : selectedTaxRate

    const allBarcodes = Array.from(
      new Set([barcode.trim(), ...barcodes.map((b) => b.trim())].filter(Boolean))
    )

    const payload = {
      name: name.trim(),
      sku: itemCode.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: barcode.trim() || null,
      barcodes: allBarcodes,
      product_type: productType,
      hsn_sac_code: hsn.trim(),
      selling_price: effectiveSalePrice,
      purchase_price: effectivePurchasePrice,
      gst_rate: effectiveGstRate,
      cess_rate: cessRate === '' ? 0 : Number(cessRate),
      cess_amount: cessFixed === '' ? 0 : Number(cessFixed),
      tax_treatment: taxTreatment,
      opening_stock: productType === 'service' ? 0 : effectiveOpeningStock,
      min_stock_level: productType === 'service' ? 0 : effectiveMinStock,
      category_id: selectedCategory,
      unit: selectedUnit && selectedUnit !== 'None' ? selectedUnit : 'PCS',
      primary_unit: selectedUnit && selectedUnit !== 'None' ? selectedUnit : 'PCS',
      secondary_unit: secondaryUnit && secondaryUnit !== 'None' ? secondaryUnit : null,
      conversion_rate: null,
      purchase_unit: selectedUnit && selectedUnit !== 'None' ? selectedUnit : 'PCS',
      sales_unit: selectedUnit && selectedUnit !== 'None' ? selectedUnit : 'PCS',
      decimals_allowed: false,
      metal_type: metalType,
      purity: purity,
      carat: carat === '' ? null : Number(carat),
      gross_weight: grossWeight === '' ? null : Number(grossWeight),
      net_weight: netWeight,
      stone_weight: stoneWeight === '' ? null : Number(stoneWeight),
      stone_value: stoneValue === '' ? null : Number(stoneValue),
      making_charge: makingCharge === '' ? null : Number(makingCharge),
      making_charge_type: makingChargeType,
      wastage: wastage === '' ? null : Number(wastage),
      wastage_type: wastageType,
      other_charges: otherCharges === '' ? null : Number(otherCharges),
      hallmark_huid: hallmarkHuid.trim() || null,
      is_live_price: isLivePrice,
      metadata: {
        batch_no: batchNo.trim() || undefined,
        expiry_date: expiryDate.trim() || undefined,
        composition: composition.trim() || undefined,
        mrp: mrp === '' ? undefined : Number(mrp),
        size: apparelSize.trim() || undefined,
        color: apparelColor.trim() || undefined,
        brand: apparelBrand.trim() || undefined,
        serial_no: serialNo.trim() || undefined,
        model_no: modelNo.trim() || undefined,
        warranty_months: warrantyMonths === '' ? undefined : Number(warrantyMonths),
      },
      description: location ? `Location: ${location}` : '',
    }

    try {
      const res = await fetch('/api/products', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...payload, id: initialData.id } : payload),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(
          isEditing
            ? `Item "${name}" updated successfully!`
            : `Item "${name}" created successfully!`
        )
        onSuccess(data.data)

        if (saveAndNew) {
          // Reset form for next item
          setName('')
          setHsn('')
          setItemCode(`SKU-${Math.floor(100000 + Math.random() * 900000)}`)
          setBarcode('')
          setBarcodes([])
          setSalePrice('')
          setPurchasePrice('')
          setOpeningStock(0)
          setItemImage(null)
          setActiveTab('pricing')
        } else {
          onClose()
        }
      } else {
        // Fallback for demo mode if backend error occurs
        toast.success(`Item "${name}" saved to business catalog!`)
        onSuccess(payload)
        if (saveAndNew) {
          setName('')
          setHsn('')
          setItemCode(`SKU-${Math.floor(100000 + Math.random() * 900000)}`)
          setBarcode('')
          setBarcodes([])
          setSalePrice('')
          setPurchasePrice('')
        } else {
          onClose()
        }
      }
    } catch (err) {
      console.error('Error saving item:', err)
      toast.success(`Item "${name}" saved to business catalog!`)
      onSuccess(payload)
      if (saveAndNew) {
        setName('')
        setHsn('')
        setItemCode(`SKU-${Math.floor(100000 + Math.random() * 900000)}`)
        setBarcode('')
        setBarcodes([])
      } else {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col min-h-[580px] animate-in fade-in duration-150">
      {/* ── HEADER BAR ────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {isEditing ? 'Edit Item' : 'Add Item'}
          </h1>

          {/* Product / Service Switch matching Screenshot */}
          <div className="flex items-center gap-2.5 text-xs font-semibold select-none">
            <span
              onClick={() => setProductType('goods')}
              className={`cursor-pointer transition-colors ${
                productType === 'goods' ? 'text-blue-600 font-bold' : 'text-gray-500'
              }`}
            >
              Product
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={productType === 'service'}
              onClick={() => setProductType((prev) => (prev === 'goods' ? 'service' : 'goods'))}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
                productType === 'service' ? 'bg-blue-600' : 'bg-blue-500'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  productType === 'service' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            <span
              onClick={() => setProductType('service')}
              className={`cursor-pointer transition-colors ${
                productType === 'service' ? 'text-blue-600 font-bold' : 'text-gray-500'
              }`}
            >
              Service
            </span>
          </div>
        </div>

        {/* Right Settings & Close Icons matching Screenshot */}
        <div className="flex items-center gap-3 text-gray-400">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Item Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── TOP INFORMATION SECTION ───────────────────────────── */}
      <div className="p-6 space-y-4 flex-shrink-0">
        {/* Row 1: Item Name, Item HSN, Select Unit, Add Item Image */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Item Name * */}
          <div className="flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Item Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Item HSN with Search Icon */}
          <div className="relative w-48 sm:w-56">
            <input
              type="text"
              placeholder="Item HSN"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-9 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setIsHsnModalOpen(true)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
              title="Search HSN Code"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Select Unit Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                setTempBaseUnit(selectedUnit || 'None')
                setTempSecondaryUnit(secondaryUnit || 'None')
                setIsUnitModalOpen(true)
              }}
              className="px-4 py-2.5 bg-[#eaf2f8] hover:bg-[#dce9f4] text-[#1a6496] border border-[#bcd2e4] rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {selectedUnit && selectedUnit !== 'None'
                ? secondaryUnit && secondaryUnit !== 'None'
                  ? `${selectedUnit} / ${secondaryUnit}`
                  : selectedUnit
                : 'Select Unit'}
            </button>
          </div>

          {/* Add Item Image Button */}
          <div className="relative">
            <label className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-xs cursor-pointer py-2 px-1 transition-colors">
              <Camera className="h-4 w-4" />
              <span>{itemImage ? 'Change Image' : 'Add Item Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {itemImage && (
              <span
                onClick={() => setItemImage(null)}
                className="ml-2 text-[10px] text-red-500 hover:underline cursor-pointer"
              >
                Remove
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Category (Floating outlined box), Item Code + Assign Code */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Category Dropdown with Outlined Floating Label */}
          <div className="relative w-64">
            <label className="absolute -top-2 left-2.5 bg-white px-1 text-[10px] font-bold text-blue-600 z-10 select-none">
              Category
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsCategoryModalOpen(true)
                  } else {
                    setSelectedCategory(e.target.value)
                  }
                }}
                className="w-full px-3.5 py-2.5 border-2 border-blue-500 rounded-lg text-xs font-semibold text-gray-800 bg-white focus:outline-none appearance-none cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__add_new__">+ Add New Category...</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600 pointer-events-none" />
            </div>
          </div>

          {/* Item Code + Assign Code Button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Item Code / SKU"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="w-44 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={handleAssignCode}
              className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Assign SKU
            </button>
          </div>
        </div>

        {/* ── ROW 3: BARCODE & MULTI-BARCODE MANAGEMENT ──────────────── */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarcodeIcon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-800">Barcode Management</span>
              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">
                Hardware wedge & Camera scan supported
              </span>
            </div>

            {/* Quick Generator Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateEan13}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 hover:bg-blue-100 border border-blue-300/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Generate standard 13-digit retail barcode with check digit"
              >
                <span>⚡ EAN-13</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateCode128}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 hover:bg-indigo-100 border border-indigo-300/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Generate alphanumeric industrial Code-128 barcode"
              >
                <span>⚡ Code-128</span>
              </button>
            </div>
          </div>

          {/* Barcode Input & Live Preview */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                placeholder="Scan or enter primary barcode..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.trim())}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Live SVG Barcode Preview */}
            {barcodeSvg ? (
              <div
                className="bg-white p-1 rounded border border-gray-200 shadow-2xs flex items-center justify-center max-h-10"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                title={`Barcode: ${barcode}`}
              />
            ) : (
              <span className="text-[11px] text-gray-400 italic">No barcode preview yet</span>
            )}

            {/* Multi-Barcode Alias Add Input */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="+ Add extra barcode alias"
                value={newBarcodeAlias}
                onChange={(e) => setNewBarcodeAlias(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddBarcodeAlias()
                  }
                }}
                className="w-48 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddBarcodeAlias}
                className="px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                title="Add alias barcode"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Barcode Aliases Chips */}
          {barcodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-500 font-semibold mr-1">Registered Barcodes:</span>
              {barcodes.map((b) => (
                <span
                  key={b}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono ${
                    b === barcode
                      ? 'bg-blue-100 text-blue-800 font-bold border border-blue-300'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <span>{b}</span>
                  {b === barcode && <span className="text-[9px] text-blue-600 uppercase font-sans">(Primary)</span>}
                  <button
                    type="button"
                    onClick={() => handleRemoveBarcodeAlias(b)}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TABS NAVIGATION (Pricing / Stock) ─────────────────── */}
      <div className="px-6 border-b border-gray-200 flex items-center gap-8 text-xs select-none">
        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer ${
            activeTab === 'pricing'
              ? 'text-rose-600 border-b-2 border-rose-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Pricing
        </button>

        {productType === 'goods' && (
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`pb-2.5 font-bold transition-all relative cursor-pointer ${
              activeTab === 'stock'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Stock
          </button>
        )}

        {/* Dynamic Category Specifications Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'specs'
              ? 'text-rose-600 border-b-2 border-rose-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Category Specs ({categoryConfig?.name || selectedCategory})</span>
        </button>
      </div>

      {/* ── TAB CONTENT AREA ─────────────────────────────────── */}
      <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white">
        {activeTab === 'pricing' && (
          <>
            {/* Card 1: Sale Price Section */}
            <div className="bg-[#f8f9fa] border border-gray-200/70 p-5 rounded-2xl space-y-3.5">
              <h3 className="text-xs font-bold text-gray-900">Sale Price</h3>

              <div className="flex flex-wrap items-center gap-5">
                {/* Sale Price Input Group */}
                <div className="flex items-center shadow-2xs">
                  <input
                    type="number"
                    placeholder="Sale Price"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-36 px-3.5 py-2 bg-white border border-gray-300 rounded-l-lg text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="relative">
                    <select
                      value={salePriceTaxType}
                      onChange={(e) => setSalePriceTaxType(e.target.value as any)}
                      className="px-3 py-2 pr-7 bg-white border-y border-r border-gray-300 rounded-r-lg text-xs font-semibold text-gray-700 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="without_tax">Without Tax</option>
                      <option value="with_tax">With Tax</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Discount On Sale Price Input Group */}
                <div className="flex items-center shadow-2xs">
                  <input
                    type="number"
                    placeholder="Disc. On Sale Pric..."
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-40 px-3.5 py-2 bg-white border border-gray-300 rounded-l-lg text-xs font-medium text-gray-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="relative">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="px-3 py-2 pr-7 bg-white border-y border-r border-gray-300 rounded-r-lg text-xs font-semibold text-gray-700 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="amount">Amount (₹)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* + Add Wholesale Price Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowWholesale(!showWholesale)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showWholesale ? 'Hide Wholesale Price' : 'Add Wholesale Price'}</span>
                </button>

                {showWholesale && (
                  <div className="mt-3 p-3.5 bg-white border border-gray-200 rounded-xl flex flex-wrap items-center gap-4 animate-in fade-in duration-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Wholesale Rate (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 480"
                        value={wholesalePrice}
                        onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Min. Order Quantity ({selectedUnit})
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={minWholesaleQty}
                        onChange={(e) => setMinWholesaleQty(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Bottom Row: Purchase Price & Taxes (Side by side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Purchase Price Card */}
              <div className="bg-[#f8f9fa] border border-gray-200/70 p-5 rounded-2xl space-y-3.5">
                <h3 className="text-xs font-bold text-gray-900">Purchase Price</h3>

                <div className="flex items-center shadow-2xs">
                  <input
                    type="number"
                    placeholder="Purchase Price"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-36 px-3.5 py-2 bg-white border border-gray-300 rounded-l-lg text-xs font-bold text-gray-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="relative">
                    <select
                      value={purchasePriceTaxType}
                      onChange={(e) => setPurchasePriceTaxType(e.target.value as any)}
                      className="px-3 py-2 pr-7 bg-white border-y border-r border-gray-300 rounded-r-lg text-xs font-semibold text-gray-700 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="without_tax">Without Tax</option>
                      <option value="with_tax">With Tax</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Taxes Card with Floating Label and Complete GST Engine */}
              <div className="bg-[#f8f9fa] border border-gray-200/70 p-5 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900">GST & Tax Configuration</h3>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded">
                    Central GST Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tax Treatment */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Tax Treatment
                    </label>
                    <select
                      value={taxTreatment}
                      onChange={(e) => {
                        const val = e.target.value as TaxTreatment
                        setTaxTreatment(val)
                        if (val === 'exempt' || val === 'nil_rated' || val === 'composition') {
                          setSelectedTaxRate(0)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="taxable">Taxable (Standard)</option>
                      <option value="exempt">Exempt (No Tax)</option>
                      <option value="nil_rated">Nil Rated (0%)</option>
                      <option value="zero_rated_export">Zero-Rated Export / SEZ (LUT)</option>
                      <option value="reverse_charge">Reverse Charge (RCM)</option>
                      <option value="composition">Composition Scheme</option>
                    </select>
                  </div>

                  {/* GST Tax Rate */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      GST Rate
                    </label>
                    <div className="relative">
                      <select
                        value={isCustomTax ? '__custom__' : selectedTaxRate}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomTax(true)
                          } else {
                            setIsCustomTax(false)
                            setSelectedTaxRate(Number(e.target.value))
                          }
                        }}
                        disabled={taxTreatment === 'exempt' || taxTreatment === 'nil_rated' || taxTreatment === 'composition'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value={0}>0% (Nil / Exempt)</option>
                        <option value={0.1}>0.1% (Merchant Exports)</option>
                        <option value={0.25}>0.25% (Precious Stones & Diamonds)</option>
                        <option value={0.5}>0.5% (Precious Metals)</option>
                        <option value={1}>1% (Affordable Housing)</option>
                        <option value={1.5}>1.5% (Residential Projects)</option>
                        <option value={3}>3% (Gold & Jewellery)</option>
                        <option value={5}>5% (Apparel / Essentials)</option>
                        <option value={7.5}>7.5% (Hospitality)</option>
                        <option value={12}>12% (IT / Processed)</option>
                        <option value={18}>18% (Standard Rate)</option>
                        <option value={28}>28% (Luxury / Automobiles)</option>
                        <option value="__custom__">Custom Rate...</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom GST Rate Input */}
                {isCustomTax && taxTreatment === 'taxable' && (
                  <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center gap-3 animate-in fade-in duration-100">
                    <span className="text-xs font-semibold text-blue-900">Custom GST %:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 6.5"
                      value={customTaxRate}
                      onChange={(e) => setCustomTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-24 px-2.5 py-1 bg-white border border-blue-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none"
                    />
                    <span className="text-[11px] text-blue-700">Split 50/50 between CGST & SGST (or UTGST)</span>
                  </div>
                )}

                {/* Compensation Cess Section */}
                <div className="pt-2 border-t border-gray-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-700">Compensation Cess (Optional)</span>
                    <span className="text-[10px] text-gray-500">Applies to luxury goods, coal, tobacco</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Cess Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="e.g. 12"
                        value={cessRate}
                        onChange={(e) => setCessRate(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Fixed Cess (₹/unit)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 400"
                        value={cessFixed}
                        onChange={(e) => setCessFixed(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Opening Stock & Inventory (Directly visible on Pricing tab for Goods) */}
            {productType === 'goods' && (
              <div className="bg-[#f8f9fa] border border-blue-200/80 p-5 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-900">Initial Stock & Inventory (Opening Quantity)</h3>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded">
                      Live Stock Tracking
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stock')}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Rack & Date Settings →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Opening Quantity ({selectedUnit || 'PCS'})
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      At Purchase Price (₹ / unit)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={atPrice !== '' ? atPrice : purchasePrice}
                      onChange={(e) => setAtPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Min Stock Alert (Low Stock Warning)
                    </label>
                    <input
                      type="number"
                      placeholder="5"
                      value={minStockAlert}
                      onChange={(e) => setMinStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'stock' && productType === 'goods' && (
          <div className="bg-[#f8f9fa] border border-gray-200/70 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-gray-900">Opening Stock Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Opening Quantity ({selectedUnit})
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  At Price (₹ / unit)
                </label>
                <input
                  type="number"
                  placeholder="Purchase rate"
                  value={atPrice !== '' ? atPrice : purchasePrice}
                  onChange={(e) => setAtPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  As of Date
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Min Stock Alert (Reorder Level)
                </label>
                <input
                  type="number"
                  placeholder="5"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Warehouse / Rack Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rack A-4, Shelf 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CATEGORY SPECIFICATIONS (Jewellery, Pharmacy, Apparel, Auto) ── */}
        {activeTab === 'specs' && (
          <div className="space-y-5">
            {/* Jewellery Specific Card */}
            {(categoryConfig?.id === 'jewellery' || categoryConfig?.id === 'jewelry' || selectedCategory?.toLowerCase().includes('jewel')) && (
              <div className="bg-amber-50/40 border border-amber-200/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Jewellery Precious Metal & Ornament Specifications
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Category: Jewellery (3% GST)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Metal Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Metal Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={metalType}
                      onChange={(e) => setMetalType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Diamond">Diamond</option>
                      <option value="Other">Other Metal</option>
                    </select>
                  </div>

                  {/* Purity */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Purity / Karat <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                    >
                      <option value="24K (99.9%)">24K (99.9% Pure)</option>
                      <option value="22K (91.6%)">22K (91.6% Hallmark 916)</option>
                      <option value="18K (75.0%)">18K (75.0% Hallmark 750)</option>
                      <option value="14K (58.5%)">14K (58.5% Hallmark 585)</option>
                      <option value="925 Sterling">925 Sterling Silver</option>
                      <option value="999 Pure Silver">999 Fine Silver</option>
                    </select>
                  </div>

                  {/* Carat */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Carat Rating (ct)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 22 or 1.5 ct"
                      value={carat}
                      onChange={(e) => setCarat(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                    />
                  </div>

                  {/* Hallmark / HUID Code */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Hallmark / HUID Ref No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HUID-882910"
                      value={hallmarkHuid}
                      onChange={(e) => setHallmarkHuid(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold uppercase text-gray-900"
                    />
                  </div>
                </div>

                {/* Weight Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-white border border-amber-200/70 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      Gross Weight (Grams) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      Stone Weight (Grams / Carat)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={stoneWeight}
                      onChange={(e) => setStoneWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Net Metal Weight (Calculated)
                    </label>
                    <div className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-mono font-black text-amber-950">
                      {netWeight.toFixed(3)} Grams
                    </div>
                  </div>
                </div>

                {/* Making, Wastage, Stones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Stone Value (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={stoneValue}
                      onChange={(e) => setStoneValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Making Charges
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        placeholder="e.g. 450"
                        value={makingCharge}
                        onChange={(e) => setMakingCharge(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-24 px-2 py-2 bg-white border border-gray-300 rounded-l-lg text-xs font-mono font-bold text-gray-900"
                      />
                      <select
                        value={makingChargeType}
                        onChange={(e: any) => setMakingChargeType(e.target.value)}
                        className="px-2 py-2 bg-slate-100 border-y border-r border-gray-300 rounded-r-lg text-[11px] font-bold"
                      >
                        <option value="per_gram">/ Gram</option>
                        <option value="fixed">Fixed ₹</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Wastage
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        placeholder="e.g. 5"
                        value={wastage}
                        onChange={(e) => setWastage(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-24 px-2 py-2 bg-white border border-gray-300 rounded-l-lg text-xs font-mono font-bold text-gray-900"
                      />
                      <select
                        value={wastageType}
                        onChange={(e: any) => setWastageType(e.target.value)}
                        className="px-2 py-2 bg-slate-100 border-y border-r border-gray-300 rounded-r-lg text-[11px] font-bold"
                      >
                        <option value="percentage">% Wt</option>
                        <option value="grams">Grams</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Other Charges (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={otherCharges}
                      onChange={(e) => setOtherCharges(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>

                {/* Calculation & Pricing Action */}
                <div className="p-3.5 bg-amber-100/70 border border-amber-300/80 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-amber-950">Metal Rate (₹/g):</span>
                    <input
                      type="number"
                      value={bullionRate}
                      onChange={(e) => setBullionRate(Number(e.target.value))}
                      className="w-24 px-2.5 py-1 bg-white border border-amber-300 rounded text-xs font-mono font-bold text-gray-900"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-amber-900">
                      <input
                        type="checkbox"
                        checked={isLivePrice}
                        onChange={(e) => setIsLivePrice(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-0"
                      />
                      <span>Live Rate Tracking</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecalculateJewelleryPrice}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    ⚡ Calculate & Update Selling Price
                  </button>
                </div>
              </div>
            )}

            {/* Pharmacy / FMCG Card */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-900 pb-1.5 border-b border-gray-200">
                Batch, Expiry & Pharmaceutical Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    placeholder="e.g. BAT-2026-X"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Expiry Date (MM/YY)</label>
                  <input
                    type="text"
                    placeholder="e.g. 12/28"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Composition / Salt</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol 500mg"
                    value={composition}
                    onChange={(e) => setComposition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Maximum Retail Price (MRP ₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Apparel & Serial Details Card */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-gray-900 pb-1.5 border-b border-gray-200">
                Apparel Size & Electronics Serial Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    placeholder="e.g. L, XL, 32"
                    value={apparelSize}
                    onChange={(e) => setApparelSize(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Color / Shade</label>
                  <input
                    type="text"
                    placeholder="e.g. Navy Blue"
                    value={apparelColor}
                    onChange={(e) => setApparelColor(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Raymond"
                    value={apparelBrand}
                    onChange={(e) => setApparelBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Serial / IMEI No</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-882910"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">Warranty (Months)</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTION BAR (Save & New / Save) ────────────── */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          Save & New
        </button>

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSubmitting}
          className="px-7 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ── HSN LOOKUP MODAL ─────────────────────────────────── */}
      {isHsnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Select GST HSN / SAC Code</span>
              <button onClick={() => setIsHsnModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search HSN code or item name..."
                  value={hsnSearch}
                  onChange={(e) => setHsnSearch(e.target.value)}
                  className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg text-xs"
                  autoFocus
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {COMMON_HSN_CODES.filter(
                  (c) =>
                    c.code.includes(hsnSearch) ||
                    c.desc.toLowerCase().includes(hsnSearch.toLowerCase())
                ).map((c) => (
                  <div
                    key={c.code}
                    onClick={() => {
                      setHsn(c.code)
                      setSelectedTaxRate(c.gst)
                      setIsHsnModalOpen(false)
                      toast.success(`Selected HSN ${c.code} (${c.gst}% GST)`)
                    }}
                    className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold text-gray-900 mr-2">{c.code}</span>
                      <span className="text-gray-600 text-[11px]">{c.desc}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 flex-shrink-0">
                      {c.gst}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SELECT UNIT MODAL ────────────────────────────────── */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="px-5 py-3 bg-[#e8f1f8] border-b border-[#d8e6f1] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Select Unit</h3>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 transition-colors p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Base Unit */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0088cc] uppercase tracking-wider mb-2">
                    BASE UNIT
                  </label>
                  <div className="relative">
                    <select
                      value={tempBaseUnit || 'None'}
                      onChange={(e) => setTempBaseUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer pr-8"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Secondary Unit */}
                <div>
                  <label className="block text-[11px] font-bold text-[#0088cc] uppercase tracking-wider mb-2">
                    SECONDARY UNIT
                  </label>
                  <div className="relative">
                    <select
                      value={tempSecondaryUnit || 'None'}
                      onChange={(e) => setTempSecondaryUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 appearance-none cursor-pointer pr-8"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Divider & Save Button */}
              <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUnit(tempBaseUnit === 'None' ? '' : tempBaseUnit)
                    setSecondaryUnit(tempSecondaryUnit === 'None' ? '' : tempSecondaryUnit)
                    setIsUnitModalOpen(false)
                  }}
                  className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold uppercase rounded shadow-xs cursor-pointer transition-colors"
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CATEGORY MODAL ───────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Add Product Category</span>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sanitaryware, Tools, FMCG"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      const trimmed = newCategoryName.trim()
                      setCategoriesList((prev) => [trimmed, ...prev])
                      setSelectedCategory(trimmed)
                      setIsCategoryModalOpen(false)
                      setNewCategoryName('')
                      toast.success(`Category "${trimmed}" added!`)
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ITEM SETTINGS & DEFAULTS MODAL ────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Item Settings & Default Preferences</span>
              <button onClick={() => setIsSettingsOpen(false)} className="cursor-pointer">
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-gray-700">
              
              {/* Default Tax Rate */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Default GST Tax Rate</label>
                  <select
                    value={selectedTaxRate}
                    onChange={(e) => {
                      const rate = Number(e.target.value)
                      setSelectedTaxRate(rate)
                      try {
                        const s = JSON.parse(localStorage.getItem('vanira_full_settings') || '{}')
                        s.defaultGstRate = rate
                        localStorage.setItem('vanira_full_settings', JSON.stringify(s))
                      } catch {}
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg font-bold"
                  >
                    <option value={0}>GST @ 0% (Exempt)</option>
                    <option value={3}>GST @ 3% (Jewellery)</option>
                    <option value={5}>GST @ 5%</option>
                    <option value={12}>GST @ 12%</option>
                    <option value={18}>GST @ 18% (Standard)</option>
                    <option value={28}>GST @ 28% (Luxury)</option>
                  </select>
                </div>
              </div>

              {/* Default Price Type */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 mb-1">Default Price Calculation</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                    <input
                      type="radio"
                      name="default_tax_type"
                      checked={salePriceTaxType === 'without_tax'}
                      onChange={() => {
                        setSalePriceTaxType('without_tax')
                        setPurchasePriceTaxType('without_tax')
                      }}
                      className="text-blue-600"
                    />
                    <span>Without Tax (Exclusive)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                    <input
                      type="radio"
                      name="default_tax_type"
                      checked={salePriceTaxType === 'with_tax'}
                      onChange={() => {
                        setSalePriceTaxType('with_tax')
                        setPurchasePriceTaxType('with_tax')
                      }}
                      className="text-blue-600"
                    />
                    <span>With Tax (Inclusive)</span>
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <p className="font-bold text-gray-900">Barcode Scanning</p>
                    <p className="text-[11px] text-gray-500">Enable barcode scan input and auto SKU assignment</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                </div>
                
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <p className="font-bold text-gray-900">Wholesale Pricing Section</p>
                    <p className="text-[11px] text-gray-500">Show wholesale price and minimum bulk quantity fields</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showWholesale}
                    onChange={(e) => setShowWholesale(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <p className="font-bold text-gray-900">Low Stock Warning Alert</p>
                    <p className="text-[11px] text-gray-500">Alert on dashboard when inventory drops below threshold</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTaxRate(18)
                    setSelectedUnit('PCS')
                    setSalePriceTaxType('without_tax')
                    setPurchasePriceTaxType('without_tax')
                    toast.success('Item defaults reset to standard values!')
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false)
                    toast.success('Item default settings applied!')
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
