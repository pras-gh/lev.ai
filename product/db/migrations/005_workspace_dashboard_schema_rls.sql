-- Workspace-aware dashboard schema baseline with RLS.
-- Additive migration: keeps existing bigint ledger internals intact.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Workspace primitives
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id BIGINT NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

INSERT INTO workspaces (business_id, name)
SELECT
  b.id,
  COALESCE(NULLIF(TRIM(b.name), ''), 'Workspace ' || b.id::text)
FROM businesses b
LEFT JOIN workspaces w ON w.business_id = b.id
WHERE w.business_id IS NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspaces_touch_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_touch_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_workspace_members_touch_updated_at ON workspace_members;
CREATE TRIGGER trg_workspace_members_touch_updated_at
BEFORE UPDATE ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_workspace_for_business()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO workspaces (business_id, name)
  VALUES (NEW.id, COALESCE(NULLIF(TRIM(NEW.name), ''), 'Workspace ' || NEW.id::text))
  ON CONFLICT (business_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_ensure_workspace ON businesses;
CREATE TRIGGER trg_businesses_ensure_workspace
AFTER INSERT ON businesses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_workspace_for_business();

-- 2) Add workspace_id to core tables and backfill
ALTER TABLE categories ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS workspace_id UUID;

UPDATE categories c
SET workspace_id = w.id
FROM workspaces w
WHERE c.workspace_id IS NULL
  AND w.business_id = c.business_id;

UPDATE transactions t
SET workspace_id = w.id
FROM workspaces w
WHERE t.workspace_id IS NULL
  AND w.business_id = t.business_id;

UPDATE alerts a
SET workspace_id = w.id
FROM workspaces w
WHERE a.workspace_id IS NULL
  AND w.business_id = a.business_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_workspace_id_fkey'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_workspace_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alerts_workspace_id_fkey'
  ) THEN
    ALTER TABLE alerts
      ADD CONSTRAINT alerts_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN workspace_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_workspace_id_from_business()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.business_id IS NOT NULL THEN
    SELECT w.id
    INTO NEW.workspace_id
    FROM workspaces w
    WHERE w.business_id = NEW.business_id
    LIMIT 1;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id cannot be null for business_id=%', NEW.business_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_set_workspace_id ON categories;
CREATE TRIGGER trg_categories_set_workspace_id
BEFORE INSERT OR UPDATE OF business_id, workspace_id ON categories
FOR EACH ROW
EXECUTE FUNCTION public.set_workspace_id_from_business();

DROP TRIGGER IF EXISTS trg_transactions_set_workspace_id ON transactions;
CREATE TRIGGER trg_transactions_set_workspace_id
BEFORE INSERT OR UPDATE OF business_id, workspace_id ON transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_workspace_id_from_business();

DROP TRIGGER IF EXISTS trg_alerts_set_workspace_id ON alerts;
CREATE TRIGGER trg_alerts_set_workspace_id
BEFORE INSERT OR UPDATE OF business_id, workspace_id ON alerts
FOR EACH ROW
EXECUTE FUNCTION public.set_workspace_id_from_business();

CREATE INDEX IF NOT EXISTS idx_categories_workspace_name
ON categories (workspace_id, name);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_occurred_at
ON transactions (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_workspace_status_severity
ON alerts (workspace_id, status, severity);

-- 3) transactions: dashboard-required fields
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS date DATE GENERATED ALWAYS AS ((occurred_at AT TIME ZONE 'UTC')::date) STORED,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2) GENERATED ALWAYS AS (amount_minor) STORED,
  ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS matched BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS match_group_id UUID,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS meta JSONB GENERATED ALWAYS AS (metadata) STORED;

UPDATE transactions
SET source = CASE
  WHEN source IS NULL OR BTRIM(source) = '' THEN 'manual'
  WHEN LOWER(source) IN ('bank', 'upi', 'razorpay', 'stripe', 'manual', 'csv_import', 'csv_proof', 'reversal', 'import') THEN LOWER(source)
  ELSE 'manual'
END;

ALTER TABLE transactions ALTER COLUMN source SET DEFAULT 'manual';
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('bank', 'upi', 'razorpay', 'stripe', 'manual', 'csv_import', 'csv_proof', 'reversal', 'import'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_confidence_range_check'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_confidence_range_check
      CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date
ON transactions (workspace_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_matched
ON transactions (workspace_id, matched);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_match_group
ON transactions (workspace_id, match_group_id)
WHERE match_group_id IS NOT NULL;

-- 4) categories: add UI-facing type
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS type TEXT;

UPDATE categories
SET type = CASE
  WHEN kind = 'income' THEN 'income'
  WHEN kind = 'asset' THEN 'asset'
  WHEN kind = 'liability' THEN 'liability'
  ELSE 'expense'
END
WHERE type IS NULL OR type NOT IN ('income', 'expense', 'asset', 'liability');

ALTER TABLE categories ALTER COLUMN type SET DEFAULT 'expense';
ALTER TABLE categories ALTER COLUMN type SET NOT NULL;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE categories
  ADD CONSTRAINT categories_type_check
  CHECK (type IN ('income', 'expense', 'asset', 'liability'));

-- 5) alerts: normalize to dashboard contract
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS related_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE alerts
SET type = CASE
  WHEN LOWER(alert_type) LIKE '%gst%' THEN 'gst_due'
  WHEN LOWER(alert_type) LIKE '%itc%' THEN 'itc_mismatch'
  WHEN LOWER(alert_type) LIKE '%runway%' OR LOWER(alert_type) LIKE '%cash%' THEN 'cash_runway'
  WHEN LOWER(alert_type) LIKE '%duplicate%' THEN 'duplicate'
  WHEN LOWER(alert_type) = 'unmatched' THEN 'unmatched'
  ELSE 'unmatched'
END
WHERE type IS NULL OR type NOT IN ('gst_due', 'itc_mismatch', 'cash_runway', 'unmatched', 'duplicate');

UPDATE alerts
SET severity = CASE
  WHEN LOWER(severity) = 'critical' THEN 'critical'
  WHEN LOWER(severity) IN ('high', 'medium', 'warning') THEN 'warning'
  ELSE 'info'
END;

UPDATE alerts
SET status = CASE
  WHEN LOWER(status) = 'open' THEN 'open'
  WHEN LOWER(status) IN ('acknowledged', 'snoozed') THEN 'snoozed'
  ELSE 'resolved'
END;

UPDATE alerts
SET title = COALESCE(NULLIF(BTRIM(title), ''), INITCAP(REPLACE(type, '_', ' ')))
WHERE title IS NULL OR BTRIM(title) = '';

UPDATE alerts
SET body = COALESCE(NULLIF(BTRIM(body), ''), message)
WHERE body IS NULL OR BTRIM(body) = '';

ALTER TABLE alerts ALTER COLUMN type SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN title SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN body SET NOT NULL;

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_type_check
  CHECK (type IN ('gst_due', 'itc_mismatch', 'cash_runway', 'unmatched', 'duplicate'));

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_severity_check;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_severity_check
  CHECK (severity IN ('critical', 'warning', 'info'));

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_status_check;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_status_check
  CHECK (status IN ('open', 'snoozed', 'resolved'));

-- 6) integrations: workspace-level connection states
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hdfc', 'icici', 'razorpay', 'gpay', 'stripe', 'tally', 'whatsapp', 'zohobooks')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'error', 'syncing', 'disconnected')),
  last_synced_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

DROP TRIGGER IF EXISTS trg_integrations_touch_updated_at ON integrations;
CREATE TRIGGER trg_integrations_touch_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_integrations_workspace_status
ON integrations (workspace_id, status);

-- 7) RLS policies
CREATE OR REPLACE FUNCTION public.current_request_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_uid UUID;
BEGIN
  BEGIN
    EXECUTE 'SELECT auth.uid()' INTO v_uid;
  EXCEPTION
    WHEN undefined_function OR invalid_schema_name THEN
      v_uid := NULL;
  END;

  IF v_uid IS NULL THEN
    BEGIN
      v_uid := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    EXCEPTION
      WHEN OTHERS THEN
        v_uid := NULL;
    END;
  END IF;

  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = target_workspace
      AND wm.user_id = public.current_request_user_id()
      AND wm.status = 'active'
  )
$$;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspaces_member_access ON workspaces;
CREATE POLICY workspaces_member_access
ON workspaces
FOR ALL
USING (public.is_workspace_member(id))
WITH CHECK (public.is_workspace_member(id));

DROP POLICY IF EXISTS workspace_members_select_self ON workspace_members;
CREATE POLICY workspace_members_select_self
ON workspace_members
FOR SELECT
USING (user_id = public.current_request_user_id());

DROP POLICY IF EXISTS workspace_members_block_mutation ON workspace_members;
CREATE POLICY workspace_members_block_mutation
ON workspace_members
FOR ALL
USING (FALSE)
WITH CHECK (FALSE);

DROP POLICY IF EXISTS categories_workspace_access ON categories;
CREATE POLICY categories_workspace_access
ON categories
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS transactions_workspace_access ON transactions;
CREATE POLICY transactions_workspace_access
ON transactions
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS alerts_workspace_access ON alerts;
CREATE POLICY alerts_workspace_access
ON alerts
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS integrations_workspace_access ON integrations;
CREATE POLICY integrations_workspace_access
ON integrations
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
