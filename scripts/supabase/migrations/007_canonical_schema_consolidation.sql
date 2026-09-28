-- ============================================================
-- 007_canonical_schema_consolidation.sql
-- ============================================================
-- Migration Phase 1: Canonical Schema & Currency Consolidation
-- Authoritative monetary standard: NUMERIC(15,2) Indian Rupees (₹)
-- Authoritative line item tables:
--   • Invoices        -> invoice_items
--   • Quotations      -> quotation_items
--   • Purchase Bills  -> purchase_bill_items
--   • Ledgers         -> customer_transactions, supplier_transactions
-- ============================================================

-- 1. Ensure Quotations & quotation_items have canonical decimal Rupee columns
CREATE TABLE IF NOT EXISTS quotations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  quotation_number    TEXT NOT NULL,
  quotation_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until         DATE,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  terms               TEXT,
  converted_invoice_id UUID,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add decimal columns to quotations if missing from earlier migrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'total_amount') THEN
    ALTER TABLE quotations ADD COLUMN total_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'taxable_amount') THEN
    ALTER TABLE quotations ADD COLUMN taxable_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'subtotal') THEN
    ALTER TABLE quotations ADD COLUMN subtotal NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'cgst_amount') THEN
    ALTER TABLE quotations ADD COLUMN cgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'sgst_amount') THEN
    ALTER TABLE quotations ADD COLUMN sgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'igst_amount') THEN
    ALTER TABLE quotations ADD COLUMN igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Canonical quotation_items table
CREATE TABLE IF NOT EXISTS quotation_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id        UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  description         TEXT NOT NULL,
  quantity            NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit                TEXT NOT NULL DEFAULT 'PCS',
  unit_price          NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  discount_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  hsn_sac             TEXT,
  gst_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_type            TEXT NOT NULL DEFAULT 'exclusive' CHECK (gst_type IN ('exclusive', 'inclusive')),
  taxable_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility view if quotation_line_items is referenced
CREATE OR REPLACE VIEW quotation_line_items AS
SELECT
  id,
  quotation_id,
  organization_id,
  product_id,
  description,
  quantity,
  unit,
  unit_price,
  discount_percent AS discount_pct,
  taxable_amount,
  cgst_amount,
  sgst_amount,
  igst_amount,
  total_amount,
  (unit_price * 100)::BIGINT AS unit_price_paise,
  (taxable_amount * 100)::BIGINT AS line_subtotal_paise,
  (total_amount * 100)::BIGINT AS line_total_paise,
  sort_order,
  created_at
FROM quotation_items;

-- 2. Canonical Purchase Bills & purchase_bill_items
CREATE TABLE IF NOT EXISTS purchase_bills (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  bill_number         TEXT NOT NULL,
  bill_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'partial', 'overdue', 'cancelled')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  taxable_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  round_off_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid         NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_due         NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_bill_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_bill_id    UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  description         TEXT NOT NULL,
  quantity            NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit                TEXT NOT NULL DEFAULT 'PCS',
  unit_price          NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  discount_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  hsn_sac             TEXT,
  gst_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_type            TEXT NOT NULL DEFAULT 'exclusive' CHECK (gst_type IN ('exclusive', 'inclusive')),
  taxable_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  sgst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  igst_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward compatibility view if purchase_items is queried by old reporting tools
CREATE OR REPLACE VIEW purchase_items AS
SELECT
  id,
  purchase_bill_id,
  organization_id,
  product_id,
  description,
  quantity,
  unit,
  unit_price,
  discount_percent,
  taxable_amount,
  cgst_amount,
  sgst_amount,
  igst_amount,
  total_amount,
  (unit_price * 100)::BIGINT AS unit_price_paise,
  (taxable_amount * 100)::BIGINT AS taxable_paise,
  ((cgst_amount + sgst_amount + igst_amount) * 100)::BIGINT AS tax_paise,
  (total_amount * 100)::BIGINT AS total_paise,
  created_at
FROM purchase_bill_items;

-- 3. Invoices canonical items & column aliases
CREATE OR REPLACE VIEW invoice_line_items AS
SELECT
  id,
  invoice_id,
  organization_id,
  product_id,
  description,
  quantity,
  unit,
  unit_price,
  discount_percent,
  discount_amount,
  taxable_amount,
  cgst_amount,
  sgst_amount,
  igst_amount,
  total_amount,
  (unit_price * 100)::BIGINT AS unit_price_paise,
  (taxable_amount * 100)::BIGINT AS taxable_paise,
  (total_amount * 100)::BIGINT AS total_paise,
  created_at
FROM invoice_items;

-- 4. Supplier & Customer decimal column consistency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'outstanding_balance') THEN
    ALTER TABLE customers ADD COLUMN outstanding_balance NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'outstanding_balance') THEN
    ALTER TABLE suppliers ADD COLUMN outstanding_balance NUMERIC(15,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
