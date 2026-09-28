-- ============================================================================
-- Migration 008: Phase 2 Cash & Bank Financial Ledger
--
-- Introduces:
--   1. cash_bank_accounts (Cash in Hand, Bank Accounts, UPI/Wallets)
--   2. cash_bank_transactions (Append-only financial entries for In/Out flows)
--   3. Row Level Security policies scoping all mutations to organization_id
--   4. Trigger to provision default Cash & Bank accounts for new organizations
-- ============================================================================

-- 1. Accounts Table
CREATE TABLE IF NOT EXISTS cash_bank_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_name        TEXT NOT NULL,
  account_type        TEXT NOT NULL CHECK (account_type IN ('cash', 'bank', 'upi', 'wallet')),
  bank_name           TEXT,
  account_number      TEXT,
  ifsc_code           TEXT,
  upi_id              TEXT,
  opening_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cba_org_id ON cash_bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_cba_type ON cash_bank_accounts(organization_id, account_type);

-- 2. Financial Ledger Transactions Table
CREATE TABLE IF NOT EXISTS cash_bank_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id          UUID NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE CASCADE,
  transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('payment_in', 'payment_out', 'expense_out', 'transfer', 'opening_balance', 'adjustment')),
  direction           TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  running_balance     NUMERIC(15,2) NOT NULL,
  transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type      TEXT, -- 'invoice', 'payment', 'expense', 'purchase_bill', 'transfer'
  reference_id        TEXT,
  reference_number    TEXT,
  payment_mode        TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'bank_transfer', 'upi', 'card', 'cheque', etc.
  narration           TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cbt_org_account ON cash_bank_transactions(organization_id, account_id);
CREATE INDEX IF NOT EXISTS idx_cbt_org_date ON cash_bank_transactions(organization_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_cbt_reference ON cash_bank_transactions(organization_id, reference_type, reference_id);

-- 3. Row Level Security
ALTER TABLE cash_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_bank_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_bank_accounts' AND policyname = 'tenant_isolation_cash_bank_accounts'
  ) THEN
    CREATE POLICY tenant_isolation_cash_bank_accounts ON cash_bank_accounts
      FOR ALL
      USING (organization_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid()))
      WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_bank_transactions' AND policyname = 'tenant_isolation_cash_bank_transactions'
  ) THEN
    CREATE POLICY tenant_isolation_cash_bank_transactions ON cash_bank_transactions
      FOR ALL
      USING (organization_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid()))
      WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE auth_id = auth.uid()));
  END IF;
END $$;

-- 4. Default Accounts Provisioning Function
CREATE OR REPLACE FUNCTION provision_default_cash_bank_accounts(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Default Cash Account
  IF NOT EXISTS (SELECT 1 FROM cash_bank_accounts WHERE organization_id = p_org_id AND account_type = 'cash') THEN
    INSERT INTO cash_bank_accounts (
      organization_id, account_name, account_type, opening_balance, current_balance, is_default, is_active
    ) VALUES (
      p_org_id, 'Cash in Hand', 'cash', 0.00, 0.00, true, true
    );
  END IF;

  -- Default Bank Account
  IF NOT EXISTS (SELECT 1 FROM cash_bank_accounts WHERE organization_id = p_org_id AND account_type = 'bank') THEN
    INSERT INTO cash_bank_accounts (
      organization_id, account_name, account_type, bank_name, opening_balance, current_balance, is_default, is_active
    ) VALUES (
      p_org_id, 'Primary Bank Account', 'bank', 'General Bank', 0.00, 0.00, true, true
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
