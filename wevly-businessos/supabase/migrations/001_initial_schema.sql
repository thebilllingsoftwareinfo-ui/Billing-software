-- ============================================================
-- Migration: 001_initial_schema.sql
-- WEVLY BUSINESSOS — Full database schema
-- All monetary values stored as BIGINT (paise)
-- RLS enabled on every table
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  gstin                 TEXT,
  pan                   TEXT,
  address               JSONB,
  logo_url              TEXT,
  currency              TEXT NOT NULL DEFAULT 'INR',
  financial_year_start  TEXT NOT NULL DEFAULT '04-01',
  invoice_prefix        TEXT NOT NULL DEFAULT 'INV',
  invoice_sequence      INTEGER NOT NULL DEFAULT 1,
  quotation_prefix      TEXT NOT NULL DEFAULT 'QUO',
  quotation_sequence    INTEGER NOT NULL DEFAULT 1,
  po_prefix             TEXT NOT NULL DEFAULT 'PO',
  po_sequence           INTEGER NOT NULL DEFAULT 1,
  state_code            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE organization_members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role              TEXT NOT NULL DEFAULT 'staff'
                    CHECK (role IN ('owner', 'admin', 'manager', 'accountant', 'staff')),
  invited_email     TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'invited', 'suspended')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);

CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE organization_settings (
  organization_id         UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_template        TEXT NOT NULL DEFAULT 'default',
  default_payment_terms   INTEGER NOT NULL DEFAULT 30,
  default_gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 18,
  timezone                TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  date_format             TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  auto_send_invoices      BOOLEAN NOT NULL DEFAULT FALSE,
  low_stock_threshold     INTEGER NOT NULL DEFAULT 5,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  gstin                 TEXT,
  pan                   TEXT,
  state_code            TEXT,
  billing_address       JSONB,
  shipping_address      JSONB,
  credit_limit_paise    BIGINT NOT NULL DEFAULT 0,
  outstanding_paise     BIGINT NOT NULL DEFAULT 0,
  notes                 TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_org_id ON customers(organization_id);
CREATE INDEX idx_customers_name ON customers(organization_id, name);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  gstin             TEXT,
  pan               TEXT,
  state_code        TEXT,
  address           JSONB,
  payment_terms     INTEGER DEFAULT 30,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_org_id ON suppliers(organization_id);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PRODUCTS & INVENTORY
-- ============================================================

CREATE TABLE product_categories (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  parent_id         UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_categories_org_id ON product_categories(organization_id);

CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id             UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name                    TEXT NOT NULL,
  description             TEXT,
  sku                     TEXT,
  hsn_sac                 TEXT,
  unit                    TEXT NOT NULL DEFAULT 'pcs',
  is_service              BOOLEAN NOT NULL DEFAULT FALSE,
  sale_price_paise        BIGINT NOT NULL DEFAULT 0,
  purchase_price_paise    BIGINT NOT NULL DEFAULT 0,
  gst_rate                NUMERIC(5,2) NOT NULL DEFAULT 18
                          CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  gst_type                TEXT NOT NULL DEFAULT 'exclusive'
                          CHECK (gst_type IN ('inclusive', 'exclusive')),
  track_inventory         BOOLEAN NOT NULL DEFAULT TRUE,
  min_stock_level         INTEGER NOT NULL DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_org_id ON products(organization_id);
CREATE INDEX idx_products_sku ON products(organization_id, sku);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE stock_movements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type     TEXT NOT NULL
                    CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'opening')),
  reference_type    TEXT CHECK (reference_type IN ('invoice', 'purchase_order', 'purchase_bill', 'adjustment', NULL)),
  reference_id      UUID,
  quantity          NUMERIC(12,4) NOT NULL,  -- positive = stock in, negative = stock out
  unit_cost_paise   BIGINT,
  running_balance   NUMERIC(12,4),           -- computed by trigger
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- View: current stock levels
CREATE OR REPLACE VIEW stock_on_hand AS
SELECT
  organization_id,
  product_id,
  SUM(quantity) AS current_stock
FROM stock_movements
GROUP BY organization_id, product_id;

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number      TEXT NOT NULL,
  invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'void', 'cancelled')),
  place_of_supply     TEXT,
  is_inter_state      BOOLEAN NOT NULL DEFAULT FALSE,
  currency            TEXT NOT NULL DEFAULT 'INR',
  exchange_rate       NUMERIC(10,6) NOT NULL DEFAULT 1,
  subtotal_paise      BIGINT NOT NULL DEFAULT 0,
  discount_paise      BIGINT NOT NULL DEFAULT 0,
  taxable_paise       BIGINT NOT NULL DEFAULT 0,
  cgst_paise          BIGINT NOT NULL DEFAULT 0,
  sgst_paise          BIGINT NOT NULL DEFAULT 0,
  igst_paise          BIGINT NOT NULL DEFAULT 0,
  cess_paise          BIGINT NOT NULL DEFAULT 0,
  total_paise         BIGINT NOT NULL DEFAULT 0,
  paid_paise          BIGINT NOT NULL DEFAULT 0,
  balance_paise       BIGINT GENERATED ALWAYS AS (total_paise - paid_paise) STORED,
  notes               TEXT,
  terms               TEXT,
  is_void             BOOLEAN NOT NULL DEFAULT FALSE,
  finalized_at        TIMESTAMPTZ,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_date ON invoices(organization_id, invoice_date DESC);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE invoice_line_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id            UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit                  TEXT,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  discount_pct          NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_subtotal_paise   BIGINT NOT NULL DEFAULT 0,
  hsn_sac               TEXT,
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_type              TEXT NOT NULL DEFAULT 'exclusive',
  cgst_paise            BIGINT NOT NULL DEFAULT 0,
  sgst_paise            BIGINT NOT NULL DEFAULT 0,
  igst_paise            BIGINT NOT NULL DEFAULT 0,
  line_total_paise      BIGINT NOT NULL DEFAULT 0,
  sort_order            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_items_invoice ON invoice_line_items(invoice_id);

-- ============================================================
-- QUOTATIONS
-- ============================================================

CREATE TABLE quotations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  quotation_number      TEXT NOT NULL,
  quotation_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until           DATE,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  converted_invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  subtotal_paise        BIGINT NOT NULL DEFAULT 0,
  discount_paise        BIGINT NOT NULL DEFAULT 0,
  taxable_paise         BIGINT NOT NULL DEFAULT 0,
  cgst_paise            BIGINT NOT NULL DEFAULT 0,
  sgst_paise            BIGINT NOT NULL DEFAULT 0,
  igst_paise            BIGINT NOT NULL DEFAULT 0,
  total_paise           BIGINT NOT NULL DEFAULT 0,
  notes                 TEXT,
  terms                 TEXT,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, quotation_number)
);

CREATE INDEX idx_quotations_org_id ON quotations(organization_id);

CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE quotation_line_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id          UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit                  TEXT,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  discount_pct          NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_subtotal_paise   BIGINT NOT NULL DEFAULT 0,
  hsn_sac               TEXT,
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_type              TEXT NOT NULL DEFAULT 'exclusive',
  cgst_paise            BIGINT NOT NULL DEFAULT 0,
  sgst_paise            BIGINT NOT NULL DEFAULT 0,
  igst_paise            BIGINT NOT NULL DEFAULT 0,
  line_total_paise      BIGINT NOT NULL DEFAULT 0,
  sort_order            INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paise      BIGINT NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'upi', 'neft', 'rtgs', 'cheque', 'card', 'other')),
  reference_number  TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_org_id ON payments(organization_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE payment_allocations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  allocated_paise BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id, invoice_id)
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice ON payment_allocations(invoice_id);

-- ============================================================
-- PURCHASES
-- ============================================================

CREATE TABLE purchase_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  po_number         TEXT NOT NULL,
  po_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date     DATE,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'received', 'partial', 'cancelled')),
  subtotal_paise    BIGINT NOT NULL DEFAULT 0,
  taxable_paise     BIGINT NOT NULL DEFAULT 0,
  cgst_paise        BIGINT NOT NULL DEFAULT 0,
  sgst_paise        BIGINT NOT NULL DEFAULT 0,
  igst_paise        BIGINT NOT NULL DEFAULT 0,
  total_paise       BIGINT NOT NULL DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, po_number)
);

CREATE INDEX idx_purchase_orders_org_id ON purchase_orders(organization_id);

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE purchase_order_line_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit                  TEXT,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  line_total_paise      BIGINT NOT NULL DEFAULT 0,
  received_quantity     NUMERIC(12,4) NOT NULL DEFAULT 0,
  sort_order            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE purchase_bills (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_order_id   UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  bill_number         TEXT,
  bill_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'approved', 'paid', 'partial', 'overdue')),
  subtotal_paise      BIGINT NOT NULL DEFAULT 0,
  taxable_paise       BIGINT NOT NULL DEFAULT 0,
  cgst_paise          BIGINT NOT NULL DEFAULT 0,
  sgst_paise          BIGINT NOT NULL DEFAULT 0,
  igst_paise          BIGINT NOT NULL DEFAULT 0,
  total_paise         BIGINT NOT NULL DEFAULT 0,
  paid_paise          BIGINT NOT NULL DEFAULT 0,
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_bills_org_id ON purchase_bills(organization_id);

CREATE TRIGGER purchase_bills_updated_at
  BEFORE UPDATE ON purchase_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expense_categories (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  parent_id         UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_categories_org ON expense_categories(organization_id);

CREATE TABLE expenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  expense_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paise      BIGINT NOT NULL,
  gst_paise         BIGINT NOT NULL DEFAULT 0,
  vendor_name       TEXT,
  description       TEXT,
  payment_method    TEXT DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'upi', 'neft', 'rtgs', 'cheque', 'card', 'other')),
  reference_number  TEXT,
  receipt_url       TEXT,
  is_void           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_org_id ON expenses(organization_id);
CREATE INDEX idx_expenses_date ON expenses(organization_id, expense_date DESC);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  resource_type     TEXT NOT NULL,
  resource_id       UUID NOT NULL,
  old_values        JSONB,
  new_values        JSONB,
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(organization_id, resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(organization_id, created_at DESC);

-- Audit logs are NEVER deleted or updated — append-only
ALTER TABLE audit_logs REPLICA IDENTITY FULL;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  reference_type    TEXT,
  reference_id      UUID,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper function: get current user's organization IDs
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
  AND status = 'active'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ---- Organizations -----------------------------------------
CREATE POLICY "org_members_can_view_org" ON organizations
  FOR SELECT USING (id IN (SELECT get_my_org_ids()));

CREATE POLICY "org_owners_can_update_org" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- ---- Organization Members ----------------------------------
CREATE POLICY "members_can_view_org_members" ON organization_members
  FOR SELECT USING (organization_id IN (SELECT get_my_org_ids()));

CREATE POLICY "owners_admins_can_manage_members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- ---- Standard org-scoped policy macro ----------------------
-- Applied to: customers, suppliers, products, product_categories,
--             stock_movements, invoices, invoice_line_items,
--             quotations, quotation_line_items, payments,
--             payment_allocations, purchase_orders,
--             purchase_order_line_items, purchase_bills,
--             expenses, expense_categories, audit_logs,
--             notifications, organization_settings

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'customers', 'suppliers', 'product_categories', 'products',
    'stock_movements', 'invoices', 'invoice_line_items',
    'quotations', 'quotation_line_items', 'payments',
    'payment_allocations', 'purchase_orders',
    'purchase_order_line_items', 'purchase_bills',
    'expense_categories', 'expenses', 'audit_logs',
    'notifications', 'organization_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "org_isolation_%s" ON %I
       FOR ALL
       USING (organization_id IN (SELECT get_my_org_ids()))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- INDEXES for performance
-- ============================================================

-- Composite indexes for common dashboard queries
CREATE INDEX idx_invoices_org_status_date
  ON invoices(organization_id, status, invoice_date DESC);

CREATE INDEX idx_invoices_overdue
  ON invoices(organization_id, due_date)
  WHERE status NOT IN ('paid', 'void', 'cancelled');

CREATE INDEX idx_expenses_org_date_cat
  ON expenses(organization_id, expense_date DESC, category_id);

-- ============================================================
-- SEQUENCES for invoice/quotation numbering
-- (advisory lock on organizations.invoice_sequence used at app level)
-- ============================================================

-- NOTE: Invoice/quotation numbering is handled in application code
-- using a SELECT ... FOR UPDATE on the organizations row to prevent
-- concurrent duplicate numbers. See lib/services/invoice.service.ts

COMMENT ON TABLE audit_logs IS 'Append-only audit trail. Never DELETE or UPDATE rows.';
COMMENT ON TABLE stock_movements IS 'Append-only stock ledger. Never DELETE rows.';
COMMENT ON COLUMN invoices.balance_paise IS 'Computed: total_paise - paid_paise. Always use this column, do not calculate in application.';
