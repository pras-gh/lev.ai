import { getDbPool } from "@/lib/db";
import type { PoolClient } from "pg";

const GST_LOOKAHEAD_DAYS = 7;
const GST_ALERT_THRESHOLD = 5000;
const GST_DUE_DAY_OF_MONTH = 20;
const CASH_RUNWAY_WARNING_MONTHS = 3;
const CASH_RUNWAY_CRITICAL_MONTHS = 1.5;

const ELIGIBLE_INPUT_CATEGORY_HINTS = [
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
  "subscription"
] as const;

type TxnAggregateRow = {
  all_credit: string;
  all_debit: string;
  expense_30d: string;
  expense_60d: string;
  expense_90d: string;
  total_count: string;
  matched_count: string;
  categorized_count: string;
  gst_applicable_count: string;
  gst_tagged_count: string;
};

type GstTxnRow = {
  id: string;
  direction: "credit" | "debit";
  amount_minor: string;
  gst_amount: string | null;
  gst_rate: string | null;
  category_name: string | null;
  metadata: unknown;
};

type IntegrationMetaRow = {
  meta: unknown;
};

type OpenCriticalRow = {
  count: string;
};

type ExistingAlertRow = {
  id: string;
};

export type FinanceHealthMetrics = {
  cash_runway_months: number;
  gst_due_amount_next_7d: number;
  itc_mismatch_count: number;
  recon_match_pct: number;
  month_close_readiness_pct: number;
  compliance_confidence: number;
};

type ComputeFinanceHealthParams = {
  workspaceId: string;
  businessId: number;
  syncAlerts?: boolean;
  client?: PoolClient;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyKey(obj: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== "") {
        return true;
      }
    }
  }

  return false;
}

function hasArrayEvidence(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function hasInvoiceEvidence(metadata: unknown): boolean {
  const root = asRecord(metadata);
  if (!root) {
    return false;
  }

  if (root.invoiceUploaded === true || root.hasInvoice === true) {
    return true;
  }

  if (
    hasAnyKey(root, ["invoiceId", "invoiceNo", "invoiceNumber", "invoiceUrl", "invoice_url"])
  ) {
    return true;
  }

  if (
    hasArrayEvidence(root.attachments) ||
    hasArrayEvidence(root.evidence) ||
    hasArrayEvidence(root.proofs) ||
    hasArrayEvidence(root.invoices)
  ) {
    return true;
  }

  const nestedKeys = ["evidence", "invoice", "documents", "proof"];
  for (const key of nestedKeys) {
    const nested = asRecord(root[key]);
    if (!nested) {
      continue;
    }

    if (
      hasAnyKey(nested, ["invoiceId", "invoiceNo", "invoiceNumber", "invoiceUrl", "url"]) ||
      hasArrayEvidence(nested.attachments) ||
      hasArrayEvidence(nested.files)
    ) {
      return true;
    }
  }

  return false;
}

function isEligibleInputCategory(categoryName: string | null): boolean {
  const normalized = normalizeText(categoryName);
  if (!normalized) {
    return false;
  }

  return ELIGIBLE_INPUT_CATEGORY_HINTS.some((hint) => normalized.includes(hint));
}

function toCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function nextGstDueWindow(now: Date): {
  cycleStart: Date;
  cycleEnd: Date;
  dueDate: Date;
  dueInDays: number;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const currentMonthDue = new Date(Date.UTC(year, month, GST_DUE_DAY_OF_MONTH, 0, 0, 0));

  let cycleStart: Date;
  let cycleEnd: Date;
  let dueDate: Date;

  if (now.getTime() <= currentMonthDue.getTime()) {
    cycleStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    cycleEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    dueDate = currentMonthDue;
  } else {
    cycleStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    cycleEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
    dueDate = new Date(Date.UTC(year, month + 1, GST_DUE_DAY_OF_MONTH, 0, 0, 0));
  }

  const dueInDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return { cycleStart, cycleEnd, dueDate, dueInDays };
}

function gstAmountForRow(row: GstTxnRow): number {
  const explicit = toNumber(row.gst_amount);
  if (explicit > 0) {
    return explicit;
  }

  const rate = toNumber(row.gst_rate);
  if (rate <= 0) {
    return 0;
  }

  const baseAmount = Math.abs(toNumber(row.amount_minor));
  return (baseAmount * rate) / 100;
}

function extractBalanceFromMeta(meta: unknown): number | null {
  const record = asRecord(meta);
  if (!record) {
    return null;
  }

  const keys = [
    "bank_balance",
    "bankBalance",
    "cash_balance",
    "cashBalance",
    "closing_balance",
    "closingBalance",
    "balance"
  ];

  for (const key of keys) {
    const value = record[key];
    const parsed = toNumber(typeof value === "string" || typeof value === "number" ? value : null);
    if (parsed > 0) {
      return parsed;
    }
  }

  const nestedCandidates = [record.manual, record.bank, record.summary];
  for (const candidate of nestedCandidates) {
    const parsed = extractBalanceFromMeta(candidate);
    if (parsed !== null && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

async function resolveCashBalance(params: {
  client: PoolClient;
  workspaceId: string;
  fallbackFromLedger: number;
}): Promise<number> {
  try {
    const integrationRows = await params.client.query<IntegrationMetaRow>(
      `
      SELECT meta
      FROM integrations
      WHERE workspace_id = $1::uuid
        AND status IN ('connected', 'syncing')
      ORDER BY updated_at DESC
      LIMIT 10
      `,
      [params.workspaceId]
    );

    for (const row of integrationRows.rows) {
      const balance = extractBalanceFromMeta(row.meta);
      if (balance !== null && balance > 0) {
        return balance;
      }
    }
  } catch {
    // Older databases may not have integrations table yet; fallback to manual/ledger balance.
  }

  const manualRows = await params.client.query<{ metadata: unknown }>(
    `
    SELECT metadata
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
    ORDER BY occurred_at DESC, id DESC
    LIMIT 200
    `,
    [params.workspaceId]
  );

  for (const row of manualRows.rows) {
    const balance = extractBalanceFromMeta(row.metadata);
    if (balance !== null && balance > 0) {
      return balance;
    }
  }

  return Math.max(0, params.fallbackFromLedger);
}

async function syncExplainableAlert(params: {
  client: PoolClient;
  workspaceId: string;
  businessId: number;
  type: "gst_due" | "itc_mismatch" | "cash_runway_risk";
  shouldOpen: boolean;
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  relatedTransactionIds?: number[];
  payload: Record<string, unknown>;
}): Promise<void> {
  const openRows = await params.client.query<ExistingAlertRow>(
    `
    SELECT id::text
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = $2
      AND status IN ('open', 'snoozed')
    ORDER BY created_at DESC, id DESC
    `,
    [params.workspaceId, params.type]
  );

  if (!params.shouldOpen) {
    if (openRows.rows.length === 0) {
      return;
    }

    await params.client.query(
      `
      UPDATE alerts
      SET
        status = 'resolved',
        resolved_at = NOW(),
        payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
        metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE workspace_id = $1::uuid
        AND type = $2
        AND status IN ('open', 'snoozed')
      `,
      [
        params.workspaceId,
        params.type,
        JSON.stringify({
          resolution: {
            action: "auto_resolve",
            reason: "metric back within threshold"
          }
        })
      ]
    );

    return;
  }

  const relatedIds = params.relatedTransactionIds ?? [];
  const payload = {
    ...params.payload,
    explainable: true,
    generatedAt: new Date().toISOString()
  };

  if (openRows.rows.length === 0) {
    await params.client.query(
      `
      INSERT INTO alerts (
        business_id,
        workspace_id,
        transaction_id,
        alert_type,
        type,
        severity,
        status,
        message,
        title,
        body,
        related_transaction_ids,
        payload,
        metadata
      )
      VALUES (
        $1,
        $2::uuid,
        $3,
        $4,
        $4,
        $5,
        'open',
        $6,
        $7,
        $8,
        $9::jsonb,
        $10::jsonb,
        $10::jsonb
      )
      `,
      [
        params.businessId,
        params.workspaceId,
        relatedIds[0] ?? null,
        params.type,
        params.severity,
        params.body,
        params.title,
        params.body,
        JSON.stringify(relatedIds),
        JSON.stringify(payload)
      ]
    );

    return;
  }

  const primaryId = openRows.rows[0]?.id;
  if (primaryId) {
    await params.client.query(
      `
      UPDATE alerts
      SET
        severity = $3,
        status = 'open',
        resolved_at = NULL,
        message = $4,
        title = $5,
        body = $6,
        transaction_id = $7,
        related_transaction_ids = $8::jsonb,
        payload = $9::jsonb,
        metadata = $9::jsonb
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,
      [
        primaryId,
        params.workspaceId,
        params.severity,
        params.body,
        params.title,
        params.body,
        relatedIds[0] ?? null,
        JSON.stringify(relatedIds),
        JSON.stringify(payload)
      ]
    );
  }

  if (openRows.rows.length > 1) {
    const staleIds = openRows.rows
      .slice(1)
      .map((row) => Number.parseInt(row.id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (staleIds.length > 0) {
      await params.client.query(
        `
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
        `,
        [
          params.workspaceId,
          staleIds,
          JSON.stringify({
            resolution: {
              action: "auto_resolve",
              reason: "superseded by latest computed alert"
            }
          })
        ]
      );
    }
  }
}

async function computeWithClient(params: {
  client: PoolClient;
  workspaceId: string;
  businessId: number;
  syncAlerts: boolean;
}): Promise<FinanceHealthMetrics> {
  const now = new Date();
  const gstWindow = nextGstDueWindow(now);

  const aggregateResult = await params.client.query<TxnAggregateRow>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS all_credit,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS all_debit,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '30 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_30d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '60 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_60d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '90 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_90d,
      COUNT(*) FILTER (WHERE status <> 'pending')::text AS total_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND matched = TRUE)::text AS matched_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND category_id IS NOT NULL)::text AS categorized_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND gst_applicable = TRUE)::text AS gst_applicable_count,
      COUNT(*) FILTER (WHERE status <> 'pending' AND gst_applicable = TRUE AND gst_amount IS NOT NULL)::text AS gst_tagged_count
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
    `,
    [params.workspaceId]
  );
  const aggregate = aggregateResult.rows[0];
  if (!aggregate) {
    throw new Error("Failed to compute aggregates");
  }

  const gstRowsResult = await params.client.query<GstTxnRow>(
    `
    SELECT
      t.id::text,
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
    ORDER BY t.occurred_at DESC, t.id DESC
    `,
    [params.workspaceId, gstWindow.cycleStart.toISOString(), gstWindow.cycleEnd.toISOString()]
  );

  let outputGst = 0;
  let inputGst = 0;
  let mismatchInputAmount = 0;
  const mismatchTxnIds: number[] = [];

  for (const row of gstRowsResult.rows) {
    const txnId = Number.parseInt(row.id, 10);
    if (!Number.isInteger(txnId) || txnId <= 0) {
      continue;
    }

    const gstValue = gstAmountForRow(row);
    if (gstValue <= 0) {
      continue;
    }

    if (row.direction === "credit") {
      outputGst += gstValue;
      continue;
    }

    if (row.direction === "debit" && isEligibleInputCategory(row.category_name)) {
      inputGst += gstValue;
      if (!hasInvoiceEvidence(row.metadata)) {
        mismatchInputAmount += gstValue;
        mismatchTxnIds.push(txnId);
      }
    }
  }

  const netGstDue = Math.max(0, outputGst - inputGst);
  const dueWithinWindow = gstWindow.dueInDays >= 0 && gstWindow.dueInDays <= GST_LOOKAHEAD_DAYS;
  const gstDueAmountNext7d = dueWithinWindow ? netGstDue : 0;

  const allCredit = toNumber(aggregate.all_credit);
  const allDebit = toNumber(aggregate.all_debit);
  const fallbackLedgerCash = allCredit - allDebit;
  const cashBalance = await resolveCashBalance({
    client: params.client,
    workspaceId: params.workspaceId,
    fallbackFromLedger: fallbackLedgerCash
  });

  const expense30 = toNumber(aggregate.expense_30d);
  const expense60 = toNumber(aggregate.expense_60d);
  const expense90 = toNumber(aggregate.expense_90d);
  const dailyBurn30 = expense30 / 30;
  const dailyBurn60 = expense60 / 60;
  const dailyBurn90 = expense90 / 90;
  const avgDailyBurn = (dailyBurn30 + dailyBurn60 + dailyBurn90) / 3;
  const monthlyBurn = avgDailyBurn * 30;
  const cashRunwayMonths = monthlyBurn > 0 ? cashBalance / monthlyBurn : 99;

  const totalCount = toNumber(aggregate.total_count);
  const matchedCount = toNumber(aggregate.matched_count);
  const categorizedCount = toNumber(aggregate.categorized_count);
  const gstApplicableCount = toNumber(aggregate.gst_applicable_count);
  const gstTaggedCount = toNumber(aggregate.gst_tagged_count);

  const reconMatchPct = totalCount > 0 ? (matchedCount / totalCount) * 100 : 100;
  const categorizedPct = totalCount > 0 ? (categorizedCount / totalCount) * 100 : 100;
  const gstCoveragePct =
    gstApplicableCount > 0 ? (gstTaggedCount / gstApplicableCount) * 100 : 100;

  const mismatchCount = mismatchTxnIds.length;
  const mismatchPenalty = clamp(mismatchCount * 4, 0, 50);
  const runwayPenalty = cashRunwayMonths < CASH_RUNWAY_WARNING_MONTHS ? 10 : 0;
  const monthCloseReadinessPct = clamp(
    categorizedPct * 0.45 + reconMatchPct * 0.45 + gstCoveragePct * 0.1 - mismatchPenalty * 0.2 - runwayPenalty,
    0,
    100
  );
  const complianceConfidence = clamp(
    gstCoveragePct * 0.7 + (100 - mismatchPenalty) * 0.3,
    0,
    100
  );

  if (params.syncAlerts) {
    const gstSeverity: "critical" | "warning" =
      netGstDue >= GST_ALERT_THRESHOLD * 2 ? "critical" : "warning";
    const shouldOpenGst = dueWithinWindow && netGstDue > GST_ALERT_THRESHOLD;

    await syncExplainableAlert({
      client: params.client,
      workspaceId: params.workspaceId,
      businessId: params.businessId,
      type: "gst_due",
      shouldOpen: shouldOpenGst,
      severity: gstSeverity,
      title: `GST net due ${toCurrency(netGstDue)} by ${gstWindow.dueDate.toISOString().slice(0, 10)}`,
      body: `Output GST ${toCurrency(outputGst)} - Input GST ${toCurrency(inputGst)} = Net due ${toCurrency(netGstDue)}. Due date ${gstWindow.dueDate.toISOString().slice(0, 10)} (${Math.max(0, Math.ceil(gstWindow.dueInDays))} day(s)). Threshold ${toCurrency(GST_ALERT_THRESHOLD)}.`,
      relatedTransactionIds: [],
      payload: {
        netDue: round2(netGstDue),
        outputGst: round2(outputGst),
        inputGst: round2(inputGst),
        threshold: GST_ALERT_THRESHOLD,
        dueDate: gstWindow.dueDate.toISOString(),
        dueInDays: round2(gstWindow.dueInDays),
        fixAction: {
          label: "Review GST transactions",
          kind: "open_filter",
          preset: "gst_due"
        }
      }
    });

    const mismatchSeverity: "critical" | "warning" = mismatchCount >= 10 ? "critical" : "warning";
    await syncExplainableAlert({
      client: params.client,
      workspaceId: params.workspaceId,
      businessId: params.businessId,
      type: "itc_mismatch",
      shouldOpen: mismatchCount > 0,
      severity: mismatchSeverity,
      title: `ITC mismatch: ${mismatchCount} transaction(s) missing invoice evidence`,
      body: `${mismatchCount} input-GST transaction(s) have no invoice evidence. Potential blocked ITC ${toCurrency(mismatchInputAmount)} in current cycle.`,
      relatedTransactionIds: mismatchTxnIds.slice(0, 200),
      payload: {
        mismatchCount,
        mismatchAmount: round2(mismatchInputAmount),
        cycleStart: gstWindow.cycleStart.toISOString(),
        cycleEnd: gstWindow.cycleEnd.toISOString(),
        fixAction: {
          label: "Upload invoices",
          kind: "open_filter",
          preset: "itc_mismatch"
        }
      }
    });

    const runwaySeverity: "critical" | "warning" =
      cashRunwayMonths < CASH_RUNWAY_CRITICAL_MONTHS ? "critical" : "warning";
    await syncExplainableAlert({
      client: params.client,
      workspaceId: params.workspaceId,
      businessId: params.businessId,
      type: "cash_runway_risk",
      shouldOpen: cashRunwayMonths < CASH_RUNWAY_WARNING_MONTHS,
      severity: runwaySeverity,
      title: `Cash runway ${cashRunwayMonths.toFixed(1)} month(s)`,
      body: `Cash balance ${toCurrency(cashBalance)}. Burn (30/60/90d): ${toCurrency(expense30 / 30)}/${toCurrency(expense60 / 60)}/${toCurrency(expense90 / 90)} per day. Weighted monthly burn ${toCurrency(monthlyBurn)}. Runway ${cashRunwayMonths.toFixed(1)} months.`,
      relatedTransactionIds: [],
      payload: {
        cashBalance: round2(cashBalance),
        burnRateDaily30d: round2(dailyBurn30),
        burnRateDaily60d: round2(dailyBurn60),
        burnRateDaily90d: round2(dailyBurn90),
        monthlyBurn: round2(monthlyBurn),
        runwayMonths: round2(cashRunwayMonths),
        warningThresholdMonths: CASH_RUNWAY_WARNING_MONTHS,
        criticalThresholdMonths: CASH_RUNWAY_CRITICAL_MONTHS,
        fixAction: {
          label: "Review unmatched cash drivers",
          kind: "open_recon",
          recon: "unmatched"
        }
      }
    });
  }

  const criticalOpenResult = await params.client.query<OpenCriticalRow>(
    `
    SELECT COUNT(*)::text AS count
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND severity = 'critical'
    `,
    [params.workspaceId]
  );
  const criticalOpenCount = toNumber(criticalOpenResult.rows[0]?.count);

  const adjustedReadiness = clamp(monthCloseReadinessPct - criticalOpenCount * 5, 0, 100);

  return {
    cash_runway_months: round2(cashRunwayMonths),
    gst_due_amount_next_7d: round2(gstDueAmountNext7d),
    itc_mismatch_count: mismatchCount,
    recon_match_pct: round2(reconMatchPct),
    month_close_readiness_pct: round2(adjustedReadiness),
    compliance_confidence: round2(complianceConfidence)
  };
}

export async function computeFinanceHealth(
  params: ComputeFinanceHealthParams
): Promise<FinanceHealthMetrics> {
  const syncAlerts = params.syncAlerts ?? true;

  if (params.client) {
    return computeWithClient({
      client: params.client,
      workspaceId: params.workspaceId,
      businessId: params.businessId,
      syncAlerts
    });
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await computeWithClient({
      client,
      workspaceId: params.workspaceId,
      businessId: params.businessId,
      syncAlerts
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
