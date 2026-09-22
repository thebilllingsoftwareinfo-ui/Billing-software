-- ============================================================
-- 005_business_category.sql
-- Adds business_category column to organizations table
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_category TEXT NOT NULL DEFAULT 'retail'
    CHECK (business_category IN (
      'retail',
      'wholesale',
      'services',
      'manufacturing',
      'restaurant',
      'freelancer',
      'jewelry',
      'medical'
    ));

COMMENT ON COLUMN organizations.business_category IS
  'The primary category of this business, used to render a tailored dashboard.';
