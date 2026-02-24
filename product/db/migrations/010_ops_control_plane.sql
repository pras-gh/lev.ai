-- Operational control-plane tables for reliable ingestion, jobs, and deliveries.

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'sync',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'success', 'partial', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  cursor TEXT,
  rows_fetched INTEGER NOT NULL DEFAULT 0 CHECK (rows_fetched >= 0),
  rows_inserted INTEGER NOT NULL DEFAULT 0 CHECK (rows_inserted >= 0),
  rows_deduped INTEGER NOT NULL DEFAULT 0 CHECK (rows_deduped >= 0),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_workspace_provider_created
ON ingestion_runs (workspace_id, provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status_created
ON ingestion_runs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS job_runs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, job_type, dedupe_key, attempt)
);

CREATE INDEX IF NOT EXISTS idx_job_runs_workspace_type_created
ON job_runs (workspace_id, job_type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_runs_workspace_type_active
ON job_runs (workspace_id, job_type)
WHERE status IN ('queued', 'running');

CREATE TABLE IF NOT EXISTS event_outbox (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, event_type, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_event_outbox_status_available
ON event_outbox (status, available_at ASC);

CREATE INDEX IF NOT EXISTS idx_event_outbox_workspace_created
ON event_outbox (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  outbox_id BIGINT NOT NULL REFERENCES event_outbox(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'webhook', 'dashboard')),
  destination TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
  http_status INTEGER,
  provider_message_id TEXT,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_outbox_attempted
ON delivery_attempts (outbox_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_workspace_attempted
ON delivery_attempts (workspace_id, attempted_at DESC);

DROP TRIGGER IF EXISTS trg_ingestion_runs_touch_updated_at ON ingestion_runs;
CREATE TRIGGER trg_ingestion_runs_touch_updated_at
BEFORE UPDATE ON ingestion_runs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_job_runs_touch_updated_at ON job_runs;
CREATE TRIGGER trg_job_runs_touch_updated_at
BEFORE UPDATE ON job_runs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_event_outbox_touch_updated_at ON event_outbox;
CREATE TRIGGER trg_event_outbox_touch_updated_at
BEFORE UPDATE ON event_outbox
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ingestion_runs_workspace_access ON ingestion_runs;
CREATE POLICY ingestion_runs_workspace_access
ON ingestion_runs
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS job_runs_workspace_access ON job_runs;
CREATE POLICY job_runs_workspace_access
ON job_runs
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS event_outbox_workspace_access ON event_outbox;
CREATE POLICY event_outbox_workspace_access
ON event_outbox
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS delivery_attempts_workspace_access ON delivery_attempts;
CREATE POLICY delivery_attempts_workspace_access
ON delivery_attempts
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
