-- Rules engine v0: workspace-scoped idempotency and duplicate suggestion performance.

-- Keep row_hash as the canonical storage field and expose hash as a generated alias.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'hash'
  ) THEN
    ALTER TABLE transactions
      ADD COLUMN hash TEXT GENERATED ALWAYS AS (row_hash) STORED;
  END IF;
END $$;

-- Enforce hash uniqueness at workspace scope.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_workspace_hash_uniq
ON transactions (workspace_id, hash)
WHERE hash IS NOT NULL;

DROP INDEX IF EXISTS transactions_workspace_rowhash_uniq;
DROP INDEX IF EXISTS transactions_business_rowhash_uniq;

-- Helpful access paths for duplicate suggestion queries/actions.
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_row_hash
ON transactions (workspace_id, row_hash)
WHERE row_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_workspace_duplicate_status_created
ON alerts (workspace_id, type, status, created_at DESC)
WHERE type = 'duplicate';

CREATE INDEX IF NOT EXISTS idx_alerts_related_transaction_ids_gin
ON alerts
USING GIN (related_transaction_ids);
