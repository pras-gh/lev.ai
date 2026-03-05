-- Standard transaction schema view for external consumers.
-- Keeps core table rich, while exposing a stable minimal contract.

CREATE OR REPLACE VIEW transactions_standard AS
SELECT
  t.id,
  t.workspace_id,
  t.occurred_at AS date,
  t.description,
  t.amount_minor AS amount,
  t.direction::text AS type,
  c.name AS category,
  t.source,
  t.created_at
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id;
