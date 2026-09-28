-- ============================================================
-- Migration 010: Phase 7B CRM Notes & Follow-ups
-- Customer & Supplier CRM + Financial Relationship Management
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier')),
    entity_id TEXT NOT NULL,
    note_text TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_org_entity ON crm_notes(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_created_at ON crm_notes(created_at DESC);

CREATE TABLE IF NOT EXISTS crm_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier')),
    entity_id TEXT NOT NULL,
    followup_date DATE NOT NULL,
    followup_time TEXT,
    followup_type TEXT NOT NULL CHECK (followup_type IN ('payment', 'sales', 'quotation', 'general', 'support')),
    purpose TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_by TEXT NOT NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_followups_org_entity ON crm_followups(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_followups_date_status ON crm_followups(organization_id, followup_date, status);

-- Enable RLS
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_notes_tenant_isolation" ON crm_notes
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);

CREATE POLICY "crm_followups_tenant_isolation" ON crm_followups
    FOR ALL USING (organization_id = (current_setting('app.current_organization_id', true))::uuid);
