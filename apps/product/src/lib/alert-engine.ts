import { getDbPool } from "@/lib/db";
import { writeAuditLogSafe } from "@/lib/audit-log";
import {
  computeFinanceHealth,
  type FinanceHealthMetrics
} from "@/lib/finance-health";
import {
  sendProactiveWhatsAppAlertDigest,
  type WhatsAppDigestResult
} from "@/lib/whatsapp-alerts";

const ALERT_ENGINE_SOURCE = "alert_engine_v0";
const DEFAULT_GST_DUE_LOOKAHEAD_DAYS = 7;
const DEFAULT_ITC_MISMATCH_THRESHOLD = 2;
const DEFAULT_REFUND_SPIKE_RATIO = 1.15;
const DEFAULT_CASH_RUNWAY_THRESHOLD_DAYS = 10;
const DEFAULT_RECONCILIATION_GAP_THRESHOLD_PCT = 8;
const DEFAULT_SYNC_FAILURE_LOOKBACK_HOURS = 24;
const DEFAULT_ANOMALY_RATIO = 1.35;
const DEFAULT_ANOMALY_MIN_DELTA = 10000;

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

const REFUND_PATTERN_HINTS = [
  "%refund%",
  "%chargeback%",
  "%reversal%",
  "%return%",
  "%failed settlement%"
] as const;

type RuleAlertType =
  | "gst_due"
  | "itc_mismatch"
  | "refund_spike"
  | "reconciliation_gap"
  | "cash_runway_risk"
  | "sync_failure"
  | "anomaly_detected";

const ALERT_V0_TYPES: RuleAlertType[] = [
  "gst_due",
  "itc_mismatch",
  "refund_spike",
  "reconciliation_gap",
  "cash_runway_risk",
  "sync_failure",
  "anomaly_detected"
];

const LEGACY_ENGINE_TYPES = [
  "itc_available",
  "vendor_mismatch_risk",
  "cash_runway",
  "expense_spike_anomaly"
] as const;

type WorkspaceRow = {
  workspace_id: string;
  business_id: string;
};

type IdRow = {
  id: string;
};

type ExistingAlertRow = {
  id: string;
  severity: string;
  status: string;
  title: string | null;
  body: string | null;
  related_transaction_ids: unknown;
  payload: unknown;
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

type RefundAggregateRow = {
  refunds_this_week: string;
  refunds_prev_4w: string;
};

type ReconciliationAggregateRow = {
  total_count: string;
  unmatched_count: string;
};

type BurnAggregateRow = {
  cash_balance: string;
  expense_30d: string;
  expense_60d: string;
  expense_90d: string;
};

type SyncFailureAggregateRow = {
  failed_runs: string;
  partial_runs: string;
  last_run_at: string | null;
  last_error: string | null;
};

type ExpenseMonthlyRow = {
  month_start: string;
  expense: string;
};

type EngineSyncResultStatus = "opened" | "updated" | "resolved" | "none";

export type EngineAlertSyncResult = {
  status: EngineSyncResultStatus;
  alertId: number | null;
};

export type EvaluateWorkspaceAlertsInput = {
  workspaceId: string;
  businessId: number;
  gstDueLookaheadDays?: number;
  itcMismatchThreshold?: number;
  refundSpikeRatioThreshold?: number;
  cashRunwayThresholdDays?: number;
  reconciliationGapThresholdPct?: number;
  syncFailureLookbackHours?: number;
  anomalyRatioThreshold?: number;
  anomalyMinDelta?: number;
  sendWhatsAppDigest?: boolean;
  appBaseUrl?: string;
};

export type EvaluateWorkspaceAlertsResult = {
  workspaceId: string;
  businessId: number;
  health: FinanceHealthMetrics;
  whatsAppDigest?: WhatsAppDigestResult;
  alerts: {
    gstDue: {
      payableAmount: number;
      dueInDays: number;
      alert: EngineAlertSyncResult;
    };
    itcMismatch: {
      mismatchCount: number;
      mismatchAmount: number;
      threshold: number;
      alert: EngineAlertSyncResult;
    };
    refundSpike: {
      refundsThisWeek: number;
      avgRefunds4w: number;
      ratioThreshold: number;
      alert: EngineAlertSyncResult;
    };
    reconciliationGap: {
      totalCount: number;
      unmatchedCount: number;
      gapPct: number;
      thresholdPct: number;
      alert: EngineAlertSyncResult;
    };
    cashRunwayRisk: {
      runwayDays: number;
      thresholdDays: number;
      alert: EngineAlertSyncResult;
    };
    syncFailure: {
      failedRuns: number;
      partialRuns: number;
      lookbackHours: number;
      alert: EngineAlertSyncResult;
    };
    anomalyDetected: {
      currentMonthExpense: number;
      baselineExpense: number;
      ratio: number;
      ratioThreshold: number;
      alert: EngineAlertSyncResult;
    };
  };
};

export type DailyAlertEngineResult = {
  startedAt: string;
  finishedAt: string;
  scannedWorkspaces: number;
  successCount: number;
  failureCount: number;
  results: EvaluateWorkspaceAlertsResult[];
  failures: Array<{
    workspaceId: string;
    businessId: number;
    error: string;
  }>;
};

function toPositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

function toCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textContainsAnyHint(text: string, hints: readonly string[]): boolean {
  return hints.some((hint) => text.includes(hint));
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

  const directCandidates = [
    root.gst_itc_eligible,
    root.itcEligible,
    root.gstItcEligible
  ];

  for (const candidate of directCandidates) {
    const parsed = readBoolean(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  const nestedCandidates = [root.gst, root.tax, root.claims];
  for (const candidate of nestedCandidates) {
    const record = asRecord(candidate);
    if (!record) {
      continue;
    }

    const values = [
      record.itcEligible,
      record.gstItcEligible,
      record.itc_eligible,
      record.inputCreditEligible
    ];

    for (const value of values) {
      const parsed = readBoolean(value);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function hasAnyKey(obj: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const value = obj[key];
    if (value !== null && value !== undefined && value !== "") {
      return true;
    }
  }

  return false;
}

function hasArrayEvidence(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
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

function gstAmountForRow(row: GstTxnRow): number {
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

function isEligibleInputCategory(categoryName: string | null): boolean {
  const normalized = normalizeText(categoryName);
  return normalized.length > 0 && textContainsAnyHint(normalized, ITC_ELIGIBLE_CATEGORY_HINTS);
}

function nextGstDueWindow(now: Date): {
  cycleStart: Date;
  cycleEnd: Date;
  dueDate: Date;
  dueInDays: number;
} {
  const dueDay = 20;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const currentMonthDue = new Date(Date.UTC(year, month, dueDay, 0, 0, 0));

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
    dueDate = new Date(Date.UTC(year, month + 1, dueDay, 0, 0, 0));
  }

  const dueInDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return { cycleStart, cycleEnd, dueDate, dueInDays };
}

function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

function isMissingRelationError(error: unknown, relationName: string): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (code === "42P01") {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes(`relation \"${relationName.toLowerCase()}\" does not exist`);
}

async function syncRuleAlert(params: {
  workspaceId: string;
  businessId: number;
  type: RuleAlertType;
  rule: string;
  shouldOpen: boolean;
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  relatedTransactionIds: number[];
  payload: Record<string, unknown>;
}): Promise<EngineAlertSyncResult> {
  const db = getDbPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const openRows = await client.query<ExistingAlertRow>(
      `
      SELECT
        id::text,
        severity,
        status,
        title,
        body,
        related_transaction_ids,
        payload
      FROM alerts
      WHERE workspace_id = $1::uuid
        AND type = $2
        AND status IN ('open', 'snoozed')
        AND COALESCE(payload->>'source', metadata->>'source', '') = $3
      ORDER BY created_at DESC, id DESC
      `,
      [params.workspaceId, params.type, ALERT_ENGINE_SOURCE]
    );

    if (!params.shouldOpen) {
      if (openRows.rows.length === 0) {
        await client.query("COMMIT");
        return { status: "none", alertId: null };
      }

      const resolvedRows = await client.query<IdRow>(
        `
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
        WHERE workspace_id = $1::uuid
          AND type = $2
          AND status IN ('open', 'snoozed')
          AND COALESCE(payload->>'source', metadata->>'source', '') = $3
        RETURNING id::text
        `,
        [
          params.workspaceId,
          params.type,
          ALERT_ENGINE_SOURCE,
          JSON.stringify({
            resolution: {
              action: "auto_resolve",
              reason: "rule criteria not met",
              by: ALERT_ENGINE_SOURCE
            }
          })
        ]
      );

      const previousById = new Map(openRows.rows.map((row) => [row.id, row]));
      for (const row of resolvedRows.rows) {
        const before = previousById.get(row.id);
        await writeAuditLogSafe(
          {
            workspaceId: params.workspaceId,
            businessId: params.businessId,
            actorType: "system",
            actorId: ALERT_ENGINE_SOURCE,
            entityType: "alert",
            entityId: row.id,
            action: "trail.alert.rule_resolved",
            beforeState: before
              ? {
                  type: params.type,
                  rule: params.rule,
                  severity: before.severity,
                  status: before.status,
                  title: before.title,
                  body: before.body,
                  relatedTransactionIds: before.related_transaction_ids,
                  payload: before.payload
                }
              : null,
            afterState: {
              type: params.type,
              rule: params.rule,
              status: "resolved",
              reason: "rule criteria not met",
              evidence: {
                relatedTransactionIds: params.relatedTransactionIds,
                source: ALERT_ENGINE_SOURCE
              }
            }
          },
          client
        );
      }

      await client.query("COMMIT");
      return {
        status: "resolved",
        alertId: toPositiveInt(openRows.rows[0]?.id ?? "") ?? null
      };
    }

    const metadata = {
      ...params.payload,
      source: ALERT_ENGINE_SOURCE,
      rule: params.rule,
      generatedAt: new Date().toISOString()
    };

    if (openRows.rows.length === 0) {
      const inserted = await client.query<IdRow>(
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
        RETURNING id::text
        `,
        [
          params.businessId,
          params.workspaceId,
          params.relatedTransactionIds[0] ?? null,
          params.type,
          params.severity,
          params.body,
          params.title,
          params.body,
          JSON.stringify(params.relatedTransactionIds),
          JSON.stringify(metadata)
        ]
      );

      const insertedAlertId = toPositiveInt(inserted.rows[0]?.id ?? "") ?? null;
      await writeAuditLogSafe(
        {
          workspaceId: params.workspaceId,
          businessId: params.businessId,
          actorType: "system",
          actorId: ALERT_ENGINE_SOURCE,
          entityType: "alert",
          entityId: inserted.rows[0]?.id ?? `${params.type}:opened`,
          action: "trail.alert.rule_opened",
          beforeState: null,
          afterState: {
            type: params.type,
            rule: params.rule,
            severity: params.severity,
            status: "open",
            title: params.title,
            body: params.body,
            payload: metadata,
            evidence: {
              relatedTransactionIds: params.relatedTransactionIds,
              source: ALERT_ENGINE_SOURCE
            }
          }
        },
        client
      );

      await client.query("COMMIT");
      return {
        status: "opened",
        alertId: insertedAlertId
      };
    }

    const primaryId = openRows.rows[0]?.id;
    const beforePrimary = openRows.rows[0];
    let updatedAlertId: number | null = null;

    if (primaryId) {
      const updated = await client.query<IdRow>(
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
        WHERE workspace_id = $1::uuid
          AND id = $2::bigint
        RETURNING id::text
        `,
        [
          params.workspaceId,
          primaryId,
          params.severity,
          params.body,
          params.title,
          params.body,
          params.relatedTransactionIds[0] ?? null,
          JSON.stringify(params.relatedTransactionIds),
          JSON.stringify(metadata)
        ]
      );

      updatedAlertId = toPositiveInt(updated.rows[0]?.id ?? "") ?? null;
    }

    if (primaryId) {
      await writeAuditLogSafe(
        {
          workspaceId: params.workspaceId,
          businessId: params.businessId,
          actorType: "system",
          actorId: ALERT_ENGINE_SOURCE,
          entityType: "alert",
          entityId: primaryId,
          action: "trail.alert.rule_updated",
          beforeState: beforePrimary
            ? {
                type: params.type,
                rule: params.rule,
                severity: beforePrimary.severity,
                status: beforePrimary.status,
                title: beforePrimary.title,
                body: beforePrimary.body,
                relatedTransactionIds: beforePrimary.related_transaction_ids,
                payload: beforePrimary.payload
              }
            : null,
          afterState: {
            type: params.type,
            rule: params.rule,
            severity: params.severity,
            status: "open",
            title: params.title,
            body: params.body,
            payload: metadata,
            evidence: {
              relatedTransactionIds: params.relatedTransactionIds,
              source: ALERT_ENGINE_SOURCE
            }
          }
        },
        client
      );
    }

    if (openRows.rows.length > 1) {
      const staleIds = openRows.rows
        .slice(1)
        .map((row) => toPositiveInt(row.id))
        .filter((id): id is number => id !== null);

      if (staleIds.length > 0) {
        await client.query(
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
                reason: "superseded by latest engine evaluation",
                by: ALERT_ENGINE_SOURCE
              }
            })
          ]
        );

        await writeAuditLogSafe(
          {
            workspaceId: params.workspaceId,
            businessId: params.businessId,
            actorType: "system",
            actorId: ALERT_ENGINE_SOURCE,
            entityType: "alert",
            entityId: params.type,
            action: "trail.alert.rule_superseded",
            beforeState: {
              staleAlertIds: staleIds
            },
            afterState: {
              keptAlertId: updatedAlertId,
              staleAlertIds: staleIds,
              reason: "superseded by latest engine evaluation"
            }
          },
          client
        );
      }
    }

    await client.query("COMMIT");
    return { status: "updated", alertId: updatedAlertId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function resolveLegacyAlerts(workspaceId: string): Promise<void> {
  const db = getDbPool();
  await db.query(
    `
    UPDATE alerts
    SET
      status = 'resolved',
      resolved_at = NOW(),
      payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
      metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
    WHERE workspace_id = $1::uuid
      AND status IN ('open', 'snoozed')
      AND type = ANY($3::text[])
    `,
    [
      workspaceId,
      JSON.stringify({
        resolution: {
          action: "auto_resolve",
          reason: "replaced by alert-engine v0 taxonomy",
          by: ALERT_ENGINE_SOURCE
        }
      }),
      LEGACY_ENGINE_TYPES
    ]
  );
}

async function computeGstCycleState(params: {
  workspaceId: string;
}): Promise<{
  outputGst: number;
  eligibleItc: number;
  dueDateIso: string;
  dueInDays: number;
  dueCycleStartIso: string;
  dueCycleEndIso: string;
  outputTxnIds: number[];
  itcTxnIds: number[];
  itcMismatchCount: number;
  itcMismatchAmount: number;
  itcMismatchTxnIds: number[];
}> {
  const now = new Date();
  const gstWindow = nextGstDueWindow(now);
  const db = getDbPool();
  const rowsResult = await db.query<GstTxnRow>(
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
    `,
    [params.workspaceId, gstWindow.cycleStart.toISOString(), gstWindow.cycleEnd.toISOString()]
  );

  let outputGst = 0;
  let eligibleItc = 0;
  let itcMismatchAmount = 0;
  const outputTxnIds: number[] = [];
  const itcTxnIds: number[] = [];
  const itcMismatchTxnIds: number[] = [];

  for (const row of rowsResult.rows) {
    const txnId = toPositiveInt(row.id);
    if (!txnId) {
      continue;
    }

    const gstValue = gstAmountForRow(row);
    if (gstValue <= 0) {
      continue;
    }

    if (row.direction === "credit") {
      outputGst += gstValue;
      outputTxnIds.push(txnId);
      continue;
    }

    const explicitEligibility = readItcEligibility(row.metadata);
    const inferredEligibility = isEligibleInputCategory(row.category_name);
    const eligible = explicitEligibility === true || (explicitEligibility === undefined && inferredEligibility);

    if (!eligible) {
      continue;
    }

    eligibleItc += gstValue;
    itcTxnIds.push(txnId);

    if (!hasInvoiceEvidence(row.metadata)) {
      itcMismatchAmount += gstValue;
      itcMismatchTxnIds.push(txnId);
    }
  }

  return {
    outputGst: round2(outputGst),
    eligibleItc: round2(eligibleItc),
    dueDateIso: gstWindow.dueDate.toISOString(),
    dueInDays: round2(gstWindow.dueInDays),
    dueCycleStartIso: gstWindow.cycleStart.toISOString(),
    dueCycleEndIso: gstWindow.cycleEnd.toISOString(),
    outputTxnIds: outputTxnIds.slice(0, 200),
    itcTxnIds: itcTxnIds.slice(0, 200),
    itcMismatchCount: itcMismatchTxnIds.length,
    itcMismatchAmount: round2(itcMismatchAmount),
    itcMismatchTxnIds: itcMismatchTxnIds.slice(0, 200)
  };
}

async function evaluateGstDueRule(params: {
  workspaceId: string;
  businessId: number;
  lookaheadDays: number;
  gstState: Awaited<ReturnType<typeof computeGstCycleState>>;
}): Promise<{ payableAmount: number; dueInDays: number; alert: EngineAlertSyncResult }> {
  const payableAmount = Math.max(0, params.gstState.outputGst - params.gstState.eligibleItc);
  const dueInDays = params.gstState.dueInDays;
  const shouldOpen = dueInDays >= 0 && dueInDays <= params.lookaheadDays && payableAmount > 0;
  const severity: "critical" | "warning" =
    dueInDays <= 2 || payableAmount >= 100000 ? "critical" : "warning";

  const relatedIds = [...new Set([...params.gstState.outputTxnIds, ...params.gstState.itcTxnIds])];
  const dueDate = params.gstState.dueDateIso.slice(0, 10);

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "gst_due",
    rule: "gst_due_v0",
    shouldOpen,
    severity,
    title: `GST due soon: ${toCurrency(payableAmount)} by ${dueDate}`,
    body: `Estimated GST payable ${toCurrency(payableAmount)} (output ${toCurrency(params.gstState.outputGst)} - ITC ${toCurrency(params.gstState.eligibleItc)}). Due in ${Math.max(0, Math.ceil(dueInDays))} day(s).`,
    relatedTransactionIds: relatedIds,
    payload: {
      payableAmount,
      outputGst: params.gstState.outputGst,
      eligibleItc: params.gstState.eligibleItc,
      dueDate: params.gstState.dueDateIso,
      dueInDays,
      lookaheadDays: params.lookaheadDays,
      formula: "gst_due_when_due_date_within_window"
    }
  });

  return { payableAmount: round2(payableAmount), dueInDays: round2(dueInDays), alert };
}

async function evaluateItcMismatchRule(params: {
  workspaceId: string;
  businessId: number;
  threshold: number;
  gstState: Awaited<ReturnType<typeof computeGstCycleState>>;
}): Promise<{
  mismatchCount: number;
  mismatchAmount: number;
  threshold: number;
  alert: EngineAlertSyncResult;
}> {
  const mismatchCount = params.gstState.itcMismatchCount;
  const mismatchAmount = params.gstState.itcMismatchAmount;
  const shouldOpen = mismatchCount > params.threshold;
  const severity: "critical" | "warning" = mismatchCount >= params.threshold * 2 ? "critical" : "warning";

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "itc_mismatch",
    rule: "itc_mismatch_count_v0",
    shouldOpen,
    severity,
    title: `ITC mismatch risk: ${mismatchCount} invoice(s) unmatched`,
    body: `${mismatchCount} eligible ITC transaction(s) are missing invoice evidence. Potential ITC at risk ${toCurrency(mismatchAmount)}.`,
    relatedTransactionIds: params.gstState.itcMismatchTxnIds,
    payload: {
      mismatchCount,
      mismatchAmount,
      threshold: params.threshold,
      cycleStart: params.gstState.dueCycleStartIso,
      cycleEnd: params.gstState.dueCycleEndIso,
      formula: "itc_mismatch_when_unmatched_invoice_count_exceeds_threshold",
      fixAction: {
        label: "Upload invoice evidence",
        kind: "open_filter",
        preset: "itc_mismatch"
      }
    }
  });

  return {
    mismatchCount,
    mismatchAmount,
    threshold: params.threshold,
    alert
  };
}

async function evaluateRefundSpikeRule(params: {
  workspaceId: string;
  businessId: number;
  ratioThreshold: number;
}): Promise<{
  refundsThisWeek: number;
  avgRefunds4w: number;
  ratioThreshold: number;
  alert: EngineAlertSyncResult;
}> {
  const db = getDbPool();

  const aggregateResult = await db.query<RefundAggregateRow>(
    `
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN t.occurred_at >= NOW() - INTERVAL '7 days' THEN t.amount_minor
            ELSE 0
          END
        ),
        0
      )::text AS refunds_this_week,
      COALESCE(
        SUM(
          CASE
            WHEN t.occurred_at >= NOW() - INTERVAL '35 days'
              AND t.occurred_at < NOW() - INTERVAL '7 days'
            THEN t.amount_minor
            ELSE 0
          END
        ),
        0
      )::text AS refunds_prev_4w
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= NOW() - INTERVAL '35 days'
      AND (
        COALESCE(t.description, '') ILIKE ANY($2::text[])
        OR COALESCE(t.counterparty, '') ILIKE ANY($2::text[])
        OR COALESCE(t.external_ref, '') ILIKE ANY($2::text[])
      )
    `,
    [params.workspaceId, REFUND_PATTERN_HINTS]
  );

  const row = aggregateResult.rows[0];
  const refundsThisWeek = toNumber(row?.refunds_this_week);
  const avgRefunds4w = toNumber(row?.refunds_prev_4w) / 4;

  const shouldOpen = avgRefunds4w > 0 && refundsThisWeek > avgRefunds4w * params.ratioThreshold;
  const severity: "critical" | "warning" =
    avgRefunds4w > 0 && refundsThisWeek > avgRefunds4w * Math.max(1.5, params.ratioThreshold + 0.2)
      ? "critical"
      : "warning";

  const relatedRows = await db.query<IdRow>(
    `
    SELECT t.id::text
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= NOW() - INTERVAL '7 days'
      AND (
        COALESCE(t.description, '') ILIKE ANY($2::text[])
        OR COALESCE(t.counterparty, '') ILIKE ANY($2::text[])
        OR COALESCE(t.external_ref, '') ILIKE ANY($2::text[])
      )
    ORDER BY t.amount_minor DESC, t.occurred_at DESC
    LIMIT 200
    `,
    [params.workspaceId, REFUND_PATTERN_HINTS]
  );

  const relatedIds = relatedRows.rows
    .map((item) => toPositiveInt(item.id))
    .filter((id): id is number => id !== null);

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "refund_spike",
    rule: "refund_spike_v0",
    shouldOpen,
    severity,
    title: `Refund spike detected: ${toCurrency(refundsThisWeek)} this week`,
    body: `Refunds this week ${toCurrency(refundsThisWeek)} vs 4-week weekly average ${toCurrency(avgRefunds4w)} (threshold ${params.ratioThreshold.toFixed(2)}x).`,
    relatedTransactionIds: relatedIds,
    payload: {
      refundsThisWeek: round2(refundsThisWeek),
      avgRefunds4w: round2(avgRefunds4w),
      ratioThreshold: params.ratioThreshold,
      thresholdAmount: round2(avgRefunds4w * params.ratioThreshold),
      formula: "refunds_this_week > avg_4w * threshold",
      suggestedAction: {
        kind: "review_reversal_candidates",
        label: "Review potential reversals",
        evidenceTransactionIds: relatedIds.slice(0, 50)
      }
    }
  });

  return {
    refundsThisWeek: round2(refundsThisWeek),
    avgRefunds4w: round2(avgRefunds4w),
    ratioThreshold: params.ratioThreshold,
    alert
  };
}

async function evaluateReconciliationGapRule(params: {
  workspaceId: string;
  businessId: number;
  thresholdPct: number;
}): Promise<{
  totalCount: number;
  unmatchedCount: number;
  gapPct: number;
  thresholdPct: number;
  alert: EngineAlertSyncResult;
}> {
  const db = getDbPool();
  const aggregateResult = await db.query<ReconciliationAggregateRow>(
    `
    SELECT
      COUNT(*) FILTER (WHERE t.status <> 'pending')::text AS total_count,
      COUNT(*) FILTER (WHERE t.status <> 'pending' AND t.matched = FALSE)::text AS unmatched_count
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
    `,
    [params.workspaceId]
  );

  const row = aggregateResult.rows[0];
  const totalCount = Math.max(0, Math.trunc(toNumber(row?.total_count)));
  const unmatchedCount = Math.max(0, Math.trunc(toNumber(row?.unmatched_count)));
  const gapPct = totalCount > 0 ? (unmatchedCount / totalCount) * 100 : 0;

  const shouldOpen = totalCount >= 20 && gapPct >= params.thresholdPct;
  const severity: "critical" | "warning" =
    gapPct >= Math.max(params.thresholdPct * 1.8, 20) ? "critical" : "warning";

  const relatedRows = await db.query<IdRow>(
    `
    SELECT t.id::text
    FROM transactions t
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.matched = FALSE
    ORDER BY t.occurred_at DESC, t.id DESC
    LIMIT 200
    `,
    [params.workspaceId]
  );

  const relatedIds = relatedRows.rows
    .map((item) => toPositiveInt(item.id))
    .filter((id): id is number => id !== null);

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "reconciliation_gap",
    rule: "reconciliation_gap_v0",
    shouldOpen,
    severity,
    title: `Reconciliation gap: ${round2(gapPct)}% unmatched`,
    body: `${unmatchedCount} of ${totalCount} posted transactions are unmatched (${round2(gapPct)}%).`,
    relatedTransactionIds: relatedIds,
    payload: {
      totalCount,
      unmatchedCount,
      gapPct: round2(gapPct),
      thresholdPct: params.thresholdPct,
      formula: "unmatched_pct > threshold_pct",
      fixAction: {
        label: "Review unmatched transactions",
        kind: "open_recon",
        recon: "unmatched"
      }
    }
  });

  return {
    totalCount,
    unmatchedCount,
    gapPct: round2(gapPct),
    thresholdPct: params.thresholdPct,
    alert
  };
}

async function evaluateCashRunwayRiskRule(params: {
  workspaceId: string;
  businessId: number;
  thresholdDays: number;
}): Promise<{ runwayDays: number; thresholdDays: number; alert: EngineAlertSyncResult }> {
  const db = getDbPool();
  const aggregateResult = await db.query<BurnAggregateRow>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS cash_balance,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '30 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_30d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '60 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_60d,
      COALESCE(SUM(CASE WHEN direction = 'debit' AND occurred_at >= NOW() - INTERVAL '90 days' THEN amount_minor ELSE 0 END), 0)::text AS expense_90d
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
    `,
    [params.workspaceId]
  );

  const row = aggregateResult.rows[0];
  const cashBalance = toNumber(row?.cash_balance);
  const burn30 = toNumber(row?.expense_30d) / 30;
  const burn60 = toNumber(row?.expense_60d) / 60;
  const burn90 = toNumber(row?.expense_90d) / 90;
  const avgDailyBurn = (burn30 + burn60 + burn90) / 3;
  const runwayDays = avgDailyBurn > 0 ? cashBalance / avgDailyBurn : 999;
  const shouldOpen = runwayDays < params.thresholdDays;
  const severity: "critical" | "warning" =
    runwayDays < Math.max(5, params.thresholdDays / 2) ? "critical" : "warning";

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "cash_runway_risk",
    rule: "cash_runway_risk_v0",
    shouldOpen,
    severity,
    title: `Cash runway risk: ${Math.max(0, runwayDays).toFixed(1)} days`,
    body: `Cash balance ${toCurrency(cashBalance)} with avg burn ${toCurrency(avgDailyBurn)}/day gives runway ${Math.max(0, runwayDays).toFixed(1)} days (threshold ${params.thresholdDays} days).`,
    relatedTransactionIds: [],
    payload: {
      runwayDays: round2(runwayDays),
      thresholdDays: params.thresholdDays,
      cashBalance: round2(cashBalance),
      avgDailyBurn: round2(avgDailyBurn),
      burnRateDaily30d: round2(burn30),
      burnRateDaily60d: round2(burn60),
      burnRateDaily90d: round2(burn90),
      formula: "cash / avg_daily_burn < threshold_days"
    }
  });

  return {
    runwayDays: round2(runwayDays),
    thresholdDays: params.thresholdDays,
    alert
  };
}

async function evaluateSyncFailureRule(params: {
  workspaceId: string;
  businessId: number;
  lookbackHours: number;
}): Promise<{
  failedRuns: number;
  partialRuns: number;
  lookbackHours: number;
  alert: EngineAlertSyncResult;
}> {
  const db = getDbPool();

  let aggregate: SyncFailureAggregateRow | null = null;
  try {
    const result = await db.query<SyncFailureAggregateRow>(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'failed'
            AND COALESCE(started_at, created_at) >= NOW() - $2::interval
        )::text AS failed_runs,
        COUNT(*) FILTER (
          WHERE status = 'partial'
            AND COALESCE(started_at, created_at) >= NOW() - $2::interval
        )::text AS partial_runs,
        COALESCE(MAX(finished_at), MAX(started_at), MAX(created_at))::text AS last_run_at,
        MAX(CASE WHEN status = 'failed' THEN COALESCE(error, '') ELSE '' END)::text AS last_error
      FROM ingestion_runs
      WHERE workspace_id = $1::uuid
      `,
      [params.workspaceId, `${params.lookbackHours} hours`]
    );

    aggregate = result.rows[0] ?? null;
  } catch (error) {
    if (isMissingRelationError(error, "ingestion_runs")) {
      return {
        failedRuns: 0,
        partialRuns: 0,
        lookbackHours: params.lookbackHours,
        alert: { status: "none", alertId: null }
      };
    }

    throw error;
  }

  const failedRuns = Math.max(0, Math.trunc(toNumber(aggregate?.failed_runs)));
  const partialRuns = Math.max(0, Math.trunc(toNumber(aggregate?.partial_runs)));
  const shouldOpen = failedRuns + partialRuns > 0;
  const severity: "critical" | "warning" = failedRuns > 0 ? "critical" : "warning";

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "sync_failure",
    rule: "sync_failure_v0",
    shouldOpen,
    severity,
    title: `Sync failure in last ${params.lookbackHours}h: ${failedRuns} failed, ${partialRuns} partial`,
    body: `Detected ${failedRuns} failed and ${partialRuns} partial ingestion run(s) in the last ${params.lookbackHours} hour(s).`,
    relatedTransactionIds: [],
    payload: {
      failedRuns,
      partialRuns,
      lookbackHours: params.lookbackHours,
      lastRunAt: aggregate?.last_run_at ?? null,
      lastError: aggregate?.last_error ?? null,
      formula: "failed_or_partial_ingestion_runs_in_lookback > 0"
    }
  });

  return {
    failedRuns,
    partialRuns,
    lookbackHours: params.lookbackHours,
    alert
  };
}

async function evaluateAnomalyDetectedRule(params: {
  workspaceId: string;
  businessId: number;
  ratioThreshold: number;
  minDelta: number;
}): Promise<{
  currentMonthExpense: number;
  baselineExpense: number;
  ratio: number;
  ratioThreshold: number;
  alert: EngineAlertSyncResult;
}> {
  const db = getDbPool();
  const now = new Date();
  const monthStart = monthStartUtc(now);

  const monthlyResult = await db.query<ExpenseMonthlyRow>(
    `
    SELECT
      date_trunc('month', occurred_at AT TIME ZONE 'UTC')::date::text AS month_start,
      COALESCE(SUM(amount_minor), 0)::text AS expense
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= ($2::timestamptz - INTERVAL '3 months')
      AND occurred_at < ($2::timestamptz + INTERVAL '1 month')
    GROUP BY 1
    ORDER BY 1 DESC
    `,
    [params.workspaceId, monthStart.toISOString()]
  );

  const currentMonthKey = monthStart.toISOString().slice(0, 10);
  let currentMonthExpense = 0;
  const previousExpenses: number[] = [];

  for (const row of monthlyResult.rows) {
    const expense = Math.abs(toNumber(row.expense));
    if (row.month_start === currentMonthKey) {
      currentMonthExpense = expense;
      continue;
    }

    if (previousExpenses.length < 3) {
      previousExpenses.push(expense);
    }
  }

  const baselineExpense =
    previousExpenses.length > 0
      ? previousExpenses.reduce((sum, value) => sum + value, 0) / previousExpenses.length
      : 0;

  const ratio = baselineExpense > 0 ? currentMonthExpense / baselineExpense : 0;
  const delta = currentMonthExpense - baselineExpense;
  const shouldOpen =
    baselineExpense > 0 &&
    ratio >= params.ratioThreshold &&
    delta >= params.minDelta;
  const severity: "critical" | "warning" =
    ratio >= Math.max(1.8, params.ratioThreshold + 0.4) ? "critical" : "warning";

  const topExpenseRows = await db.query<IdRow>(
    `
    SELECT id::text
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= $2::timestamptz
    ORDER BY amount_minor DESC, occurred_at DESC
    LIMIT 150
    `,
    [params.workspaceId, monthStart.toISOString()]
  );

  const relatedIds = topExpenseRows.rows
    .map((item) => toPositiveInt(item.id))
    .filter((id): id is number => id !== null);

  const alert = await syncRuleAlert({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    type: "anomaly_detected",
    rule: "expense_spike_anomaly_v0",
    shouldOpen,
    severity,
    title: `Expense anomaly: ${(ratio * 100).toFixed(0)}% of baseline`,
    body: `Current month expenses ${toCurrency(currentMonthExpense)} vs 3-month baseline ${toCurrency(baselineExpense)} (${ratio.toFixed(2)}x).`,
    relatedTransactionIds: relatedIds,
    payload: {
      anomalyKind: "expense_spike",
      currentMonthExpense: round2(currentMonthExpense),
      baselineExpense: round2(baselineExpense),
      ratio: round2(ratio),
      ratioThreshold: params.ratioThreshold,
      minDelta: params.minDelta,
      comparedMonths: previousExpenses.length
    }
  });

  return {
    currentMonthExpense: round2(currentMonthExpense),
    baselineExpense: round2(baselineExpense),
    ratio: round2(ratio),
    ratioThreshold: params.ratioThreshold,
    alert
  };
}

export async function evaluateWorkspaceAlerts(
  input: EvaluateWorkspaceAlertsInput
): Promise<EvaluateWorkspaceAlertsResult> {
  const gstDueLookaheadDays =
    input.gstDueLookaheadDays ?? DEFAULT_GST_DUE_LOOKAHEAD_DAYS;
  const itcMismatchThreshold =
    input.itcMismatchThreshold ?? DEFAULT_ITC_MISMATCH_THRESHOLD;
  const refundSpikeRatioThreshold =
    input.refundSpikeRatioThreshold ?? DEFAULT_REFUND_SPIKE_RATIO;
  const cashRunwayThresholdDays =
    input.cashRunwayThresholdDays ?? DEFAULT_CASH_RUNWAY_THRESHOLD_DAYS;
  const reconciliationGapThresholdPct =
    input.reconciliationGapThresholdPct ?? DEFAULT_RECONCILIATION_GAP_THRESHOLD_PCT;
  const syncFailureLookbackHours =
    input.syncFailureLookbackHours ?? DEFAULT_SYNC_FAILURE_LOOKBACK_HOURS;
  const anomalyRatioThreshold =
    input.anomalyRatioThreshold ?? DEFAULT_ANOMALY_RATIO;
  const anomalyMinDelta = input.anomalyMinDelta ?? DEFAULT_ANOMALY_MIN_DELTA;

  if (!Number.isInteger(gstDueLookaheadDays) || gstDueLookaheadDays <= 0 || gstDueLookaheadDays > 31) {
    throw new Error("gstDueLookaheadDays must be between 1 and 31");
  }

  if (!Number.isInteger(itcMismatchThreshold) || itcMismatchThreshold <= 0) {
    throw new Error("itcMismatchThreshold must be a positive integer");
  }

  if (!Number.isFinite(refundSpikeRatioThreshold) || refundSpikeRatioThreshold <= 1) {
    throw new Error("refundSpikeRatioThreshold must be greater than 1");
  }

  if (!Number.isFinite(cashRunwayThresholdDays) || cashRunwayThresholdDays <= 0) {
    throw new Error("cashRunwayThresholdDays must be a positive number");
  }

  if (
    !Number.isFinite(reconciliationGapThresholdPct) ||
    reconciliationGapThresholdPct <= 0 ||
    reconciliationGapThresholdPct > 100
  ) {
    throw new Error("reconciliationGapThresholdPct must be between 0 and 100");
  }

  if (!Number.isInteger(syncFailureLookbackHours) || syncFailureLookbackHours <= 0 || syncFailureLookbackHours > 168) {
    throw new Error("syncFailureLookbackHours must be between 1 and 168");
  }

  if (!Number.isFinite(anomalyRatioThreshold) || anomalyRatioThreshold <= 1) {
    throw new Error("anomalyRatioThreshold must be greater than 1");
  }

  if (!Number.isFinite(anomalyMinDelta) || anomalyMinDelta < 0) {
    throw new Error("anomalyMinDelta must be a non-negative number");
  }

  const sendWhatsAppDigest = input.sendWhatsAppDigest ?? false;

  const health = await computeFinanceHealth({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    syncAlerts: false
  });

  const gstState = await computeGstCycleState({
    workspaceId: input.workspaceId
  });

  const gstDue = await evaluateGstDueRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    lookaheadDays: gstDueLookaheadDays,
    gstState
  });

  const itcMismatch = await evaluateItcMismatchRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    threshold: itcMismatchThreshold,
    gstState
  });

  const refundSpike = await evaluateRefundSpikeRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    ratioThreshold: refundSpikeRatioThreshold
  });

  const reconciliationGap = await evaluateReconciliationGapRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    thresholdPct: reconciliationGapThresholdPct
  });

  const cashRunwayRisk = await evaluateCashRunwayRiskRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    thresholdDays: cashRunwayThresholdDays
  });

  const syncFailure = await evaluateSyncFailureRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    lookbackHours: syncFailureLookbackHours
  });

  const anomalyDetected = await evaluateAnomalyDetectedRule({
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    ratioThreshold: anomalyRatioThreshold,
    minDelta: anomalyMinDelta
  });

  await resolveLegacyAlerts(input.workspaceId);

  let whatsAppDigest: WhatsAppDigestResult | undefined;
  if (sendWhatsAppDigest) {
    try {
      whatsAppDigest = await sendProactiveWhatsAppAlertDigest({
        workspaceId: input.workspaceId,
        businessId: input.businessId,
        appBaseUrl: input.appBaseUrl
      });
    } catch (error) {
      whatsAppDigest = {
        status: "failed",
        reason: "whatsapp_dispatch_error",
        alertCount: 0,
        preview: "Failed to send proactive WhatsApp digest",
        error: error instanceof Error ? error.message : "Unknown WhatsApp dispatch error"
      };
    }
  }

  return {
    workspaceId: input.workspaceId,
    businessId: input.businessId,
    health,
    whatsAppDigest,
    alerts: {
      gstDue,
      itcMismatch,
      refundSpike,
      reconciliationGap,
      cashRunwayRisk,
      syncFailure,
      anomalyDetected
    }
  };
}

export async function runDailyAlertEvaluation(input?: {
  limit?: number;
  gstDueLookaheadDays?: number;
  itcMismatchThreshold?: number;
  refundSpikeRatioThreshold?: number;
  cashRunwayThresholdDays?: number;
  reconciliationGapThresholdPct?: number;
  syncFailureLookbackHours?: number;
  anomalyRatioThreshold?: number;
  anomalyMinDelta?: number;
  sendWhatsAppDigest?: boolean;
  appBaseUrl?: string;
}): Promise<DailyAlertEngineResult> {
  const startedAt = new Date().toISOString();
  const db = getDbPool();
  const limit = input?.limit;
  const sendWhatsAppDigest = input?.sendWhatsAppDigest ?? true;

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0 || limit > 5000)) {
    throw new Error("limit must be between 1 and 5000");
  }

  const values: Array<number> = [];
  const limitClause = limit !== undefined ? `LIMIT $1` : "";
  if (limit !== undefined) {
    values.push(limit);
  }

  const workspaceRows = await db.query<WorkspaceRow>(
    `
    SELECT
      w.id::text AS workspace_id,
      w.business_id::text AS business_id
    FROM workspaces w
    INNER JOIN businesses b ON b.id = w.business_id
    WHERE COALESCE(b.is_active, TRUE) = TRUE
    ORDER BY w.id ASC
    ${limitClause}
    `,
    values
  );

  const results: EvaluateWorkspaceAlertsResult[] = [];
  const failures: DailyAlertEngineResult["failures"] = [];

  for (const row of workspaceRows.rows) {
    const businessId = toPositiveInt(row.business_id);
    if (!businessId) {
      failures.push({
        workspaceId: row.workspace_id,
        businessId: 0,
        error: `Invalid business id on workspace row: ${row.business_id}`
      });
      continue;
    }

    try {
      const result = await evaluateWorkspaceAlerts({
        workspaceId: row.workspace_id,
        businessId,
        gstDueLookaheadDays: input?.gstDueLookaheadDays,
        itcMismatchThreshold: input?.itcMismatchThreshold,
        refundSpikeRatioThreshold: input?.refundSpikeRatioThreshold,
        cashRunwayThresholdDays: input?.cashRunwayThresholdDays,
        reconciliationGapThresholdPct: input?.reconciliationGapThresholdPct,
        syncFailureLookbackHours: input?.syncFailureLookbackHours,
        anomalyRatioThreshold: input?.anomalyRatioThreshold,
        anomalyMinDelta: input?.anomalyMinDelta,
        sendWhatsAppDigest,
        appBaseUrl: input?.appBaseUrl
      });
      results.push(result);
    } catch (error) {
      failures.push({
        workspaceId: row.workspace_id,
        businessId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    scannedWorkspaces: workspaceRows.rows.length,
    successCount: results.length,
    failureCount: failures.length,
    results,
    failures
  };
}

export const ALERT_V0_ALERT_TYPES = ALERT_V0_TYPES;
export const FIRST_FIVE_ALERT_TYPES = ALERT_V0_TYPES;
