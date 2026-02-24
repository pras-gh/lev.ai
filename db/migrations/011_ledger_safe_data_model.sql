-- Ledger-safe data model extensions for finance trust:
-- - Idempotent ingestion keys
-- - Explicit provenance fields
-- - Soft-void (no hard delete for accounting data)
-- - Immutable audit trail and category change logging
-- - Missing core tables: accounts, transaction_categories, reconciliations, gst_snapshots

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Integrations: add normalized source_type
-- -----------------------------------------------------------------------------
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS source_type TEXT;

UPDATE integrations
SET source_type = CASE
  WHEN provider IN ('hdfc', 'icici', 'gpay') THEN 'bank'
  WHEN provider = 'razorpay' THEN 'razorpay'
  WHEN provider = 'stripe' THEN 'stripe'
  WHEN provider = 'tally' THEN 'tally'
  WHEN provider = 'zohobooks' THEN 'zoho'
  WHEN provider = 'whatsapp' THEN 'other'
  ELSE 'other'
END
WHERE source_type IS NULL OR BTRIM(source_type) = '';

ALTER TABLE integrations ALTER COLUMN source_type SET DEFAULT 'bank';
UPDATE integrations SET source_type = 'bank' WHERE source_type IS NULL;
ALTER TABLE integrations ALTER COLUMN source_type SET NOT NULL;

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_source_type_check;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_source_type_check
  CHECK (source_type IN ('bank', 'razorpay', 'zoho', 'tally', 'stripe', 'cash', 'manual', 'other'));

-- -----------------------------------------------------------------------------
-- Accounts: bank/cash accounts used by transaction provenance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  account_type TEXT NOT NULL DEFAULT 'bank'
    CHECK (account_type IN ('bank', 'cash', 'wallet', 'credit', 'other')),
  name TEXT NOT NULL,
  account_number_masked TEXT,
  ifsc TEXT,
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_workspace_type_name
ON accounts (workspace_id, account_type, name);

CREATE INDEX IF NOT EXISTS idx_accounts_integration
ON accounts (integration_id)
WHERE integration_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_accounts_touch_updated_at ON accounts;
CREATE TRIGGER trg_accounts_touch_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Transactions: idempotency, soft-void, and provenance
-- -----------------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by TEXT;

UPDATE transactions t
SET source_id = i.id
FROM integrations i
WHERE t.source_id IS NULL
  AND t.workspace_id = i.workspace_id
  AND LOWER(t.source) = LOWER(i.provider);

UPDATE transactions
SET ingested_at = created_at
WHERE ingested_at IS NULL;

UPDATE transactions
SET raw_payload = metadata
WHERE raw_payload = '{}'::jsonb
  AND metadata <> '{}'::jsonb;

UPDATE transactions
SET
  is_void = TRUE,
  void_reason = COALESCE(void_reason, NULLIF(hidden_reason, ''), 'voided via legacy hidden flag'),
  voided_at = COALESCE(voided_at, hidden_at)
WHERE is_void = FALSE
  AND is_hidden = TRUE;

ALTER TABLE transactions ALTER COLUMN ingested_at SET DEFAULT NOW();
UPDATE transactions SET ingested_at = NOW() WHERE ingested_at IS NULL;
ALTER TABLE transactions ALTER COLUMN ingested_at SET NOT NULL;

-- Replace strict legacy unique key with ledger-safe idempotency key.
DROP INDEX IF EXISTS idx_transactions_business_external_ref;

CREATE INDEX IF NOT EXISTS idx_transactions_business_external_ref
ON transactions (business_id, external_ref)
WHERE external_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source_external_ref_uniq
ON transactions (source_id, external_ref)
WHERE source_id IS NOT NULL
  AND external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_void_date
ON transactions (workspace_id, is_void, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_source_ingested
ON transactions (workspace_id, source_id, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date
ON transactions (account_id, occurred_at DESC)
WHERE account_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Sync runs: compatibility projection for requested core model
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sync_runs AS
SELECT
  id,
  workspace_id,
  provider AS source_type,
  mode,
  status,
  started_at,
  finished_at,
  rows_inserted AS rows_ingested,
  error AS errors,
  metadata,
  created_at,
  updated_at
FROM ingestion_runs;

-- -----------------------------------------------------------------------------
-- Shared helper: derive scope from transaction_id for child tables
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_scope_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tx_workspace UUID;
  tx_business BIGINT;
BEGIN
  SELECT t.workspace_id, t.business_id
  INTO tx_workspace, tx_business
  FROM transactions t
  WHERE t.id = NEW.transaction_id
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
    RAISE EXCEPTION 'Scope mismatch for transaction_id %', NEW.transaction_id;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Transaction categories: model suggestion + manual override history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_categories (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  transaction_id BIGINT NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  model_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  model_confidence NUMERIC(5, 4)
    CHECK (model_confidence IS NULL OR (model_confidence >= 0 AND model_confidence <= 1)),
  manual_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  final_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_categories_workspace_final
ON transaction_categories (workspace_id, final_category_id);

CREATE INDEX IF NOT EXISTS idx_transaction_categories_workspace_override
ON transaction_categories (workspace_id, is_manual_override);

DROP TRIGGER IF EXISTS trg_transaction_categories_touch_updated_at ON transaction_categories;
CREATE TRIGGER trg_transaction_categories_touch_updated_at
BEFORE UPDATE ON transaction_categories
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_transaction_categories_set_scope ON transaction_categories;
CREATE TRIGGER trg_transaction_categories_set_scope
BEFORE INSERT OR UPDATE OF transaction_id, workspace_id, business_id ON transaction_categories
FOR EACH ROW
EXECUTE FUNCTION public.set_scope_from_transaction();

-- Keep transactions.category_id in sync with latest categorization decision.
CREATE OR REPLACE FUNCTION public.apply_transaction_category_decision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  chosen_category BIGINT;
BEGIN
  chosen_category := COALESCE(NEW.final_category_id, NEW.manual_category_id, NEW.model_category_id);

  UPDATE transactions
  SET
    category_id = chosen_category,
    updated_at = NOW()
  WHERE id = NEW.transaction_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_transaction_category_decision ON transaction_categories;
CREATE TRIGGER trg_apply_transaction_category_decision
AFTER INSERT OR UPDATE OF model_category_id, manual_category_id, final_category_id
ON transaction_categories
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaction_category_decision();

-- -----------------------------------------------------------------------------
-- Reconciliations: matched/unmatched states per transaction
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliations (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  transaction_id BIGINT NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (state IN ('matched', 'unmatched', 'needs_review')),
  match_group_id UUID,
  matched_with_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5, 4)
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_workspace_state
ON reconciliations (workspace_id, state);

CREATE INDEX IF NOT EXISTS idx_reconciliations_workspace_group
ON reconciliations (workspace_id, match_group_id)
WHERE match_group_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_reconciliations_touch_updated_at ON reconciliations;
CREATE TRIGGER trg_reconciliations_touch_updated_at
BEFORE UPDATE ON reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_reconciliations_set_scope ON reconciliations;
CREATE TRIGGER trg_reconciliations_set_scope
BEFORE INSERT OR UPDATE OF transaction_id, workspace_id, business_id ON reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.set_scope_from_transaction();

-- Backfill reconciliations from existing transaction matched flags.
INSERT INTO reconciliations (
  workspace_id,
  business_id,
  transaction_id,
  state,
  match_group_id,
  confidence,
  metadata
)
SELECT
  t.workspace_id,
  t.business_id,
  t.id,
  CASE
    WHEN t.matched THEN 'matched'
    ELSE 'unmatched'
  END,
  t.match_group_id,
  t.confidence,
  jsonb_build_object('backfill', 'from_transactions')
FROM transactions t
ON CONFLICT (transaction_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Alerts: action URL + dedicated metadata field
-- -----------------------------------------------------------------------------
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE alerts
SET metadata = payload
WHERE metadata = '{}'::jsonb
  AND payload <> '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_alerts_workspace_type_severity_status
ON alerts (workspace_id, type, severity, status);

-- -----------------------------------------------------------------------------
-- GST snapshots: period-level payable and ITC view
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gst_snapshots (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  estimated_payable NUMERIC(14, 2) NOT NULL DEFAULT 0,
  itc_claimable NUMERIC(14, 2) NOT NULL DEFAULT 0,
  itc_mismatch NUMERIC(14, 2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, period)
);

CREATE INDEX IF NOT EXISTS idx_gst_snapshots_workspace_period
ON gst_snapshots (workspace_id, period DESC);

DROP TRIGGER IF EXISTS trg_gst_snapshots_touch_updated_at ON gst_snapshots;
CREATE TRIGGER trg_gst_snapshots_touch_updated_at
BEFORE UPDATE ON gst_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Monthly reports: explicit finance fields for dashboard/reporting
-- -----------------------------------------------------------------------------
ALTER TABLE monthly_reports
  ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS expense_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS profit_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS runway_days NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS anomalies JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE monthly_reports
SET
  revenue_amount = COALESCE(revenue_amount, total_income_minor::NUMERIC),
  expense_amount = COALESCE(expense_amount, total_expense_minor::NUMERIC),
  profit_amount = COALESCE(profit_amount, (total_income_minor - total_expense_minor)::NUMERIC)
WHERE revenue_amount IS NULL
   OR expense_amount IS NULL
   OR profit_amount IS NULL;

ALTER TABLE monthly_reports ALTER COLUMN revenue_amount SET DEFAULT 0;
ALTER TABLE monthly_reports ALTER COLUMN expense_amount SET DEFAULT 0;
ALTER TABLE monthly_reports ALTER COLUMN profit_amount SET DEFAULT 0;

UPDATE monthly_reports SET revenue_amount = 0 WHERE revenue_amount IS NULL;
UPDATE monthly_reports SET expense_amount = 0 WHERE expense_amount IS NULL;
UPDATE monthly_reports SET profit_amount = 0 WHERE profit_amount IS NULL;

ALTER TABLE monthly_reports ALTER COLUMN revenue_amount SET NOT NULL;
ALTER TABLE monthly_reports ALTER COLUMN expense_amount SET NOT NULL;
ALTER TABLE monthly_reports ALTER COLUMN profit_amount SET NOT NULL;

-- -----------------------------------------------------------------------------
-- Audit logs: immutable by design + category-change audit hook
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable and cannot be updated or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.log_transaction_category_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor TEXT;
  request_id_value TEXT;
BEGIN
  IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    actor := NULLIF(current_setting('app.user_id', true), '');
    IF actor IS NULL THEN
      actor := NULLIF(current_setting('request.jwt.claim.sub', true), '');
    END IF;

    request_id_value := NULLIF(current_setting('app.request_id', true), '');

    INSERT INTO audit_logs (
      workspace_id,
      business_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state,
      request_id
    )
    VALUES (
      NEW.workspace_id,
      NEW.business_id,
      CASE WHEN actor IS NULL THEN 'system' ELSE 'user' END,
      actor,
      'Transaction',
      NEW.id::TEXT,
      'transaction.category.updated',
      jsonb_build_object('category_id', OLD.category_id),
      jsonb_build_object('category_id', NEW.category_id),
      request_id_value
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_audit_category_update ON transactions;
CREATE TRIGGER trg_transactions_audit_category_update
AFTER UPDATE OF category_id ON transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_category_change();

-- -----------------------------------------------------------------------------
-- Row-level security for new tables
-- -----------------------------------------------------------------------------
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_workspace_access ON accounts;
CREATE POLICY accounts_workspace_access
ON accounts
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS transaction_categories_workspace_access ON transaction_categories;
CREATE POLICY transaction_categories_workspace_access
ON transaction_categories
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS reconciliations_workspace_access ON reconciliations;
CREATE POLICY reconciliations_workspace_access
ON reconciliations
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS gst_snapshots_workspace_access ON gst_snapshots;
CREATE POLICY gst_snapshots_workspace_access
ON gst_snapshots
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
