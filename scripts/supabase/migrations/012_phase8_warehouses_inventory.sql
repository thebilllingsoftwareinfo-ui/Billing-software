-- ============================================================
-- Migration 012: Phase 8 Advanced Inventory & Warehouse Management
-- ============================================================

-- 1. Warehouses Master
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'main' CHECK (type IN ('main', 'store', 'godown', 'branch', 'retail_outlet', 'other')),
  address TEXT,
  city TEXT,
  state_code TEXT,
  pincode TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_warehouses_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_default ON warehouses(organization_id, is_default) WHERE is_default = true;

-- 2. Warehouse Stock Balance (Product-Warehouse link)
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  opening_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  current_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12, 4),
  reorder_quantity NUMERIC(12, 4),
  min_stock_level NUMERIC(12, 4),
  max_stock_level NUMERIC(12, 4),
  average_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_warehouse_stock_product UNIQUE (warehouse_id, product_id),
  CONSTRAINT chk_reserved_not_exceed_current CHECK (reserved_quantity >= 0 AND reserved_quantity <= current_quantity)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_org ON warehouse_stock(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_lookup ON warehouse_stock(organization_id, warehouse_id, product_id);

-- 3. Stock Transfers Header
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transfer_number TEXT NOT NULL,
  source_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'initiated', 'in_transit', 'received', 'transferred', 'cancelled')),
  reference_number TEXT,
  notes TEXT,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stock_transfers_number UNIQUE (organization_id, transfer_number),
  CONSTRAINT chk_transfers_distinct_warehouses CHECK (source_warehouse_id <> destination_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_org ON stock_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(organization_id, status);

-- 4. Stock Transfer Line Items
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'PCS',
  batch_id UUID,
  batch_number TEXT,
  serial_numbers JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);

-- 5. Inventory Batches
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  purchase_date DATE,
  cost NUMERIC(15, 2) DEFAULT 0,
  initial_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  current_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  reference_document TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_batches_number UNIQUE (organization_id, product_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_org_prod ON inventory_batches(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(organization_id, expiry_date);

-- 6. Inventory Serial Numbers
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
  serial_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'transferred', 'returned', 'damaged')),
  batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
  purchase_reference TEXT,
  sale_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_serials_number UNIQUE (organization_id, product_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_serials_lookup ON inventory_serial_numbers(organization_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_serials_wh ON inventory_serial_numbers(organization_id, warehouse_id);

-- 7. Stock Reservations (Sales Orders / Pre-commitments)
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('sales_order', 'quotation', 'manual')),
  reference_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_ref ON stock_reservations(organization_id, reference_type, reference_id);

-- 8. Stock Counts & Physical Stocktakes
CREATE TABLE IF NOT EXISTS stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  count_number TEXT NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'counted', 'review', 'approved', 'posted', 'cancelled')),
  category_id UUID,
  notes TEXT,
  adjustment_id UUID REFERENCES stock_adjustments(id) ON DELETE SET NULL,
  counted_by UUID,
  approved_by UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stock_counts_number UNIQUE (organization_id, count_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_org ON stock_counts(organization_id);

-- 9. Stock Count Line Items
CREATE TABLE IF NOT EXISTS stock_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  physical_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  difference NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON stock_count_items(stock_count_id);

-- 10. Product Master Extensions for Batch & Serial Tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_batch_tracked BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_serial_tracked BOOLEAN DEFAULT false;

-- 11. Row-Level Security (RLS) Policies
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for warehouses" ON warehouses
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for warehouse_stock" ON warehouse_stock
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for stock_transfers" ON stock_transfers
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for stock_transfer_items" ON stock_transfer_items
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for inventory_batches" ON inventory_batches
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for inventory_serial_numbers" ON inventory_serial_numbers
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for stock_reservations" ON stock_reservations
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for stock_counts" ON stock_counts
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant isolation for stock_count_items" ON stock_count_items
  FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- 12. Safe Data Migration for Existing Organizations and Products
-- Auto-provision default Main Warehouse for organizations without one
INSERT INTO warehouses (organization_id, name, code, type, is_default, is_active, notes)
SELECT
  o.id,
  'Main Warehouse',
  'WH-MAIN',
  'main',
  true,
  true,
  'Auto-provisioned default warehouse for existing inventory'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.organization_id = o.id AND w.is_default = true
);

-- Map existing tracked products to default warehouse
INSERT INTO warehouse_stock (organization_id, warehouse_id, product_id, current_quantity, average_cost)
SELECT
  p.organization_id,
  w.id,
  p.id,
  COALESCE(p.current_stock, 0),
  COALESCE(p.purchase_price, 0)
FROM products p
JOIN warehouses w ON w.organization_id = p.organization_id AND w.is_default = true
WHERE p.track_inventory = true
ON CONFLICT (warehouse_id, product_id) DO NOTHING;
