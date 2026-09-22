'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle2,
  BookmarkPlus,
  UserCheck,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  Link2,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Banknote,
  Landmark,
  Zap,
  ChevronDown,
  PlusCircle,
  X,
  Barcode,
  ScanLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { calculateInvoiceServerSide } from '@/lib/services/invoice.service'
import { INDIAN_STATES, filterIndianStates, findState } from '@/lib/constants/indian-states'
import { PDFTemplateType, TEMPLATE_OPTIONS } from '@/lib/constants/invoice-templates'
import { AddItemView } from '@/components/products/add-item-view'
import { STANDARD_GST_RATES, isUtgstTerritory } from '@/lib/services/tax.service'
import { STANDARD_UNITS } from '@/lib/services/unit.service'



interface CustomerOption {
  id: string
  display_name: string
  legal_name?: string | null
  gstin: string | null
  state?: string | null
  place_of_supply?: string | null
  phone: string | null
  email: string | null
  outstanding_balance?: number
  credit_limit?: number
  customer_addresses?: Array<{
    id?: string
    state?: string | null
    city?: string | null
    line1?: string | null
  }>
}

interface ProductOption {
  id: string
  name: string
  category?: string | null
  sku: string | null
  barcode?: string | null
  barcodes?: string[] | null
  hsn_sac_code: string | null
  sale_price: number
  gst_rate: number
  gst_inclusive: boolean
  product_units?: { abbreviation: string } | null
  primary_unit?: string | null
  secondary_unit?: string | null
  conversion_rate?: number | null
  purchase_unit?: string | null
  sales_unit?: string | null
  cess_rate?: number | null
  cess_amount?: number | null
  tax_treatment?: string | null
}

interface InvoiceRowOption {
  id: string
  invoice_number: string
  customer_id: string
  invoice_date: string
  total_amount: number
  status: string
  customers?: { display_name?: string } | null
}

interface LineItemFormState {
  id?: string
  product_id: string
  category?: string
  description: string
  hsn_sac_code: string
  quantity: number | ''
  unit: string
  unit_price: number | ''
  discount_percent: number | ''
  discount_amount?: number | ''
  gst_rate: number | ''
  is_gst_inclusive: boolean
  cess_rate?: number | ''
  cess_amount?: number | ''
  tax_treatment?: string
  primary_unit?: string
  secondary_unit?: string
  conversion_rate?: number
}

interface InvoiceFormProps {
  initialData?: any
  isEditing?: boolean
  isFullDesktop?: boolean
}

export function InvoiceForm({ initialData, isEditing = false, isFullDesktop = false }: InvoiceFormProps) {
  const router = useRouter()

  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [allInvoices, setAllInvoices] = useState<InvoiceRowOption[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Customer State
  const [customerId, setCustomerId] = useState<string>(initialData?.customer_id || '')
  const [customerName, setCustomerName] = useState<string>(
    initialData?.customers?.display_name || initialData?.customer_name || ''
  )
  const [customerPhone, setCustomerPhone] = useState<string>(
    initialData?.customers?.phone || initialData?.customer_phone || ''
  )
  const [customerEmail, setCustomerEmail] = useState<string>(
    initialData?.customers?.email || initialData?.customer_email || ''
  )
  const [customerGstin, setCustomerGstin] = useState<string>(
    initialData?.customers?.gstin || initialData?.customer_gstin || ''
  )
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    initialData?.place_of_supply || initialData?.customers?.state || ''
  )
  const [isSavingCustomer, setIsSavingCustomer] = useState<boolean>(false)

  // Link Invoice State
  const [isLinkingInvoice, setIsLinkingInvoice] = useState<boolean>(
    Boolean(initialData?.reference_number && initialData?.reference_number.includes('INV-'))
  )
  const [linkedInvoiceNumber, setLinkedInvoiceNumber] = useState<string>(
    initialData?.reference_number || ''
  )

  // Auto-complete suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const customerInputRef = useRef<HTMLDivElement>(null)

  // Place of supply suggestions dropdown state
  const [showStateSuggestions, setShowStateSuggestions] = useState(false)
  const stateInputRef = useRef<HTMLDivElement>(null)

  // Invoice Meta Fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>(initialData?.invoice_number || '')
  const [invoiceDate, setInvoiceDate] = useState<string>(
    initialData?.invoice_date || new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState<string>(initialData?.due_date || '')
  const [referenceNumber, setReferenceNumber] = useState<string>(initialData?.reference_number || '')
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>(
    initialData?.discount_type || 'fixed'
  )
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discount_value || 0)

  // Payment Mode & Settlement State
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'partial'>(
    initialData?.payment_status || (initialData?.status === 'paid' ? 'paid' : (Number(initialData?.amount_paid) > 0 ? 'partial' : 'unpaid'))
  )
  const [paymentMode, setPaymentMode] = useState<string>(
    initialData?.payment_mode || 'cash'
  )
  const [amountPaidInput, setAmountPaidInput] = useState<number>(
    initialData?.amount_paid !== undefined ? Number(initialData.amount_paid) : 0
  )
  const [paymentReference, setPaymentReference] = useState<string>(
    initialData?.payment_reference || ''
  )
  const [notes, setNotes] = useState<string>(initialData?.notes || '')
  const [terms, setTerms] = useState<string>(
    initialData?.terms_and_conditions ||
      '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged on overdue bills.'
  )

  // Print Template selection (Auto-remembered across invoices)
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplateType>('standard')
  const [showFullScreenQr, setShowFullScreenQr] = useState<boolean>(false)


  useEffect(() => {
    try {
      const savedTmpl = localStorage.getItem('wevly_default_invoice_template') as PDFTemplateType
      if (savedTmpl && ['standard', 'modern', 'compact_a5', 'thermal_pos', 'minimal'].includes(savedTmpl)) {
        setSelectedTemplate(savedTmpl)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleTemplateSelect = (tmpl: PDFTemplateType) => {
    setSelectedTemplate(tmpl)
    try {
      localStorage.setItem('wevly_default_invoice_template', tmpl)
      const found = TEMPLATE_OPTIONS.find((t) => t.id === tmpl)
      toast.success(`Default Print Template set to ${found?.name || tmpl} (${found?.paperSize})`)
    } catch {
      // ignore
    }
  }

  // Helper for empty line item
  const createEmptyLineItem = (): LineItemFormState => ({
    product_id: '',
    category: 'ALL',
    description: '',
    hsn_sac_code: '',
    quantity: '' as any,
    unit: 'NONE',
    unit_price: '' as any,
    discount_percent: '' as any,
    discount_amount: '' as any,
    gst_rate: '' as any,
    is_gst_inclusive: false,
    cess_rate: '',
    cess_amount: '',
    tax_treatment: 'taxable',
    primary_unit: '',
    secondary_unit: '',
    conversion_rate: 1,
  })

  // Line items (default to 2 rows when creating a new invoice)
  const [items, setItems] = useState<LineItemFormState[]>(
    initialData?.invoice_items?.length
      ? initialData.invoice_items.map((it: any) => ({
          id: it.id,
          product_id: it.product_id || '',
          category: it.category || 'ALL',
          description: it.description || '',
          hsn_sac_code: it.hsn_sac_code || '',
          quantity: it.quantity !== undefined ? Number(it.quantity) : 1,
          unit: it.unit || 'NONE',
          unit_price: it.unit_price !== undefined ? Number(it.unit_price) : '',
          discount_percent: it.discount_percent !== undefined ? Number(it.discount_percent) : '',
          discount_amount: it.discount_amount !== undefined ? Number(it.discount_amount) : '',
          gst_rate: it.gst_rate !== undefined ? Number(it.gst_rate) : 18,
          is_gst_inclusive: Boolean(it.is_gst_inclusive),
          cess_rate: it.cess_rate || '',
          cess_amount: it.cess_amount || '',
          tax_treatment: it.tax_treatment || 'taxable',
          primary_unit: it.primary_unit || '',
          secondary_unit: it.secondary_unit || '',
          conversion_rate: it.conversion_rate || 1,
        }))
      : [createEmptyLineItem(), createEmptyLineItem()]
  )

  // Quick Barcode Scanning State
  const [barcodeInput, setBarcodeInput] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Price Tax Mode: Without Tax vs With Tax
  const [priceTaxMode, setPriceTaxMode] = useState<'without_tax' | 'with_tax'>('without_tax')
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null)
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false)
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number | null>(null)
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number
    left: number
    width: number
    openUpwards: boolean
  } | null>(null)
  const itemDropdownRef = useRef<HTMLDivElement>(null)

  // Floating dropdown positioning calculation (immune to table clipping)
  const updateDropdownCoords = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 280
    const openUpwards = spaceBelow < dropdownHeight && rect.top > spaceBelow

    setDropdownCoords({
      top: openUpwards ? Math.max(10, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left: Math.max(10, Math.min(rect.left, window.innerWidth - 370)),
      width: Math.max(rect.width, 360),
      openUpwards,
    })
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPrerequisites()
  }, [])

  // Auto-remember & hydrate last used place of supply for new invoice
  useEffect(() => {
    if (!initialData?.place_of_supply && !placeOfSupply) {
      try {
        const savedState = localStorage.getItem('wevly_last_place_of_supply')
        if (savedState) {
          setPlaceOfSupply(savedState)
        } else {
          setPlaceOfSupply('Maharashtra')
        }
      } catch {
        setPlaceOfSupply('Maharashtra')
      }
    }
  }, [])

  // Close suggestions on outside click, window scroll or resize
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
      if (
        stateInputRef.current &&
        !stateInputRef.current.contains(event.target as Node)
      ) {
        setShowStateSuggestions(false)
      }
      if (
        itemDropdownRef.current &&
        !itemDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveItemDropdown(null)
      }
    }

    function handleScrollOrResize(e: Event) {
      if (itemDropdownRef.current && itemDropdownRef.current.contains(e.target as Node)) {
        return
      }
      setActiveItemDropdown(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [])

  const fetchPrerequisites = async () => {
    setLoadingData(true)
    try {
      const [custRes, prodRes, invRes] = await Promise.all([
        fetch('/api/customers?limit=200'),
        fetch('/api/products?limit=200'),
        fetch('/api/invoices?limit=200'),
      ])

      const custJson = await custRes.json()
      const prodJson = await prodRes.json()
      const invJson = await invRes.json()

      if (custJson.success) {
        const loadedCustomers: CustomerOption[] = custJson.data || []
        setCustomers(loadedCustomers)

        // If editing or preselected, fill in details if missing
        if (initialData?.customer_id) {
          const match = loadedCustomers.find((c) => c.id === initialData.customer_id)
          if (match) {
            if (!customerName) setCustomerName(match.display_name)
            if (!customerPhone) setCustomerPhone(match.phone || '')
            if (!customerEmail) setCustomerEmail(match.email || '')
            if (!customerGstin) setCustomerGstin(match.gstin || '')
            if (!placeOfSupply) {
              setPlaceOfSupply(
                match.place_of_supply ||
                  match.state ||
                  match.customer_addresses?.[0]?.state ||
                  ''
              )
            }
          }
        }
      }

      if (prodJson.success) setProducts(prodJson.data || [])
      if (invJson.success) setAllInvoices(invJson.data || [])
    } catch (err) {
      console.error('Failed to load initial data for invoice form:', err)
      toast.error('Failed to load initial master data')
    } finally {
      setLoadingData(false)
    }
  }

  // Active matched customer
  const matchedCustomer = useMemo(() => {
    if (customerId) {
      return customers.find((c) => c.id === customerId) || null
    }
    if (customerName.trim()) {
      return (
        customers.find(
          (c) => c.display_name.toLowerCase() === customerName.trim().toLowerCase()
        ) || null
      )
    }
    return null
  }, [customerId, customerName, customers])

  // Outstanding / Due balance
  const customerBalance = Number(matchedCustomer?.outstanding_balance) || 0
  const isDueOnCustomer = customerBalance > 0
  const isDueOnUs = customerBalance < 0

  // Filter regular customers matching typed text (from 1st letter onwards or show recent on focus)
  const matchingCustomers = useMemo(() => {
    const q = customerName.toLowerCase().trim()
    if (!q) {
      return customers.slice(0, 8)
    }
    return customers.filter((c) => {
      const nameMatch = c.display_name.toLowerCase().includes(q)
      const legalMatch = c.legal_name ? c.legal_name.toLowerCase().includes(q) : false
      const phoneMatch = c.phone ? c.phone.toLowerCase().includes(q) : false
      const gstinMatch = c.gstin ? c.gstin.toLowerCase().includes(q) : false
      return nameMatch || legalMatch || phoneMatch || gstinMatch
    })
  }, [customerName, customers])

  // Filter Indian States for Place of Supply dropdown
  const filteredStates = useMemo(() => {
    return filterIndianStates(placeOfSupply)
  }, [placeOfSupply])

  // Customer previous invoices available for linking
  const customerPreviousInvoices = useMemo(() => {
    if (!matchedCustomer && !customerId && !customerName.trim()) return []
    return allInvoices.filter(
      (inv) =>
        (matchedCustomer && inv.customer_id === matchedCustomer.id) ||
        (customerId && inv.customer_id === customerId) ||
        (customerName &&
          inv.customers?.display_name?.toLowerCase() === customerName.trim().toLowerCase())
    )
  }, [matchedCustomer, customerId, customerName, allInvoices])

  // Handle customer name input typing
  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val)

    // If previously linked to a regular customer and name changed, reset customerId
    if (customerId) {
      const linked = customers.find((c) => c.id === customerId)
      if (linked && linked.display_name.toLowerCase() !== val.trim().toLowerCase()) {
        setCustomerId('')
      }
    }

    // Always show suggestions when typing or focused
    setShowSuggestions(true)
  }

  // Handle selecting a regular customer from suggestions dropdown
  const handleSelectSuggestedCustomer = (cust: CustomerOption) => {
    setCustomerId(cust.id)
    setCustomerName(cust.display_name)
    setCustomerPhone(cust.phone || '')
    setCustomerEmail(cust.email || '')
    setCustomerGstin(cust.gstin || '')
    const stateVal =
      cust.place_of_supply ||
      cust.state ||
      cust.customer_addresses?.[0]?.state ||
      ''
    if (stateVal) {
      setPlaceOfSupply(stateVal)
      try {
        localStorage.setItem('wevly_last_place_of_supply', stateVal)
      } catch {}
    }
    setShowSuggestions(false)
    toast.success(`Loaded all regular customer info for "${cust.display_name}"`)
  }

  // Handle Place of Supply state selection & persistence
  const handleSelectState = (st: { code: string; name: string }) => {
    setPlaceOfSupply(st.name)
    try {
      localStorage.setItem('wevly_last_place_of_supply', st.name)
    } catch {}
    setShowStateSuggestions(false)
    toast.success(`Place of Supply: ${st.name} (${st.code})`)
  }

  // Handle Place of Supply typing
  const handlePlaceOfSupplyChange = (val: string) => {
    setPlaceOfSupply(val)
    setShowStateSuggestions(true)
    if (val.trim()) {
      try {
        localStorage.setItem('wevly_last_place_of_supply', val.trim())
      } catch {}
    }
  }

  // Quick Action: Instant Anonymous / Walk-in Customer Generator
  const handleQuickWalkIn = () => {
    const walkinSuffix = Math.floor(1000 + Math.random() * 9000)
    const generatedCustId = `CUST-WALKIN-${Date.now().toString().slice(-4)}${walkinSuffix}`
    const walkinName = `Walk-in Customer #${walkinSuffix}`

    setCustomerId(generatedCustId)
    setCustomerName(walkinName)
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerGstin('')
    setShowSuggestions(false)

    // Ensure instant payment mode default
    setPaymentStatus('paid')
    if (paymentMode === 'credit_account') {
      setPaymentMode('cash')
    }

    if (!placeOfSupply) {
      try {
        const saved = localStorage.getItem('wevly_last_place_of_supply')
        setPlaceOfSupply(saved || 'Maharashtra')
      } catch {
        setPlaceOfSupply('Maharashtra')
      }
    }

    toast.success(`⚡ Auto-generated instant customer: ${walkinName}`)
  }

  // Reset to custom customer
  const handleResetCustomer = () => {
    setCustomerId('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerGstin('')
    setShowSuggestions(false)
  }

  // Quick Action: Add this customer to Regular Customers directory
  const handleSaveCustomerToDirectory = async (): Promise<string | null> => {
    if (!customerName.trim()) {
      toast.error('Please enter a customer name')
      return null
    }

    setIsSavingCustomer(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: customerName.trim(),
          phone: customerPhone.trim() || undefined,
          email: customerEmail.trim() || undefined,
          gstin: customerGstin.trim() || undefined,
          place_of_supply: placeOfSupply.trim() || undefined,
          customer_type: customerGstin.trim() ? 'business' : 'individual',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save customer to directory')
      }

      const savedCust = data.data
      setCustomers((prev) => {
        const exists = prev.some((c) => c.id === savedCust.id)
        if (exists) return prev
        return [
          {
            id: savedCust.id,
            display_name: savedCust.display_name,
            phone: savedCust.phone,
            email: savedCust.email,
            gstin: savedCust.gstin,
            state: savedCust.place_of_supply,
            outstanding_balance: 0,
          },
          ...prev,
        ]
      })

      setCustomerId(savedCust.id)
      setSaveAsRegularCustomer(false)
      setShowSuggestions(false)
      toast.success(`"${savedCust.display_name}" added to Regular Customers!`)
      return savedCust.id
    } catch (err: any) {
      console.error('Error saving regular customer:', err)
      toast.error(err.message || 'Could not save customer')
      return null
    } finally {
      setIsSavingCustomer(false)
    }
  }

  const isInterState = useMemo(() => {
    if (!placeOfSupply) return false
    const sellerState = 'Maharashtra'
    return placeOfSupply.trim().toLowerCase() !== sellerState.toLowerCase() && placeOfSupply.trim() !== '27'
  }, [placeOfSupply])

  // Available categories extracted from products + standard categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    set.add('ALL')
    products.forEach((p: any) => {
      if (p.category) set.add(p.category)
      if (p.product_categories?.name) set.add(p.product_categories.name)
    })
    set.add('cakes')
    return Array.from(set)
  }, [products])

  const UNIT_OPTIONS = useMemo(() => {
    const list = ['NONE']
    STANDARD_UNITS.forEach((u) => {
      if (!list.includes(u.short_name)) list.push(u.short_name)
    })
    return list
  }, [])

  // Auto-add new row when interacting with the last row
  const handleRowInteraction = (index: number) => {
    if (index === items.length - 1) {
      setItems((prev) => [...prev, createEmptyLineItem()])
    }
  }

  // Active item catalog products filter for floating dropdown
  const activeFilteredProducts = useMemo(() => {
    if (activeItemDropdown === null || !items[activeItemDropdown]) return []
    const currentItem = items[activeItemDropdown]
    const q = (currentItem.description || '').trim().toLowerCase()

    let filtered = products

    // If search query is typed, search across name, SKU, HSN code, and barcodes
    if (q) {
      filtered = filtered.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q)
        const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false
        const hsnMatch = p.hsn_sac_code ? p.hsn_sac_code.includes(q) : false
        const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false
        const aliasesMatch = Array.isArray(p.barcodes) && p.barcodes.some((b) => b && b.toLowerCase().includes(q))
        return nameMatch || skuMatch || hsnMatch || barcodeMatch || aliasesMatch
      })
    }

    // If category is selected and not 'ALL', prefer items from this category if any exist
    if (currentItem.category && currentItem.category !== 'ALL') {
      const catMatches = filtered.filter((p) => {
        const cat = (p as any).category || (p as any).product_categories?.name
        return cat && cat.toLowerCase() === currentItem.category?.toLowerCase()
      })
      if (catMatches.length > 0) {
        return catMatches
      }
    }

    return filtered
  }, [activeItemDropdown, items, products])

  // Real-time live tax calculation preview (supporting UTGST, Cess, all GST rates)
  const liveTotals = useMemo(() => {
    const validItems = items
      .filter((it) => (it.description && it.description.trim()) || it.product_id || (Number(it.unit_price) > 0))
      .map((it) => ({
        product_id: it.product_id || null,
        description: it.description || 'Line Item',
        hsn_sac_code: it.hsn_sac_code || undefined,
        quantity: Number(it.quantity) || 1,
        unit: it.unit && it.unit !== 'NONE' ? it.unit : undefined,
        unit_price: Number(it.unit_price) || 0,
        discount_percent: Number(it.discount_percent) || 0,
        gst_rate: it.gst_rate === '' ? 0 : Number(it.gst_rate) || 0,
        cess_rate: it.cess_rate === '' ? 0 : Number(it.cess_rate) || 0,
        cess_amount: it.cess_amount === '' ? 0 : Number(it.cess_amount) || 0,
        tax_treatment: it.tax_treatment || 'taxable',
        is_gst_inclusive: priceTaxMode === 'with_tax',
      }))

    const buyerState = findState(placeOfSupply)
    const buyerCode = buyerState?.code || (isInterState ? '07' : '27')

    return calculateInvoiceServerSide(
      validItems.length > 0
        ? validItems
        : [
            {
              product_id: null,
              description: 'Default',
              quantity: 1,
              unit_price: 0,
              discount_percent: 0,
              gst_rate: 0,
              is_gst_inclusive: false,
            },
          ],
      discountType,
      discountValue,
      isInterState,
      '27',
      buyerCode
    )
  }, [items, discountType, discountValue, isInterState, placeOfSupply, priceTaxMode])

  const calculateRowMetrics = (item: LineItemFormState) => {
    const q = item.quantity === '' ? 0 : Number(item.quantity) || 0
    const p = item.unit_price === '' ? 0 : Number(item.unit_price) || 0
    const dp = item.discount_percent === '' ? 0 : Number(item.discount_percent) || 0
    const da = item.discount_amount === '' ? 0 : Number(item.discount_amount) || 0
    const gr = item.gst_rate === '' ? null : Number(item.gst_rate)
    const cessRate = item.cess_rate === '' ? 0 : Number(item.cess_rate) || 0
    const cessAmt = item.cess_amount === '' ? 0 : Number(item.cess_amount) || 0

    if (q <= 0 || p <= 0) {
      return {
        taxable: 0,
        taxAmount: 0,
        taxAmountDisplay: '',
        lineTotal: 0,
        lineTotalDisplay: '',
        hasValue: false,
      }
    }

    const gross = q * p
    const discount = da > 0 ? da : (dp > 0 ? (gross * dp) / 100 : 0)
    const taxable = Math.max(0, gross - discount)

    let taxAmount = 0
    let lineTotal = 0

    if (gr !== null) {
      if (priceTaxMode === 'with_tax') {
        const totalTaxRate = gr + cessRate
        const base = totalTaxRate > 0 ? taxable / (1 + totalTaxRate / 100) : taxable
        taxAmount = taxable - base
        lineTotal = taxable
      } else {
        const gstTax = (taxable * gr) / 100
        const cessTax = (taxable * cessRate) / 100 + (cessAmt * q)
        taxAmount = gstTax + cessTax
        lineTotal = taxable + taxAmount
      }
    } else {
      const cessTax = (taxable * cessRate) / 100 + (cessAmt * q)
      taxAmount = cessTax
      lineTotal = taxable + taxAmount
    }

    const roundedTax = Math.round(taxAmount * 100) / 100
    const roundedTotal = Math.round(lineTotal * 100) / 100

    return {
      taxable: Math.round(taxable * 100) / 100,
      taxAmount: roundedTax,
      taxAmountDisplay: roundedTax === 0 ? '' : roundedTax.toFixed(2),
      lineTotal: roundedTotal,
      lineTotalDisplay: roundedTotal % 1 === 0 ? roundedTotal.toString() : roundedTotal.toFixed(2),
      hasValue: true,
    }
  }

  const handleProductSelect = (index: number, productId: string, directProduct?: ProductOption) => {
    const prod = directProduct || products.find((p) => p.id === productId)
    if (!prod) return

    setItems((prev) => {
      const next = [...prev]
      const defaultUnit =
        (prod as any).sales_unit ||
        (prod as any).primary_unit ||
        prod.product_units?.abbreviation ||
        (prod as any).unit ||
        'Pcs'

      next[index] = {
        ...next[index],
        product_id: prod.id,
        description: prod.name,
        category: (prod as any).category || (prod as any).product_categories?.name || next[index].category || 'ALL',
        hsn_sac_code: prod.hsn_sac_code || '',
        quantity: next[index].quantity === '' ? 1 : next[index].quantity,
        unit_price: Number(prod.sale_price) || 0,
        gst_rate: Number(prod.gst_rate) !== undefined ? Number(prod.gst_rate) : 18,
        is_gst_inclusive: Boolean(prod.gst_inclusive),
        unit: defaultUnit,
        cess_rate: (prod as any).cess_rate !== undefined ? (prod as any).cess_rate : '',
        cess_amount: (prod as any).cess_amount !== undefined ? (prod as any).cess_amount : '',
        tax_treatment: (prod as any).tax_treatment || 'taxable',
        primary_unit: (prod as any).primary_unit || '',
        secondary_unit: (prod as any).secondary_unit || '',
        conversion_rate: (prod as any).conversion_rate || 1,
      }
      return next
    })
    setActiveItemDropdown(null)
  }

  // Handle hardware wedge & camera barcode scanner
  // Repeat scan auto-increments quantity rather than duplicate row!
  const handleBarcodeScan = (scannedValue: string) => {
    const code = scannedValue.trim()
    if (!code) return

    const matched = lookupProductByBarcode(code, products)
    if (!matched) {
      toast.error(`No item found for barcode / SKU "${code}"`, {
        description: 'Verify the barcode in your item master or add it as a new item.',
      })
      return
    }

    // Check if item is already in invoice
    const existingIndex = items.findIndex((it) => it.product_id === matched.id)
    if (existingIndex >= 0) {
      // Repeat scan: Auto-increment quantity by 1!
      setItems((prev) => {
        const next = [...prev]
        const currentQty = Number(next[existingIndex].quantity) || 0
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: currentQty + 1,
        }
        return next
      })
      toast.success(`Incremented: ${matched.name} (+1)`, {
        description: `Quantity is now ${(Number(items[existingIndex].quantity) || 0) + 1}`,
        duration: 1500,
      })
    } else {
      // Find first empty row
      const emptyIndex = items.findIndex(
        (it) => !it.product_id && (!it.description || !it.description.trim()) && (!it.unit_price || Number(it.unit_price) === 0)
      )

      const targetUnit =
        (matched as any).sales_unit ||
        (matched as any).primary_unit ||
        matched.product_units?.abbreviation ||
        (matched as any).unit ||
        'Pcs'

      const newItem: LineItemFormState = {
        product_id: matched.id,
        description: matched.name,
        category: (matched as any).category || (matched as any).product_categories?.name || 'ALL',
        hsn_sac_code: matched.hsn_sac_code || '',
        quantity: 1,
        unit: targetUnit,
        unit_price: Number(matched.sale_price) || 0,
        discount_percent: '',
        discount_amount: '',
        gst_rate: matched.gst_rate !== undefined ? Number(matched.gst_rate) : 18,
        is_gst_inclusive: Boolean(matched.gst_inclusive),
        cess_rate: (matched as any).cess_rate !== undefined ? (matched as any).cess_rate : '',
        cess_amount: (matched as any).cess_amount !== undefined ? (matched as any).cess_amount : '',
        tax_treatment: (matched as any).tax_treatment || 'taxable',
        primary_unit: (matched as any).primary_unit || '',
        secondary_unit: (matched as any).secondary_unit || '',
        conversion_rate: (matched as any).conversion_rate || 1,
      }

      setItems((prev) => {
        const next = [...prev]
        if (emptyIndex >= 0) {
          next[emptyIndex] = newItem
        } else {
          next.push(newItem)
        }
        // Maintain an empty row at the bottom
        if (next.every((it) => it.product_id || (it.description && it.description.trim()))) {
          next.push(createEmptyLineItem())
        }
        return next
      })

      toast.success(`Scanned: ${matched.name} (Qty: 1)`, { duration: 1500 })
    }

    setBarcodeInput('')
    barcodeInputRef.current?.focus()
  }

  const handleItemChange = (index: number, field: keyof LineItemFormState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleDiscountPercentChange = (idx: number, pctVal: string) => {
    handleRowInteraction(idx)
    setItems((prev) => {
      const next = [...prev]
      const it = { ...next[idx] }
      if (pctVal === '') {
        it.discount_percent = ''
        it.discount_amount = ''
      } else {
        const p = parseFloat(pctVal) || 0
        it.discount_percent = p
        const q = Number(it.quantity) || 1
        const pr = Number(it.unit_price) || 0
        it.discount_amount = pr > 0 ? Math.round(((q * pr * p) / 100) * 100) / 100 : ''
      }
      next[idx] = it
      return next
    })
  }

  const handleDiscountAmountChange = (idx: number, amtVal: string) => {
    handleRowInteraction(idx)
    setItems((prev) => {
      const next = [...prev]
      const it = { ...next[idx] }
      if (amtVal === '') {
        it.discount_amount = ''
        it.discount_percent = ''
      } else {
        const a = parseFloat(amtVal) || 0
        it.discount_amount = a
        const q = Number(it.quantity) || 1
        const pr = Number(it.unit_price) || 0
        const gross = q * pr
        it.discount_percent = gross > 0 ? Math.round(((a / gross) * 100) * 100) / 100 : ''
      }
      next[idx] = it
      return next
    })
  }

  const addItemRow = () => {
    setItems((prev) => [...prev, createEmptyLineItem()])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createEmptyLineItem()])
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent, finalizeImmediately = false) => {
    e.preventDefault()

    // Filter valid line items (ignoring blank rows that were auto-created)
    const validItems = items.filter(
      (it) => (it.description && it.description.trim()) || it.product_id || (Number(it.unit_price) > 0)
    )

    if (validItems.length === 0) {
      setError('Please add at least one line item with an item name or product.')
      toast.error('Please add at least one line item')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let finalCustId = customerId
      let finalCustName = customerName.trim()

      // If customer name is empty, auto-generate walk-in customer details
      if (!finalCustName) {
        const walkinSuffix = Math.floor(1000 + Math.random() * 9000)
        finalCustName = `Walk-in Customer #${walkinSuffix}`
        finalCustId = `CUST-WALKIN-${Date.now().toString().slice(-4)}${walkinSuffix}`
        setCustomerName(finalCustName)
        setCustomerId(finalCustId)
      }

      // If user enabled "Save to Regular Customers" or has a new customer, persist to master customer directory
      if (!finalCustId || saveAsRegularCustomer) {
        if (!finalCustId && saveAsRegularCustomer) {
          const savedId = await handleSaveCustomerToDirectory()
          if (savedId) {
            finalCustId = savedId
          }
        }

        // If still without a customer_id, ensure customer is created/resolved in directory
        if (!finalCustId) {
          const match = customers.find(
            (c) => c.display_name.toLowerCase() === finalCustName.toLowerCase()
          )
          if (match) {
            finalCustId = match.id
          } else {
            const quickRes = await fetch('/api/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                display_name: finalCustName,
                phone: customerPhone.trim() || undefined,
                email: customerEmail.trim() || undefined,
                gstin: customerGstin.trim() || undefined,
                place_of_supply: placeOfSupply.trim() || undefined,
                customer_type: customerGstin.trim() ? 'business' : 'individual',
                notes: 'Created via Sales Invoice',
              }),
            })
            const quickData = await quickRes.json()
            if (quickData.success && quickData.data?.id) {
              finalCustId = quickData.data.id
            } else {
              finalCustId = `cust-${Date.now()}`
            }
          }
        }
      }

      // Final reference number (incorporating linked invoice if specified)
      const finalReferenceNumber = isLinkingInvoice && linkedInvoiceNumber.trim()
        ? linkedInvoiceNumber.trim()
        : referenceNumber.trim() || undefined

      const finalAmountPaid =
        paymentStatus === 'paid'
          ? liveTotals.total_amount
          : paymentStatus === 'partial'
          ? Number(amountPaidInput) || 0
          : 0

      const payload = {
        customer_id: finalCustId,
        invoice_number: invoiceNumber.trim() || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        place_of_supply: placeOfSupply.trim() || undefined,
        reference_number: finalReferenceNumber,
        payment_status: paymentStatus,
        payment_mode: paymentMode,
        payment_reference: paymentReference.trim() || undefined,
        amount_paid: finalAmountPaid,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        notes: notes.trim() || undefined,
        terms_and_conditions: terms.trim() || undefined,
        items: validItems.map((it) => ({
          product_id: it.product_id || undefined,
          description: it.description.trim() || 'Line Item',
          hsn_sac_code: it.hsn_sac_code.trim() || undefined,
          quantity: Number(it.quantity) || 1,
          unit: it.unit && it.unit !== 'NONE' ? it.unit.trim() : undefined,
          unit_price: Number(it.unit_price) || 0,
          discount_percent: Number(it.discount_percent) || 0,
          gst_rate: it.gst_rate === '' ? 0 : Number(it.gst_rate) || 0,
          cess_rate: it.cess_rate === '' ? 0 : Number(it.cess_rate) || 0,
          cess_amount: it.cess_amount === '' ? 0 : Number(it.cess_amount) || 0,
          tax_treatment: it.tax_treatment || 'taxable',
          is_gst_inclusive: priceTaxMode === 'with_tax',
        })),
      }

      const url = isEditing ? `/api/invoices/${initialData.id}` : '/api/invoices'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save sales invoice.')
      }

      const invoiceId = data.data.id

      if (finalizeImmediately) {
        const finRes = await fetch(`/api/invoices/${invoiceId}/finalize`, {
          method: 'POST',
        })
        const finData = await finRes.json()

        if (!finRes.ok || !finData.success) {
          toast.warning(`Invoice saved as draft, but finalization failed: ${finData.error}`)
          router.push(`/sales/invoices/${invoiceId}`)
          return
        }
        toast.success('Invoice finalized and issued successfully!')
      } else {
        toast.success(isEditing ? 'Invoice updated successfully' : 'Draft invoice created successfully')
      }

      router.push(`/sales/invoices/${invoiceId}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving invoice.')
    } finally {
      setSubmitting(false)
    }
  }

  // Linked invoice lookup for quick link button
  const linkedInvoiceObj = useMemo(() => {
    if (!linkedInvoiceNumber) return null
    return allInvoices.find(
      (inv) =>
        inv.invoice_number.toLowerCase() === linkedInvoiceNumber.toLowerCase() ||
        inv.id === linkedInvoiceNumber
    )
  }, [linkedInvoiceNumber, allInvoices])

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
        Loading master customer and product data...
      </div>
    )
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 pb-16">
      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer & Invoice Details Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Customer & Invoice Details</h2>
              <p className="text-[11px] text-gray-500">
                Type first letter of name or state to search. Regular customers and all 36 states auto-suggest immediately.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Instant Walk-in Bill Generator Button */}
            <button
              type="button"
              onClick={handleQuickWalkIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl shadow-2xs transition-all active:scale-95"
              title="Generate auto-customer ID for instant walk-in retail buyer"
            >
              <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              <span>⚡ Quick Walk-in (Instant Bill)</span>
            </button>

            {customerId || matchedCustomer ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-100">
                <UserCheck className="h-3.5 w-3.5" />
                {customerId.startsWith('CUST-WALKIN-') ? 'Auto Walk-in ID' : 'Regular Customer'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 text-[11px] font-semibold rounded-lg border border-gray-200">
                <User className="h-3.5 w-3.5 text-gray-500" /> Walk-in / Custom
              </span>
            )}
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[11px] font-semibold rounded-lg uppercase font-mono">
              {isEditing ? `Edit: ${invoiceNumber}` : 'New Invoice'}
            </span>
          </div>
        </div>

        {/* Customer Information Row */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Customer Name with Live Autocomplete Suggestions (From 1st letter) */}
            <div ref={customerInputRef} className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Customer Name <span className="text-red-500">*</span>
                  {customerId && (
                    <span className="ml-1.5 font-mono text-[10px] text-gray-400 font-normal">
                      ({customerId.slice(0, 16)})
                    </span>
                  )}
                </label>
                {(customerId || customerName) && (
                  <button
                    type="button"
                    onClick={handleResetCustomer}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5"
                    title="Clear customer details"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type 1st letter of customer name or select..."
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  disabled={submitting}
                  autoComplete="off"
                  className="w-full h-10 pl-9 pr-8 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Customer Autocomplete Dropdown List */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded shadow-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150 flex flex-col">
                  <div className="border-b border-gray-100">
                    <button
                      type="button"
                      onClick={handleSaveCustomerToDirectory}
                      disabled={isSavingCustomer || submitting || !customerName.trim()}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-blue-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 text-[13px]"
                    >
                      {isSavingCustomer ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="h-4 w-4" />
                      )}
                      Add Party
                    </button>
                  </div>

                  {matchingCustomers.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {matchingCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectSuggestedCustomer(cust)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors group flex flex-col gap-0.5"
                        >
                          <div className="font-semibold text-[13px] text-gray-900 group-hover:text-blue-600">
                            {cust.display_name}
                          </div>
                          {cust.phone && (
                            <div className="text-[13px] text-gray-400 font-mono">
                              {cust.phone}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-left text-[13px] text-gray-500">
                      No matching regular customer for &quot;{customerName}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Customer Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone / Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={submitting}
                  className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all font-mono"
                />
              </div>
            </div>

            {/* 3. Customer Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="e.g. accounts@customer.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 4. Customer GSTIN */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 27AABCA1234A1Z5"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                disabled={submitting}
                maxLength={15}
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono uppercase text-gray-900 transition-all"
              />
            </div>

            {/* 5. Place of Supply - Auto-selectable dropdown with all 36 Indian states & search from 1st letter */}
            <div ref={stateInputRef} className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Place of Supply (State / Code) <span className="text-red-500">*</span>
                </label>
                {placeOfSupply && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    Auto-saved
                  </span>
                )}
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Click or type 1st letter of state (e.g. M / 27)..."
                  value={placeOfSupply}
                  onChange={(e) => handlePlaceOfSupplyChange(e.target.value)}
                  onFocus={() => setShowStateSuggestions(true)}
                  disabled={submitting}
                  autoComplete="off"
                  className="w-full h-10 pl-9 pr-8 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowStateSuggestions(!showStateSuggestions)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* State Suggestions Dropdown */}
              {showStateSuggestions && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 bg-indigo-50/70 border-b border-indigo-100/80 flex items-center justify-between text-[11px] font-semibold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-indigo-600" />
                      All States & UTs ({filteredStates.length})
                    </span>
                    <span className="text-[10px] text-indigo-600 font-normal">Click state to select</span>
                  </div>
                  {filteredStates.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {filteredStates.map((st) => {
                        const isSelected =
                          placeOfSupply.toLowerCase() === st.name.toLowerCase() ||
                          placeOfSupply.trim() === st.code
                        return (
                          <button
                            key={st.code}
                            type="button"
                            onClick={() => handleSelectState(st)}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 font-bold text-indigo-700'
                                : 'hover:bg-gray-50 text-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono text-[10px] font-bold">
                                {st.code}
                              </span>
                              <span>{st.name}</span>
                              {st.isUnionTerritory && (
                                <span className="px-1 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-semibold rounded">
                                  UT
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-500">
                      No matching state for &quot;{placeOfSupply}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Customer PO / Reference # */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PO / Reference #</label>
              <input
                type="text"
                placeholder="e.g. PO-98745"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={submitting}
                className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* DUES STATUS INDICATOR CARD (Due on Customer / Due on Us) */}
          {matchedCustomer && (
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                isDueOnCustomer
                  ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                  : isDueOnUs
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-gray-50/80 border-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    isDueOnCustomer
                      ? 'bg-rose-100 text-rose-700'
                      : isDueOnUs
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    {isDueOnCustomer ? (
                      <span>🔴 Due on Customer (Unpaid Receivables): ₹{customerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    ) : isDueOnUs ? (
                      <span>🟢 Due on Us (Customer Advance Credit): ₹{Math.abs(customerBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    ) : (
                      <span>✓ Clean Account Balance (₹0.00 Outstanding)</span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isDueOnCustomer
                      ? `Customer owes previous unpaid bills. Total net balance will be reflected in invoice financial summary.`
                      : isDueOnUs
                      ? `Customer has advance payments available. This advance credit will be applied against this invoice total.`
                      : 'Customer account is fully settled with zero pending dues.'}
                  </p>
                </div>
              </div>

              {matchedCustomer.id && (
                <Link
                  href={`/customers/${matchedCustomer.id}`}
                  target="_blank"
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-2xs ${
                    isDueOnCustomer
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : isDueOnUs
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  <span>Customer Ledger</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}

          {/* LINK INVOICE / REFERENCE SECTION */}
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-800">
                <input
                  type="checkbox"
                  checked={isLinkingInvoice}
                  onChange={(e) => {
                    setIsLinkingInvoice(e.target.checked)
                    if (!e.target.checked) setLinkedInvoiceNumber('')
                  }}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-indigo-600" />
                  Link to Previous Invoice / Quotation / Order
                </span>
              </label>

              {linkedInvoiceNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                    Linked: {linkedInvoiceNumber}
                  </span>
                  {linkedInvoiceObj && (
                    <Link
                      href={`/sales/invoices/${linkedInvoiceObj.id}`}
                      target="_blank"
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5 underline"
                    >
                      View Invoice <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {isLinkingInvoice && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200/70">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Select Customer's Previous Invoice
                  </label>
                  <select
                    value={linkedInvoiceNumber}
                    onChange={(e) => setLinkedInvoiceNumber(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-gray-800"
                  >
                    <option value="">-- Select Existing Invoice --</option>
                    {customerPreviousInvoices.map((inv) => (
                      <option key={inv.id} value={inv.invoice_number}>
                        {inv.invoice_number} ({inv.invoice_date} | ₹{Number(inv.total_amount).toLocaleString('en-IN')} | {inv.status.toUpperCase()})
                      </option>
                    ))}
                    {customerPreviousInvoices.length === 0 && (
                      <option value="" disabled>No previous invoices recorded for this customer</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Or Enter Custom Linked Invoice / Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-0001, QUOT-1042, PO-884"
                    value={linkedInvoiceNumber}
                    onChange={(e) => setLinkedInvoiceNumber(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-gray-800"
                  />
                </div>
              </div>
            )}
          </div>


          {/* Invoice Header Details */}
          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated (e.g. INV-0001)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isEditing || submitting}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={submitting}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting}
                  className="w-full h-10 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Barcode Scanner Bar (Hardware Wedge & Camera Ready) */}
      <div className="bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
            <Barcode className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">Barcode Quick-Scan</span>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ScanLine className="h-3 w-3" />
                Hardware Wedge & Camera
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Scanning an existing item automatically increments its quantity by +1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 grow max-w-lg">
          <div className="relative w-full">
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode or type SKU / code and press Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleBarcodeScan(barcodeInput)
                }
              }}
              className="w-full h-9 pl-9 pr-20 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 placeholder:text-gray-400 shadow-2xs"
            />
            <Barcode className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <button
              type="button"
              onClick={() => handleBarcodeScan(barcodeInput)}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
            >
              Scan
            </button>
          </div>
        </div>
      </div>

      {/* Line Items Table Section (Vyapar 2-Tier Header Design) */}
      <div className="bg-white rounded-xl border border-gray-300 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-300 text-[11px] font-bold text-[#1e40af] uppercase tracking-wider">
                <th rowSpan={2} className="py-2 px-2 text-center border-r border-gray-300 w-12 select-none">
                  #
                </th>
                <th rowSpan={2} className="py-2 px-3 text-left border-r border-gray-300 w-32 select-none">
                  CATEGORY
                </th>
                <th rowSpan={2} className="py-2 px-3 text-left border-r border-gray-300 min-w-[220px] select-none">
                  ITEM
                </th>
                <th rowSpan={2} className="py-2 px-2 text-right border-r border-gray-300 w-20 select-none">
                  QTY
                </th>
                <th rowSpan={2} className="py-2 px-2 text-left border-r border-gray-300 w-24 select-none">
                  UNIT
                </th>
                <th className="py-1.5 px-2 text-center border-r border-b border-gray-300 min-w-[130px] select-none">
                  PRICE/UNIT
                </th>
                <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b border-gray-300 select-none">
                  DISCOUNT
                </th>
                <th colSpan={2} className="py-1.5 px-2 text-center border-r border-b border-gray-300 select-none">
                  TAX
                </th>
                <th rowSpan={2} className="py-2 px-3 text-right border-r border-gray-300 w-28 select-none">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>AMOUNT</span>
                    <button
                      type="button"
                      onClick={addItemRow}
                      title="Add New Row"
                      className="text-blue-600 hover:text-blue-800 transition-transform hover:scale-110 p-0.5"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </div>
                </th>
                <th rowSpan={2} className="py-2 px-1 text-center w-9 select-none"></th>
              </tr>
              <tr className="bg-[#f8fafc] border-b border-gray-300 text-[11px] font-semibold text-[#1e40af]">
                {/* Under PRICE/UNIT */}
                <th className="py-1 px-1 text-center border-r border-gray-300">
                  <div className="relative inline-flex items-center justify-center">
                    <select
                      value={priceTaxMode}
                      onChange={(e) => setPriceTaxMode(e.target.value as any)}
                      className="text-[10px] font-medium text-gray-700 bg-transparent border-none appearance-none pr-3.5 focus:outline-none cursor-pointer hover:text-blue-700"
                    >
                      <option value="without_tax">Without Tax</option>
                      <option value="with_tax">With Tax</option>
                    </select>
                    <ChevronDown className="h-3 w-3 text-gray-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </th>
                {/* Under DISCOUNT */}
                <th className="py-1 px-1 text-center border-r border-gray-300 w-16">
                  %
                </th>
                <th className="py-1 px-1 text-center border-r border-gray-300 w-20">
                  AMOUNT
                </th>
                {/* Under TAX */}
                <th className="py-1 px-1 text-center border-r border-gray-300 w-24">
                  %
                </th>
                <th className="py-1 px-1 text-center border-r border-gray-300 w-20">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const metrics = calculateRowMetrics(item)

                // Filter products for category and description search if dropdown active
                const filteredProducts = products.filter((p) => {
                  if (item.category && item.category !== 'ALL') {
                    const cat = (p as any).category || (p as any).product_categories?.name
                    if (cat && cat.toLowerCase() !== item.category.toLowerCase()) return false
                  }
                  if (item.description && item.description.trim()) {
                    return p.name.toLowerCase().includes(item.description.trim().toLowerCase())
                  }
                  return true
                })

                return (
                  <tr
                    key={idx}
                    onClick={() => handleRowInteraction(idx)}
                    className={`border-b border-gray-200 transition-colors group ${
                      idx % 2 === 1 ? 'bg-[#fcfdfd]' : 'bg-white'
                    } hover:bg-blue-50/20`}
                  >
                    {/* 1. Row Number # */}
                    <td className="py-1 px-2 text-center text-gray-400 text-xs font-medium border-r border-gray-200 select-none">
                      {idx + 1}
                    </td>

                    {/* 2. Category Dropdown */}
                    <td className="p-0 border-r border-gray-200">
                      <div className="relative w-full h-full flex items-center">
                        <select
                          value={item.category || 'ALL'}
                          onChange={(e) => {
                            handleRowInteraction(idx)
                            handleItemChange(idx, 'category', e.target.value)
                          }}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className="w-full h-9 pl-2 pr-5 text-xs bg-transparent border-none appearance-none rounded focus:outline-none focus:bg-white text-gray-800 cursor-pointer"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="h-3 w-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>

                    {/* 3. Item Name with Autocomplete / Direct typing */}
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="text"
                        placeholder=""
                        value={item.description}
                        onFocus={(e) => {
                          handleRowInteraction(idx)
                          updateDropdownCoords(e.currentTarget)
                          setActiveItemDropdown(idx)
                        }}
                        onClick={(e) => {
                          handleRowInteraction(idx)
                          updateDropdownCoords(e.currentTarget)
                          setActiveItemDropdown(idx)
                        }}
                        onChange={(e) => {
                          handleRowInteraction(idx)
                          handleItemChange(idx, 'description', e.target.value)
                          updateDropdownCoords(e.currentTarget)
                          setActiveItemDropdown(idx)
                        }}
                        className="w-full h-9 px-2.5 text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white text-gray-900 font-medium"
                      />
                    </td>

                    {/* 4. Quantity */}
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder=""
                        value={item.quantity === '' ? '' : item.quantity}
                        onChange={(e) => {
                          handleRowInteraction(idx)
                          handleItemChange(
                            idx,
                            'quantity',
                            e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                          )
                        }}
                        onFocus={() => handleRowInteraction(idx)}
                        onClick={() => handleRowInteraction(idx)}
                        className="w-full h-9 px-2 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white text-gray-900 font-medium"
                      />
                    </td>

                    {/* 5. Unit Dropdown */}
                    <td className="p-0 border-r border-gray-200">
                      <div className="relative w-full h-full flex items-center">
                        <select
                          value={item.unit || 'NONE'}
                          onChange={(e) => {
                            handleRowInteraction(idx)
                            handleItemChange(idx, 'unit', e.target.value)
                          }}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className="w-full h-9 pl-2 pr-5 text-xs bg-transparent border-none appearance-none rounded focus:outline-none focus:bg-white text-gray-800 cursor-pointer"
                        >
                          {/* If product has primary or secondary units, show them at the top */}
                          {item.primary_unit && (
                            <option value={item.primary_unit}>
                              {item.primary_unit} (Base)
                            </option>
                          )}
                          {item.secondary_unit && (
                            <option value={item.secondary_unit}>
                              {item.secondary_unit} (1 {item.secondary_unit} = {item.conversion_rate || 1} {item.primary_unit})
                            </option>
                          )}
                          {UNIT_OPTIONS.filter((u) => u !== item.primary_unit && u !== item.secondary_unit).map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="h-3 w-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>

                    {/* 6. Price / Unit */}
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder=""
                        value={item.unit_price === '' ? '' : item.unit_price}
                        onChange={(e) => {
                          handleRowInteraction(idx)
                          handleItemChange(
                            idx,
                            'unit_price',
                            e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                          )
                        }}
                        onFocus={() => handleRowInteraction(idx)}
                        onClick={() => handleRowInteraction(idx)}
                        className="w-full h-9 px-2 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white font-mono text-gray-900 font-medium"
                      />
                    </td>

                    {/* 7. Discount % */}
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        placeholder=""
                        value={item.discount_percent === '' ? '' : item.discount_percent}
                        onChange={(e) => handleDiscountPercentChange(idx, e.target.value)}
                        onFocus={() => handleRowInteraction(idx)}
                        onClick={() => handleRowInteraction(idx)}
                        className="w-full h-9 px-1 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white text-gray-900"
                      />
                    </td>

                    {/* 8. Discount Amount */}
                    <td className="p-0 border-r border-gray-200">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder=""
                        value={item.discount_amount === '' ? '' : item.discount_amount}
                        onChange={(e) => handleDiscountAmountChange(idx, e.target.value)}
                        onFocus={() => handleRowInteraction(idx)}
                        onClick={() => handleRowInteraction(idx)}
                        className="w-full h-9 px-1 text-right text-xs bg-transparent border-none rounded focus:outline-none focus:bg-white font-mono text-gray-900"
                      />
                    </td>

                    {/* 9. Tax Rate Dropdown */}
                    <td className="p-0 border-r border-gray-200">
                      <div className="relative w-full h-full flex items-center">
                        <select
                          value={item.gst_rate === '' ? '' : String(item.gst_rate)}
                          onChange={(e) => {
                            handleRowInteraction(idx)
                            handleItemChange(
                              idx,
                              'gst_rate',
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }}
                          onFocus={() => handleRowInteraction(idx)}
                          onClick={() => handleRowInteraction(idx)}
                          className={`w-full h-9 pl-1.5 pr-4 text-xs bg-transparent border-none appearance-none rounded focus:outline-none focus:bg-white cursor-pointer ${
                            item.gst_rate === '' ? 'text-gray-400' : 'text-gray-800 font-medium'
                          }`}
                        >
                          <option value="">Select</option>
                          {STANDARD_GST_RATES.map((rate) => (
                            <option key={rate} value={rate}>
                              GST@{rate}%
                            </option>
                          ))}
                          {item.gst_rate !== '' && !STANDARD_GST_RATES.includes(Number(item.gst_rate) as any) && (
                            <option value={item.gst_rate}>
                              GST@{item.gst_rate}% (Custom)
                            </option>
                          )}
                        </select>
                        <ChevronDown className="h-3 w-3 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>

                    {/* 10. Tax Amount (Computed Display) */}
                    <td className="py-1 px-2.5 text-right font-mono text-xs text-gray-700 border-r border-gray-200 select-none">
                      {metrics.taxAmountDisplay}
                    </td>

                    {/* 11. Amount (Line Total Display) */}
                    <td className="py-1 px-2.5 text-right font-mono font-semibold text-xs text-gray-900 border-r border-gray-200 select-none">
                      {metrics.lineTotalDisplay}
                    </td>

                    {/* 12. Delete Action */}
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-gray-300 hover:text-red-600 rounded transition-opacity opacity-0 group-hover:opacity-100"
                        title="Delete Row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & Add Row shortcut */}
        <div className="p-2.5 bg-[#f8fafc] border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={addItemRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
          <div className="text-[11px] text-gray-500 font-medium">
            Total Rows: <span className="font-semibold text-gray-800">{items.length}</span> • Clicking the last row automatically creates the next row
          </div>
        </div>
      </div>

      {/* Floating Catalog Dropdown (Fixed Portal - 100% visible, zero clipping, no scrolling) */}
      {activeItemDropdown !== null && dropdownCoords && (
        <div
          ref={itemDropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            width: `${dropdownCoords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-gray-100 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Header with "+ Add Item" Button (replacing static text per requirement) */}
          <div className="p-2 bg-slate-50 border-b border-gray-200 flex justify-between items-center sticky top-0 backdrop-blur-xs z-10">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const targetIdx = activeItemDropdown
                setActiveItemRowIndex(targetIdx)
                setActiveItemDropdown(null)
                setShowAddItemModal(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ea8b2c] hover:bg-[#d97d22] text-white text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
              title="Add New Item to Catalog"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Add Item</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
                {activeFilteredProducts.length} Available
              </span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setActiveItemDropdown(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List of Products or Empty state */}
          {activeFilteredProducts.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                No catalog items found {items[activeItemDropdown]?.description ? `matching "${items[activeItemDropdown].description}"` : ''}
              </p>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const targetIdx = activeItemDropdown
                  setActiveItemRowIndex(targetIdx)
                  setActiveItemDropdown(null)
                  setShowAddItemModal(true)
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#ea8b2c] hover:underline cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Click here to Add New Item</span>
              </button>
            </div>
          ) : (
            <>
              {activeFilteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleProductSelect(activeItemDropdown, p.id)
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{p.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {p.hsn_sac_code ? `HSN: ${p.hsn_sac_code}` : ''}{' '}
                      {(p as any).category ? `• ${(p as any).category}` : ''}
                      {p.product_units?.abbreviation ? ` • ${p.product_units.abbreviation}` : ''}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs font-bold text-gray-800 group-hover:text-blue-700 shrink-0">
                    ₹{Number(p.sale_price).toLocaleString('en-IN')}
                  </div>
                </button>
              ))}

              {/* Quick bottom action to add another item */}
              <div className="p-1.5 bg-gray-50 border-t border-gray-100 flex justify-center">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const targetIdx = activeItemDropdown
                    setActiveItemRowIndex(targetIdx)
                    setActiveItemDropdown(null)
                    setShowAddItemModal(true)
                  }}
                  className="w-full py-1.5 px-3 text-center text-xs font-bold text-[#ea8b2c] hover:text-[#d97d22] hover:bg-amber-50/70 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Another New Item</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary & Notes Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Payment & Settlement Method Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CreditCard className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Payment Mode & Settlement
                </h3>
              </div>

              {/* Quick Status Selector */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('unpaid')
                    setAmountPaidInput(0)
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    paymentStatus === 'unpaid'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Unpaid (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('paid')
                    setAmountPaidInput(liveTotals.total_amount)
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Fully Paid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('partial')
                    if (!amountPaidInput) setAmountPaidInput(Math.round(liveTotals.total_amount / 2))
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    paymentStatus === 'partial'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Partially Paid
                </button>
              </div>
            </div>

            {paymentStatus !== 'unpaid' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                    Select Payment Mode / Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium">
                    {[
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'upi', label: 'UPI / QR', icon: QrCode },
                      { id: 'bank_transfer', label: 'Bank (NEFT/IMPS)', icon: Landmark },
                      { id: 'card', label: 'Card', icon: CreditCard },
                      { id: 'cheque', label: 'Cheque / DD', icon: FileText },
                      { id: 'credit', label: 'Credit Account', icon: Wallet },
                    ].map((mode) => {
                      const Icon = mode.icon
                      const isSelected = paymentMode === mode.id
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMode(mode.id)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-2xs ring-1 ring-indigo-500/20'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                          <span className="truncate">{mode.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Amount Received Now (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={paymentStatus === 'paid' ? liveTotals.total_amount : amountPaidInput}
                      onChange={(e) => setAmountPaidInput(parseFloat(e.target.value) || 0)}
                      disabled={paymentStatus === 'paid'}
                      className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-gray-900"
                    />
                    {paymentStatus === 'partial' && (
                      <p className="text-[10px] text-rose-600 font-medium mt-1">
                        Remaining Balance Due: ₹{(Math.max(0, liveTotals.total_amount - amountPaidInput)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Transaction / Reference #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-982144, CHQ-104882"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-gray-800"
                    />
                  </div>
                </div>

                {paymentMode === 'upi' && (
                  <div className="mt-3 p-4 bg-white border-2 border-dashed border-indigo-200 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div 
                      className="bg-white p-1.5 rounded-lg border border-indigo-100 shadow-xs relative cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setShowFullScreenQr(true)}
                    >
                      {/* Fake QR Scanner Grid styling */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-600 rounded-tl-sm"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-600 rounded-tr-sm"></div>
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-600 rounded-bl-sm"></div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-600 rounded-br-sm"></div>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=business@upi&pn=VANIRA Business&am=${(paymentStatus === 'paid' ? liveTotals.total_amount : amountPaidInput).toFixed(2)}&cu=INR`)}`} 
                        alt="UPI QR" 
                        className="w-14 h-14 object-contain rounded-md" 
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                        Scan to Pay 
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">Secure</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Customer can scan this QR code with PhonePe, GPay, or Paytm. The exact amount is pre-filled.
                      </p>
                      <div className="mt-2 text-[11px] font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md inline-block shadow-xs">
                        PAY: ₹{(paymentStatus === 'paid' ? liveTotals.total_amount : amountPaidInput).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentStatus === 'unpaid' && (
              <p className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                Invoice will be issued on credit (₹{liveTotals.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} balance due). Payment can be recorded later.
              </p>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
            <label className="block text-xs font-medium text-gray-700">Customer Notes</label>
            <textarea
              rows={2}
              placeholder="Add note visible on customer invoice..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
            <label className="block text-xs font-medium text-gray-700">Terms & Conditions</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>


        </div>

        {/* Live Tax Summary Breakdown Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
            Invoice Financial Summary
          </h3>

          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal (Gross)</span>
              <span className="font-mono font-medium">₹{liveTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {liveTotals.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount</span>
                <span className="font-mono font-medium">-₹{liveTotals.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between pt-1 border-t border-gray-100 font-medium text-gray-800">
              <span>Taxable Value</span>
              <span className="font-mono">₹{liveTotals.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-indigo-600">
                <span>IGST (Inter-state)</span>
                <span className="font-mono">₹{liveTotals.igst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-indigo-600">
                  <span>CGST (Central GST)</span>
                  <span className="font-mono">₹{liveTotals.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-indigo-600">
                  <span>
                    {liveTotals.utgst_amount && liveTotals.utgst_amount > 0
                      ? 'UTGST (Union Territory GST)'
                      : 'SGST (State GST)'}
                  </span>
                  <span className="font-mono">
                    ₹{(liveTotals.utgst_amount && liveTotals.utgst_amount > 0
                      ? liveTotals.utgst_amount
                      : liveTotals.sgst_amount
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {Boolean(liveTotals.cess_amount && liveTotals.cess_amount > 0) && (
              <div className="flex justify-between text-amber-700">
                <span>GST Compensation Cess</span>
                <span className="font-mono">
                  ₹{Number(liveTotals.cess_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {liveTotals.round_off_amount !== 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Round Off</span>
                <span className="font-mono">
                  {liveTotals.round_off_amount > 0 ? `+₹${liveTotals.round_off_amount}` : `-₹${Math.abs(liveTotals.round_off_amount)}`}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-sm font-bold text-gray-900">
              <span>Current Invoice Total</span>
              <span className="font-mono text-indigo-600">
                ₹{liveTotals.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* PREVIOUS DUE OR ADVANCE BALANCE IMPACT */}
            {matchedCustomer && (
              <div className="pt-2 border-t border-dashed border-gray-200 space-y-1.5 bg-gray-50/50 p-2.5 rounded-xl">
                {isDueOnCustomer && (
                  <>
                    <div className="flex justify-between text-rose-700 font-medium text-[11px]">
                      <span>+ Previous Dues (Due from Customer)</span>
                      <span className="font-mono">+₹{customerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total Net Outstanding After Bill</span>
                      <span className="font-mono text-rose-600 text-sm">
                        ₹{(liveTotals.total_amount + customerBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}

                {isDueOnUs && (
                  <>
                    <div className="flex justify-between text-emerald-700 font-medium text-[11px]">
                      <span>- Customer Advance Credit (Due on Us)</span>
                      <span className="font-mono">-₹{Math.abs(customerBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Net Payable After Advance Adjusted</span>
                      <span className="font-mono text-emerald-600 text-sm">
                        ₹{Math.max(0, liveTotals.total_amount - Math.abs(customerBalance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {Math.abs(customerBalance) > liveTotals.total_amount && (
                      <div className="text-[10px] text-emerald-600 text-right italic">
                        Remaining Advance Credit: ₹{(Math.abs(customerBalance) - liveTotals.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </>
                )}

                {customerBalance === 0 && (
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Previous Balance Due</span>
                    <span className="font-mono">₹0.00</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/sales/invoices')}
              className="px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving Draft...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Finalize & Issue'}
            </button>
          </div>
        </div>
      </div>

      {/* ── ADD ITEM DASHBOARD POPUP MODAL ───────────────────────── */}
      {showAddItemModal && (
        <div
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddItemModal(false)
            }
          }}
        >
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-gray-200">
            <AddItemView
              initialData={{
                name:
                  activeItemRowIndex !== null && items[activeItemRowIndex]?.description
                    ? items[activeItemRowIndex].description
                    : '',
                category:
                  activeItemRowIndex !== null &&
                  items[activeItemRowIndex]?.category &&
                  items[activeItemRowIndex]?.category !== 'ALL'
                    ? items[activeItemRowIndex].category
                    : undefined,
              }}
              onClose={() => setShowAddItemModal(false)}
              onSuccess={(savedProduct) => {
                if (savedProduct) {
                  const newProductOption: ProductOption = {
                    id: savedProduct.id || `prod-${Date.now()}`,
                    name: savedProduct.name,
                    category: savedProduct.category || savedProduct.category_id || 'Hardware',
                    sku: savedProduct.sku || null,
                    hsn_sac_code: savedProduct.hsn_sac_code || null,
                    sale_price: Number(savedProduct.sale_price ?? savedProduct.selling_price) || 0,
                    gst_rate:
                      Number(savedProduct.gst_rate) !== undefined
                        ? Number(savedProduct.gst_rate)
                        : 18,
                    gst_inclusive: Boolean(savedProduct.gst_inclusive),
                    product_units: {
                      abbreviation:
                        savedProduct.product_units?.abbreviation ||
                        savedProduct.unit ||
                        'Pcs',
                    },
                  }

                  setProducts((prev) => [newProductOption, ...prev])

                  const targetIdx =
                    activeItemRowIndex !== null ? activeItemRowIndex : Math.max(0, items.length - 1)
                  handleProductSelect(targetIdx, newProductOption.id, newProductOption)
                  toast.success(`"${newProductOption.name}" added and selected in invoice!`)
                }
                setShowAddItemModal(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Full Screen QR Modal */}
      {showFullScreenQr && paymentMode === 'upi' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowFullScreenQr(false)}>
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Scan to Pay</h3>
              <button onClick={() => setShowFullScreenQr(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="relative p-2 bg-white border-2 border-indigo-100 rounded-xl">
               {/* Decorative corner brackets for big QR */}
               <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-indigo-600 rounded-tl-md"></div>
               <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-indigo-600 rounded-tr-md"></div>
               <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-indigo-600 rounded-bl-md"></div>
               <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-indigo-600 rounded-br-md"></div>
               
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(`upi://pay?pa=business@upi&pn=VANIRA Business&am=${(paymentStatus === 'paid' ? liveTotals.total_amount : amountPaidInput).toFixed(2)}&cu=INR`)}`} 
                 alt="UPI QR Big" 
                 className="w-64 h-64 object-contain" 
               />
            </div>
            
            <div className="text-center">
               <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
               <p className="text-3xl font-bold text-indigo-700">₹{(paymentStatus === 'paid' ? liveTotals.total_amount : amountPaidInput).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            
            <button 
              type="button" 
              onClick={() => setShowFullScreenQr(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
