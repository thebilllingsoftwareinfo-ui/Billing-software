-- ============================================================
-- 006_jewelry_schema_fixes.sql
-- Adds missing columns for jewelry products and a metal_rates table
-- ============================================================

-- Add jewelry specific columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS metal_type TEXT,
  ADD COLUMN IF NOT EXISTS metal_weight NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS is_live_price BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS purity TEXT,
  ADD COLUMN IF NOT EXISTS gross_weight NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS net_weight NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS stone_weight NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS stone_value NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS wastage_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS making_charge NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS making_charge_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create metal_rates table for organization-specific live metal rates
CREATE TABLE IF NOT EXISTS metal_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metal_type TEXT NOT NULL,
  rate_per_gram NUMERIC(15,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, metal_type)
);

CREATE INDEX IF NOT EXISTS idx_metal_rates_org ON metal_rates(organization_id);

-- Enable RLS
ALTER TABLE metal_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metal_rates_select_policy"
  ON metal_rates FOR SELECT
  USING (
    organization_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "metal_rates_all_policy"
  ON metal_rates FOR ALL
  USING (
    organization_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
