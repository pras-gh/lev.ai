# Core Data Architecture

This architecture is normalized around `workspace_id` and `business_id`.

## Core Tables

- `workspaces` (existing): tenant boundary for all operational data.
- `businesses` (existing): legal/business entity metadata.
- `accounts` (existing): bank/cash/wallet account master.
- `ledger_entries` (new): canonical accounting postings (debit/credit rows).
- `vendors` (new): payable counterparties.
- `customers` (new): receivable counterparties.
- `metrics_cache` (new): materialized metric values with scope + expiry.
- `alerts` (existing): proactive risk and anomaly signals.
- `reconciliations` (existing): transaction-level match state.
- `forecasts` (new): projected cashflow/revenue/expense/runway outputs.

## Normalization Rules

- `workspace_id` is present on every operational table.
- `business_id` is present on every operational table.
- `ledger_entries` references `accounts`, `transactions`, `vendors`, and `customers`.
- `transactions` can link to normalized counterparties using `vendor_id` / `customer_id`.
- `metrics_cache` uses `(workspace_id, metric_key, metric_scope)` uniqueness via scope hash.

## Multi-tenant Security

RLS is enabled for:

- `vendors`
- `customers`
- `ledger_entries`
- `metrics_cache`
- `forecasts`

Policy: `public.is_workspace_member(workspace_id)` for read/write scope enforcement.

## Migration

- SQL migration file: `db/migrations/019_core_finance_data_architecture.sql`
- Prisma models updated in: `prisma/schema.prisma`
