import type { PoolClient } from "pg";
import { getDbPool } from "@/lib/db";

const GST_RATE_GUESS_DEFAULT = 18;
const UPCOMING_BILLS_FALLBACK_RATIO = 0.25;

const ITC_ELIGIBLE_CATEGORY_HINTS = [
  "marketing",
  "saas",
  "software",
  "logistics",
  "shipping",
  "rent",
  "utilities",
  "fixed cost",
  "internet",
  "electricity",
  "office",
  "operations",
  "professional",
  "subscription",
  "tax"
] as const;

const FIXED_COST_HINTS = [
  "fixed cost",
  "rent",
  "lease",
  "electricity",
  "internet",
  "utility",
  "salary",
  "payroll",
  "subscription",
  "saas",
  "insurance",
  "office",
  "emi"
] as const;

type AggregateRow = {
  revenue: string;
  expenses: string;
  profit: string;
};

type GstRow = {
  direction: "credit" | "debit";
  amount_minor: string;
  gst_amount: string | null;
  gst_rate: string | null;
  category_name: string | null;
  metadata: unknown;
};

type FixedCostRow = {
  amount_minor: string;
  occurred_at: string;
  category_name: string | null;
  description: string | null;
  counterparty: string | null;
  metadata: unknown;
};

type BalanceRow = {
  closing_cash: string;
};

type ExpenseHistoryRow = {
  expense_90d: string;
};

type MonthWindow = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

export type MonthlySummaryMetrics = {
  revenue: number;
  expenses: number;
  profitEstimate: number;
  gstPayableEstimate: number;
  safeToSpendCash: number;
  closingCashBalance: number;
  gstPayableReserve: number;
  upcomingBillsReserve: number;
  reserveBuffer: number;
  expectedFixedCostsNext30Days: number;
  alreadyPaidFixedCostsThisMonth: number;
  fallbackExpenseBufferUsed: number;
  outputGstEstimate: number;
  eligibleItcEstimate: number;
  profitMarginPct: number;
};

export type MonthlySummary = {
  month: string;
  monthLabel: string;
  periodStart: string;
  periodEndExclusive: string;
  generatedAt: string;
  metrics: MonthlySummaryMetrics;
  assumptions: string[];
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function readItcEligibility(metadata: unknown): boolean | undefined {
  const root = asRecord(metadata);
  if (!root) {
    return undefined;
  }

  const rootCandidates = [
    root.gst_itc_eligible,
    root.itcEligible,
    root.gstItcEligible
  ];

  for (const candidate of rootCandidates) {
    const parsed = readBoolean(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  const nested = [root.gst, root.tax, root.claims];
  for (const candidate of nested) {
    const record = asRecord(candidate);
    if (!record) {
      continue;
    }

    const nestedCandidates = [
      record.itcEligible,
      record.gstItcEligible,
      record.itc_eligible,
      record.inputCreditEligible
    ];

    for (const nestedCandidate of nestedCandidates) {
      const parsed = readBoolean(nestedCandidate);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function textContainsAnyHint(text: string, hints: readonly string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function isEligibleInputCategory(categoryName: string | null): boolean {
  const normalized = normalizeText(categoryName);
  if (!normalized) {
    return false;
  }

  return textContainsAnyHint(normalized, ITC_ELIGIBLE_CATEGORY_HINTS);
}

function isFixedCostRow(row: FixedCostRow): boolean {
  const normalized = normalizeText(
    [row.category_name, row.description, row.counterparty].filter(Boolean).join(" ")
  );
  if (normalized && textContainsAnyHint(normalized, FIXED_COST_HINTS)) {
    return true;
  }

  const metadata = asRecord(row.metadata);
  const categorization = metadata ? asRecord(metadata.categorization) : null;
  const categoryName =
    categorization && typeof categorization.categoryName === "string"
      ? normalizeText(categorization.categoryName)
      : "";

  return categoryName.includes("fixed cost");
}

function gstAmountForRow(row: GstRow): number {
  const explicit = toNumber(row.gst_amount);
  if (explicit > 0) {
    return explicit;
  }

  const rate = toNumber(row.gst_rate);
  if (rate <= 0) {
    return 0;
  }

  const base = Math.abs(toNumber(row.amount_minor));
  return (base * rate) / 100;
}

function toInr(value: number): string {
  return `₹${Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveMonthWindow(monthRaw: string | undefined, now = new Date()): MonthWindow {
  if (!monthRaw) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));

    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: start.toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }),
      start,
      end
    };
  }

  if (!/^\d{4}-\d{2}$/.test(monthRaw)) {
    throw new Error("month must be in YYYY-MM format");
  }

  const [yearRaw, monthValueRaw] = monthRaw.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const monthValue = Number.parseInt(monthValueRaw, 10);

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error("month year must be between 2000 and 3000");
  }

  if (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
    throw new Error("month value must be between 01 and 12");
  }

  const start = new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthValue, 1, 0, 0, 0));

  return {
    key: `${year}-${String(monthValue).padStart(2, "0")}`,
    label: start.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }),
    start,
    end
  };
}

export async function computeMonthlySummary(params: {
  workspaceId: string;
  businessId: number;
  month?: string;
  gstRateGuessPct?: number;
  client?: PoolClient;
}): Promise<MonthlySummary> {
  const monthWindow = resolveMonthWindow(params.month);
  const db = params.client ?? getDbPool();

  const gstRateGuessPct = Number.isFinite(params.gstRateGuessPct)
    ? Math.max(0, params.gstRateGuessPct as number)
    : GST_RATE_GUESS_DEFAULT;

  const aggregateResult = await db.query<AggregateRow>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS revenue,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS expenses,
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS profit
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND occurred_at >= $2::timestamptz
      AND occurred_at < $3::timestamptz
    `,
    [params.workspaceId, monthWindow.start.toISOString(), monthWindow.end.toISOString()]
  );

  const aggregate = aggregateResult.rows[0];
  if (!aggregate) {
    throw new Error("Failed to compute monthly aggregates");
  }

  const gstRowsResult = await db.query<GstRow>(
    `
    SELECT
      t.direction::text AS direction,
      t.amount_minor::text,
      t.gst_amount::text,
      t.gst_rate::text,
      c.name AS category_name,
      t.metadata
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status IN ('posted', 'reversed')
      AND t.gst_applicable = TRUE
      AND t.occurred_at >= $2::timestamptz
      AND t.occurred_at < $3::timestamptz
    `,
    [params.workspaceId, monthWindow.start.toISOString(), monthWindow.end.toISOString()]
  );

  let outputGst = 0;
  let eligibleItc = 0;
  let outputRowsWithGst = 0;

  for (const row of gstRowsResult.rows) {
    const gstValue = gstAmountForRow(row);
    if (gstValue <= 0) {
      continue;
    }

    if (row.direction === "credit") {
      outputGst += gstValue;
      outputRowsWithGst += 1;
      continue;
    }

    const explicitItcEligibility = readItcEligibility(row.metadata);
    if (explicitItcEligibility === true) {
      eligibleItc += gstValue;
      continue;
    }

    if (
      explicitItcEligibility === undefined &&
      isEligibleInputCategory(row.category_name)
    ) {
      eligibleItc += gstValue;
    }
  }

  const balanceResult = await db.query<BalanceRow>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS closing_cash
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND occurred_at < $2::timestamptz
    `,
    [params.workspaceId, monthWindow.end.toISOString()]
  );

  const fixedCostRowsResult = await db.query<FixedCostRow>(
    `
    SELECT
      t.amount_minor::text,
      t.occurred_at::text,
      c.name AS category_name,
      t.description,
      t.counterparty,
      t.metadata
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= ($2::timestamptz - INTERVAL '90 days')
      AND t.occurred_at < $2::timestamptz
    `,
    [params.workspaceId, monthWindow.end.toISOString()]
  );

  const expenseHistoryResult = await db.query<ExpenseHistoryRow>(
    `
    SELECT
      COALESCE(SUM(amount_minor), 0)::text AS expense_90d
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= ($2::timestamptz - INTERVAL '90 days')
      AND occurred_at < $2::timestamptz
    `,
    [params.workspaceId, monthWindow.end.toISOString()]
  );

  let fixedCostLast90Days = 0;
  let alreadyPaidFixedCostsThisMonth = 0;

  for (const row of fixedCostRowsResult.rows) {
    if (!isFixedCostRow(row)) {
      continue;
    }

    const amount = Math.abs(toNumber(row.amount_minor));
    fixedCostLast90Days += amount;

    const occurredAt = new Date(row.occurred_at);
    const timestamp = occurredAt.getTime();
    if (
      Number.isFinite(timestamp) &&
      timestamp >= monthWindow.start.getTime() &&
      timestamp < monthWindow.end.getTime()
    ) {
      alreadyPaidFixedCostsThisMonth += amount;
    }
  }

  const revenue = toNumber(aggregate.revenue);
  const expenses = toNumber(aggregate.expenses);
  const profitEstimate = toNumber(aggregate.profit);
  const closingCashBalance = toNumber(balanceResult.rows[0]?.closing_cash);
  const avgMonthlyExpenses = toNumber(expenseHistoryResult.rows[0]?.expense_90d) / 3;

  let outputGstEstimate = outputGst;
  let usedOutputGuess = false;
  if (outputRowsWithGst === 0 && revenue > 0) {
    outputGstEstimate = (revenue * gstRateGuessPct) / 100;
    usedOutputGuess = true;
  }

  const eligibleItcEstimate = eligibleItc;
  const gstPayableEstimate = Math.max(0, outputGstEstimate - eligibleItcEstimate);

  const expectedFixedCostsNext30Days = fixedCostLast90Days / 3;
  const computedUpcomingBillsReserve = Math.max(
    0,
    expectedFixedCostsNext30Days - alreadyPaidFixedCostsThisMonth
  );
  const fallbackExpenseBufferUsed = Math.max(0, avgMonthlyExpenses * UPCOMING_BILLS_FALLBACK_RATIO);
  const upcomingBillsReserve =
    expectedFixedCostsNext30Days > 0 ? computedUpcomingBillsReserve : fallbackExpenseBufferUsed;

  const gstPayableReserve = gstPayableEstimate;
  const safeToSpendCash = Math.max(
    0,
    closingCashBalance - gstPayableReserve - upcomingBillsReserve
  );
  const profitMarginPct = revenue > 0 ? (profitEstimate / revenue) * 100 : 0;

  return {
    month: monthWindow.key,
    monthLabel: monthWindow.label,
    periodStart: monthWindow.start.toISOString(),
    periodEndExclusive: monthWindow.end.toISOString(),
    generatedAt: new Date().toISOString(),
    metrics: {
      revenue: round2(revenue),
      expenses: round2(expenses),
      profitEstimate: round2(profitEstimate),
      gstPayableEstimate: round2(gstPayableEstimate),
      safeToSpendCash: round2(safeToSpendCash),
      closingCashBalance: round2(closingCashBalance),
      gstPayableReserve: round2(gstPayableReserve),
      upcomingBillsReserve: round2(upcomingBillsReserve),
      reserveBuffer: round2(upcomingBillsReserve),
      expectedFixedCostsNext30Days: round2(expectedFixedCostsNext30Days),
      alreadyPaidFixedCostsThisMonth: round2(alreadyPaidFixedCostsThisMonth),
      fallbackExpenseBufferUsed: round2(fallbackExpenseBufferUsed),
      outputGstEstimate: round2(outputGstEstimate),
      eligibleItcEstimate: round2(eligibleItcEstimate),
      profitMarginPct: round2(profitMarginPct)
    },
    assumptions: [
      "Revenue = sum(credit). Expenses = sum(debit abs). Profit estimate = Revenue - Expenses (non-hidden, status != pending).",
      `GST payable estimate = max(0, output GST - eligible ITC). ${
        usedOutputGuess
          ? `Output GST fallback applied as Revenue * ${round2(gstRateGuessPct)}% due to missing GST split on sales.`
          : "Output GST used transaction-level GST amounts/rates."
      }`,
      `Safe-to-spend cash = cash on hand - GST payable reserve - upcoming bills reserve. Upcoming reserve = max(0, expected fixed costs next 30 days - already paid fixed costs this month); fallback buffer ${(UPCOMING_BILLS_FALLBACK_RATIO * 100).toFixed(0)}% of average monthly expenses when fixed-cost signal is unavailable.`,
      "For statutory GST filing in India, reconcile with GSTR-1/GSTR-3B and GSTR-2B eligible ITC as per CGST Act Section 16/17 conditions."
    ]
  };
}

export function buildMonthlySummaryHtml(params: {
  summary: MonthlySummary;
  workspaceId: string;
  businessId: number;
  autoPrint?: boolean;
}): string {
  const { summary } = params;
  const generatedAtText = new Date(summary.generatedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  });
  const assumptionsHtml = summary.assumptions
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const autoPrintScript = params.autoPrint
    ? `<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Monthly Finance Summary - ${escapeHtml(summary.month)}</title>
    <style>
      :root {
        --text: #0f172a;
        --muted: #475569;
        --line: #e2e8f0;
        --bg: #f8fafc;
        --card: #ffffff;
        --accent: #0f766e;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        color: var(--text);
        background: var(--bg);
      }
      .page {
        max-width: 980px;
        margin: 16px auto;
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 20px;
      }
      .top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.2;
      }
      .sub {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .btn {
        border: 1px solid var(--line);
        background: #fff;
        color: var(--text);
        border-radius: 8px;
        font-size: 12px;
        padding: 8px 10px;
        cursor: pointer;
      }
      .btn-primary {
        border-color: #134e4a;
        background: var(--accent);
        color: #fff;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 10px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 12px;
        background: #fff;
      }
      .label {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .value {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 700;
      }
      .meta-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .meta {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px;
        font-size: 13px;
      }
      .meta strong {
        display: block;
        margin-bottom: 4px;
      }
      .section-title {
        margin-top: 16px;
        margin-bottom: 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
      }
      ul {
        margin: 8px 0 0 16px;
        padding: 0;
        font-size: 13px;
        color: var(--text);
      }
      li { margin-bottom: 6px; }
      .footer {
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px dashed var(--line);
        font-size: 12px;
        color: var(--muted);
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      @media print {
        body {
          background: #fff;
        }
        .page {
          margin: 0;
          border: none;
          border-radius: 0;
          padding: 0;
          max-width: none;
        }
        .actions {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <div class="top">
        <div>
          <h1>Monthly Finance Summary</h1>
          <div class="sub">Period: ${escapeHtml(summary.monthLabel)} (${escapeHtml(summary.month)})</div>
          <div class="sub">Workspace: ${escapeHtml(params.workspaceId)} • Business: ${params.businessId}</div>
          <div class="sub">Generated: ${escapeHtml(generatedAtText)} (UTC)</div>
        </div>
        <div class="actions">
          <button class="btn" type="button" onclick="window.location.reload()">Refresh</button>
          <button class="btn btn-primary" type="button" onclick="window.print()">Download PDF</button>
        </div>
      </div>

      <section class="grid">
        <article class="card">
          <div class="label">Revenue</div>
          <div class="value">${toInr(summary.metrics.revenue)}</div>
        </article>
        <article class="card">
          <div class="label">Expenses</div>
          <div class="value">${toInr(summary.metrics.expenses)}</div>
        </article>
        <article class="card">
          <div class="label">Profit Estimate</div>
          <div class="value">${toInr(summary.metrics.profitEstimate)}</div>
        </article>
        <article class="card">
          <div class="label">GST Payable Estimate</div>
          <div class="value">${toInr(summary.metrics.gstPayableEstimate)}</div>
        </article>
        <article class="card">
          <div class="label">Safe-to-Spend Cash</div>
          <div class="value">${toInr(summary.metrics.safeToSpendCash)}</div>
        </article>
      </section>

      <section class="meta-grid">
        <article class="meta">
          <strong>Closing Cash Balance</strong>
          ${toInr(summary.metrics.closingCashBalance)}
        </article>
        <article class="meta">
          <strong>Upcoming Bills Reserve</strong>
          ${toInr(summary.metrics.upcomingBillsReserve)}
        </article>
        <article class="meta">
          <strong>Profit Margin</strong>
          ${summary.metrics.profitMarginPct.toFixed(2)}%
        </article>
      </section>

      <section>
        <h2 class="section-title">Computation Notes</h2>
        <ul>${assumptionsHtml}</ul>
      </section>

      <div class="footer">
        This is an ops estimate for India SMB finance monitoring. Statutory output must be confirmed during return filing and month close.
      </div>
    </main>
    ${autoPrintScript}
  </body>
</html>`;
}
