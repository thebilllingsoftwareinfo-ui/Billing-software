-- ============================================================
-- Migration: 006_subscriptions.sql
-- WEVLY BUSINESSOS — Subscription Management System
-- ============================================================

-- ============================================================
-- 1. PLANS TABLE
-- ============================================================
CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name       TEXT NOT NULL,
  plan_code       TEXT NOT NULL UNIQUE,
  duration_days   INTEGER NOT NULL,
  price_paise     BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default Plans
INSERT INTO plans (plan_name, plan_code, duration_days, price_paise) VALUES 
('7-Day Trial', 'TRIAL', 7, 0),
('Silver Plan (1 Year)', 'SILVER', 365, 300000),  -- ₹3,000 = 300,000 paise
('Gold Plan (3 Years)', 'GOLD', 1095, 800000)      -- ₹8,000 = 800,000 paise
ON CONFLICT (plan_code) DO NOTHING;

-- Enable RLS for Plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);
-- Only service_role can modify plans, no public policy for INSERT/UPDATE/DELETE.


-- ============================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES plans(id),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'pending')),
  start_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date     TIMESTAMPTZ NOT NULL,
  purchased_price BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON subscriptions 
  FOR SELECT USING (auth.uid() = user_id);
-- Insert/Update is restricted to backend/RPC only for security.


-- ============================================================
-- 3. PAYMENTS TABLE
-- ============================================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES plans(id),
  amount_paise    BIGINT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payments" ON payments 
  FOR SELECT USING (auth.uid() = user_id);
-- Insert/Update restricted to backend only.


-- ============================================================
-- 4. SECURE RPC TO ACTIVATE TRIAL
-- ============================================================
-- This ensures users cannot spam trial creations from the frontend.
CREATE OR REPLACE FUNCTION activate_trial() 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_existing_trial UUID;
  v_sub_id UUID;
BEGIN
  -- 1. Get the current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Check if the user already has any subscription (trial or otherwise)
  SELECT id INTO v_existing_trial FROM subscriptions WHERE user_id = v_user_id LIMIT 1;
  IF v_existing_trial IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a subscription history. Cannot activate trial.';
  END IF;

  -- 3. Get the TRIAL plan ID
  SELECT id INTO v_plan_id FROM plans WHERE plan_code = 'TRIAL' AND is_active = TRUE;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Trial plan is not available.';
  END IF;

  -- 4. Create the subscription
  INSERT INTO subscriptions (
    user_id, plan_id, status, start_date, expiry_date, purchased_price, currency
  ) VALUES (
    v_user_id, 
    v_plan_id, 
    'trial', 
    NOW(), 
    NOW() + INTERVAL '7 days', 
    0, 
    'INR'
  ) RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END;
$$;
