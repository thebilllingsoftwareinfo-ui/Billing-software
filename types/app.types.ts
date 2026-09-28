// ============================================================
// types/app.types.ts — Application-level derived types
// ============================================================

export type OrgRole = 'owner' | 'admin' | 'manager' | 'accountant' | 'sales' | 'inventory' | 'staff'

export type BusinessCategory = string

export type MemberStatus = 'active' | 'invited' | 'suspended'

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'void'
  | 'cancelled'

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted'

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'received'
  | 'partial'
  | 'cancelled'

export type PurchaseBillStatus =
  | 'draft'
  | 'approved'
  | 'paid'
  | 'partial'
  | 'overdue'

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'return'
  | 'opening'

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'neft'
  | 'rtgs'
  | 'cheque'
  | 'card'
  | 'other'

export type GstType = 'inclusive' | 'exclusive'

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'finalized'
  | 'voided'
  | 'sent'
  | 'paid'
  | 'cancelled'
  | 'invited'
  | 'role_changed'
  | 'login'
  | 'logout'
  | 'setting_changed'
  | 'permission_changed'

export type ResourceType =
  | 'invoice'
  | 'quotation'
  | 'payment'
  | 'customer'
  | 'supplier'
  | 'product'
  | 'expense'
  | 'purchase_order'
  | 'purchase_bill'
  | 'stock_movement'
  | 'organization_member'
  | 'organization'

// ---- Session -----------------------------------------------

export interface AppSession {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  organization: {
    id: string
    name: string
    gstin: string | null
    logo_url: string | null
    business_category: BusinessCategory
  }
  member: {
    id: string
    role: OrgRole
    status: MemberStatus
  }
  // Top-level aliases
  organization_id: string
  user_id: string
  role: OrgRole
  org_id?: string
  email?: string
}

// ---- Address -----------------------------------------------

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country?: string
}

// ---- GST ---------------------------------------------------

export interface GstBreakdown {
  subtotal: number
  discount_amount: number
  taxable_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  cess_amount: number
  total_amount: number
  // Legacy paise aliases for backward compatibility if needed
  subtotal_paise?: number
  discount_paise?: number
  taxable_paise?: number
  cgst_paise?: number
  sgst_paise?: number
  igst_paise?: number
  cess_paise?: number
  total_paise?: number
}

export interface GstLineItem {
  quantity: number
  unit_price: number
  discount_pct: number
  gst_rate: number
  gst_type: GstType
  is_inter_state: boolean
  unit_price_paise?: number
}

// ---- API response wrapper ----------------------------------

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ---- Pagination --------------------------------------------

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

export interface PaginationParams {
  page?: number
  per_page?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// ---- Global Search ------------------------------------------

export type SearchEntityType = 'customer' | 'supplier' | 'product' | 'invoice' | 'quotation' | 'payment' | 'purchase_bill'

export interface SearchResultItem {
  id: string
  entity_type: SearchEntityType
  title: string
  subtitle: string
  status?: string
  amount?: number
  amount_paise?: number
  url: string
}

// ---- Notification Center -----------------------------------

export type NotificationType = 
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'LOW_STOCK'
  | 'QUOTATION_EXPIRING'
  | 'SYSTEM_EVENT'

export interface NotificationItem {
  id: string
  organization_id: string
  user_id: string | null
  type: NotificationType
  title: string
  message: string
  read: boolean
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  created_at: string
}

// ---- WhatsApp Integration -----------------------------------

export type WhatsAppTemplateType = 
  | 'invoice.created'
  | 'invoice.overdue'
  | 'payment.received'
  | 'quotation.created'

export type WhatsAppMessageStatus = 
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'OPT_OUT_BLOCKED'

export interface WhatsAppMessageLog {
  id: string
  organization_id: string
  customer_id: string | null
  recipient_phone: string
  template_type: WhatsAppTemplateType
  entity_type: 'invoice' | 'payment' | 'quotation'
  entity_id: string
  status: WhatsAppMessageStatus
  provider_message_id?: string | null
  error_message?: string | null
  parameters: Record<string, string>
  sent_at: string
}

export interface WhatsAppProviderConfig {
  provider_name: 'meta_cloud_api' | 'twilio' | 'interakt' | 'mock'
  api_key: string
  phone_number_id: string
  waba_id: string
  is_active: boolean
}



