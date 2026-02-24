# Core Sell Pro - Repo + Infrastructure Setup

This repository now contains:
- A Next.js app (App Router)
- Backend API route at `/api/health`
- Postgres connectivity check for Supabase/Neon via `DATABASE_URL`
- System-of-record data model with migrations for:
  - `businesses`
  - `transactions`
  - `categories`
  - `alerts`
  - `monthly_reports`
  - `audit_logs`

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

```bash
cp .env.example .env.local
```

Set one Postgres URL env var (prefer `DATABASE_URL`; `POSTGRES_URL`, `NEON_DATABASE_URL`, and `SUPABASE_DB_URL` are also supported).

## 3) Run app

```bash
npm run dev
```

## 4) Apply DB schema

```bash
npm run db:migrate
```

This now includes:
- ledger-safe transaction behavior
- Prisma-aligned schema updates (`db/migrations/003_prisma_alignment_bigint_public_ids.sql`)
- bigint primary keys + `public_id` columns for external-safe identifiers

## 5) Verify health endpoint

```bash
curl http://localhost:3000/api/health
```

Expected when DB is reachable:

```json
{
  "status": "ok",
  "service": "core-sell-pro",
  "database": {
    "status": "connected",
    "time": "..."
  },
  "responseTimeMs": 12
}
```

## 6) Verify transaction insert + query

Option A: Run smoke script

```bash
npm run db:smoke
```

Option B: Use API directly

Insert:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H \"Content-Type: application/json\" \
  -d '{
    \"businessId\": 1,
    \"direction\": \"debit\",
    \"amountMinor\": 125000,
    \"currencyCode\": \"INR\",
    \"description\": \"Cloud hosting\"
  }'
```

Query:

```bash
curl \"http://localhost:3000/api/transactions?businessId=1&limit=20\"
```

UI list convention:
- Soft-deleted rows are excluded by default.
- To include them explicitly, pass `includeDeleted=true` (or legacy alias `includeHidden=true`).

## 7) Ledger-safe operations

Rules enforced:
- Posted transactions are never hard-deleted
- Corrections happen via reversal transactions
- Hiding duplicates/import noise uses `is_hidden` (soft-hide), not deletion

Get one transaction:

```bash
curl \"http://localhost:3000/api/transactions/1?businessId=1\"
```

Reverse a posted transaction:

```bash
curl -X PATCH http://localhost:3000/api/transactions/1 \
  -H \"Content-Type: application/json\" \
  -d '{
    \"action\": \"reverse\",
    \"businessId\": 1,
    \"reason\": \"Incorrect import mapping\",
    \"markOriginalReversed\": true
  }'
```

Soft-hide (UI only):

```bash
curl -X PATCH http://localhost:3000/api/transactions/1 \
  -H \"Content-Type: application/json\" \
  -d '{
    \"action\": \"hide\",
    \"businessId\": 1,
    \"reason\": \"Duplicate from CSV import\"
  }'
```

## 8) Reporting policy modes

Endpoint:

```bash
curl \"http://localhost:3000/api/transactions/report?businessId=1&policy=strict_ledger\"
```

Supported policies:
- `strict_ledger` (default): includes all non-pending transactions in totals; also returns excluded metrics for soft-deleted and bad-import-flagged records.
- `ui_ledger`: excludes `isDeleted=true` (`is_hidden=true`) rows from totals for UI-facing reporting.

Optional filters:
- `fromDate` (ISO datetime)
- `toDate` (ISO datetime)

## 9) Seed default categories (one-time per business)

```bash
npm run db:seed-categories -- <businessId>
```

Idempotent behavior:
- Inserts only missing defaults (safe to run again).

## 10) Categorization Rules v0

Hardcoded rules used during CSV ingest:
- Revenue: `RAZORPAY SETTLEMENT`, `STRIPE PAYOUT`, `PAYMENT RECEIVED`
- GST/Tax: `GST`, `CBIC`, `TAX PAYMENT`, `GSTR`
- Payroll: `SALARY`, `PAYROLL`, `PF`, `ESIC`
- Marketing: `FACEBOOK ADS`, `GOOGLE ADS`
- SaaS: `ZOHO`, `AWS`, `NOTION`, `OPENAI`
- Logistics: `DELHIVERY`, `SHIPROCKET`
- Rent/Utilities: `RENT`, `ELECTRICITY`, `INTERNET`

Execution model:
- Import-time tagging: runs during CSV transaction creation (`parseAndInsertBankCsv` / `insertParsedTransactions`)
- Backfill tagging: run `autoTagTransactionsV0` for existing uncategorized rows

CSV ingest now returns:
- `autoTaggedCount`
- `autoTaggedRate`
- `coverageTarget` (`0.8`)
- `coverageTargetMet`

Quick proof command:

```bash
npm run db:csv-proof
```

Backfill existing uncategorized rows:

```bash
npm run db:autotag-v0 -- <businessId> [confidenceThreshold] [limitPerBatch] [maxBatches]
```

## 11) Prisma commands

```bash
npm run prisma:validate
npm run prisma:generate
```

## 12) Monthly Summary (HTML + PDF)

Generate monthly summary for:
- Revenue
- Expenses
- Profit estimate
- GST payable estimate
- Safe-to-spend cash

JSON output:

```bash
curl "http://localhost:3000/api/reports/monthly?businessId=1&month=2026-01"
```

One-page HTML summary:

```bash
open "http://localhost:3000/api/reports/monthly?businessId=1&month=2026-01&format=html"
```

PDF mode (opens print dialog ready for Save as PDF):

```bash
open "http://localhost:3000/api/reports/monthly?businessId=1&month=2026-01&format=pdf"
```

Path-based HTML route (good for Playwright/Puppeteer `page.pdf()`):

```bash
open "http://localhost:3000/api/reports/monthly/2026-01?businessId=1"
```

Notes:
- `month` format is `YYYY-MM`.
- Optional `gstRateGuess` (0-100) applies only when output GST split is missing.
- Endpoint is auth-scoped (valid Supabase session + workspace membership required).

Formula v0 (India ops estimate):
- `Revenue = SUM(credit amounts)`
- `Expenses = SUM(debit amounts as positive)`
- `Profit estimate = Revenue - Expenses`
- `GST payable estimate = MAX(0, outputGST - eligibleITC)`
  - `outputGST` uses transaction GST values; fallback `Revenue * gstRateGuess%` if GST split missing.
  - `eligibleITC` uses explicit `gst_itc_eligible` flags when available, otherwise eligible expense category hints.
- `safeToSpendCash = cashOnHand - gstPayableReserve - upcomingBillsReserve`
  - `gstPayableReserve = GST payable estimate`
  - `upcomingBillsReserve = MAX(0, expectedFixedCostsNext30Days - alreadyPaidFixedCostsThisMonth)`
  - fallback if fixed-cost signal unavailable: `avgMonthlyExpenses * 0.25`

## 13) Alert Engine Skeleton (daily)

Daily evaluator route:

```bash
GET /api/jobs/alerts/daily
POST /api/jobs/alerts/daily
```

What it does:
- scans workspaces (or one workspace when scope is provided)
- evaluates and writes only these 5 alert types:
  - `gst_due` (GST due soon)
  - `itc_available`
  - `vendor_mismatch_risk`
  - `cash_runway` (thresholded at `< 10 days` by default)
  - `expense_spike_anomaly`
- writes/updates alerts in `alerts` table
- sends proactive WhatsApp digest (when `whatsapp` integration is connected + recipient/webhook is configured)

Auth:
- In production, set `ALERT_ENGINE_KEY` (or `CRON_SECRET`) and send:
  - `Authorization: Bearer <secret>` or
  - `x-alert-engine-key: <secret>`

Manual trigger (all workspaces):

```bash
curl -X POST "http://localhost:3000/api/jobs/alerts/daily?key=<ALERT_ENGINE_KEY>"
```

Manual trigger (single workspace/business scope):

```bash
curl -X POST "http://localhost:3000/api/jobs/alerts/daily?key=<ALERT_ENGINE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": 1,
    "gstDueLookaheadDays": 7,
    "itcAvailableMinAmount": 500,
    "vendorMismatchThreshold": 6,
    "cashRunwayThresholdDays": 10,
    "expenseSpikeRatioThreshold": 1.35,
    "expenseSpikeMinDelta": 10000,
    "sendWhatsAppDigest": true,
    "appBaseUrl": "https://your-app.example"
  }'
```

WhatsApp config notes:
- connect `provider=whatsapp` with `alertPhone` and `alertWebhookUrl` (or set `WHATSAPP_ALERT_WEBHOOK_URL` in env).
- duplicate digests are suppressed by hash + cooldown (`WHATSAPP_ALERT_COOLDOWN_HOURS`, default `6`).
- integration metadata stores last send status and timestamp for operator visibility.

Daily scheduling:
- `vercel.json` includes a daily cron hitting `/api/jobs/alerts/daily` at `20:30 UTC` (02:00 IST).
- Keep `CRON_SECRET` configured in deployment so cron calls are authenticated.

## 14) Backend Operating Design (Smooth Execution)

Architecture + flow design doc:
- `docs/trail-system-design.md`

Operational control-plane migration:
- `db/migrations/010_ops_control_plane.sql`

Adds tables for reliability and observability:
- `ingestion_runs`
- `job_runs`
- `event_outbox`
- `delivery_attempts`

Apply latest migration:

```bash
npm run db:migrate
```
