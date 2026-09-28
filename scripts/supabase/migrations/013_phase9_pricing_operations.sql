-- ============================================================
-- Migration 013: Phase 9 Advanced Pricing, Sales Operations,
-- Credit Management, Commissions & Recurring Invoices
-- ============================================================

-- 1. Price Lists Master
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  customer_group TEXT,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_price_lists_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_price_lists_org ON price_lists(organization_id);

-- 2. Price List Items (Product rates & quantity slabs)
CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit TEXT NOT NULL DEFAULT 'PCS',
  min_quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
  max_quantity NUMERIC(12, 4),
  fixed_price NUMERIC(15, 2),
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  discount_amount NUMERIC(15, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_price_list_quantities CHECK (max_quantity IS NULL OR max_quantity >= min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_price_list_items_lookup ON price_list_items(organization_id, price_list_id, product_id);

-- 3. Customer Special Pricing (Per-customer product negotiated rate)
CREATE TABLE IF NOT EXISTS customer_special_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_rate NUMERIC(15, 2) NOT NULL,
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  min_quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_special_prices UNIQUE (organization_id, customer_id, product_id, min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_customer_special_prices_lookup ON customer_special_prices(organization_id, customer_id, product_id);

-- 4. Promotional Rules
CREATE TABLE IF NOT EXISTS promotional_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('buy_x_get_y', 'percentage_discount', 'fixed_discount', 'bundle_rate')),
  buy_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  buy_quantity NUMERIC(12, 4) DEFAULT 1,
  get_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  get_quantity NUMERIC(12, 4) DEFAULT 0,
  discount_value NUMERIC(15, 2) DEFAULT 0,
  min_order_amount NUMERIC(15, 2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_usage_count INTEGER,
  current_usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_promotions_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promotions_org ON promotional_rules(organization_id);

-- 5. Supplier Purchase Pricing Master
CREATE TABLE IF NOT EXISTS supplier_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit TEXT NOT NULL DEFAULT 'PCS',
  purchase_rate NUMERIC(15, 2) NOT NULL,
  min_quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_supplier_product_minqty UNIQUE (organization_id, supplier_id, product_id, min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_supplier_pricing_lookup ON supplier_pricing(organization_id, supplier_id, product_id);

-- 6. Purchase Price History
CREATE TABLE IF NOT EXISTS purchase_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price NUMERIC(15, 2),
  new_price NUMERIC(15, 2) NOT NULL,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_price_history ON purchase_price_history(organization_id, product_id, supplier_id);

-- 7. Salespersons
CREATE TABLE IF NOT EXISTS salespersons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id UUID,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_salespersons_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salespersons_org ON salespersons(organization_id);

-- 8. Sales Commissions Ledger
CREATE TABLE IF NOT EXISTS sales_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  salesperson_id UUID NOT NULL REFERENCES salespersons(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sale_amount NUMERIC(15, 2) NOT NULL,
  commission_rate NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sales_commission_invoice UNIQUE (organization_id, salesperson_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_commissions_lookup ON sales_commissions(organization_id, salesperson_id, status);

-- 9. Recurring Invoices Master
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_due ON recurring_invoices(organization_id, status, next_run_date);

-- 10. Recurring Invoice Execution Logs
CREATE TABLE IF NOT EXISTS recurring_invoice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recurring_invoice_id UUID NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,
  generated_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  cycle_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recurring_cycle UNIQUE (recurring_invoice_id, cycle_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_logs ON recurring_invoice_logs(organization_id, recurring_invoice_id);

-- 11. Customer Table Enhancements for Phase 9
ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_salesperson_id UUID REFERENCES salespersons(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_status TEXT DEFAULT 'ok' CHECK (credit_status IN ('ok', 'near_limit', 'limit_exceeded', 'blocked'));

-- 12. Transaction Document Enhancements
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES salespersons(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_override_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_approved_by UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL;

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES salespersons(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL;

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES salespersons(id) ON DELETE SET NULL;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL;

ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES salespersons(id) ON DELETE SET NULL;

-- 13. Enable RLS and Tenant Isolation
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_special_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE salespersons ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for price_lists" ON price_lists
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for price_list_items" ON price_list_items
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for customer_special_prices" ON customer_special_prices
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for promotional_rules" ON promotional_rules
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for supplier_pricing" ON supplier_pricing
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for purchase_price_history" ON purchase_price_history
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for salespersons" ON salespersons
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for sales_commissions" ON sales_commissions
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for recurring_invoices" ON recurring_invoices
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for recurring_invoice_logs" ON recurring_invoice_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
