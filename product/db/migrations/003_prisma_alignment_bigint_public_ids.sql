-- Prisma alignment: keep bigint primary keys, add public string IDs, and align transaction columns/types.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_public_id(prefix TEXT)
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT prefix || '_' || encode(gen_random_bytes(12), 'hex')
$$;

-- Public IDs for safer external exposure while keeping bigint internal IDs.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE businesses ALTER COLUMN public_id SET DEFAULT public.generate_public_id('biz');
UPDATE businesses SET public_id = public.generate_public_id('biz') WHERE public_id IS NULL;
ALTER TABLE businesses ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_public_id ON businesses (public_id);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE categories ALTER COLUMN public_id SET DEFAULT public.generate_public_id('cat');
UPDATE categories SET public_id = public.generate_public_id('cat') WHERE public_id IS NULL;
ALTER TABLE categories ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_public_id ON categories (public_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE transactions ALTER COLUMN public_id SET DEFAULT public.generate_public_id('txn');
UPDATE transactions SET public_id = public.generate_public_id('txn') WHERE public_id IS NULL;
ALTER TABLE transactions ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_public_id ON transactions (public_id);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE alerts ALTER COLUMN public_id SET DEFAULT public.generate_public_id('alr');
UPDATE alerts SET public_id = public.generate_public_id('alr') WHERE public_id IS NULL;
ALTER TABLE alerts ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_public_id ON alerts (public_id);

ALTER TABLE monthly_reports ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE monthly_reports ALTER COLUMN public_id SET DEFAULT public.generate_public_id('mrp');
UPDATE monthly_reports SET public_id = public.generate_public_id('mrp') WHERE public_id IS NULL;
ALTER TABLE monthly_reports ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_reports_public_id ON monthly_reports (public_id);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE audit_logs ALTER COLUMN public_id SET DEFAULT public.generate_public_id('aud');
UPDATE audit_logs SET public_id = public.generate_public_id('aud') WHERE public_id IS NULL;
ALTER TABLE audit_logs ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_public_id ON audit_logs (public_id);

-- Transaction columns expected by Prisma model.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS row_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_business_external_id
ON transactions (business_id, external_id)
WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_business_row_hash
ON transactions (business_id, row_hash)
WHERE row_hash IS NOT NULL;

-- Align amount to Decimal(14,2) storage while keeping the column name stable.
DO $$
DECLARE
  current_udt TEXT;
BEGIN
  SELECT udt_name
  INTO current_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'amount_minor';

  IF current_udt = 'int8' THEN
    ALTER TABLE transactions
      ALTER COLUMN amount_minor TYPE NUMERIC(14, 2)
      USING amount_minor::NUMERIC;
  END IF;
END $$;

-- Backing enum types for Prisma TxnType / TxnStatus.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_type') THEN
    CREATE TYPE txn_type AS ENUM ('credit', 'debit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_status') THEN
    CREATE TYPE txn_status AS ENUM ('pending', 'posted', 'reversed');
  END IF;
END $$;

-- Drop legacy text-based constraints/defaults before converting columns to enums.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_direction_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ALTER COLUMN status DROP DEFAULT;

DO $$
DECLARE
  current_udt TEXT;
BEGIN
  SELECT udt_name
  INTO current_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'direction';

  IF current_udt IS NOT NULL AND current_udt <> 'txn_type' THEN
    ALTER TABLE transactions
      ALTER COLUMN direction TYPE txn_type
      USING direction::txn_type;
  END IF;
END $$;

DO $$
DECLARE
  current_udt TEXT;
BEGIN
  SELECT udt_name
  INTO current_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'status';

  IF current_udt IS NOT NULL AND current_udt <> 'txn_status' THEN
    ALTER TABLE transactions
      ALTER COLUMN status TYPE txn_status
      USING status::txn_status;
  END IF;
END $$;

ALTER TABLE transactions
  ALTER COLUMN status SET DEFAULT 'posted'::txn_status,
  ALTER COLUMN direction SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Match Prisma self-relations on delete behavior.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_reversal_of_transaction_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_reversed_by_transaction_id_fkey;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_reversal_of_transaction_id_fkey
  FOREIGN KEY (reversal_of_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_reversed_by_transaction_id_fkey
  FOREIGN KEY (reversed_by_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
