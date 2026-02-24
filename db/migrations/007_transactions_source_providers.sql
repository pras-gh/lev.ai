-- Allow integration providers to write directly into transactions.source.

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (
    source IN (
      'bank',
      'upi',
      'razorpay',
      'stripe',
      'manual',
      'csv_import',
      'csv_proof',
      'reversal',
      'import',
      'hdfc',
      'icici',
      'gpay',
      'tally',
      'whatsapp',
      'zohobooks'
    )
  );
