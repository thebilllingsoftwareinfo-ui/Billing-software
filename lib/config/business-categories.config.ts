import { BusinessCategory } from '@/types/app.types'

export type DashboardMetricType =
  | 'total_sales'
  | 'today_sales'
  | 'total_purchases'
  | 'stock_value'
  | 'gold_stock'
  | 'silver_stock'
  | 'customer_outstanding'
  | 'supplier_outstanding'
  | 'low_stock'
  | 'expiry_alerts'
  | 'pending_orders'
  | 'service_reminders'
  | 'batch_alerts'

export type ProductFieldConfig = {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean'
  required?: boolean
  options?: string[]
  group: 'basic' | 'metal' | 'stones' | 'pricing' | 'inventory' | 'specifications'
}

export type MeasurementUnit = {
  id: string
  name: string
  abbreviation: string
  isStandard: boolean
}

export type BillingFieldConfig = {
  id: string
  label: string
  type: 'text' | 'number' | 'calculated'
  visible: boolean
}

export interface GstBehaviorConfig {
  defaultGstRate: number
  allowedRates: number[]
  isCompositionAllowed: boolean
  rcmCommon?: boolean
}

export interface BarcodeSupportConfig {
  enabled: boolean
  autoGenerate: boolean
  defaultFormat: 'ean13' | 'code128'
}

export interface InventoryBehaviorConfig {
  trackStock: boolean
  trackBatches: boolean
  trackSerials: boolean
  allowNegativeStock: boolean
}

export interface CategoryConfig {
  id: BusinessCategory
  name: string
  subcategories: string[]
  enabledModules: string[]
  features: {
    dashboard: DashboardMetricType[]
    products: ProductFieldConfig[]
    measurements: MeasurementUnit[]
    billing: BillingFieldConfig[]
    reports: string[]
    gstBehavior: GstBehaviorConfig
    barcodeSupport: BarcodeSupportConfig
    inventoryBehavior: InventoryBehaviorConfig
  }
  terminology: {
    product: string
    client: string
    supplier: string
    invoice: string
  }
}

// ── JEWELLERY SPECIFIC PRODUCT FIELDS ─────────────────────────
const JEWELLERY_PRODUCT_FIELDS: ProductFieldConfig[] = [
  { id: 'metal_type', label: 'Metal Type', type: 'select', options: ['Gold', 'Silver', 'Platinum', 'Diamond', 'Other'], group: 'metal', required: true },
  { id: 'purity', label: 'Purity / Karat', type: 'select', options: ['24K (99.9%)', '22K (91.6%)', '18K (75.0%)', '14K (58.5%)', '925 Sterling', '999 Pure Silver'], group: 'metal', required: true },
  { id: 'carat', label: 'Carat Rating', type: 'number', group: 'metal' },
  { id: 'gross_weight', label: 'Gross Weight (g)', type: 'number', group: 'metal', required: true },
  { id: 'stone_weight', label: 'Stone Weight (g / ct)', type: 'number', group: 'stones' },
  { id: 'net_weight', label: 'Net Weight (g)', type: 'number', group: 'metal', required: true },
  { id: 'stone_value', label: 'Stone Value (₹)', type: 'number', group: 'stones' },
  { id: 'making_charge', label: 'Making Charges (₹)', type: 'number', group: 'pricing' },
  { id: 'making_charge_type', label: 'Making Charge Type', type: 'select', options: ['Per Gram', 'Fixed', 'Percentage'], group: 'pricing' },
  { id: 'wastage', label: 'Wastage', type: 'number', group: 'pricing' },
  { id: 'wastage_type', label: 'Wastage Type', type: 'select', options: ['Percentage (%)', 'Weight (g)'], group: 'pricing' },
  { id: 'other_charges', label: 'Other Charges (₹)', type: 'number', group: 'pricing' },
  { id: 'hallmark_huid', label: 'Hallmark / HUID Code', type: 'text', group: 'specifications' },
  { id: 'is_live_price', label: 'Link to Live Bullion Rate', type: 'boolean', group: 'pricing' },
]

// ── JEWELLERY SPECIFIC BILLING FIELDS ─────────────────────────
const JEWELLERY_BILLING_FIELDS: BillingFieldConfig[] = [
  { id: 'gross_weight', label: 'Gross Wt', type: 'number', visible: true },
  { id: 'stone_weight', label: 'Stone Wt', type: 'number', visible: true },
  { id: 'net_weight', label: 'Net Wt', type: 'calculated', visible: true },
  { id: 'wastage', label: 'Wastage', type: 'number', visible: true },
  { id: 'making', label: 'Making Charges', type: 'number', visible: true },
  { id: 'hallmark', label: 'HUID', type: 'text', visible: true },
]

// ── 26 OFFICIAL BUSINESS CATEGORIES REGISTRY ──────────────────
export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  // 1. General Retail
  retail: {
    id: 'retail',
    name: 'General Retail',
    subcategories: ['Gift Shop', 'General Store', 'Departmental', 'Variety Store', 'Toys & Games', 'Home Decor'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'accounting', 'reports'],
    terminology: { product: 'Item', client: 'Customer', supplier: 'Supplier', invoice: 'Retail Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'pkt', name: 'Pack', abbreviation: 'pkt', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
      ],
      products: [
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
        { id: 'mrp', label: 'MRP', type: 'number', group: 'pricing' },
      ],
      billing: [],
      reports: ['sales_summary', 'stock_summary', 'low_stock_report'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [0, 5, 12, 18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 2. Grocery
  grocery: {
    id: 'grocery',
    name: 'Grocery / Kirana',
    subcategories: ['Kirana Store', 'Daily Needs', 'Spices & Condiments', 'Dry Fruits', 'Organic Groceries'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'accounting', 'reports'],
    terminology: { product: 'Item', client: 'Customer', supplier: 'Wholesaler', invoice: 'Grocery Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'expiry_alerts', 'customer_outstanding'],
      measurements: [
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'g', name: 'Gram', abbreviation: 'g', isStandard: true },
        { id: 'l', name: 'Litre', abbreviation: 'L', isStandard: true },
        { id: 'ml', name: 'Millilitre', abbreviation: 'ml', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'pkt', name: 'Pack', abbreviation: 'pkt', isStandard: true },
        { id: 'bag', name: 'Bag', abbreviation: 'bag', isStandard: true },
      ],
      products: [
        { id: 'mrp', label: 'MRP', type: 'number', group: 'pricing' },
        { id: 'batch_no', label: 'Batch No', type: 'text', group: 'inventory' },
        { id: 'expiry_date', label: 'Expiry Date', type: 'text', group: 'inventory' },
      ],
      billing: [
        { id: 'mrp', label: 'MRP', type: 'number', visible: true },
        { id: 'batch_no', label: 'Batch', type: 'text', visible: true },
      ],
      reports: ['expiry_report', 'low_stock_report', 'fast_moving_items'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [0, 5, 12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 3. Supermarket
  supermarket: {
    id: 'supermarket',
    name: 'Supermarket / Hypermarket',
    subcategories: ['Supermarket', 'Departmental Store', 'Cash & Carry', 'Mart'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'pos', 'accounting', 'reports'],
    terminology: { product: 'Article', client: 'Shopper', supplier: 'Vendor', invoice: 'Tax Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'expiry_alerts', 'customer_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'g', name: 'Gram', abbreviation: 'g', isStandard: true },
        { id: 'pkt', name: 'Pack', abbreviation: 'pkt', isStandard: true },
        { id: 'ctn', name: 'Carton', abbreviation: 'ctn', isStandard: true },
      ],
      products: [
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
        { id: 'mrp', label: 'MRP', type: 'number', group: 'pricing' },
        { id: 'aisle_rack', label: 'Aisle / Shelf Location', type: 'text', group: 'inventory' },
      ],
      billing: [{ id: 'mrp', label: 'MRP', type: 'number', visible: true }],
      reports: ['sales_summary', 'stock_summary', 'expiry_report', 'pos_register'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [0, 5, 12, 18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 4. Electronics
  electronics: {
    id: 'electronics',
    name: 'Electronics & Appliances',
    subcategories: ['Home Appliances', 'Kitchen Appliances', 'Audio / TV', 'Computers & Laptops', 'CCTV & Security'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'serials', 'service_reminders', 'accounting', 'reports'],
    terminology: { product: 'Equipment', client: 'Customer', supplier: 'Distributor', invoice: 'Tax Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
      ],
      products: [
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
        { id: 'model_no', label: 'Model No', type: 'text', group: 'specifications' },
        { id: 'serial_no', label: 'Serial / IMEI Number', type: 'text', group: 'specifications' },
        { id: 'warranty_months', label: 'Warranty (Months)', type: 'number', group: 'specifications' },
      ],
      billing: [
        { id: 'model_no', label: 'Model', type: 'text', visible: true },
        { id: 'serial_no', label: 'Serial No', type: 'text', visible: true },
      ],
      reports: ['sales_summary', 'serial_tracker', 'warranty_report'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [18, 28], isCompositionAllowed: false },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: true, allowNegativeStock: false },
    },
  },

  // 5. Mobile & Accessories
  mobile_accessories: {
    id: 'mobile_accessories',
    name: 'Mobile & Accessories',
    subcategories: ['Smartphones', 'Feature Phones', 'Phone Cases & Covers', 'Chargers & Cables', 'Smart Watches', 'Audio Gear'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'serials', 'accounting', 'reports'],
    terminology: { product: 'Device / Accessory', client: 'Customer', supplier: 'Distributor', invoice: 'Mobile Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
      ],
      products: [
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
        { id: 'model_name', label: 'Model Name', type: 'text', group: 'specifications' },
        { id: 'imei_1', label: 'IMEI 1', type: 'text', group: 'specifications' },
        { id: 'imei_2', label: 'IMEI 2', type: 'text', group: 'specifications' },
        { id: 'color', label: 'Color / RAM / Storage', type: 'text', group: 'specifications' },
      ],
      billing: [
        { id: 'imei_1', label: 'IMEI', type: 'text', visible: true },
        { id: 'color', label: 'Spec', type: 'text', visible: true },
      ],
      reports: ['imei_history', 'sales_summary', 'stock_summary'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: true, allowNegativeStock: false },
    },
  },

  // 6. Clothing / Garments
  clothing_garments: {
    id: 'clothing_garments',
    name: 'Clothing / Garments',
    subcategories: ['Menswear', 'Womenswear', 'Kids Wear', 'Ethnic Wear', 'Fabric / Suiting Shirting', 'Innerwear'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'accounting', 'reports'],
    terminology: { product: 'Garment', client: 'Customer', supplier: 'Manufacturer', invoice: 'Apparel Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'mtr', name: 'Meters', abbreviation: 'mtr', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
        { id: 'doz', name: 'Dozen', abbreviation: 'doz', isStandard: true },
      ],
      products: [
        { id: 'size', label: 'Size (S, M, L, XL, XXL, 32, 34...)', type: 'text', group: 'specifications' },
        { id: 'color', label: 'Color / Shade', type: 'text', group: 'specifications' },
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
        { id: 'fabric', label: 'Fabric / Material', type: 'text', group: 'specifications' },
      ],
      billing: [
        { id: 'size', label: 'Size', type: 'text', visible: true },
        { id: 'color', label: 'Color', type: 'text', visible: true },
      ],
      reports: ['size_wise_stock', 'sales_summary', 'stock_summary'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [5, 12], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 7. Footwear
  footwear: {
    id: 'footwear',
    name: 'Footwear',
    subcategories: ['Men Shoes', 'Women Sandals', 'Kids Footwear', 'Sports Shoes', 'Formal Shoes', 'Slippers'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'accounting', 'reports'],
    terminology: { product: 'Footwear', client: 'Customer', supplier: 'Distributor', invoice: 'Footwear Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'pair', name: 'Pair', abbreviation: 'pr', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'ctn', name: 'Carton', abbreviation: 'ctn', isStandard: true },
      ],
      products: [
        { id: 'shoe_size', label: 'Size (UK / Euro)', type: 'select', options: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'], group: 'specifications' },
        { id: 'color', label: 'Color', type: 'text', group: 'specifications' },
        { id: 'article_no', label: 'Article / Model No', type: 'text', group: 'specifications' },
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
      ],
      billing: [
        { id: 'shoe_size', label: 'Size', type: 'text', visible: true },
        { id: 'article_no', label: 'Article', type: 'text', visible: true },
      ],
      reports: ['size_wise_stock', 'article_sales', 'stock_summary'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [5, 12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 8. Jewellery (MANDATORY DEEP CONFIGURATION)
  jewellery: {
    id: 'jewellery',
    name: 'Jewellery',
    subcategories: ['Gold Jewellery', 'Diamond Jewellery', 'Silver Ornaments', 'Platinum Articles', 'Precious Gemstones', 'Bullion & Coins'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'jewellery_calculator', 'bullion_rates', 'accounting', 'reports'],
    terminology: { product: 'Ornaments / Item', client: 'Customer', supplier: 'Karigar / Bullion Dealer', invoice: 'Jewellery Estimate / Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'gold_stock', 'silver_stock', 'stock_value', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'g', name: 'Gram', abbreviation: 'g', isStandard: true },
        { id: 'mg', name: 'Milligram', abbreviation: 'mg', isStandard: true },
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'ct', name: 'Carat', abbreviation: 'ct', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
      ],
      products: JEWELLERY_PRODUCT_FIELDS,
      billing: JEWELLERY_BILLING_FIELDS,
      reports: ['metal_wise_stock', 'jewellery_sales', 'making_charges', 'stone_details', 'karigar_ledger'],
      gstBehavior: { defaultGstRate: 3, allowedRates: [0, 0.25, 1.5, 3, 5], isCompositionAllowed: false },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: true, allowNegativeStock: false },
    },
  },

  // 9. Hardware
  hardware: {
    id: 'hardware',
    name: 'Hardware & Tools',
    subcategories: ['Fasteners & Screws', 'Power Tools', 'Hand Tools', 'Paints & Polishes', 'Plumbing Fixtures', 'Safety Gear'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'accounting', 'reports'],
    terminology: { product: 'Hardware Item', client: 'Contractor / Buyer', supplier: 'Distributor', invoice: 'Tax Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'pkt', name: 'Pack', abbreviation: 'pkt', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
        { id: 'mtr', name: 'Meters', abbreviation: 'mtr', isStandard: true },
      ],
      products: [
        { id: 'size_dimensions', label: 'Size / Dimensions (mm / inches)', type: 'text', group: 'specifications' },
        { id: 'grade', label: 'Material Grade / Spec', type: 'text', group: 'specifications' },
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
      ],
      billing: [{ id: 'size_dimensions', label: 'Size', type: 'text', visible: true }],
      reports: ['sales_summary', 'stock_summary', 'fast_moving_items'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [12, 18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 10. Pharmacy / Medical Store
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy / Medical Store',
    subcategories: ['Allopathic Medicines', 'Ayurvedic & Herbal', 'Surgical & Disposable', 'Health Supplements', 'OTC Healthcare', 'Baby Care'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'expiry', 'accounting', 'reports'],
    terminology: { product: 'Medicine', client: 'Patient / Customer', supplier: 'Pharma Distributor', invoice: 'Medical Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'expiry_alerts', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'strip', name: 'Strip', abbreviation: 'strp', isStandard: true },
        { id: 'tab', name: 'Tablet', abbreviation: 'tab', isStandard: true },
        { id: 'btl', name: 'Bottle', abbreviation: 'btl', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'tube', name: 'Tube', abbreviation: 'tube', isStandard: true },
        { id: 'vial', name: 'Vial', abbreviation: 'vial', isStandard: true },
      ],
      products: [
        { id: 'batch_no', label: 'Batch Number', type: 'text', required: true, group: 'inventory' },
        { id: 'expiry_date', label: 'Expiry Date (MM/YY)', type: 'text', required: true, group: 'inventory' },
        { id: 'composition', label: 'Drug Composition / Salt', type: 'text', group: 'basic' },
        { id: 'manufacturer', label: 'Manufacturer Pharma', type: 'text', group: 'basic' },
        { id: 'mrp', label: 'MRP', type: 'number', required: true, group: 'pricing' },
        { id: 'schedule_h', label: 'Schedule H / Rx Prescription Required', type: 'boolean', group: 'specifications' },
      ],
      billing: [
        { id: 'batch_no', label: 'Batch', type: 'text', visible: true },
        { id: 'expiry_date', label: 'Expiry', type: 'text', visible: true },
        { id: 'mrp', label: 'MRP', type: 'number', visible: true },
      ],
      reports: ['expiry_report', 'batch_wise_stock', 'schedule_h_register', 'sales_summary'],
      gstBehavior: { defaultGstRate: 12, allowedRates: [0, 5, 12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 11. Restaurant
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    subcategories: ['Fine Dine', 'Quick Service (QSR)', 'Family Restaurant', 'Dhaba', 'Food Court', 'Buffet'],
    enabledModules: ['sales', 'inventory', 'tables', 'kot', 'accounting', 'reports'],
    terminology: { product: 'Dish / Menu Item', client: 'Diner / Table', supplier: 'Vendor', invoice: 'Restaurant Bill' },
    features: {
      dashboard: ['today_sales', 'pending_orders', 'total_sales', 'stock_value'],
      measurements: [
        { id: 'plate', name: 'Plate', abbreviation: 'plt', isStandard: true },
        { id: 'portion', name: 'Portion', abbreviation: 'ptn', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'cup', name: 'Cup', abbreviation: 'cup', isStandard: true },
        { id: 'glass', name: 'Glass', abbreviation: 'gls', isStandard: true },
      ],
      products: [
        { id: 'food_type', label: 'Category (Veg/Non-Veg/Vegan)', type: 'select', options: ['Veg', 'Non-Veg', 'Egg', 'Vegan', 'Beverage'], group: 'basic', required: true },
        { id: 'preparation_time', label: 'Prep Time (Mins)', type: 'number', group: 'basic' },
        { id: 'spice_level', label: 'Spice Level', type: 'select', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy'], group: 'specifications' },
      ],
      billing: [
        { id: 'food_type', label: 'Type', type: 'text', visible: true },
        { id: 'table_no', label: 'Table', type: 'text', visible: true },
      ],
      reports: ['item_wise_sales', 'kot_summary', 'daily_summary'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [5, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: false, autoGenerate: false, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: false, trackBatches: false, trackSerials: false, allowNegativeStock: true },
    },
  },

  // 12. Cafe
  cafe: {
    id: 'cafe',
    name: 'Cafe / Coffee Shop',
    subcategories: ['Coffee Bar', 'Tea Lounge', 'Bakery Cafe', 'Bistro', 'Juice Bar'],
    enabledModules: ['sales', 'inventory', 'pos', 'accounting', 'reports'],
    terminology: { product: 'Beverage / Food', client: 'Guest', supplier: 'Supplier', invoice: 'Cafe Receipt' },
    features: {
      dashboard: ['today_sales', 'total_sales', 'pending_orders'],
      measurements: [
        { id: 'cup', name: 'Cup', abbreviation: 'cup', isStandard: true },
        { id: 'glass', name: 'Glass', abbreviation: 'gls', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'portion', name: 'Portion', abbreviation: 'ptn', isStandard: true },
      ],
      products: [
        { id: 'beverage_type', label: 'Type (Hot / Cold / Bakery)', type: 'select', options: ['Hot Coffee', 'Cold Coffee', 'Tea', 'Smoothie', 'Snack'], group: 'basic' },
        { id: 'serving_size', label: 'Size', type: 'select', options: ['Regular', 'Medium', 'Large'], group: 'specifications' },
      ],
      billing: [],
      reports: ['item_wise_sales', 'daily_summary'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [5, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: false, autoGenerate: false, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: false, trackBatches: false, trackSerials: false, allowNegativeStock: true },
    },
  },

  // 13. Bakery
  bakery: {
    id: 'bakery',
    name: 'Bakery & Confectionery',
    subcategories: ['Cakes & Pastries', 'Bread & Buns', 'Cookies & Biscuits', 'Chocolates & Sweets', 'Custom Designer Cakes'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'accounting', 'reports'],
    terminology: { product: 'Bakery Item', client: 'Customer', supplier: 'Ingredient Vendor', invoice: 'Bakery Bill' },
    features: {
      dashboard: ['today_sales', 'total_sales', 'stock_value', 'expiry_alerts'],
      measurements: [
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'g', name: 'Gram', abbreviation: 'g', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'pkt', name: 'Pack', abbreviation: 'pkt', isStandard: true },
      ],
      products: [
        { id: 'egg_status', label: 'Contains Egg', type: 'select', options: ['100% Eggless', 'Contains Egg'], group: 'basic' },
        { id: 'flavour', label: 'Flavour', type: 'text', group: 'specifications' },
        { id: 'shelf_life_days', label: 'Shelf Life (Days)', type: 'number', group: 'inventory' },
      ],
      billing: [{ id: 'flavour', label: 'Flavour', type: 'text', visible: true }],
      reports: ['item_wise_sales', 'expiry_report', 'stock_summary'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [5, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 14. Hotel / Hospitality
  hotel_hospitality: {
    id: 'hotel_hospitality',
    name: 'Hotel / Hospitality',
    subcategories: ['Business Hotel', 'Resort', 'Homestay / Guest House', 'Lodge', 'Banquet Hall'],
    enabledModules: ['sales', 'purchases', 'services', 'accounting', 'reports'],
    terminology: { product: 'Room / Service', client: 'Guest', supplier: 'Vendor', invoice: 'Hotel Folio / Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'night', name: 'Room Night', abbreviation: 'ngt', isStandard: true },
        { id: 'day', name: 'Day', abbreviation: 'day', isStandard: true },
        { id: 'hr', name: 'Hour', abbreviation: 'hr', isStandard: true },
        { id: 'session', name: 'Event Session', abbreviation: 'ssn', isStandard: true },
      ],
      products: [
        { id: 'room_type', label: 'Room Category', type: 'select', options: ['Deluxe Room', 'Super Deluxe', 'Executive Suite', 'Standard Non-AC', 'Banquet Hall'], group: 'basic' },
        { id: 'max_occupancy', label: 'Max Occupancy', type: 'number', group: 'specifications' },
      ],
      billing: [{ id: 'room_type', label: 'Room Type', type: 'text', visible: true }],
      reports: ['occupancy_report', 'sales_summary', 'customer_ledger'],
      gstBehavior: { defaultGstRate: 12, allowedRates: [0, 12, 18], isCompositionAllowed: false },
      barcodeSupport: { enabled: false, autoGenerate: false, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: false, trackBatches: false, trackSerials: false, allowNegativeStock: true },
    },
  },

  // 15. Wholesale
  wholesale: {
    id: 'wholesale',
    name: 'Wholesale',
    subcategories: ['FMCG Wholesale', 'Textile Wholesale', 'Grain / Commodity Merchant', 'Electrical Wholesale', 'General Wholesale'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'units', 'credit_limits', 'accounting', 'reports'],
    terminology: { product: 'Bulk Product', client: 'Retailer / Trader', supplier: 'Manufacturer', invoice: 'Tax Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'carton', name: 'Carton', abbreviation: 'ctn', isStandard: true },
        { id: 'bag', name: 'Bag', abbreviation: 'bag', isStandard: true },
        { id: 'qtl', name: 'Quintal', abbreviation: 'qtl', isStandard: true },
        { id: 'ton', name: 'Ton', abbreviation: 'ton', isStandard: true },
      ],
      products: [
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
        { id: 'mrp', label: 'MRP', type: 'number', group: 'pricing' },
        { id: 'box_quantity', label: 'Units Per Packaging Master', type: 'number', group: 'inventory' },
      ],
      billing: [{ id: 'box_quantity', label: 'Pack Qty', type: 'number', visible: true }],
      reports: ['sales_summary', 'stock_summary', 'party_ledger', 'outstanding_report'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [0, 5, 12, 18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 16. Distributor
  distributor: {
    id: 'distributor',
    name: 'Distributor / C&F',
    subcategories: ['Authorized Channel Partner', 'Super Stockist', 'C&F Agent', 'Pharma Distributor', 'Telecom Distributor'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'routes', 'accounting', 'reports'],
    terminology: { product: 'SKU Item', client: 'Dealer / Retailer', supplier: 'Principal Company', invoice: 'Distribution Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'customer_outstanding', 'supplier_outstanding', 'low_stock'],
      measurements: [
        { id: 'ctn', name: 'Carton', abbreviation: 'ctn', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'case', name: 'Case', abbreviation: 'case', isStandard: true },
      ],
      products: [
        { id: 'brand', label: 'Principal Brand', type: 'text', group: 'basic' },
        { id: 'distributor_margin', label: 'Distributor Margin %', type: 'number', group: 'pricing' },
      ],
      billing: [],
      reports: ['sales_summary', 'stock_summary', 'party_ledger'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [5, 12, 18, 28], isCompositionAllowed: false },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 17. Manufacturing
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing',
    subcategories: ['Plastic Molding', 'Engineering Fabrication', 'Chemicals', 'Textiles & Weaving', 'Food Processing', 'Assembly Unit'],
    enabledModules: ['inventory', 'sales', 'purchases', 'bom', 'production', 'accounting', 'reports'],
    terminology: { product: 'Finished Good', client: 'Client / Buyer', supplier: 'Raw Material Supplier', invoice: 'Commercial Invoice' },
    features: {
      dashboard: ['total_sales', 'stock_value', 'customer_outstanding', 'supplier_outstanding', 'low_stock'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'ton', name: 'Ton', abbreviation: 'ton', isStandard: true },
        { id: 'mtr', name: 'Meter', abbreviation: 'mtr', isStandard: true },
        { id: 'sqf', name: 'Square Feet', abbreviation: 'sqf', isStandard: true },
      ],
      products: [
        { id: 'bom_cost', label: 'BOM Estimate Cost', type: 'number', group: 'pricing' },
        { id: 'raw_material_type', label: 'Material Grade / Spec', type: 'text', group: 'specifications' },
      ],
      billing: [],
      reports: ['stock_summary', 'production_summary', 'sales_summary'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [5, 12, 18, 28], isCompositionAllowed: false },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 18. Services
  services: {
    id: 'services',
    name: 'Services & Consulting',
    subcategories: ['IT & Software Services', 'Digital Marketing', 'Legal & Compliance', 'Chartered Accountant / Tax', 'Architecture & Design', 'Consultancy'],
    enabledModules: ['sales', 'purchases', 'expenses', 'service_contracts', 'accounting', 'reports'],
    terminology: { product: 'Service / Scope', client: 'Client', supplier: 'Vendor / Contractor', invoice: 'Service Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'hr', name: 'Hour', abbreviation: 'hr', isStandard: true },
        { id: 'day', name: 'Day', abbreviation: 'day', isStandard: true },
        { id: 'session', name: 'Session', abbreviation: 'ssn', isStandard: true },
        { id: 'project', name: 'Project / Milestone', abbreviation: 'prj', isStandard: true },
        { id: 'month', name: 'Month Retainer', abbreviation: 'mth', isStandard: true },
      ],
      products: [
        { id: 'duration', label: 'Standard Duration', type: 'text', group: 'basic' },
        { id: 'deliverables', label: 'Scope / Deliverables', type: 'text', group: 'specifications' },
      ],
      billing: [],
      reports: ['sales_summary', 'party_ledger', 'receivables_aging'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [0, 5, 12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: false, autoGenerate: false, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: false, trackBatches: false, trackSerials: false, allowNegativeStock: true },
    },
  },

  // 19. Salon / Spa
  salon_spa: {
    id: 'salon_spa',
    name: 'Salon / Spa',
    subcategories: ['Hair Salon', 'Beauty Parlour', 'Wellness Spa', 'Nail Bar', 'Tattoo Studio', 'Bridal Studio'],
    enabledModules: ['sales', 'inventory', 'services', 'appointments', 'accounting', 'reports'],
    terminology: { product: 'Treatment / Service', client: 'Client / Customer', supplier: 'Cosmetic Supplier', invoice: 'Salon Bill' },
    features: {
      dashboard: ['today_sales', 'total_sales', 'customer_outstanding', 'service_reminders'],
      measurements: [
        { id: 'session', name: 'Session', abbreviation: 'ssn', isStandard: true },
        { id: 'hr', name: 'Hour', abbreviation: 'hr', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
      ],
      products: [
        { id: 'duration_minutes', label: 'Duration (Mins)', type: 'number', group: 'basic' },
        { id: 'stylist_specialization', label: 'Specialist Required', type: 'text', group: 'specifications' },
      ],
      billing: [],
      reports: ['service_wise_sales', 'daily_summary', 'client_visits'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [5, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: false, autoGenerate: false, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 20. Automobile / Auto Parts
  automobile: {
    id: 'automobile',
    name: 'Automobile / Auto Parts',
    subcategories: ['Two Wheeler Spares', 'Four Wheeler Spares', 'Garage & Workshop', 'Battery & Tyres', 'Car Accessories', 'Auto Lubricants'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'job_cards', 'accounting', 'reports'],
    terminology: { product: 'Spare Part', client: 'Customer / Vehicle Owner', supplier: 'Auto Ancillary Distributor', invoice: 'Tax Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
        { id: 'l', name: 'Litre', abbreviation: 'L', isStandard: true },
        { id: 'pair', name: 'Pair', abbreviation: 'pr', isStandard: true },
      ],
      products: [
        { id: 'part_number', label: 'OEM Part Number', type: 'text', group: 'specifications' },
        { id: 'vehicle_model', label: 'Vehicle Model Compatibility', type: 'text', group: 'specifications' },
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
      ],
      billing: [
        { id: 'part_number', label: 'Part No', type: 'text', visible: true },
        { id: 'vehicle_model', label: 'Vehicle', type: 'text', visible: true },
      ],
      reports: ['sales_summary', 'stock_summary', 'part_movement'],
      gstBehavior: { defaultGstRate: 28, allowedRates: [18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 21. Furniture
  furniture: {
    id: 'furniture',
    name: 'Furniture & Interior',
    subcategories: ['Living Room Furniture', 'Bedroom Sets', 'Office Furniture', 'Modular Kitchens', 'Mattresses', 'Outdoor Furniture'],
    enabledModules: ['inventory', 'sales', 'purchases', 'custom_orders', 'accounting', 'reports'],
    terminology: { product: 'Furniture Unit', client: 'Customer', supplier: 'Manufacturer', invoice: 'Furniture Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'customer_outstanding', 'supplier_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
      ],
      products: [
        { id: 'dimensions', label: 'Dimensions (L x W x H)', type: 'text', group: 'specifications' },
        { id: 'wood_type', label: 'Wood / Material (Teak, Sheesham, Engineered)', type: 'text', group: 'specifications' },
        { id: 'finish', label: 'Finish / Polish', type: 'text', group: 'specifications' },
      ],
      billing: [{ id: 'dimensions', label: 'Size', type: 'text', visible: true }],
      reports: ['sales_summary', 'stock_summary'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 22. Stationery / Books
  stationery_books: {
    id: 'stationery_books',
    name: 'Stationery / Books',
    subcategories: ['School Books', 'Office Stationery', 'Art & Craft Supplies', 'Paper & Notebooks', 'Novel & Literature', 'Pens & Writing'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'accounting', 'reports'],
    terminology: { product: 'Book / Article', client: 'Student / Customer', supplier: 'Publisher / Distributor', invoice: 'Stationery Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'pkt', name: 'Pack', abbreviation: 'pkt', isStandard: true },
        { id: 'doz', name: 'Dozen', abbreviation: 'doz', isStandard: true },
        { id: 'set', name: 'Set', abbreviation: 'set', isStandard: true },
      ],
      products: [
        { id: 'isbn', label: 'ISBN Code', type: 'text', group: 'specifications' },
        { id: 'author', label: 'Author / Publisher', type: 'text', group: 'basic' },
        { id: 'mrp', label: 'MRP', type: 'number', group: 'pricing' },
      ],
      billing: [{ id: 'isbn', label: 'ISBN', type: 'text', visible: true }],
      reports: ['sales_summary', 'stock_summary'],
      gstBehavior: { defaultGstRate: 12, allowedRates: [0, 5, 12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 23. Construction Materials
  construction_materials: {
    id: 'construction_materials',
    name: 'Construction Materials',
    subcategories: ['Cement & Aggregates', 'TMT Steel Bars', 'Bricks & Blocks', 'Tiles & Marbles', 'Sand & Stone Grit', 'Roofing Sheets'],
    enabledModules: ['inventory', 'sales', 'purchases', 'vehicle_dispatch', 'accounting', 'reports'],
    terminology: { product: 'Building Material', client: 'Builder / Contractor', supplier: 'Plant / Supplier', invoice: 'Dispatch Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'customer_outstanding', 'supplier_outstanding', 'low_stock'],
      measurements: [
        { id: 'ton', name: 'Ton / Metric Ton', abbreviation: 'ton', isStandard: true },
        { id: 'bag', name: 'Bags (50 kg)', abbreviation: 'bag', isStandard: true },
        { id: 'sqf', name: 'Square Feet', abbreviation: 'sqf', isStandard: true },
        { id: 'cft', name: 'Cubic Feet', abbreviation: 'cft', isStandard: true },
        { id: 'qtl', name: 'Quintal', abbreviation: 'qtl', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
      ],
      products: [
        { id: 'grade', label: 'Grade / Specification (e.g. Fe 550D, OPC 53)', type: 'text', group: 'specifications' },
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
      ],
      billing: [{ id: 'grade', label: 'Grade', type: 'text', visible: true }],
      reports: ['sales_summary', 'stock_summary', 'vehicle_dispatch_log'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [5, 18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: false, autoGenerate: false, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 24. Electrical
  electrical: {
    id: 'electrical',
    name: 'Electrical Supplies',
    subcategories: ['Cables & Wires', 'Switches & Sockets', 'LED Lighting', 'Switchgears & MCB', 'Fans & Motors', 'Conduit Pipes'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'accounting', 'reports'],
    terminology: { product: 'Electrical Good', client: 'Electrician / Customer', supplier: 'Distributor', invoice: 'Tax Invoice' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'low_stock', 'customer_outstanding'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'mtr', name: 'Meters', abbreviation: 'mtr', isStandard: true },
        { id: 'coil', name: 'Coil (90m)', abbreviation: 'coil', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
      ],
      products: [
        { id: 'gauge_core', label: 'Wire Gauge / Core / Spec', type: 'text', group: 'specifications' },
        { id: 'brand', label: 'Brand', type: 'text', group: 'basic' },
      ],
      billing: [{ id: 'gauge_core', label: 'Spec', type: 'text', visible: true }],
      reports: ['sales_summary', 'stock_summary'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: false, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 25. Cosmetics
  cosmetics: {
    id: 'cosmetics',
    name: 'Cosmetics & Personal Care',
    subcategories: ['Skincare', 'Haircare', 'Makeup Products', 'Fragrances & Perfumes', 'Personal Hygiene', 'Organic Cosmetics'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'accounting', 'reports'],
    terminology: { product: 'Beauty Product', client: 'Customer', supplier: 'Distributor', invoice: 'Cosmetics Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'expiry_alerts', 'low_stock'],
      measurements: [
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
        { id: 'box', name: 'Box', abbreviation: 'box', isStandard: true },
        { id: 'ml', name: 'Millilitre', abbreviation: 'ml', isStandard: true },
        { id: 'g', name: 'Gram', abbreviation: 'g', isStandard: true },
      ],
      products: [
        { id: 'shade_color', label: 'Shade / Color Variant', type: 'text', group: 'specifications' },
        { id: 'batch_no', label: 'Batch Number', type: 'text', group: 'inventory' },
        { id: 'expiry_date', label: 'Expiry Date', type: 'text', group: 'inventory' },
        { id: 'mrp', label: 'MRP', type: 'number', group: 'pricing' },
      ],
      billing: [
        { id: 'shade_color', label: 'Shade', type: 'text', visible: true },
        { id: 'mrp', label: 'MRP', type: 'number', visible: true },
      ],
      reports: ['expiry_report', 'sales_summary', 'stock_summary'],
      gstBehavior: { defaultGstRate: 18, allowedRates: [18, 28], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'ean13' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },

  // 26. Agriculture / Fertilizer / Seeds
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture / Fertilizer / Seeds',
    subcategories: ['Hybrid Seeds', 'Chemical Fertilizers', 'Bio Fertilizers & Pesticides', 'Agricultural Implements', 'Animal Feed', 'Drip Irrigation'],
    enabledModules: ['inventory', 'sales', 'purchases', 'barcodes', 'batches', 'accounting', 'reports'],
    terminology: { product: 'Agri Product', client: 'Farmer / Grower', supplier: 'Agri Manufacturer', invoice: 'Agri Bill' },
    features: {
      dashboard: ['total_sales', 'today_sales', 'stock_value', 'expiry_alerts', 'customer_outstanding', 'low_stock'],
      measurements: [
        { id: 'kg', name: 'Kilogram', abbreviation: 'kg', isStandard: true },
        { id: 'bag', name: 'Bag (50 kg)', abbreviation: 'bag', isStandard: true },
        { id: 'qtl', name: 'Quintal', abbreviation: 'qtl', isStandard: true },
        { id: 'l', name: 'Litre', abbreviation: 'L', isStandard: true },
        { id: 'ml', name: 'Millilitre', abbreviation: 'ml', isStandard: true },
        { id: 'pcs', name: 'Pieces', abbreviation: 'pcs', isStandard: true },
      ],
      products: [
        { id: 'batch_lot_no', label: 'Lot / Batch Number', type: 'text', group: 'inventory' },
        { id: 'expiry_date', label: 'Expiry Date', type: 'text', group: 'inventory' },
        { id: 'germination_pct', label: 'Germination % / Purity', type: 'text', group: 'specifications' },
        { id: 'license_no', label: 'Insecticide / Seed License No', type: 'text', group: 'specifications' },
      ],
      billing: [
        { id: 'batch_lot_no', label: 'Lot No', type: 'text', visible: true },
        { id: 'expiry_date', label: 'Expiry', type: 'text', visible: true },
      ],
      reports: ['batch_wise_stock', 'expiry_report', 'sales_summary'],
      gstBehavior: { defaultGstRate: 5, allowedRates: [0, 5, 12, 18], isCompositionAllowed: true },
      barcodeSupport: { enabled: true, autoGenerate: true, defaultFormat: 'code128' },
      inventoryBehavior: { trackStock: true, trackBatches: true, trackSerials: false, allowNegativeStock: false },
    },
  },
}

// ── BACKWARD-COMPATIBLE ALIASES ────────────────────────────────
CATEGORY_CONFIGS['jewelry'] = CATEGORY_CONFIGS['jewellery']
CATEGORY_CONFIGS['medical'] = CATEGORY_CONFIGS['pharmacy']
CATEGORY_CONFIGS['clothing'] = CATEGORY_CONFIGS['clothing_garments']
CATEGORY_CONFIGS['freelancer'] = CATEGORY_CONFIGS['services']

/**
 * Universal resolution function to map any business type, category string,
 * or raw keyword to one of the 26 canonical CategoryConfig models.
 */
export function resolveBaseCategory(businessType?: string | null, businessCategory?: string | null): string {
  const t = (businessType || '').toLowerCase().trim()
  const c = (businessCategory || '').toLowerCase().trim()
  const text = `${t} ${c}`

  if (text.includes('jewel') || text.includes('gold') || text.includes('silver') || text.includes('bullion')) return 'jewellery'
  if (text.includes('pharma') || text.includes('medic') || text.includes('clinic') || text.includes('drug') || text.includes('hospital')) return 'pharmacy'
  if (text.includes('supermarket') || text.includes('hypermarket') || text.includes('mart')) return 'supermarket'
  if (text.includes('grocer') || text.includes('kirana') || text.includes('fmcg') || text.includes('daily need')) return 'grocery'
  if (text.includes('bakery') || text.includes('cake') || text.includes('pastry') || text.includes('confection')) return 'bakery'
  if (text.includes('cafe') || text.includes('café') || text.includes('coffee') || text.includes('bistro')) return 'cafe'
  if (text.includes('restaur') || text.includes('dhaba') || text.includes('cater') || text.includes('food')) return 'restaurant'
  if (text.includes('hotel') || text.includes('resort') || text.includes('hospitality') || text.includes('lodge') || text.includes('guest house')) return 'hotel_hospitality'
  if (text.includes('mobile') || text.includes('cell') || text.includes('smartphone')) return 'mobile_accessories'
  if (text.includes('electron') || text.includes('appliance') || text.includes('cctv') || text.includes('computer')) return 'electronics'
  if (text.includes('cloth') || text.includes('garment') || text.includes('apparel') || text.includes('textile') || text.includes('suit')) return 'clothing_garments'
  if (text.includes('footwear') || text.includes('shoe') || text.includes('sandal') || text.includes('slipper')) return 'footwear'
  if (text.includes('hardware') || text.includes('tool') || text.includes('fastener') || text.includes('sanitary')) return 'hardware'
  if (text.includes('distribut') || text.includes('c&f') || text.includes('stockist')) return 'distributor'
  if (text.includes('wholesale')) return 'wholesale'
  if (text.includes('auto') || text.includes('motor') || text.includes('vehicle') || text.includes('garage') || text.includes('workshop') || text.includes('spare')) return 'automobile'
  if (text.includes('salon') || text.includes('spa ') || text.includes(' spa') || text.includes('parlour') || text.includes('beauty')) return 'salon_spa'
  if (text.includes('furnitur') || text.includes('interior') || text.includes('decor')) return 'furniture'
  if (text.includes('stationer') || text.includes('book') || text.includes('paper') || text.includes('publish')) return 'stationery_books'
  if (text.includes('construct') || text.includes('cement') || text.includes('brick') || text.includes('building material') || text.includes('steel bar')) return 'construction_materials'
  if (text.includes('electric') || text.includes('wire') || text.includes('switch') || text.includes('cable') || text.includes('light')) return 'electrical'
  if (text.includes('cosmetic') || text.includes('perfume') || text.includes('skincare') || text.includes('personal care')) return 'cosmetics'
  if (text.includes('agri') || text.includes('fertiliz') || text.includes('seed') || text.includes('pesticid') || text.includes('farmer')) return 'agriculture'
  if (text.includes('service') || text.includes('consult') || text.includes('freelanc') || text.includes('it ') || text.includes('legal') || text.includes('account')) return 'services'

  return 'retail'
}

/**
 * Returns CategoryConfig for a given key, falling back cleanly to 'retail' if unknown.
 */
export function getCategoryConfig(categoryKey?: string | null): CategoryConfig {
  const resolved = resolveBaseCategory('', categoryKey)
  return CATEGORY_CONFIGS[resolved] || CATEGORY_CONFIGS['retail']
}
