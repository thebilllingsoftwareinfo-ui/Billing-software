-- ============================================================
-- 007_invoice_items_custom_fields.sql
-- Adds custom_fields to invoice and purchase line items to snapshot category-specific attributes (e.g. Jewelry weights and making charges)
-- ============================================================

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Also add to purchase_bill_items since purchases also need to track category-specific info
ALTER TABLE purchase_bill_items
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
