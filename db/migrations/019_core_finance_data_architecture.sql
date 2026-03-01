-- Core finance data architecture (normalized extensions):
-- Required core entities:
-- - workspaces (existing)
-- - businesses (existing)
-- - accounts (existing)
-- - ledger_entries (new)
-- - vendors (new)
-- - customers (new)
-- - metrics_cache (new)
-- - alerts (existing)
-- - reconciliations (existing)
-- - forecasts (new)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Vendors and customers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  pan TEXT,
  email TEXT,
  phone TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vendors_workspace_active_name
ON vendors (workspace_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_vendors_workspace_gstin
ON vendors (workspace_id, gstin)
WHERE gstin IS NOT NULL;

DROP TRIGGER IF EXISTS trg_vendors_touch_updated_at ON vendors;
CREATE TRIGGER trg_vendors_touch_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  pan TEXT,
  email TEXT,
  phone TEXT,
  credit_terms_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_customers_workspace_active_name
ON customers (workspace_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_customers_workspace_gstin
ON customers (workspace_id, gstin)
WHERE gstin IS NOT NULL;

DROP TRIGGER IF EXISTS trg_customers_touch_updated_at ON customers;
CREATE TRIGGER trg_customers_touch_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Normalize transaction counterparties with optional links.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id
ON transactions (vendor_id)
WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id
ON transactions (customer_id)
WHERE customer_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Ledger entries (double-entry compatible)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  journal_id UUID NOT NULL DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT (vendor_id IS NOT NULL AND customer_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_workspace_occurred
ON ledger_entries (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_workspace_account
ON ledger_entries (workspace_id, account_id, occurred_at DESC)
WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction
ON ledger_entries (transaction_id)
WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_workspace_journal
ON ledger_entries (workspace_id, journal_id);

DROP TRIGGER IF EXISTS trg_ledger_entries_touch_updated_at ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_touch_updated_at
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_ledger_entry_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tx_workspace UUID;
  tx_business BIGINT;
  acct_workspace UUID;
  acct_business BIGINT;
  vendor_workspace UUID;
  vendor_business BIGINT;
  customer_workspace UUID;
  customer_business BIGINT;
BEGIN
  IF NEW.transaction_id IS NOT NULL THEN
    SELECT workspace_id, business_id
    INTO tx_workspace, tx_business
    FROM transactions
    WHERE id = NEW.transaction_id
    LIMIT 1;

    IF tx_workspace IS NULL OR tx_business IS NULL THEN
      RAISE EXCEPTION 'transaction_id % does not exist', NEW.transaction_id;
    END IF;

    IF NEW.workspace_id IS NULL THEN
      NEW.workspace_id := tx_workspace;
    END IF;
    IF NEW.business_id IS NULL THEN
      NEW.business_id := tx_business;
    END IF;

    IF NEW.workspace_id <> tx_workspace OR NEW.business_id <> tx_business THEN
      RAISE EXCEPTION 'ledger_entries scope mismatch for transaction_id %', NEW.transaction_id;
    END IF;
  END IF;

  IF NEW.account_id IS NOT NULL THEN
    SELECT workspace_id, business_id
    INTO acct_workspace, acct_business
    FROM accounts
    WHERE id = NEW.account_id
    LIMIT 1;

    IF acct_workspace IS NULL OR acct_business IS NULL THEN
      RAISE EXCEPTION 'account_id % does not exist', NEW.account_id;
    END IF;

    IF NEW.workspace_id <> acct_workspace OR NEW.business_id <> acct_business THEN
      RAISE EXCEPTION 'ledger_entries scope mismatch for account_id %', NEW.account_id;
    END IF;
  END IF;

  IF NEW.vendor_id IS NOT NULL THEN
    SELECT workspace_id, business_id
    INTO vendor_workspace, vendor_business
    FROM vendors
    WHERE id = NEW.vendor_id
    LIMIT 1;

    IF NEW.workspace_id <> vendor_workspace OR NEW.business_id <> vendor_business THEN
      RAISE EXCEPTION 'ledger_entries scope mismatch for vendor_id %', NEW.vendor_id;
    END IF;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    SELECT workspace_id, business_id
    INTO customer_workspace, customer_business
    FROM customers
    WHERE id = NEW.customer_id
    LIMIT 1;

    IF NEW.workspace_id <> customer_workspace OR NEW.business_id <> customer_business THEN
      RAISE EXCEPTION 'ledger_entries scope mismatch for customer_id %', NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_entries_enforce_scope ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_enforce_scope
BEFORE INSERT OR UPDATE OF workspace_id, business_id, transaction_id, account_id, vendor_id, customer_id
ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ledger_entry_scope();

-- -----------------------------------------------------------------------------
-- Metrics cache
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metrics_cache (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  metric_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'system',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_cache_workspace_key_scope_uniq
ON metrics_cache (workspace_id, metric_key, md5(metric_scope::text));

CREATE INDEX IF NOT EXISTS idx_metrics_cache_workspace_computed
ON metrics_cache (workspace_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_cache_workspace_expires
ON metrics_cache (workspace_id, expires_at)
WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_metrics_cache_touch_updated_at ON metrics_cache;
CREATE TRIGGER trg_metrics_cache_touch_updated_at
BEFORE UPDATE ON metrics_cache
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Forecasts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forecasts (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  forecast_type TEXT NOT NULL
    CHECK (forecast_type IN ('cashflow', 'revenue', 'expense', 'gst', 'runway', 'custom')),
  horizon_start DATE NOT NULL,
  horizon_end DATE NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  forecast_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_pct NUMERIC(5, 2)
    CHECK (confidence_pct IS NULL OR (confidence_pct >= 0 AND confidence_pct <= 100)),
  created_by TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (horizon_end >= horizon_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forecasts_workspace_type_horizon_model_uniq
ON forecasts (workspace_id, forecast_type, horizon_start, horizon_end, model_version);

CREATE INDEX IF NOT EXISTS idx_forecasts_workspace_status_generated
ON forecasts (workspace_id, status, generated_at DESC);

DROP TRIGGER IF EXISTS trg_forecasts_touch_updated_at ON forecasts;
CREATE TRIGGER trg_forecasts_touch_updated_at
BEFORE UPDATE ON forecasts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Accounts and reconciliations: additional normalized indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_accounts_workspace_name
ON accounts (workspace_id, name);

ALTER TABLE reconciliations
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reconciliations_workspace_reconciled_at
ON reconciliations (workspace_id, reconciled_at DESC)
WHERE reconciled_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Backfill vendors/customers links from legacy transaction.counterparty
-- -----------------------------------------------------------------------------
INSERT INTO vendors (workspace_id, business_id, name, metadata)
SELECT DISTINCT
  t.workspace_id,
  t.business_id,
  BTRIM(t.counterparty) AS name,
  jsonb_build_object('backfill', 'transactions.counterparty')
FROM transactions t
WHERE t.workspace_id IS NOT NULL
  AND t.business_id IS NOT NULL
  AND t.direction = 'debit'
  AND t.counterparty IS NOT NULL
  AND BTRIM(t.counterparty) <> ''
ON CONFLICT (workspace_id, name) DO NOTHING;

INSERT INTO customers (workspace_id, business_id, name, metadata)
SELECT DISTINCT
  t.workspace_id,
  t.business_id,
  BTRIM(t.counterparty) AS name,
  jsonb_build_object('backfill', 'transactions.counterparty')
FROM transactions t
WHERE t.workspace_id IS NOT NULL
  AND t.business_id IS NOT NULL
  AND t.direction = 'credit'
  AND t.counterparty IS NOT NULL
  AND BTRIM(t.counterparty) <> ''
ON CONFLICT (workspace_id, name) DO NOTHING;

UPDATE transactions t
SET vendor_id = v.id
FROM vendors v
WHERE t.vendor_id IS NULL
  AND t.workspace_id = v.workspace_id
  AND LOWER(BTRIM(COALESCE(t.counterparty, ''))) = LOWER(v.name)
  AND t.direction = 'debit';

UPDATE transactions t
SET customer_id = c.id
FROM customers c
WHERE t.customer_id IS NULL
  AND t.workspace_id = c.workspace_id
  AND LOWER(BTRIM(COALESCE(t.counterparty, ''))) = LOWER(c.name)
  AND t.direction = 'credit';

-- -----------------------------------------------------------------------------
-- RLS for new core tables
-- -----------------------------------------------------------------------------
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendors_workspace_access ON vendors;
CREATE POLICY vendors_workspace_access
ON vendors
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS customers_workspace_access ON customers;
CREATE POLICY customers_workspace_access
ON customers
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS ledger_entries_workspace_access ON ledger_entries;
CREATE POLICY ledger_entries_workspace_access
ON ledger_entries
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS metrics_cache_workspace_access ON metrics_cache;
CREATE POLICY metrics_cache_workspace_access
ON metrics_cache
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS forecasts_workspace_access ON forecasts;
CREATE POLICY forecasts_workspace_access
ON forecasts
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
