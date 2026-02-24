-- Non-negotiable sync guarantees:
-- 1) Source-event idempotency with deterministic key
-- 2) Connection-level cursor state fields
-- 3) Ledger-safe protections (no hard delete)

-- -----------------------------------------------------------------------------
-- Connection sync state fields per integration
-- -----------------------------------------------------------------------------
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS last_cursor TEXT,
  ADD COLUMN IF NOT EXISTS backfill_status TEXT,
  ADD COLUMN IF NOT EXISTS error_state TEXT;

UPDATE integrations
SET backfill_status = 'pending'
WHERE backfill_status IS NULL OR BTRIM(backfill_status) = '';

ALTER TABLE integrations ALTER COLUMN backfill_status SET DEFAULT 'pending';
ALTER TABLE integrations ALTER COLUMN backfill_status SET NOT NULL;

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_backfill_status_check;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_backfill_status_check
  CHECK (backfill_status IN ('pending', 'running', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_integrations_workspace_backfill_status
ON integrations (workspace_id, backfill_status, updated_at DESC);

-- -----------------------------------------------------------------------------
-- Deterministic source events for import idempotency
-- key = source + account_id + external_txn_id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  external_txn_id TEXT NOT NULL,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  canonical_record_id BIGINT REFERENCES canonical_records(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'duplicate', 'error')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_count INTEGER NOT NULL DEFAULT 1 CHECK (seen_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, source, account_id, external_txn_id)
);

CREATE INDEX IF NOT EXISTS idx_source_events_workspace_status_seen
ON source_events (workspace_id, status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_events_workspace_source_account
ON source_events (workspace_id, source, account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_events_transaction
ON source_events (transaction_id)
WHERE transaction_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_source_events_touch_updated_at ON source_events;
CREATE TRIGGER trg_source_events_touch_updated_at
BEFORE UPDATE ON source_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE source_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_events_workspace_access ON source_events;
CREATE POLICY source_events_workspace_access
ON source_events
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- Reconciliation-safe states and hard delete prevention
-- -----------------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS adjusted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adjusted_reason TEXT,
  ADD COLUMN IF NOT EXISTS adjusted_by TEXT;

CREATE OR REPLACE FUNCTION public.prevent_transactions_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Ledger-safe rule: hard delete is not allowed on transactions. Use hidden/reversed/adjusted states.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_transactions_delete ON transactions;
CREATE TRIGGER trg_prevent_transactions_delete
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_transactions_delete();
