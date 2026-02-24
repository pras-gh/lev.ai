-- Canonical connector model (minimum):
-- connections, sync_runs, source_events alignment, transactions canonical source fields,
-- and optional invoices table for phase-2.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Connections: canonical connector registry
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'syncing', 'error', 'disconnected')),
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  secrets_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connections_workspace_status
ON connections (workspace_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_connections_touch_updated_at ON connections;
CREATE TRIGGER trg_connections_touch_updated_at
BEFORE UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connections_workspace_access ON connections;
CREATE POLICY connections_workspace_access
ON connections
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Backfill canonical connections from existing integrations.
INSERT INTO connections (
  workspace_id,
  provider,
  status,
  scopes,
  secrets_ref,
  metadata
)
SELECT
  i.workspace_id,
  i.provider,
  CASE
    WHEN i.status IN ('connected', 'syncing', 'error', 'disconnected') THEN i.status
    ELSE 'disconnected'
  END,
  COALESCE(i.meta->'scopes', '[]'::jsonb),
  CASE
    WHEN NULLIF(COALESCE(i.meta->>'credentialTokenPlaceholder', ''), '') IS NOT NULL
      THEN CONCAT('integration_meta:', i.provider)
    ELSE NULL
  END,
  COALESCE(i.meta, '{}'::jsonb)
FROM integrations i
ON CONFLICT (workspace_id, provider)
DO UPDATE
SET
  status = EXCLUDED.status,
  scopes = CASE
    WHEN jsonb_typeof(EXCLUDED.scopes) = 'array' THEN EXCLUDED.scopes
    ELSE COALESCE(connections.scopes, '[]'::jsonb)
  END,
  metadata = COALESCE(connections.metadata, '{}'::jsonb) || EXCLUDED.metadata,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 2) sync_runs: canonical run ledger (table, not view)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'sync_runs'
      AND c.relkind = 'v'
  ) THEN
    EXECUTE 'DROP VIEW public.sync_runs';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('backfill', 'delta', 'webhook')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'success', 'partial', 'failed', 'cancelled')),
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_workspace_started
ON sync_runs (workspace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_connection_started
ON sync_runs (connection_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_status_started
ON sync_runs (status, started_at DESC);

DROP TRIGGER IF EXISTS trg_sync_runs_touch_updated_at ON sync_runs;
CREATE TRIGGER trg_sync_runs_touch_updated_at
BEFORE UPDATE ON sync_runs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_runs_workspace_access ON sync_runs;
CREATE POLICY sync_runs_workspace_access
ON sync_runs
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

-- Backfill sync_runs from ingestion_runs where possible.
INSERT INTO sync_runs (
  workspace_id,
  connection_id,
  type,
  started_at,
  finished_at,
  status,
  stats_json,
  error,
  created_at,
  updated_at
)
SELECT
  ir.workspace_id,
  c.id,
  CASE
    WHEN LOWER(ir.mode) IN ('simulated_pull_v1', 'backfill') THEN 'backfill'
    WHEN LOWER(ir.mode) = 'webhook' THEN 'webhook'
    ELSE 'delta'
  END,
  COALESCE(ir.started_at, ir.created_at),
  ir.finished_at,
  CASE
    WHEN ir.status IN ('queued', 'running', 'success', 'partial', 'failed', 'cancelled') THEN ir.status
    ELSE 'failed'
  END,
  jsonb_build_object(
    'provider', ir.provider,
    'rows_fetched', ir.rows_fetched,
    'rows_ingested', ir.rows_inserted,
    'rows_deduped', ir.rows_deduped,
    'mode', ir.mode,
    'metadata', COALESCE(ir.metadata, '{}'::jsonb)
  ),
  ir.error,
  ir.created_at,
  ir.updated_at
FROM ingestion_runs ir
INNER JOIN connections c
  ON c.workspace_id = ir.workspace_id
 AND c.provider = ir.provider
LEFT JOIN sync_runs sr
  ON sr.workspace_id = ir.workspace_id
 AND sr.connection_id = c.id
 AND sr.started_at = COALESCE(ir.started_at, ir.created_at)
 AND sr.type = CASE
   WHEN LOWER(ir.mode) IN ('simulated_pull_v1', 'backfill') THEN 'backfill'
   WHEN LOWER(ir.mode) = 'webhook' THEN 'webhook'
   ELSE 'delta'
 END
WHERE sr.id IS NULL;

-- -----------------------------------------------------------------------------
-- 3) source_events alignment to canonical schema
-- -----------------------------------------------------------------------------
-- Ensure a canonical connection exists for any source_events provider first.
INSERT INTO connections (
  workspace_id,
  provider,
  status,
  scopes,
  metadata
)
SELECT DISTINCT
  se.workspace_id,
  se.source,
  'disconnected',
  '[]'::jsonb,
  jsonb_build_object('backfill', 'from_source_events')
FROM source_events se
LEFT JOIN connections c
  ON c.workspace_id = se.workspace_id
 AND c.provider = se.source
WHERE c.id IS NULL;

ALTER TABLE source_events
  ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS payload_json JSONB,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

UPDATE source_events se
SET connection_id = c.id
FROM connections c
WHERE se.connection_id IS NULL
  AND c.workspace_id = se.workspace_id
  AND c.provider = se.source;

UPDATE source_events
SET external_id = external_txn_id
WHERE external_id IS NULL;

UPDATE source_events
SET event_type = 'transaction'
WHERE event_type IS NULL OR BTRIM(event_type) = '';

UPDATE source_events
SET payload_json = COALESCE(payload, '{}'::jsonb)
WHERE payload_json IS NULL;

UPDATE source_events
SET received_at = COALESCE(first_seen_at, created_at, NOW())
WHERE received_at IS NULL;

ALTER TABLE source_events ALTER COLUMN connection_id SET NOT NULL;
ALTER TABLE source_events ALTER COLUMN external_id SET NOT NULL;
ALTER TABLE source_events ALTER COLUMN event_type SET NOT NULL;
ALTER TABLE source_events ALTER COLUMN payload_json SET NOT NULL;
ALTER TABLE source_events ALTER COLUMN received_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_events_connection_external_uniq
ON source_events (connection_id, external_id);

CREATE INDEX IF NOT EXISTS idx_source_events_connection_received
ON source_events (connection_id, received_at DESC);

-- -----------------------------------------------------------------------------
-- 4) transactions canonical source fields
-- -----------------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,
  ADD COLUMN IF NOT EXISTS account_ref TEXT,
  ADD COLUMN IF NOT EXISTS gst_candidate BOOLEAN;

UPDATE transactions
SET source_provider = source
WHERE source_provider IS NULL;

UPDATE transactions
SET source_external_id = external_ref
WHERE source_external_id IS NULL;

UPDATE transactions
SET account_ref = account_id::text
WHERE account_ref IS NULL
  AND account_id IS NOT NULL;

UPDATE transactions
SET gst_candidate = gst_applicable
WHERE gst_candidate IS NULL;

ALTER TABLE transactions ALTER COLUMN gst_candidate SET DEFAULT FALSE;
UPDATE transactions SET gst_candidate = FALSE WHERE gst_candidate IS NULL;
ALTER TABLE transactions ALTER COLUMN gst_candidate SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_source_provider
ON transactions (workspace_id, source_provider, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace_source_external
ON transactions (workspace_id, source_external_id)
WHERE source_external_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5) invoices (optional, phase-2)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_no TEXT NOT NULL,
  party TEXT,
  gstin TEXT,
  taxable_value NUMERIC(14, 2),
  gst_amount NUMERIC(14, 2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'overdue')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status
ON invoices (workspace_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_invoices_touch_updated_at ON invoices;
CREATE TRIGGER trg_invoices_touch_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_workspace_access ON invoices;
CREATE POLICY invoices_workspace_access
ON invoices
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
