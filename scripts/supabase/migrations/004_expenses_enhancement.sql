-- Migration 004: Expense Archiving and Category Enhancements

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_archived ON expenses(organization_id, is_archived);
