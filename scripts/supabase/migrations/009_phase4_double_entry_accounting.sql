-- ============================================================================
-- 009_phase4_double_entry_accounting.sql
-- Phase 4 — Double-Entry Accounting Engine, Chart of Accounts, Journal Entries & General Ledger
-- ============================================================================

-- 1. Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_code          TEXT NOT NULL,
  account_name          TEXT NOT NULL,
  account_type          TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  parent_account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  opening_balance       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  opening_balance_type  TEXT NOT NULL DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
  current_balance       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  is_system_account     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_accounts_org_code UNIQUE (organization_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_org_id ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(organization_id, account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(organization_id, account_code);

-- 2. Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number          TEXT NOT NULL,
  entry_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type        TEXT, -- 'invoice', 'purchase_bill', 'payment_in', 'payment_out', 'expense', 'manual', 'opening_balance', 'reversal'
  reference_id          TEXT, -- Linked entity ID
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
  source                TEXT NOT NULL DEFAULT 'manual', -- 'sales', 'purchase', 'payment', 'expense', 'manual', 'system'
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_journal_entries_org_number UNIQUE (organization_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_je_org_date ON journal_entries(organization_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_je_ref ON journal_entries(organization_id, reference_type, reference_id);

-- 3. Journal Entry Lines (Debit & Credit rows)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  journal_entry_id      UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit                 NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
  credit                NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0))
);

CREATE INDEX IF NOT EXISTS idx_jel_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_id ON journal_entry_lines(organization_id, account_id);

-- 4. Accounting Settings
CREATE TABLE IF NOT EXISTS accounting_settings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  financial_year_start        DATE NOT NULL DEFAULT CURRENT_DATE,
  default_cash_account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  default_bank_account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  default_ar_account_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  default_ap_account_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  default_sales_account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  default_purchase_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  auto_post_invoices          BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_purchases         BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_payments          BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_expenses          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Row-Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'tenant_isolation_accounts') THEN
    CREATE POLICY tenant_isolation_accounts ON accounts
      USING (organization_id = (current_setting('app.current_organization_id', true))::uuid)
      WITH CHECK (organization_id = (current_setting('app.current_organization_id', true))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entries' AND policyname = 'tenant_isolation_journal_entries') THEN
    CREATE POLICY tenant_isolation_journal_entries ON journal_entries
      USING (organization_id = (current_setting('app.current_organization_id', true))::uuid)
      WITH CHECK (organization_id = (current_setting('app.current_organization_id', true))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'journal_entry_lines' AND policyname = 'tenant_isolation_journal_entry_lines') THEN
    CREATE POLICY tenant_isolation_journal_entry_lines ON journal_entry_lines
      USING (organization_id = (current_setting('app.current_organization_id', true))::uuid)
      WITH CHECK (organization_id = (current_setting('app.current_organization_id', true))::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounting_settings' AND policyname = 'tenant_isolation_accounting_settings') THEN
    CREATE POLICY tenant_isolation_accounting_settings ON accounting_settings
      USING (organization_id = (current_setting('app.current_organization_id', true))::uuid)
      WITH CHECK (organization_id = (current_setting('app.current_organization_id', true))::uuid);
  END IF;
END $$;

-- 6. Default Chart of Accounts Provisioning Function
CREATE OR REPLACE FUNCTION provision_default_chart_of_accounts(p_org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_cash_id UUID;
  v_bank_id UUID;
  v_ar_id UUID;
  v_ap_id UUID;
  v_sales_id UUID;
  v_purchases_id UUID;
BEGIN
  -- ASSETS
  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '1010', 'Cash on Hand', 'ASSET', TRUE, 'Physical currency held on premises')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE
  RETURNING id INTO v_cash_id;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '1020', 'Bank Account', 'ASSET', TRUE, 'Primary corporate checking/savings account')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE
  RETURNING id INTO v_bank_id;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '1030', 'UPI / Online Payment Clearing', 'ASSET', TRUE, 'Digital payment settlement account')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '1040', 'Accounts Receivable (Debtors)', 'ASSET', TRUE, 'Receivables owed by customers for goods/services')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE
  RETURNING id INTO v_ar_id;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '1050', 'Inventory Asset', 'ASSET', TRUE, 'Value of stock on hand held for sale')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '1060', 'Input CGST', 'ASSET', TRUE, 'Central GST paid on purchases (Input Tax Credit)'),
    (p_org_id, '1070', 'Input SGST', 'ASSET', TRUE, 'State GST paid on purchases (Input Tax Credit)'),
    (p_org_id, '1080', 'Input IGST', 'ASSET', TRUE, 'Integrated GST paid on inter-state purchases (ITC)')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  -- LIABILITIES
  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '2010', 'Accounts Payable (Creditors)', 'LIABILITY', TRUE, 'Payables owed to vendors and suppliers')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE
  RETURNING id INTO v_ap_id;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '2020', 'Output CGST', 'LIABILITY', TRUE, 'Central GST collected on sales (Tax Payable)'),
    (p_org_id, '2030', 'Output SGST', 'LIABILITY', TRUE, 'State GST collected on sales (Tax Payable)'),
    (p_org_id, '2040', 'Output IGST', 'LIABILITY', TRUE, 'Integrated GST collected on inter-state sales')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  -- EQUITY
  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '3010', 'Owner Capital', 'EQUITY', TRUE, 'Owner investment in business'),
    (p_org_id, '3020', 'Owner Drawings', 'EQUITY', TRUE, 'Owner withdrawals from business'),
    (p_org_id, '3030', 'Retained Earnings', 'EQUITY', TRUE, 'Cumulative profits retained in business')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  -- INCOME
  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '4010', 'Sales Revenue', 'INCOME', TRUE, 'Operating revenue from merchandise sales')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE
  RETURNING id INTO v_sales_id;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '4020', 'Other Income', 'INCOME', TRUE, 'Discounts, interest, and non-operating revenue')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  -- EXPENSES
  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '5010', 'Cost of Goods Sold / Purchases', 'EXPENSE', TRUE, 'Direct merchandise purchase and production cost')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE
  RETURNING id INTO v_purchases_id;

  INSERT INTO accounts (organization_id, account_code, account_name, account_type, is_system_account, description)
  VALUES
    (p_org_id, '5020', 'Rent Expense', 'EXPENSE', TRUE, 'Store and warehouse lease expenses'),
    (p_org_id, '5030', 'Salary & Staff Wages', 'EXPENSE', TRUE, 'Employee payroll and compensation'),
    (p_org_id, '5040', 'Electricity & Utilities', 'EXPENSE', TRUE, 'Water, power, and utility services'),
    (p_org_id, '5050', 'Marketing & Promotion', 'EXPENSE', TRUE, 'Advertising, branding, and promotional expenses'),
    (p_org_id, '5060', 'Office & Admin Expenses', 'EXPENSE', TRUE, 'Stationery, software, and administrative supplies'),
    (p_org_id, '5070', 'Other Operating Expenses', 'EXPENSE', TRUE, 'Miscellaneous business expenses')
  ON CONFLICT (organization_id, account_code) DO UPDATE SET is_system_account = TRUE;

  -- Accounting Settings Provisioning
  INSERT INTO accounting_settings (
    organization_id,
    default_cash_account_id,
    default_bank_account_id,
    default_ar_account_id,
    default_ap_account_id,
    default_sales_account_id,
    default_purchase_account_id
  )
  VALUES (
    p_org_id,
    v_cash_id,
    v_bank_id,
    v_ar_id,
    v_ap_id,
    v_sales_id,
    v_purchases_id
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    default_cash_account_id = COALESCE(accounting_settings.default_cash_account_id, EXCLUDED.default_cash_account_id),
    default_bank_account_id = COALESCE(accounting_settings.default_bank_account_id, EXCLUDED.default_bank_account_id),
    default_ar_account_id = COALESCE(accounting_settings.default_ar_account_id, EXCLUDED.default_ar_account_id),
    default_ap_account_id = COALESCE(accounting_settings.default_ap_account_id, EXCLUDED.default_ap_account_id),
    default_sales_account_id = COALESCE(accounting_settings.default_sales_account_id, EXCLUDED.default_sales_account_id),
    default_purchase_account_id = COALESCE(accounting_settings.default_purchase_account_id, EXCLUDED.default_purchase_account_id);
END;
$$ LANGUAGE plpgsql;
