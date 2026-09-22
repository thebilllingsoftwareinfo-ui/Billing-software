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
} from 'lucide-react'
import { toast } from 'sonner'
import { calculateInvoiceServerSide } from '@/lib/services/invoice.service'
import { INDIAN_STATES, filterIndianStates, findState } from '@/lib/constants/indian-states'
import { PDFTemplateType, TEMPLATE_OPTIONS } from '@/lib/constants/invoice-templates'

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
  sku: string | null
  hsn_sac_code: string | null
  sale_price: number
  gst_rate: number
  gst_inclusive: boolean
  product_units?: { abbreviation: string } | null
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
  description: string
  hsn_sac_code: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent: number
  gst_rate: number
  is_gst_inclusive: boolean
}

interface InvoiceFormProps {
  initialData?: any
  isEditing?: boolean
}

export function InvoiceForm({ initialData, isEditing = false }: InvoiceFormProps) {
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
  const [saveAsRegularCustomer, setSaveAsRegularCustomer] = useState<boolean>(false)
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

  // Line items
  const [items, setItems] = useState<LineItemFormState[]>(
    initialData?.invoice_items?.map((it: any) => ({
      id: it.id,
      product_id: it.product_id || '',
      description: it.description || '',
      hsn_sac_code: it.hsn_sac_code || '',
      quantity: Number(it.quantity) || 1,
      unit: it.unit || '',
      unit_price: Number(it.unit_price) || 0,
      discount_percent: Number(it.discount_percent) || 0,
      gst_rate: Number(it.gst_rate) || 18,
      is_gst_inclusive: Boolean(it.is_gst_inclusive),
    })) || [
      {
        product_id: '',
        description: '',
        hsn_sac_code: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        discount_percent: 0,
        gst_rate: 18,
        is_gst_inclusive: false,
      },
    ]
  )

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

  // Close suggestions on outside click
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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
    setSaveAsRegularCustomer(false)
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
    setSaveAsRegularCustomer(false)
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
    setSaveAsRegularCustomer(false)
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

  // Real-time live tax calculation preview
  const liveTotals = useMemo(() => {
    return calculateInvoiceServerSide(
      items.map((it) => ({
        product_id: it.product_id || null,
        description: it.description || 'Line Item',
        hsn_sac_code: it.hsn_sac_code || undefined,
        quantity: it.quantity || 1,
        unit: it.unit || undefined,
        unit_price: it.unit_price || 0,
        discount_percent: it.discount_percent || 0,
        gst_rate: it.gst_rate || 18,
        is_gst_inclusive: it.is_gst_inclusive || false,
      })),
      discountType,
      discountValue,
      isInterState
    )
  }, [items, discountType, discountValue, isInterState])

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId)
    if (!prod) return

    setItems((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        product_id: prod.id,
        description: prod.name,
        hsn_sac_code: prod.hsn_sac_code || '',
        unit_price: Number(prod.sale_price) || 0,
        gst_rate: Number(prod.gst_rate) || 18,
        is_gst_inclusive: Boolean(prod.gst_inclusive),
        unit: prod.product_units?.abbreviation || 'pcs',
      }
      return next
    })
  }

  const handleItemChange = (index: number, field: keyof LineItemFormState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: '',
        description: '',
        hsn_sac_code: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        discount_percent: 0,
        gst_rate: 18,
        is_gst_inclusive: false,
      },
    ])
  }

  const removeItemRow = (index: number) => {
    if (items.length === 1) {
      toast.error('At least one line item is required')
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent, finalizeImmediately = false) => {
    e.preventDefault()

    if (items.some((it) => !it.description.trim())) {
      setError('All line items must have a valid description.')
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
        items: items.map((it) => ({
          product_id: it.product_id || undefined,
          description: it.description.trim(),
          hsn_sac_code: it.hsn_sac_code.trim() || undefined,
          quantity: Number(it.quantity) || 1,
          unit: it.unit.trim() || undefined,
          unit_price: Number(it.unit_price) || 0,
          discount_percent: Number(it.discount_percent) || 0,
          gst_rate: Number(it.gst_rate) || 18,
          is_gst_inclusive: Boolean(it.is_gst_inclusive),
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
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in-50 slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 bg-indigo-50/70 border-b border-indigo-100/80 flex items-center justify-between text-[11px] font-semibold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Search className="h-3 w-3 text-indigo-600" />
                      {customerName.trim()
                        ? `Matching Customers (${matchingCustomers.length})`
                        : `Saved Regular Customers (${matchingCustomers.length})`}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-normal">Click to auto-fill</span>
                  </div>
                  {matchingCustomers.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {matchingCustomers.map((cust) => {
                        const bal = Number(cust.outstanding_balance) || 0
                        return (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => handleSelectSuggestedCustomer(cust)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-2 group"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-gray-900 group-hover:text-indigo-600 flex items-center gap-1.5">
                                <span>{cust.display_name}</span>
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded">
                                  Regular
                                </span>
                                {bal > 0 ? (
                                  <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 text-[9px] font-semibold rounded font-mono">
                                    Due: ₹{bal.toLocaleString('en-IN')}
                                  </span>
                                ) : bal < 0 ? (
                                  <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-semibold rounded font-mono">
                                    Advance: ₹{Math.abs(bal).toLocaleString('en-IN')}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                {cust.phone && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <Phone className="h-2.5 w-2.5 text-gray-400" />
                                    {cust.phone}
                                  </span>
                                )}
                                {cust.gstin && (
                                  <span className="font-mono text-[10px] text-gray-400">
                                    GSTIN: {cust.gstin}
                                  </span>
                                )}
                                {(cust.place_of_supply || cust.state) && (
                                  <span className="text-[10px] text-indigo-500">
                                    State: {cust.place_of_supply || cust.state}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 text-xs text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Select &rarr;
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-500">
                      <p>No matching regular customer for &quot;{customerName}&quot;</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Continue typing to use as a new customer, or check &quot;Save to Regular Customers&quot; below.
                      </p>
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

          {/* Regular Customer Helper Banner / Add-to-Regular option */}
          {!customerId && !matchedCustomer && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-linear-to-r from-indigo-50/70 via-purple-50/50 to-indigo-50/70 rounded-xl border border-indigo-100 text-xs">
              <label className="flex items-start sm:items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsRegularCustomer}
                  onChange={(e) => setSaveAsRegularCustomer(e.target.checked)}
                  className="mt-0.5 sm:mt-0 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                    <BookmarkPlus className="h-3.5 w-3.5 text-indigo-600" />
                    Save as Regular Customer
                  </span>
                  <p className="text-[11px] text-indigo-700/80">
                    Saves customer name, phone, email & tax info so they appear in auto-complete suggestions next time.
                  </p>
                </div>
              </label>

              {customerName.trim() && (
                <button
                  type="button"
                  onClick={handleSaveCustomerToDirectory}
                  disabled={isSavingCustomer || submitting}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors shadow-xs shrink-0 disabled:opacity-50"
                >
                  {isSavingCustomer ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Save to Regular Customers Now
                </button>
              )}
            </div>
          )}

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

      {/* Line Items Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Invoice Line Items</h3>
          <button
            type="button"
            onClick={addItemRow}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-3 min-w-[180px]">Product / Catalog</th>
                <th className="py-3 px-3 min-w-[200px]">Description</th>
                <th className="py-3 px-3 w-28">HSN/SAC</th>
                <th className="py-3 px-3 w-20 text-right">Qty</th>
                <th className="py-3 px-3 w-20">Unit</th>
                <th className="py-3 px-3 w-28 text-right">Price (₹)</th>
                <th className="py-3 px-3 w-20 text-right">Disc %</th>
                <th className="py-3 px-3 w-24">GST Rate</th>
                <th className="py-3 px-3 w-28 text-right">Amount (₹)</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="p-2">
                    <select
                      value={item.product_id}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Custom Item --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.sale_price})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Item description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full h-9 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="HSN"
                      value={item.hsn_sac_code}
                      onChange={(e) => handleItemChange(idx, 'hsn_sac_code', e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="pcs"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={item.discount_percent}
                      onChange={(e) => handleItemChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={item.gst_rate}
                      onChange={(e) => handleItemChange(idx, 'gst_rate', parseFloat(e.target.value))}
                      className="w-full h-9 px-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-gray-900">
                    ₹
                    {(
                      liveTotals.lines[idx]?.line_total || 0
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

          {/* 5-Template Print & Paper Size Selector (Remembered Automatically) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                  Select Print Template & Paper Size (4-5 Formats)
                </label>
                <p className="text-[11px] text-gray-500">
                  Choose your preferred printer format before save/print. Your selection is remembered for all next invoices!
                </p>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Auto-Remembers Choice
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              {TEMPLATE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = selectedTemplate === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleTemplateSelect(opt.id)}
                    className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-700 hover:bg-gray-100/90'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-indigo-200/80 text-indigo-950' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {opt.paperSize}
                      </span>
                    </div>
                    <span className="text-xs font-bold leading-tight">{opt.name}</span>
                    <span className="text-[10px] text-gray-500 font-normal mt-1 leading-snug line-clamp-2">
                      {opt.desc}
                    </span>
                  </button>
                )
              })}
            </div>
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
                  <span>SGST (State GST)</span>
                  <span className="font-mono">₹{liveTotals.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
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
    </form>
  )
}
