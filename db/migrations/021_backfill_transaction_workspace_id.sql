-- Backfill workspace scope on historical transactions created before
-- CSV ingest started writing workspace_id.
-- Dashboard and metrics APIs are workspace-scoped, so null workspace_id rows are invisible.

UPDATE transactions t
SET workspace_id = w.id
FROM workspaces w
WHERE t.workspace_id IS NULL
  AND t.business_id = w.business_id;
