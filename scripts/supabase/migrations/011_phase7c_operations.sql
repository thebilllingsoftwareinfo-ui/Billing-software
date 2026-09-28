-- ============================================================
-- Migration 011: Phase 7C Sales & Purchase Operations Enhancement
-- Sales Orders, Proforma Invoices, Delivery Challans & Purchase Orders
-- ============================================================

-- 1. SALES ORDERS
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled')),
    
    -- Monetary & Tax summary
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    place_of_supply TEXT,
    notes TEXT,
    terms TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_org ON sales_orders(organization_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_cust ON sales_orders(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_orders_org_number ON sales_orders(organization_id, order_number);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    fulfilled_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    hsn_sac TEXT,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    is_gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);

-- 2. PROFORMA INVOICES
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    proforma_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    proforma_date DATE NOT NULL,
    expiry_date DATE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'converted', 'cancelled')),
    
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    place_of_supply TEXT,
    notes TEXT,
    terms TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proforma_invoices_org ON proforma_invoices(organization_id, proforma_date DESC);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_cust ON proforma_invoices(organization_id, customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_proforma_invoices_org_number ON proforma_invoices(organization_id, proforma_number);

CREATE TABLE IF NOT EXISTS proforma_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    hsn_sac TEXT,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    is_gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_proforma_items_inv ON proforma_invoice_items(proforma_invoice_id);

-- 3. DELIVERY CHALLANS
CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    challan_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    challan_date DATE NOT NULL,
    challan_type TEXT NOT NULL DEFAULT 'removal_for_sale' CHECK (challan_type IN ('supply_on_approval', 'for_job_work', 'removal_for_sale', 'other')),
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dispatched', 'delivered', 'invoiced', 'cancelled')),
    
    vehicle_number TEXT,
    transporter_name TEXT,
    delivery_address TEXT,
    
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_challans_org ON delivery_challans(organization_id, challan_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_cust ON delivery_challans(organization_id, customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_challans_org_number ON delivery_challans(organization_id, challan_number);

CREATE TABLE IF NOT EXISTS delivery_challan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    invoiced_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hsn_sac TEXT,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_challan_items_dc ON delivery_challan_items(delivery_challan_id);

-- 4. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    converted_bill_id UUID REFERENCES purchase_bills(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_received', 'received', 'cancelled')),
    
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    notes TEXT,
    terms TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supp ON purchase_orders(organization_id, supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_org_number ON purchase_orders(organization_id, po_number);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    received_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    hsn_sac TEXT,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    is_gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);

-- Enable RLS across all 4 operational documents
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_orders_tenant_isolation" ON sales_orders
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "sales_order_items_tenant_isolation" ON sales_order_items
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "proforma_invoices_tenant_isolation" ON proforma_invoices
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "proforma_invoice_items_tenant_isolation" ON proforma_invoice_items
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "delivery_challans_tenant_isolation" ON delivery_challans
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "delivery_challan_items_tenant_isolation" ON delivery_challan_items
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "purchase_orders_tenant_isolation" ON purchase_orders
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "purchase_order_items_tenant_isolation" ON purchase_order_items
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);
