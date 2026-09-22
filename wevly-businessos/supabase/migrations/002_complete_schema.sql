-- ============================================================
-- Migration: 002_complete_schema.sql
-- WEVLY BUSINESSOS — Complete V1 MVP Schema
--
-- Design decisions:
--   • NUMERIC(15,2) for all monetary values — exact decimal, never FLOAT
--   • NUMERIC(12,4) for quantities — 4 decimal places for fractional units
--   • UUID primary keys on every table
--   • organization_id on every tenant-owned table (multi-tenant anchor)
--   • Append-only tables: inventory_movements, audit_logs, customer_transactions,
--     supplier_transactions (no updated_at, no DELETE)
--   • Soft-delete: products, customers, suppliers (archived_at)
--   • Hard-delete prevention: invoices (void workflow instead)
--   • Invoice/quotation numbers: TEXT UNIQUE per org (supports prefixes)
--   • GENERATED ALWAYS AS for derived financial columns
--   • CHECK constraints for all status/type enums
--   • Designed for future: multi-branch, multi-warehouse, TDS, ITC
-- ============================================================

-- Prerequisites: run as superuser or with sufficient privileges
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast trigram text search

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at on every mutation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS helper: returns set of org IDs the current user is an active member of
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS helper: returns the user's role in a specific organization
CREATE OR REPLACE FUNCTION get_my_role_in_org(org_id UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND status = 'active'
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS helper: checks if current user is owner or admin in an org
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- SECTION 1: TENANCY & USER MANAGEMENT
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: user_profiles
-- One row per auth.users entry. Extends Supabase auth.users
-- with app-level profile data.
-- ------------------------------------------------------------
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  date_format     TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_profiles IS
  'Application-level extension of auth.users. 1:1 with auth.users.';

-- ------------------------------------------------------------
-- TABLE: organizations
-- Core tenant entity. Every business-owned record references
-- this. Invoice/quotation sequences are managed here.
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL,
  legal_name                TEXT,
  gstin                     TEXT,
  pan                       TEXT,
  tan                       TEXT,
  cin                       TEXT,                          -- Company Identification Number
  msme_registration         TEXT,
  state_code                TEXT,                          -- 2-digit GST state code
  logo_url                  TEXT,
  currency                  TEXT NOT NULL DEFAULT 'INR',
  timezone                  TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  financial_year_start      TEXT NOT NULL DEFAULT '04-01', -- MM-DD format
  -- GST registration
  is_gst_registered         BOOLEAN NOT NULL DEFAULT FALSE,
  gst_scheme                TEXT NOT NULL DEFAULT 'regular'
                            CHECK (gst_scheme IN ('regular', 'composition', 'exempt')),
  -- Document numbering sequences (SELECT ... FOR UPDATE to prevent collision)
  invoice_prefix            TEXT NOT NULL DEFAULT 'INV',
  invoice_sequence          INTEGER NOT NULL DEFAULT 1,
  quotation_prefix          TEXT NOT NULL DEFAULT 'QUO',
  quotation_sequence        INTEGER NOT NULL DEFAULT 1,
  po_prefix                 TEXT NOT NULL DEFAULT 'PO',
  po_sequence               INTEGER NOT NULL DEFAULT 1,
  cn_prefix                 TEXT NOT NULL DEFAULT 'CN',     -- Credit Note
  cn_sequence               INTEGER NOT NULL DEFAULT 1,
  dn_prefix                 TEXT NOT NULL DEFAULT 'DN',     -- Debit Note
  dn_sequence               INTEGER NOT NULL DEFAULT 1,
  payment_prefix            TEXT NOT NULL DEFAULT 'PAY',
  payment_sequence          INTEGER NOT NULL DEFAULT 1,
  -- Future: multi-branch support anchor
  branch_count              INTEGER NOT NULL DEFAULT 1,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE organizations IS
  'Core tenant entity. All business data is scoped to an organization. '
  'Sequences are locked with SELECT FOR UPDATE during number generation.';
COMMENT ON COLUMN organizations.invoice_sequence IS
  'Auto-incremented per org. Lock the org row with SELECT FOR UPDATE before incrementing.';

-- ------------------------------------------------------------
-- TABLE: organization_members
-- Links users to organizations with role-based access.
-- Supports future multi-permission system via permissions JSONB.
-- ------------------------------------------------------------
CREATE TABLE organization_members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role              TEXT NOT NULL DEFAULT 'staff'
                    CHECK (role IN ('owner', 'admin', 'manager', 'accountant', 'staff', 'viewer')),
  permissions       JSONB,                                 -- Granular overrides on top of role
  invited_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email     TEXT,                                  -- Non-null when invitation pending
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'invited', 'suspended', 'removed')),
  joined_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user_id     ON organization_members(user_id);
CREATE INDEX idx_org_members_org_status  ON organization_members(organization_id, status);

CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE organization_members IS
  'Maps users to organizations with RBAC roles. permissions JSONB enables '
  'granular overrides beyond the base role for future fine-grained ACL.';

-- ------------------------------------------------------------
-- TABLE: business_profiles
-- Extended business details beyond what fits in organizations.
-- Banking, branding, legal identity. 1:1 with organizations for V1.
-- ------------------------------------------------------------
CREATE TABLE business_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  trade_name            TEXT,
  business_type         TEXT NOT NULL DEFAULT 'proprietorship'
                        CHECK (business_type IN (
                          'proprietorship', 'partnership', 'llp',
                          'private_limited', 'public_limited', 'huf', 'trust', 'society', 'other'
                        )),
  incorporation_date    DATE,
  -- Banking
  bank_name             TEXT,
  bank_account_name     TEXT,
  bank_account_number   TEXT,
  bank_ifsc             TEXT,
  bank_branch           TEXT,
  -- Digital payments
  upi_id                TEXT,
  -- Branding
  signature_url         TEXT,
  stamp_url             TEXT,
  -- Invoice defaults
  default_invoice_notes TEXT,
  default_invoice_terms TEXT,
  -- Address
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT,
  state                 TEXT,
  pincode               TEXT,
  country               TEXT NOT NULL DEFAULT 'India',
  phone                 TEXT,
  email                 TEXT,
  website               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE business_profiles IS
  '1:1 extension of organizations for banking, branding, and legal details. '
  'Designed for 1:N when multi-branch support is added.';

-- ============================================================
-- SECTION 2: CUSTOMERS
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: customers
-- ------------------------------------------------------------
CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL,
  legal_name            TEXT,
  customer_type         TEXT NOT NULL DEFAULT 'business'
                        CHECK (customer_type IN ('individual', 'business')),
  email                 TEXT,
  phone                 TEXT,
  mobile                TEXT,
  gstin                 TEXT,                              -- Validated at application level
  pan                   TEXT,
  place_of_supply       TEXT,                              -- Default state code for GST
  is_gst_registered     BOOLEAN NOT NULL DEFAULT FALSE,
  credit_period_days    INTEGER NOT NULL DEFAULT 30,
  credit_limit          NUMERIC(15,2) NOT NULL DEFAULT 0,
  outstanding_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Denormalized, updated by trigger
  notes                 TEXT,
  custom_fields         JSONB,
  tags                  TEXT[],
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at           TIMESTAMPTZ,                       -- Soft-delete
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_org            ON customers(organization_id);
CREATE INDEX idx_customers_org_active     ON customers(organization_id, is_active);
CREATE INDEX idx_customers_gstin          ON customers(organization_id, gstin) WHERE gstin IS NOT NULL;
CREATE INDEX idx_customers_name_trgm      ON customers USING gin(display_name gin_trgm_ops);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN customers.outstanding_balance IS
  'Denormalized for performance. Recomputed from customer_transactions on reconciliation. '
  'Positive = customer owes money. Negative = credit balance.';
COMMENT ON COLUMN customers.archived_at IS
  'Soft-delete. Archived customers remain visible in historical records.';

-- ------------------------------------------------------------
-- TABLE: customer_addresses
-- Multiple addresses per customer (billing, shipping).
-- ------------------------------------------------------------
CREATE TABLE customer_addresses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_type      TEXT NOT NULL DEFAULT 'billing'
                    CHECK (address_type IN ('billing', 'shipping', 'both')),
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  contact_name      TEXT,
  line1             TEXT NOT NULL,
  line2             TEXT,
  city              TEXT NOT NULL,
  state             TEXT NOT NULL,
  state_code        TEXT,
  pincode           TEXT,
  country           TEXT NOT NULL DEFAULT 'India',
  phone             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);

CREATE TRIGGER customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- TABLE: customer_transactions
-- APPEND-ONLY ledger. Records every debit/credit against a customer.
-- Used to compute outstanding_balance and generate customer statements.
-- Never update or delete rows — use reversal entries.
-- ------------------------------------------------------------
CREATE TABLE customer_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  transaction_type  TEXT NOT NULL
                    CHECK (transaction_type IN (
                      'invoice', 'payment', 'credit_note', 'debit_note',
                      'advance', 'refund', 'adjustment', 'opening_balance'
                    )),
  reference_type    TEXT,
  reference_id      UUID,
  reference_number  TEXT,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  amount            NUMERIC(15,2) NOT NULL,                -- Positive = debit (owes us), Negative = credit (we owe)
  running_balance   NUMERIC(15,2),                         -- Balance after this entry (updated on insert)
  narration         TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — append-only ledger
);

CREATE INDEX idx_cust_txn_customer   ON customer_transactions(customer_id, created_at DESC);
CREATE INDEX idx_cust_txn_org        ON customer_transactions(organization_id, transaction_date DESC);
CREATE INDEX idx_cust_txn_reference  ON customer_transactions(reference_type, reference_id);

COMMENT ON TABLE customer_transactions IS
  'Append-only double-entry ledger for customer balances. '
  'Never DELETE or UPDATE rows. Use reversal entries to correct mistakes.';

-- ============================================================
-- SECTION 3: SUPPLIERS
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: suppliers
-- ------------------------------------------------------------
CREATE TABLE suppliers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL,
  legal_name            TEXT,
  supplier_type         TEXT NOT NULL DEFAULT 'business'
                        CHECK (supplier_type IN ('individual', 'business')),
  email                 TEXT,
  phone                 TEXT,
  mobile                TEXT,
  gstin                 TEXT,
  pan                   TEXT,
  place_of_supply       TEXT,
  is_gst_registered     BOOLEAN NOT NULL DEFAULT FALSE,
  credit_period_days    INTEGER NOT NULL DEFAULT 30,
  outstanding_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Amount we owe supplier
  notes                 TEXT,
  tags                  TEXT[],
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at           TIMESTAMPTZ,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_org         ON suppliers(organization_id);
CREATE INDEX idx_suppliers_org_active  ON suppliers(organization_id, is_active);
CREATE INDEX idx_suppliers_gstin       ON suppliers(organization_id, gstin) WHERE gstin IS NOT NULL;
CREATE INDEX idx_suppliers_name_trgm   ON suppliers USING gin(display_name gin_trgm_ops);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- TABLE: supplier_addresses
-- ------------------------------------------------------------
CREATE TABLE supplier_addresses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  address_type      TEXT NOT NULL DEFAULT 'billing'
                    CHECK (address_type IN ('billing', 'shipping', 'both')),
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  contact_name      TEXT,
  line1             TEXT NOT NULL,
  line2             TEXT,
  city              TEXT NOT NULL,
  state             TEXT NOT NULL,
  state_code        TEXT,
  pincode           TEXT,
  country           TEXT NOT NULL DEFAULT 'India',
  phone             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_addresses_supplier ON supplier_addresses(supplier_id);

CREATE TRIGGER supplier_addresses_updated_at
  BEFORE UPDATE ON supplier_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- TABLE: supplier_transactions — Append-only ledger
-- ------------------------------------------------------------
CREATE TABLE supplier_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  transaction_type  TEXT NOT NULL
                    CHECK (transaction_type IN (
                      'purchase_bill', 'payment', 'debit_note', 'credit_note',
                      'advance', 'refund', 'adjustment', 'opening_balance'
                    )),
  reference_type    TEXT,
  reference_id      UUID,
  reference_number  TEXT,
  transaction_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  amount            NUMERIC(15,2) NOT NULL,                -- Positive = we owe supplier, Negative = supplier credit
  running_balance   NUMERIC(15,2),
  narration         TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supp_txn_supplier   ON supplier_transactions(supplier_id, created_at DESC);
CREATE INDEX idx_supp_txn_org        ON supplier_transactions(organization_id, transaction_date DESC);

COMMENT ON TABLE supplier_transactions IS 'Append-only ledger for supplier payables. Never DELETE or UPDATE.';

-- ============================================================
-- SECTION 4: PRODUCTS & CATALOGUE
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: product_units
-- Both system-wide units (NULL org) and custom org units.
-- ------------------------------------------------------------
CREATE TABLE product_units (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system global
  name              TEXT NOT NULL,
  abbreviation      TEXT NOT NULL,
  is_system         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, abbreviation)
);

-- System units seed (organization_id = NULL)
INSERT INTO product_units (id, name, abbreviation, is_system) VALUES
  (uuid_generate_v4(), 'Pieces',      'pcs',  TRUE),
  (uuid_generate_v4(), 'Kilograms',   'kg',   TRUE),
  (uuid_generate_v4(), 'Grams',       'g',    TRUE),
  (uuid_generate_v4(), 'Milligrams',  'mg',   TRUE),
  (uuid_generate_v4(), 'Litres',      'l',    TRUE),
  (uuid_generate_v4(), 'Millilitres', 'ml',   TRUE),
  (uuid_generate_v4(), 'Metres',      'm',    TRUE),
  (uuid_generate_v4(), 'Centimetres', 'cm',   TRUE),
  (uuid_generate_v4(), 'Box',         'box',  TRUE),
  (uuid_generate_v4(), 'Pack',        'pack', TRUE),
  (uuid_generate_v4(), 'Set',         'set',  TRUE),
  (uuid_generate_v4(), 'Pair',        'pair', TRUE),
  (uuid_generate_v4(), 'Dozen',       'doz',  TRUE),
  (uuid_generate_v4(), 'Square Feet', 'sqft', TRUE),
  (uuid_generate_v4(), 'Square Metre','sqm',  TRUE),
  (uuid_generate_v4(), 'Hours',       'hr',   TRUE),
  (uuid_generate_v4(), 'Days',        'day',  TRUE),
  (uuid_generate_v4(), 'Months',      'mo',   TRUE),
  (uuid_generate_v4(), 'Years',       'yr',   TRUE);

-- ------------------------------------------------------------
-- TABLE: product_categories
-- Hierarchical categories (self-referencing). Max 2 levels for V1.
-- ------------------------------------------------------------
CREATE TABLE product_categories (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  parent_id         UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name, parent_id)
);

CREATE INDEX idx_product_categories_org ON product_categories(organization_id);

CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- TABLE: products
-- Both goods and services. Services don't track inventory.
-- ------------------------------------------------------------
CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  unit_id               UUID REFERENCES product_units(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  sku                   TEXT,                              -- Unique per org (enforced below)
  barcode               TEXT,
  hsn_sac_code          TEXT,                             -- HSN for goods, SAC for services
  product_type          TEXT NOT NULL DEFAULT 'goods'
                        CHECK (product_type IN ('goods', 'service')),
  -- Pricing
  sale_price            NUMERIC(15,2) NOT NULL DEFAULT 0,
  purchase_price        NUMERIC(15,2) NOT NULL DEFAULT 0,
  mrp                   NUMERIC(15,2),
  min_sale_price        NUMERIC(15,2),
  -- Tax
  is_taxable            BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 18
                        CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  cess_rate             NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_inclusive         BOOLEAN NOT NULL DEFAULT FALSE,   -- Price includes GST?
  -- Inventory
  track_inventory       BOOLEAN NOT NULL DEFAULT TRUE,
  min_stock_level       NUMERIC(12,4) NOT NULL DEFAULT 0,
  max_stock_level       NUMERIC(12,4),
  current_stock         NUMERIC(12,4) NOT NULL DEFAULT 0, -- Denormalized; updated by inventory trigger
  opening_stock         NUMERIC(12,4) NOT NULL DEFAULT 0,
  opening_stock_value   NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Meta
  image_url             TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at           TIMESTAMPTZ,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SKU uniqueness is org-scoped
CREATE UNIQUE INDEX idx_products_sku_org
  ON products(organization_id, sku)
  WHERE sku IS NOT NULL;

CREATE INDEX idx_products_org_active  ON products(organization_id, is_active);
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_name_trgm   ON products USING gin(name gin_trgm_ops);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN products.current_stock IS
  'Denormalized. Maintained by trigger on inventory_movements. '
  'Cross-check with SUM(quantity) FROM inventory_movements WHERE product_id = X.';
COMMENT ON COLUMN products.sku IS
  'Unique per organization. Use partial unique index to allow NULL SKUs.';

-- ============================================================
-- SECTION 5: INVENTORY
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: inventory_movements
-- IMMUTABLE append-only stock ledger.
-- One row per stock event. Never update or delete.
-- Source of truth for stock levels.
-- ------------------------------------------------------------
CREATE TABLE inventory_movements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type     TEXT NOT NULL
                    CHECK (movement_type IN (
                      'opening',        -- Opening stock entry
                      'purchase',       -- Stock received from supplier
                      'sale',           -- Stock dispatched on invoice
                      'return_in',      -- Customer returns (stock comes back)
                      'return_out',     -- Stock returned to supplier
                      'adjustment_in',  -- Positive stock adjustment
                      'adjustment_out', -- Negative stock adjustment / write-off
                      'transfer_in',    -- Future: inter-branch transfer (stock in)
                      'transfer_out',   -- Future: inter-branch transfer (stock out)
                      'damage',         -- Damaged goods
                      'production_in',  -- Future: manufactured goods
                      'production_out'  -- Future: raw material consumed
                    )),
  reference_type    TEXT
                    CHECK (reference_type IN (
                      'invoice', 'purchase_bill', 'stock_adjustment',
                      'credit_note', 'debit_note', 'manual', NULL
                    )),
  reference_id      UUID,
  reference_number  TEXT,
  movement_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity          NUMERIC(12,4) NOT NULL,               -- Positive = in, Negative = out
  unit_cost         NUMERIC(15,2),                        -- Cost at time of movement (FIFO basis)
  total_cost        NUMERIC(15,2),                        -- quantity × unit_cost
  running_balance   NUMERIC(12,4),                        -- Stock after this movement
  -- Future multi-branch
  branch_id         UUID,
  warehouse_id      UUID,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — IMMUTABLE
);

CREATE INDEX idx_inv_movements_product   ON inventory_movements(product_id, created_at DESC);
CREATE INDEX idx_inv_movements_org       ON inventory_movements(organization_id);
CREATE INDEX idx_inv_movements_date      ON inventory_movements(organization_id, movement_date DESC);
CREATE INDEX idx_inv_movements_reference ON inventory_movements(reference_type, reference_id);

COMMENT ON TABLE inventory_movements IS
  'Immutable stock ledger. Never UPDATE or DELETE. '
  'running_balance is maintained by application. '
  'Periodic reconciliation: SUM(quantity) should equal products.current_stock.';

-- Trigger: auto-update products.current_stock on each movement
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET current_stock = current_stock + NEW.quantity,
      updated_at    = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movements_update_stock
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- ------------------------------------------------------------
-- TABLE: stock_adjustments
-- Header record for a stock-take / adjustment event.
-- Line items create inventory_movement rows when approved.
-- ------------------------------------------------------------
CREATE TABLE stock_adjustments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  adjustment_number   TEXT NOT NULL,
  adjustment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  reason              TEXT NOT NULL
                      CHECK (reason IN (
                        'stocktake', 'damage', 'expiry', 'theft',
                        'production', 'opening', 'correction', 'other'
                      )),
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'approved', 'rejected')),
  approved_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, adjustment_number)
);

CREATE INDEX idx_stock_adjustments_org ON stock_adjustments(organization_id);

CREATE TRIGGER stock_adjustments_updated_at
  BEFORE UPDATE ON stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE stock_adjustment_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  adjustment_id       UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  expected_quantity   NUMERIC(12,4) NOT NULL DEFAULT 0,   -- System stock before adjustment
  actual_quantity     NUMERIC(12,4) NOT NULL DEFAULT 0,   -- Physical count
  difference          NUMERIC(12,4)
                      GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  unit_cost           NUMERIC(15,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_adj_items_adj ON stock_adjustment_items(adjustment_id);

-- ============================================================
-- SECTION 6: INVOICES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: invoices
-- Core sales document. Finalized invoices are immutable
-- (use void workflow, not DELETE/UPDATE of financial fields).
-- ------------------------------------------------------------
CREATE TABLE invoices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- Identity
  invoice_number        TEXT NOT NULL,
  invoice_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date              DATE,
  invoice_type          TEXT NOT NULL DEFAULT 'standard'
                        CHECK (invoice_type IN ('standard', 'proforma', 'export', 'bill_of_supply')),
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'sent', 'partial', 'paid', 'overdue', 'void', 'cancelled'
                        )),
  -- GST
  place_of_supply       TEXT,                              -- Buyer's state code
  seller_state_code     TEXT,                              -- Seller's state code (from org)
  is_inter_state        BOOLEAN NOT NULL DEFAULT FALSE,    -- IGST applies if true
  reverse_charge        BOOLEAN NOT NULL DEFAULT FALSE,
  -- References
  reference_number      TEXT,                              -- Customer's PO number
  quotation_id          UUID REFERENCES quotations(id) ON DELETE SET NULL,
  -- Currency
  currency              TEXT NOT NULL DEFAULT 'INR',
  exchange_rate         NUMERIC(10,6) NOT NULL DEFAULT 1,
  -- Amounts (NUMERIC — never FLOAT)
  subtotal              NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Sum of line subtotals before discount
  discount_type         TEXT DEFAULT 'fixed'
                        CHECK (discount_type IN ('fixed', 'percent')),
  discount_value        NUMERIC(15,2) NOT NULL DEFAULT 0,  -- The discount input value
  discount_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Computed discount in rupees
  taxable_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,  -- subtotal - discount_amount
  cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  cess_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  round_off_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,  -- +/- to make total a round figure
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Final amount to be paid
  amount_paid           NUMERIC(15,2) NOT NULL DEFAULT 0,  -- Updated by payment allocation
  balance_due           NUMERIC(15,2)
                        GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  amount_in_words       TEXT,                              -- Stored at finalization
  -- Document
  notes                 TEXT,
  terms_and_conditions  TEXT,
  template_id           UUID,                              -- FK to document_templates
  -- Lifecycle timestamps
  finalized_at          TIMESTAMPTZ,                       -- Set when status leaves 'draft'
  sent_at               TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  -- Void
  is_void               BOOLEAN NOT NULL DEFAULT FALSE,
  void_reason           TEXT,
  voided_at             TIMESTAMPTZ,
  voided_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Audit
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  UNIQUE (organization_id, invoice_number),
  CHECK (total_amount >= 0),
  CHECK (amount_paid >= 0),
  CHECK (amount_paid <= total_amount)
);

CREATE INDEX idx_invoices_org_status  ON invoices(organization_id, status);
CREATE INDEX idx_invoices_org_date    ON invoices(organization_id, invoice_date DESC);
CREATE INDEX idx_invoices_customer    ON invoices(customer_id);
CREATE INDEX idx_invoices_due_date    ON invoices(organization_id, due_date)
  WHERE status NOT IN ('paid', 'void', 'cancelled');
CREATE INDEX idx_invoices_number      ON invoices(organization_id, invoice_number);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN invoices.balance_due IS
  'Always computed: total_amount - amount_paid. Never set manually.';
COMMENT ON COLUMN invoices.finalized_at IS
  'Set once when status moves from draft. Finalized invoices must not have '
  'their financial fields updated. Enforce in application and RLS.';
COMMENT ON COLUMN invoices.invoice_number IS
  'Unique per organization. Generated by locking the org row (SELECT FOR UPDATE) '
  'and incrementing organizations.invoice_sequence.';

-- ------------------------------------------------------------
-- TABLE: invoice_items
-- Line items. Financial fields are snapshotted at finalization —
-- later product price changes must not alter finalized invoices.
-- ------------------------------------------------------------
CREATE TABLE invoice_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id            UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL, -- nullable: custom line items
  sort_order            INTEGER NOT NULL DEFAULT 0,
  -- Snapshotted at creation (not affected by future product changes)
  description           TEXT NOT NULL,
  hsn_sac_code          TEXT,
  quantity              NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit                  TEXT,
  unit_price            NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  -- Discount
  discount_percent      NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,   -- quantity × unit_price × discount_percent / 100
  -- Tax (snapshotted — immutable after finalization)
  taxable_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,   -- (quantity × unit_price) - discount_amount
  gst_rate              NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  sgst_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  igst_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cess_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  cess_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0,   -- Total tax on this line
  line_total            NUMERIC(15,2) NOT NULL DEFAULT 0,   -- taxable_amount + tax_amount
  is_gst_inclusive      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — items should not be editable after finalization
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);

COMMENT ON TABLE invoice_items IS
  'Line items with snapshotted prices and tax rates. After invoice finalization, '
  'these values must not change even if the product price changes.';

-- ------------------------------------------------------------
-- TABLE: invoice_taxes
-- GST summary grouped by HSN/SAC and tax rate.
-- Required for GSTR-1 filing. Computed at finalization.
-- ------------------------------------------------------------
CREATE TABLE invoice_taxes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  hsn_sac_code    TEXT,
  taxable_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  sgst_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  igst_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cess_rate       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  cess_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_taxes_invoice ON invoice_taxes(invoice_id);

COMMENT ON TABLE invoice_taxes IS
  'GST breakdown by HSN/SAC code and rate. Populated at invoice finalization. '
  'Used directly for GSTR-1 preparation.';

-- ------------------------------------------------------------
-- TABLE: invoice_payments
-- Allocation bridge between payments and invoices.
-- One payment can be spread across multiple invoices and vice versa.
-- ------------------------------------------------------------
CREATE TABLE invoice_payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  payment_id          UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount_allocated    NUMERIC(15,2) NOT NULL CHECK (amount_allocated > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_id, payment_id)
);

CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_payment ON invoice_payments(payment_id);

-- ============================================================
-- SECTION 7: QUOTATIONS
-- ============================================================

CREATE TABLE quotations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  quotation_number      TEXT NOT NULL,
  quotation_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until           DATE,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'
                        )),
  converted_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  reference_number      TEXT,
  place_of_supply       TEXT,
  is_inter_state        BOOLEAN NOT NULL DEFAULT FALSE,
  currency              TEXT NOT NULL DEFAULT 'INR',
  subtotal              NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  cess_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes                 TEXT,
  terms_and_conditions  TEXT,
  template_id           UUID,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, quotation_number)
);

CREATE INDEX idx_quotations_org      ON quotations(organization_id, status);
CREATE INDEX idx_quotations_customer ON quotations(customer_id);

CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE quotation_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quotation_id      UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  description       TEXT NOT NULL,
  hsn_sac_code      TEXT,
  quantity          NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit              TEXT,
  unit_price        NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  discount_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_rate          NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_rate         NUMERIC(5,2)  NOT NULL DEFAULT 0,
  sgst_rate         NUMERIC(5,2)  NOT NULL DEFAULT 0,
  igst_rate         NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total        NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);

-- ============================================================
-- SECTION 8: PURCHASE BILLS
-- ============================================================

CREATE TABLE purchase_bills (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id           UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  bill_number           TEXT,                              -- Supplier's invoice number
  our_reference         TEXT,                              -- Our PO / reference number
  bill_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date              DATE,
  received_date         DATE,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'received', 'partial', 'paid', 'overdue', 'disputed', 'cancelled'
                        )),
  place_of_supply       TEXT,
  seller_state_code     TEXT,
  is_inter_state        BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal              NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  cess_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid           NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_due           NUMERIC(15,2)
                        GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  -- Input Tax Credit
  is_itc_eligible       BOOLEAN NOT NULL DEFAULT TRUE,
  itc_claimed_at        TIMESTAMPTZ,
  notes                 TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (total_amount >= 0),
  CHECK (amount_paid >= 0)
);

CREATE INDEX idx_purchase_bills_org      ON purchase_bills(organization_id, status);
CREATE INDEX idx_purchase_bills_supplier ON purchase_bills(supplier_id);
CREATE INDEX idx_purchase_bills_due      ON purchase_bills(organization_id, due_date)
  WHERE status NOT IN ('paid', 'cancelled');

CREATE TRIGGER purchase_bills_updated_at
  BEFORE UPDATE ON purchase_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN purchase_bills.is_itc_eligible IS
  'Input Tax Credit. Eligible purchases reduce GST payable. Track carefully for GST returns.';

CREATE TABLE purchase_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  purchase_bill_id  UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  description       TEXT NOT NULL,
  hsn_sac_code      TEXT,
  quantity          NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit              TEXT,
  unit_price        NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  discount_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_rate          NUMERIC(5,2)  NOT NULL DEFAULT 0,
  cgst_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  line_total        NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_bill ON purchase_items(purchase_bill_id);

-- ============================================================
-- SECTION 9: PAYMENTS
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: payments
-- Covers both receipts from customers and payments to suppliers.
-- payment_type distinguishes direction.
-- ------------------------------------------------------------
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number      TEXT NOT NULL,
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type        TEXT NOT NULL
                      CHECK (payment_type IN ('received', 'made')),
  party_type          TEXT NOT NULL
                      CHECK (party_type IN ('customer', 'supplier')),
  party_id            UUID NOT NULL,                       -- Points to customers.id or suppliers.id
  payment_method      TEXT NOT NULL DEFAULT 'cash'
                      CHECK (payment_method IN (
                        'cash', 'upi', 'neft', 'rtgs', 'imps',
                        'cheque', 'card', 'bank_transfer', 'other'
                      )),
  reference_number    TEXT,                                -- UTR, cheque no., UPI ref
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  tds_amount          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tds_amount >= 0),
  net_amount          NUMERIC(15,2)
                      GENERATED ALWAYS AS (amount - tds_amount) STORED,
  currency            TEXT NOT NULL DEFAULT 'INR',
  exchange_rate       NUMERIC(10,6) NOT NULL DEFAULT 1,
  notes               TEXT,
  attachment_url      TEXT,
  status              TEXT NOT NULL DEFAULT 'cleared'
                      CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  cleared_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, payment_number)
);

CREATE INDEX idx_payments_org         ON payments(organization_id, payment_date DESC);
CREATE INDEX idx_payments_party       ON payments(organization_id, party_type, party_id);
CREATE INDEX idx_payments_method      ON payments(organization_id, payment_method);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN payments.party_id IS
  'Polymorphic FK: points to customers.id when party_type=customer, '
  'suppliers.id when party_type=supplier. Enforced at application level.';

-- ============================================================
-- SECTION 10: EXPENSES
-- ============================================================

CREATE TABLE expense_categories (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system
  name              TEXT NOT NULL,
  description       TEXT,
  parent_id         UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_system         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_cat_org ON expense_categories(organization_id);

-- Seed system expense categories
INSERT INTO expense_categories (name, description, is_system) VALUES
  ('Office Expenses',    'Stationery, printing, office supplies',    TRUE),
  ('Rent',               'Office, shop, or warehouse rent',          TRUE),
  ('Salaries',           'Employee salaries and wages',              TRUE),
  ('Utilities',          'Electricity, water, internet, phone',      TRUE),
  ('Travel & Transport', 'Fuel, transportation, travel expenses',    TRUE),
  ('Marketing',          'Advertising, promotions, events',          TRUE),
  ('Professional Fees',  'Accountant, lawyer, consultant fees',      TRUE),
  ('Bank Charges',       'Bank fees, transaction charges',           TRUE),
  ('Repairs',            'Equipment and property repairs',           TRUE),
  ('Miscellaneous',      'Other operating expenses',                 TRUE);

CREATE TABLE expenses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expense_number      TEXT,
  expense_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id         UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL, -- Optional vendor
  description         TEXT NOT NULL,
  payment_method      TEXT DEFAULT 'cash'
                      CHECK (payment_method IN (
                        'cash', 'upi', 'neft', 'rtgs', 'cheque', 'card', 'bank_transfer', 'other'
                      )),
  reference_number    TEXT,
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  gst_amount          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
  total_amount        NUMERIC(15,2)
                      GENERATED ALWAYS AS (amount + gst_amount) STORED,
  is_itc_eligible     BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_url         TEXT,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'approved'
                      CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  approved_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  is_void             BOOLEAN NOT NULL DEFAULT FALSE,
  void_reason         TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_org      ON expenses(organization_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_void     ON expenses(organization_id, is_void);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 11: CREDIT & DEBIT NOTES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: credit_notes
-- Issued to customers: reduces their outstanding balance.
-- Against a specific invoice or standalone.
-- ------------------------------------------------------------
CREATE TABLE credit_notes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  against_invoice_id    UUID REFERENCES invoices(id) ON DELETE SET NULL,
  credit_note_number    TEXT NOT NULL,
  credit_note_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  reason                TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'issued', 'applied', 'void')),
  subtotal              NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_applied        NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_amount        NUMERIC(15,2)
                        GENERATED ALWAYS AS (total_amount - amount_applied) STORED,
  notes                 TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, credit_note_number)
);

CREATE INDEX idx_credit_notes_org      ON credit_notes(organization_id);
CREATE INDEX idx_credit_notes_customer ON credit_notes(customer_id);

CREATE TRIGGER credit_notes_updated_at
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- TABLE: debit_notes
-- Raised against suppliers: reduces our payable to them.
-- ------------------------------------------------------------
CREATE TABLE debit_notes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id           UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  against_bill_id       UUID REFERENCES purchase_bills(id) ON DELETE SET NULL,
  debit_note_number     TEXT NOT NULL,
  debit_note_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  reason                TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'issued', 'applied', 'void')),
  subtotal              NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_applied        NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_amount        NUMERIC(15,2)
                        GENERATED ALWAYS AS (total_amount - amount_applied) STORED,
  notes                 TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, debit_note_number)
);

CREATE INDEX idx_debit_notes_org      ON debit_notes(organization_id);
CREATE INDEX idx_debit_notes_supplier ON debit_notes(supplier_id);

CREATE TRIGGER debit_notes_updated_at
  BEFORE UPDATE ON debit_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 12: DOCUMENT TEMPLATES & GENERATED DOCUMENTS
-- ============================================================

CREATE TABLE document_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = system template
  template_type   TEXT NOT NULL
                  CHECK (template_type IN (
                    'invoice', 'quotation', 'purchase_order',
                    'credit_note', 'debit_note', 'delivery_challan'
                  )),
  name            TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  template_data   JSONB NOT NULL DEFAULT '{}',             -- Template configuration
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_templates_org ON document_templates(organization_id, template_type);

CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type     TEXT NOT NULL
                    CHECK (document_type IN (
                      'invoice', 'quotation', 'credit_note',
                      'debit_note', 'purchase_order', 'receipt'
                    )),
  reference_id      UUID NOT NULL,                         -- invoice.id, quotation.id, etc.
  reference_number  TEXT NOT NULL,
  file_url          TEXT NOT NULL,                         -- Supabase Storage path
  file_size_bytes   INTEGER,
  is_latest         BOOLEAN NOT NULL DEFAULT TRUE,
  version           INTEGER NOT NULL DEFAULT 1,
  generated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_reference ON documents(document_type, reference_id);
CREATE INDEX idx_documents_org       ON documents(organization_id);

COMMENT ON TABLE documents IS
  'Stores generated PDF URLs in Supabase Storage. is_latest=TRUE marks the '
  'current version. Multiple versions are kept for audit purposes.';

-- ============================================================
-- SECTION 13: NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = broadcast to all org members
  notification_type TEXT NOT NULL
                    CHECK (notification_type IN (
                      'invoice_overdue', 'invoice_paid', 'payment_received',
                      'payment_due', 'low_stock', 'stock_out',
                      'quotation_expiring', 'bill_due', 'subscription_expiring',
                      'member_invited', 'member_joined', 'general'
                    )),
  title             TEXT NOT NULL,
  body              TEXT,
  data              JSONB,                                 -- Structured payload for deep-linking
  reference_type    TEXT,
  reference_id      UUID,
  channel           TEXT NOT NULL DEFAULT 'in_app'
                    CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp', 'push')),
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org     ON notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

COMMENT ON TABLE notifications IS
  'In-app, email, SMS, and WhatsApp notification records. '
  'user_id=NULL means the notification targets all org members.';

-- ============================================================
-- SECTION 14: AUDIT LOGS
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: audit_logs — APPEND-ONLY, IMMUTABLE
-- Every sensitive operation writes here.
-- Never UPDATE or DELETE rows.
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL
                  CHECK (action IN (
                    'created', 'updated', 'deleted', 'archived',
                    'finalized', 'voided', 'cancelled', 'sent',
                    'paid', 'approved', 'rejected', 'invited',
                    'role_changed', 'settings_changed', 'login', 'logout'
                  )),
  resource_type   TEXT NOT NULL,
  resource_id     UUID NOT NULL,
  old_data        JSONB,                                   -- State before action
  new_data        JSONB,                                   -- State after action
  diff            JSONB,                                   -- Computed diff (key-level)
  ip_address      INET,
  user_agent      TEXT,
  session_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — APPEND-ONLY
);

CREATE INDEX idx_audit_logs_org       ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource  ON audit_logs(organization_id, resource_type, resource_id);
CREATE INDEX idx_audit_logs_user      ON audit_logs(user_id, created_at DESC);

-- Prevent any UPDATE or DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only. UPDATE and DELETE are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_logs_immutable_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

COMMENT ON TABLE audit_logs IS
  'Tamper-evident, append-only audit trail. Triggers prevent UPDATE and DELETE. '
  'old_data and new_data store full JSON snapshots for forensic reconstruction.';

-- ============================================================
-- SECTION 15: SUBSCRIPTIONS & PLANS
-- ============================================================

CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  price_monthly   NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_yearly    NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  features        JSONB NOT NULL DEFAULT '{}',             -- Feature flags
  limits          JSONB NOT NULL DEFAULT '{}',             -- { "users": 5, "invoices_per_month": 100 }
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,           -- FALSE = custom/hidden plans
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed plans
INSERT INTO plans (name, description, price_monthly, price_yearly, features, limits) VALUES
  ('Free',       'Get started for free',       0,     0,     '{"invoices": true, "customers": true}', '{"users": 1, "invoices_per_month": 20}'),
  ('Starter',    'For small businesses',       499,   4999,  '{"invoices": true, "customers": true, "inventory": true}', '{"users": 3, "invoices_per_month": 100}'),
  ('Business',   'For growing businesses',     1499,  14999, '{"invoices": true, "inventory": true, "gst_reports": true, "staff": true}', '{"users": 10, "invoices_per_month": -1}'),
  ('Enterprise', 'Custom plans for large orgs', 0,    0,     '{"all": true}', '{"users": -1, "invoices_per_month": -1}');

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  billing_cycle           TEXT NOT NULL DEFAULT 'monthly'
                          CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start    DATE NOT NULL,
  current_period_end      DATE NOT NULL,
  trial_ends_at           TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,
  payment_reference       TEXT,
  amount_paid             NUMERIC(15,2),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 16: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_addresses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_taxes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions            ENABLE ROW LEVEL SECURITY;

-- ── User Profiles ─────────────────────────────────────────────
-- Users can only see and update their own profile.
CREATE POLICY "users_own_profile_select" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_own_profile_update" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_own_profile_insert" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── Organizations ─────────────────────────────────────────────
-- Org members can view; only owner/admin can update.
CREATE POLICY "org_members_select_org" ON organizations
  FOR SELECT USING (id IN (SELECT get_my_org_ids()));

CREATE POLICY "org_admins_update_org" ON organizations
  FOR UPDATE USING (is_org_admin(id));

CREATE POLICY "org_insert_unrestricted" ON organizations
  FOR INSERT WITH CHECK (TRUE); -- Creating an org is allowed for any authenticated user

-- ── Organization Members ──────────────────────────────────────
CREATE POLICY "org_members_select_members" ON organization_members
  FOR SELECT USING (organization_id IN (SELECT get_my_org_ids()));

CREATE POLICY "org_admins_manage_members" ON organization_members
  FOR ALL USING (is_org_admin(organization_id));

CREATE POLICY "own_member_insert" ON organization_members
  FOR INSERT WITH CHECK (TRUE); -- Handled by the org creation API

-- ── Business Profiles ─────────────────────────────────────────
CREATE POLICY "org_members_select_business_profile" ON business_profiles
  FOR SELECT USING (organization_id IN (SELECT get_my_org_ids()));

CREATE POLICY "org_admins_manage_business_profile" ON business_profiles
  FOR ALL USING (is_org_admin(organization_id));

-- ── Standard Org-Isolation Policy (applied to all remaining tables) ──────────
-- Members can SELECT all records in their org.
-- Mutations are allowed to active members (enforcement of specific permissions
-- is done at the application/service layer).

DO $$
DECLARE
  tbl TEXT;
  org_tables TEXT[] := ARRAY[
    'customers', 'customer_addresses', 'customer_transactions',
    'suppliers', 'supplier_addresses', 'supplier_transactions',
    'product_categories', 'products',
    'inventory_movements', 'stock_adjustments', 'stock_adjustment_items',
    'invoices', 'invoice_items', 'invoice_taxes', 'invoice_payments',
    'quotations', 'quotation_items',
    'purchase_bills', 'purchase_items',
    'payments',
    'expenses',
    'credit_notes', 'debit_notes',
    'document_templates', 'documents',
    'notifications',
    'audit_logs',
    'subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY org_tables LOOP
    -- SELECT: any active member of the org
    EXECUTE format(
      'CREATE POLICY "org_isolation_select_%I" ON %I
       FOR SELECT USING (organization_id IN (SELECT get_my_org_ids()))',
      tbl, tbl
    );
    -- INSERT: any active member
    EXECUTE format(
      'CREATE POLICY "org_isolation_insert_%I" ON %I
       FOR INSERT WITH CHECK (organization_id IN (SELECT get_my_org_ids()))',
      tbl, tbl
    );
    -- UPDATE: any active member (fine-grained permission is in app layer)
    EXECUTE format(
      'CREATE POLICY "org_isolation_update_%I" ON %I
       FOR UPDATE USING (organization_id IN (SELECT get_my_org_ids()))',
      tbl, tbl
    );
    -- DELETE: restricted to admins (financial records further restricted in app)
    EXECUTE format(
      'CREATE POLICY "org_isolation_delete_%I" ON %I
       FOR DELETE USING (is_org_admin(organization_id))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ── Special: Audit Logs — INSERT only, no UPDATE/DELETE ──────
-- The trigger already prevents UPDATE/DELETE.
-- RLS INSERT policy is already created by the loop above.
-- Explicitly revoke DELETE at RLS level:
DROP POLICY IF EXISTS "org_isolation_delete_audit_logs" ON audit_logs;
CREATE POLICY "audit_logs_no_delete" ON audit_logs
  FOR DELETE USING (FALSE); -- Nobody can delete audit logs via RLS

-- ── Plans: Public read, no mutation via client ────────────────
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (is_public = TRUE AND is_active = TRUE);

-- ── Notifications: user sees their own + org-wide ─────────────
DROP POLICY IF EXISTS "org_isolation_select_notifications" ON notifications;
CREATE POLICY "notifications_personal_select" ON notifications
  FOR SELECT USING (
    organization_id IN (SELECT get_my_org_ids())
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- ── Product Units: see system + own org units ─────────────────
DROP POLICY IF EXISTS "org_isolation_select_product_units" ON product_units;
DROP POLICY IF EXISTS "org_isolation_insert_product_units" ON product_units;
DROP POLICY IF EXISTS "org_isolation_update_product_units" ON product_units;
DROP POLICY IF EXISTS "org_isolation_delete_product_units" ON product_units;

CREATE POLICY "product_units_select" ON product_units
  FOR SELECT USING (
    organization_id IS NULL              -- System units visible to all
    OR organization_id IN (SELECT get_my_org_ids())
  );

CREATE POLICY "product_units_insert" ON product_units
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_my_org_ids()));

CREATE POLICY "product_units_update" ON product_units
  FOR UPDATE USING (
    organization_id IN (SELECT get_my_org_ids())
    AND is_system = FALSE
  );

-- ── Expense Categories: see system + own org ─────────────────
DROP POLICY IF EXISTS "org_isolation_select_expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "org_isolation_insert_expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "org_isolation_update_expense_categories" ON expense_categories;
DROP POLICY IF EXISTS "org_isolation_delete_expense_categories" ON expense_categories;

CREATE POLICY "expense_categories_select" ON expense_categories
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_my_org_ids())
  );

CREATE POLICY "expense_categories_insert" ON expense_categories
  FOR INSERT WITH CHECK (organization_id IN (SELECT get_my_org_ids()));

CREATE POLICY "expense_categories_update" ON expense_categories
  FOR UPDATE USING (
    organization_id IN (SELECT get_my_org_ids())
    AND is_system = FALSE
  );

-- ── Document Templates: see system + own org ──────────────────
DROP POLICY IF EXISTS "org_isolation_select_document_templates" ON document_templates;
CREATE POLICY "document_templates_select" ON document_templates
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_my_org_ids())
  );

-- ============================================================
-- SECTION 17: ADDITIONAL INTEGRITY CONSTRAINTS
-- ============================================================

-- Prevent financial field updates on finalized invoices
CREATE OR REPLACE FUNCTION prevent_finalized_invoice_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.finalized_at IS NOT NULL AND NOT OLD.is_void THEN
    -- Only allow status updates, void operations, and payment tracking
    IF (
      NEW.subtotal           != OLD.subtotal           OR
      NEW.discount_amount    != OLD.discount_amount    OR
      NEW.taxable_amount     != OLD.taxable_amount     OR
      NEW.cgst_amount        != OLD.cgst_amount        OR
      NEW.sgst_amount        != OLD.sgst_amount        OR
      NEW.igst_amount        != OLD.igst_amount        OR
      NEW.total_amount       != OLD.total_amount       OR
      NEW.invoice_number     != OLD.invoice_number
    ) THEN
      RAISE EXCEPTION
        'Cannot modify financial fields of a finalized invoice (id: %). '
        'Use void workflow to correct a finalized invoice.', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_protect_finalized
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION prevent_finalized_invoice_mutation();

-- Prevent inventory_movements UPDATE (immutability enforced at DB level)
CREATE OR REPLACE FUNCTION prevent_inventory_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only. UPDATE is not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movements_immutable
  BEFORE UPDATE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_inventory_mutation();

-- Prevent customer/supplier transaction UPDATE
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Transaction ledgers are append-only. UPDATE is not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_transactions_immutable
  BEFORE UPDATE ON customer_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER supplier_transactions_immutable
  BEFORE UPDATE ON supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- ============================================================
-- SECTION 18: USEFUL VIEWS
-- ============================================================

-- Current stock levels per product per org
CREATE OR REPLACE VIEW v_stock_on_hand AS
SELECT
  organization_id,
  product_id,
  SUM(quantity) AS current_stock,
  COUNT(*)       AS movement_count
FROM inventory_movements
GROUP BY organization_id, product_id;

-- Invoice summary view (for list pages — avoids scanning line items)
CREATE OR REPLACE VIEW v_invoice_summary AS
SELECT
  i.id,
  i.organization_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.customer_id,
  c.display_name AS customer_name,
  i.total_amount,
  i.amount_paid,
  i.balance_due,
  i.is_void,
  i.finalized_at,
  i.created_at
FROM invoices i
LEFT JOIN customers c ON c.id = i.customer_id;

-- Customer outstanding balance view
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.organization_id,
  c.id AS customer_id,
  c.display_name,
  COALESCE(SUM(inv.balance_due), 0) AS total_outstanding,
  COUNT(CASE WHEN inv.status = 'overdue' THEN 1 END) AS overdue_count
FROM customers c
LEFT JOIN invoices inv ON inv.customer_id = c.id
  AND inv.status NOT IN ('void', 'cancelled', 'draft')
GROUP BY c.organization_id, c.id, c.display_name;

-- GST summary view (for GSTR-1 preparation)
CREATE OR REPLACE VIEW v_gst_summary AS
SELECT
  it.organization_id,
  DATE_TRUNC('month', i.invoice_date) AS tax_period,
  it.hsn_sac_code,
  it.gst_rate,
  SUM(it.taxable_amount) AS total_taxable,
  SUM(it.cgst_amount)    AS total_cgst,
  SUM(it.sgst_amount)    AS total_sgst,
  SUM(it.igst_amount)    AS total_igst,
  SUM(it.cess_amount)    AS total_cess,
  COUNT(DISTINCT i.id)   AS invoice_count
FROM invoice_taxes it
JOIN invoices i ON i.id = it.invoice_id
WHERE i.status NOT IN ('void', 'cancelled', 'draft')
GROUP BY it.organization_id, DATE_TRUNC('month', i.invoice_date), it.hsn_sac_code, it.gst_rate;

-- ============================================================
-- SECTION 19: COMPOSITE PERFORMANCE INDEXES
-- ============================================================

-- Dashboard: revenue by date range
CREATE INDEX idx_invoices_org_date_status ON invoices(organization_id, invoice_date, status);

-- Overdue invoices check
CREATE INDEX idx_invoices_overdue_check ON invoices(organization_id, due_date, status)
  WHERE status NOT IN ('paid', 'void', 'cancelled') AND is_void = FALSE;

-- Payments by method (reporting)
CREATE INDEX idx_payments_org_method_date ON payments(organization_id, payment_method, payment_date DESC);

-- Inventory low-stock alert query
CREATE INDEX idx_products_low_stock ON products(organization_id, current_stock, min_stock_level)
  WHERE track_inventory = TRUE AND is_active = TRUE;

-- Expenses by date and category (reports)
CREATE INDEX idx_expenses_org_date_cat ON expenses(organization_id, expense_date DESC, category_id)
  WHERE is_void = FALSE;

-- Full-text search on invoices by number
CREATE INDEX idx_invoices_number_trgm ON invoices USING gin(invoice_number gin_trgm_ops);

-- ============================================================
-- SECTION 20: TABLE COMMENTS (DOCUMENTATION)
-- ============================================================

COMMENT ON TABLE organizations         IS 'Core tenant. All data is org-scoped. Sequences prevent number collision.';
COMMENT ON TABLE organization_members  IS 'User↔org membership with RBAC. permissions JSONB = future fine-grained ACL.';
COMMENT ON TABLE business_profiles     IS '1:1 with org for banking, branding, legal details.';
COMMENT ON TABLE user_profiles         IS '1:1 with auth.users for app-level profile data.';
COMMENT ON TABLE customers             IS 'Sales parties. outstanding_balance is denormalized from customer_transactions.';
COMMENT ON TABLE customer_transactions IS 'APPEND-ONLY double-entry ledger for customer balances.';
COMMENT ON TABLE suppliers             IS 'Purchase parties. outstanding_balance = what we owe them.';
COMMENT ON TABLE supplier_transactions IS 'APPEND-ONLY double-entry ledger for supplier payables.';
COMMENT ON TABLE products              IS 'Goods and services. current_stock maintained by inventory trigger.';
COMMENT ON TABLE inventory_movements   IS 'IMMUTABLE stock ledger. Source of truth for stock levels.';
COMMENT ON TABLE invoices              IS 'Sales invoices. Finalized invoices: financial fields are immutable.';
COMMENT ON TABLE invoice_items         IS 'Line items with price/tax snapshot at creation time.';
COMMENT ON TABLE invoice_taxes         IS 'GST breakdown by HSN/rate for GSTR-1 filing.';
COMMENT ON TABLE invoice_payments      IS 'Payment-to-invoice allocation bridge (many-to-many).';
COMMENT ON TABLE quotations            IS 'Sales quotations. Converted quotations link to their invoice.';
COMMENT ON TABLE purchase_bills        IS 'Supplier invoices received. Tracks ITC eligibility.';
COMMENT ON TABLE payments              IS 'All money movements: received from customers, made to suppliers.';
COMMENT ON TABLE expenses              IS 'Operating expenses with category, receipt, and ITC tracking.';
COMMENT ON TABLE credit_notes          IS 'Issued to customers to reduce their balance.';
COMMENT ON TABLE debit_notes           IS 'Raised against suppliers to reduce our payable.';
COMMENT ON TABLE audit_logs            IS 'Tamper-evident append-only audit trail. Immutable triggers.';
COMMENT ON TABLE plans                 IS 'Subscription plan definitions with feature/limit flags.';
COMMENT ON TABLE subscriptions         IS 'One active subscription per organization.';
