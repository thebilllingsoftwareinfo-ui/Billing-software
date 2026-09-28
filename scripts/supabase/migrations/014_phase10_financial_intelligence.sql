-- ============================================================================
-- 014_phase10_financial_intelligence.sql
-- Phase 10 — Advanced Financial Accounting, Tax Compliance & Business Intelligence
--
-- Tables:
--   1. financial_periods (fiscal year and monthly accounting periods with lock protection)
--   2. cost_centers (cost center / business unit / branch / department segmentation)
--   3. bank_reconciliations (statement vs system ledger reconciliation headers)
--   4. bank_reconciliation_matches (individual matched/unmatched line items)
--   5. tax_filing_periods (monthly/quarterly GST filing preparation and status)
--   6. Alters journal_entries & lines with cost_center_id & financial_period_id
-- ============================================================================

-- 1. Financial Periods
CREATE TABLE IF NOT EXISTS financial_periods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year           TEXT NOT NULL, -- e.g. '2025-2026', '2026-2027'
  period_name           TEXT NOT NULL, -- e.g. 'April 2026', 'May 2026'
  period_key            TEXT NOT NULL, -- e.g. '2026-04', '2026-05'
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  closed_at             TIMESTAMPTZ,
  closed_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reopen_reason         TEXT,
  reopened_at           TIMESTAMPTZ,
  reopened_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_financial_periods_org_key UNIQUE (organization_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_fin_periods_org_dates ON financial_periods(organization_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fin_periods_status ON financial_periods(organization_id, status);

-- 2. Cost Centers / Business Units
CREATE TABLE IF NOT EXISTS cost_centers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'cost_center' CHECK (type IN ('cost_center', 'business_unit', 'branch', 'department', 'project')),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cost_centers_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id, is_active);

-- 3. Bank Reconciliations
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  statement_date        DATE NOT NULL,
  statement_balance     NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  system_balance        NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  difference            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status                TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  reconciled_at         TIMESTAMPTZ,
  reconciled_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_org_acc ON bank_reconciliations(organization_id, account_id, statement_date);

-- 4. Bank Reconciliation Matches
CREATE TABLE IF NOT EXISTS bank_reconciliation_matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reconciliation_id     UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_id        TEXT NOT NULL,
  transaction_type      TEXT NOT NULL DEFAULT 'cash_bank_txn', -- 'cash_bank_txn', 'journal_entry'
  amount                NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  matched               BOOLEAN NOT NULL DEFAULT TRUE,
  matched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_matches_recon ON bank_reconciliation_matches(reconciliation_id);

-- 5. Tax Filing Periods
CREATE TABLE IF NOT EXISTS tax_filing_periods (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_key            TEXT NOT NULL, -- e.g. '2026-09', 'Q2-2026'
  period_type           TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly')),
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'finalized')),
  total_taxable_turnover NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_output_tax      NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_input_tax       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  net_tax_payable       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  finalized_at          TIMESTAMPTZ,
  finalized_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tax_filing_periods_org_key UNIQUE (organization_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_tax_periods_org_key ON tax_filing_periods(organization_id, period_key);

-- 6. Add Cost Center & Financial Period Links to Journal Entries & Lines
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS financial_period_id UUID REFERENCES financial_periods(id) ON DELETE SET NULL;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

-- 7. Row Level Security Policies
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_filing_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_periods' AND policyname = 'tenant_isolation_fin_periods') THEN
    CREATE POLICY tenant_isolation_fin_periods ON financial_periods
      FOR ALL USING (organization_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cost_centers' AND policyname = 'tenant_isolation_cost_centers') THEN
    CREATE POLICY tenant_isolation_cost_centers ON cost_centers
      FOR ALL USING (organization_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_reconciliations' AND policyname = 'tenant_isolation_bank_recon') THEN
    CREATE POLICY tenant_isolation_bank_recon ON bank_reconciliations
      FOR ALL USING (organization_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_reconciliation_matches' AND policyname = 'tenant_isolation_recon_matches') THEN
    CREATE POLICY tenant_isolation_recon_matches ON bank_reconciliation_matches
      FOR ALL USING (organization_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tax_filing_periods' AND policyname = 'tenant_isolation_tax_periods') THEN
    CREATE POLICY tenant_isolation_tax_periods ON tax_filing_periods
      FOR ALL USING (organization_id = auth.uid());
  END IF;
END $$;
