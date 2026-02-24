-- Security hardening for multi-tenant isolation.
-- 1) Ensure workspace scope exists on all tenant data tables.
-- 2) Enable/extend RLS policies to workspace membership.
-- 3) Keep API-side workspace membership checks mandatory.

-- Add workspace_id to legacy tenant tables.
ALTER TABLE monthly_reports ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Backfill workspace_id from existing business linkage.
UPDATE monthly_reports mr
SET workspace_id = w.id
FROM workspaces w
WHERE mr.workspace_id IS NULL
  AND w.business_id = mr.business_id;

UPDATE audit_logs al
SET workspace_id = w.id
FROM workspaces w
WHERE al.workspace_id IS NULL
  AND al.business_id IS NOT NULL
  AND w.business_id = al.business_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'monthly_reports_workspace_id_fkey'
  ) THEN
    ALTER TABLE monthly_reports
      ADD CONSTRAINT monthly_reports_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_workspace_id_fkey'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE monthly_reports ALTER COLUMN workspace_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_reports_workspace_month_unique
ON monthly_reports (workspace_id, report_month);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_workspace_month
ON monthly_reports (workspace_id, report_month DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_entity_created_at
ON audit_logs (workspace_id, entity_type, created_at DESC);

-- For tables where business_id is optional (audit_logs), set workspace_id when business is known.
CREATE OR REPLACE FUNCTION public.set_workspace_id_from_business_optional()
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monthly_reports_set_workspace_id ON monthly_reports;
CREATE TRIGGER trg_monthly_reports_set_workspace_id
BEFORE INSERT OR UPDATE OF business_id, workspace_id ON monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_workspace_id_from_business();

DROP TRIGGER IF EXISTS trg_audit_logs_set_workspace_id ON audit_logs;
CREATE TRIGGER trg_audit_logs_set_workspace_id
BEFORE INSERT OR UPDATE OF business_id, workspace_id ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_workspace_id_from_business_optional();

-- Extend RLS to additional workspace-scoped tables.
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monthly_reports_workspace_access ON monthly_reports;
CREATE POLICY monthly_reports_workspace_access
ON monthly_reports
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS audit_logs_workspace_access ON audit_logs;
CREATE POLICY audit_logs_workspace_access
ON audit_logs
FOR ALL
USING (public.is_workspace_member(workspace_id))
WITH CHECK (public.is_workspace_member(workspace_id));
