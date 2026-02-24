-- Enforce idempotent CSV imports by guaranteeing one row_hash per business.
-- Safe to run in Supabase SQL editor as well.

DROP INDEX IF EXISTS idx_transactions_business_row_hash;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_business_rowhash_uniq
ON transactions(business_id, row_hash)
WHERE row_hash IS NOT NULL;
