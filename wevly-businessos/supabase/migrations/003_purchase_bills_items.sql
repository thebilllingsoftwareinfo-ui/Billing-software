-- Migration 003: Purchase Bill Line Items & Supplier Payable Enhancements

CREATE TABLE IF NOT EXISTS purchase_bill_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_bill_id      UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit                  TEXT,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  discount_pct          NUMERIC(5,2) NOT NULL DEFAULT 0,
  hsn_sac               TEXT,
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_type              TEXT NOT NULL DEFAULT 'exclusive',
  cgst_paise            BIGINT NOT NULL DEFAULT 0,
  sgst_paise            BIGINT NOT NULL DEFAULT 0,
  igst_paise            BIGINT NOT NULL DEFAULT 0,
  line_subtotal_paise   BIGINT NOT NULL DEFAULT 0,
  line_total_paise      BIGINT NOT NULL DEFAULT 0,
  sort_order            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pb_items_bill_id ON purchase_bill_items(purchase_bill_id);
CREATE INDEX IF NOT EXISTS idx_pb_items_org_id ON purchase_bill_items(organization_id);

ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pb_items_org_isolation ON purchase_bill_items
  FOR ALL USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));
