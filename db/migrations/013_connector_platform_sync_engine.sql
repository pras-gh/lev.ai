-- Connector platform + sync engine core primitives:
-- - Token vault metadata per workspace/provider
-- - Sync cursor state for backfill/delta scheduling
-- - Webhook inbox for idempotent event ingestion
-- - Canonical normalized records linking source payloads to ledger writes

CREATE TABLE IF NOT EXISTS connector_tokens (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_hint TEXT,
  token_ciphertext TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider, token_hash)
);

CREATE INDEX IF NOT EXISTS idx_connector_tokens_workspace_provider_status
ON connector_tokens (workspace_id, provider, status);

CREATE INDEX IF NOT EXISTS idx_connector_tokens_workspace_updated
ON connector_tokens (workspace_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_connector_tokens_touch_updated_at ON connector_tokens;
CREATE TRIGGER trg_connector_tokens_touch_updated_at
BEFORE UPDATE ON connector_tokens
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS connector_sync_cursors (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  stream TEXT NOT NULL DEFAULT 'transactions',
  cursor TEXT,
  sync_mode TEXT NOT NULL DEFAULT 'delta'
    CHECK (sync_mode IN ('initial_backfill', 'delta', 'webhook_replay')),
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'queued', 'running', 'error')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider, stream)
);

CREATE INDEX IF NOT EXISTS idx_connector_sync_cursors_status_next_run
ON connector_sync_cursors (status, next_run_at ASC);

CREATE INDEX IF NOT EXISTS idx_connector_sync_cursors_workspace_provider
ON connector_sync_cursors (workspace_id, provider, stream);

DROP TRIGGER IF EXISTS trg_connector_sync_cursors_touch_updated_at ON connector_sync_cursors;
CREATE TRIGGER trg_connector_sync_cursors_touch_updated_at
BEFORE UPDATE ON connector_sync_cursors
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS connector_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  occurred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_connector_webhook_events_workspace_status
ON connector_webhook_events (workspace_id, status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_connector_webhook_events_provider_received
ON connector_webhook_events (provider, received_at DESC);

DROP TRIGGER IF EXISTS trg_connector_webhook_events_touch_updated_at ON connector_webhook_events;
CREATE TRIGGER trg_connector_webhook_events_touch_updated_at
BEFORE UPDATE ON connector_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS canonical_records (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_kind TEXT NOT NULL
    CHECK (entity_kind IN ('transaction', 'invoice', 'refund', 'payout', 'fee', 'adjustment')),
  external_id TEXT,
  occurred_at TIMESTAMPTZ,
  direction txn_type,
  amount_minor NUMERIC(14, 2),
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  description TEXT,
  counterparty TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  ingestion_run_id BIGINT REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider, entity_kind, external_id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_records_workspace_occurred
ON canonical_records (workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_canonical_records_workspace_provider
ON canonical_records (workspace_id, provider, entity_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_canonical_records_transaction
ON canonical_records (transaction_id)
WHERE transaction_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_canonical_records_touch_updated_at ON canonical_records;
CREATE TRIGGER trg_canonical_records_touch_updated_at
BEFORE UPDATE ON canonical_records
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE connector_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connector_tokens_workspace_access ON connector_tokens;
CREATE POLICY connector_tokens_workspace_access
ON connector_tokens
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS connector_sync_cursors_workspace_access ON connector_sync_cursors;
CREATE POLICY connector_sync_cursors_workspace_access
ON connector_sync_cursors
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS connector_webhook_events_workspace_access ON connector_webhook_events;
CREATE POLICY connector_webhook_events_workspace_access
ON connector_webhook_events
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS canonical_records_workspace_access ON canonical_records;
CREATE POLICY canonical_records_workspace_access
ON canonical_records
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
