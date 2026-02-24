-- Ledger safety extensions for transactions
-- Rule: no hard delete for accounting correction; use reversal entries + optional soft-hide for UI

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hidden_by TEXT,
  ADD COLUMN IF NOT EXISTS reversal_of_transaction_id BIGINT REFERENCES transactions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reversed_by_transaction_id BIGINT REFERENCES transactions(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reversal_of_unique
ON transactions (reversal_of_transaction_id)
WHERE reversal_of_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reversed_by_unique
ON transactions (reversed_by_transaction_id)
WHERE reversed_by_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_business_hidden_occurred_at
ON transactions (business_id, is_hidden, occurred_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_transactions_not_self_reversal'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_not_self_reversal
      CHECK (reversal_of_transaction_id IS NULL OR reversal_of_transaction_id <> id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_transactions_not_self_reversed_by'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_not_self_reversed_by
      CHECK (reversed_by_transaction_id IS NULL OR reversed_by_transaction_id <> id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_posted_transaction_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot delete posted transactions. Create a reversal transaction instead.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_transaction_delete ON transactions;

CREATE TRIGGER trg_prevent_posted_transaction_delete
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_transaction_delete();
