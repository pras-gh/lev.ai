import { NextRequest } from "next/server";
import {
  evaluateWorkspaceAlerts,
  type EvaluateWorkspaceAlertsResult
} from "@/lib/alert-engine";
import {
  computeMonthlySummary,
  type MonthlySummary
} from "@/lib/monthly-summary";
import {
  applyRulesV0ForWorkspace,
  type ApplyRulesV0Result
} from "@/lib/rules-engine-v0";
import { getDbPool } from "@/lib/db";

type ScopeInput = {
  workspaceId: string;
  businessId: number;
};

type ReconcileSuggestResult = {
  workspaceId: string;
  businessId: number;
  scanned: number;
  suggestions: number;
  updatedRows: number;
  clearedRows: number;
  recon_match_pct: number;
};

type CloseMonthOptions = {
  month?: string;
  ruleLimit?: number;
  confidenceThreshold?: number;
  reconcileLimit?: number;
  reconcileMaxDateWindowDays?: number;
  reconcileConfidenceThreshold?: number;
  sendWhatsAppDigest?: boolean;
};

type StageDurations = {
  categorizeMs: number;
  reconcileMs: number;
  alertsMs: number;
  reportMs: number;
};

type SnapshotRow = {
  tx_total: string;
  tx_categorized: string;
  tx_matched: string;
  tx_latest_updated_at: string | null;
  open_alerts: string;
  alerts_latest_touched_at: string | null;
};

type WorkspaceSnapshot = {
  txTotal: number;
  txCategorized: number;
  txMatched: number;
  openAlerts: number;
  txLatestUpdatedAt: string | null;
  alertsLatestTouchedAt: string | null;
};

type SnapshotDelta = {
  txTotal: number;
  txCategorized: number;
  txMatched: number;
  openAlerts: number;
};

export type CloseMonthPipelineResult = {
  workspaceId: string;
  businessId: number;
  month: string;
  monthLabel: string;
  completedAt: string;
  durationMs: number;
  stageDurations: StageDurations;
  categorize: ApplyRulesV0Result;
  reconcile: ReconcileSuggestResult;
  alerts: {
    result: EvaluateWorkspaceAlertsResult;
    statusCounts: {
      opened: number;
      updated: number;
      resolved: number;
      none: number;
    };
  };
  report: Pick<MonthlySummary, "generatedAt" | "metrics">;
  verification: {
    before: WorkspaceSnapshot;
    after: WorkspaceSnapshot;
    delta: SnapshotDelta;
    checks: {
      apiRun: boolean;
      dbTouched: boolean;
      alertsEvaluated: boolean;
      reportGenerated: boolean;
    };
  };
};

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  return fallback;
}

export function forwardAuthHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  const candidates = [
    "authorization",
    "x-supabase-access-token",
    "x-access-token",
    "cookie"
  ] as const;

  for (const key of candidates) {
    const value = request.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return headers;
}

function validateMonth(month: string | undefined): string | undefined {
  if (!month) {
    return undefined;
  }

  const normalized = month.trim();
  if (!normalized) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    throw new Error("month must be in YYYY-MM format");
  }

  return normalized;
}

function countAlertStatuses(result: EvaluateWorkspaceAlertsResult): {
  opened: number;
  updated: number;
  resolved: number;
  none: number;
} {
  const statuses = [
    result.alerts.gstDue.alert.status,
    result.alerts.itcMismatch.alert.status,
    result.alerts.refundSpike.alert.status,
    result.alerts.reconciliationGap.alert.status,
    result.alerts.cashRunwayRisk.alert.status,
    result.alerts.syncFailure.alert.status,
    result.alerts.anomalyDetected.alert.status
  ];

  let opened = 0;
  let updated = 0;
  let resolved = 0;
  let none = 0;

  for (const status of statuses) {
    if (status === "opened") {
      opened += 1;
      continue;
    }

    if (status === "updated") {
      updated += 1;
      continue;
    }

    if (status === "resolved") {
      resolved += 1;
      continue;
    }

    none += 1;
  }

  return { opened, updated, resolved, none };
}

function parseSnapshotRow(row: SnapshotRow | undefined): WorkspaceSnapshot {
  return {
    txTotal: Number(row?.tx_total ?? "0"),
    txCategorized: Number(row?.tx_categorized ?? "0"),
    txMatched: Number(row?.tx_matched ?? "0"),
    openAlerts: Number(row?.open_alerts ?? "0"),
    txLatestUpdatedAt: row?.tx_latest_updated_at ?? null,
    alertsLatestTouchedAt: row?.alerts_latest_touched_at ?? null
  };
}

function isoToTime(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function readWorkspaceSnapshot(workspaceId: string): Promise<WorkspaceSnapshot> {
  const db = getDbPool();
  const result = await db.query<SnapshotRow>(
    `
    SELECT
      (
        SELECT COUNT(*)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status <> 'pending'
      ) AS tx_total,
      (
        SELECT COUNT(*)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status <> 'pending'
          AND t.category_id IS NOT NULL
      ) AS tx_categorized,
      (
        SELECT COUNT(*)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status <> 'pending'
          AND t.matched = TRUE
      ) AS tx_matched,
      (
        SELECT MAX(t.updated_at)::text
        FROM transactions t
        WHERE t.workspace_id = $1::uuid
      ) AS tx_latest_updated_at,
      (
        SELECT COUNT(*)::text
        FROM alerts a
        WHERE a.workspace_id = $1::uuid
          AND a.status = 'open'
      ) AS open_alerts,
      (
        SELECT MAX(COALESCE(a.resolved_at, a.created_at))::text
        FROM alerts a
        WHERE a.workspace_id = $1::uuid
      ) AS alerts_latest_touched_at
    `,
    [workspaceId]
  );

  return parseSnapshotRow(result.rows[0]);
}

async function runReconcileSuggest(params: {
  request: NextRequest;
  scope: ScopeInput;
  limit: number;
  maxDateWindowDays: number;
  confidenceThreshold: number;
}): Promise<ReconcileSuggestResult> {
  const response = await fetch(
    new URL("/api/transactions/reconcile/suggest", params.request.url),
    {
      method: "POST",
      headers: forwardAuthHeaders(params.request),
      cache: "no-store",
      body: JSON.stringify({
        workspaceId: params.scope.workspaceId,
        businessId: params.scope.businessId,
        limit: params.limit,
        maxDateWindowDays: params.maxDateWindowDays,
        confidenceThreshold: params.confidenceThreshold
      })
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | ReconcileSuggestResult
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(payload, "Failed to run reconciliation suggestion step")
    );
  }

  const responseRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  return {
    workspaceId:
      typeof responseRecord.workspaceId === "string"
        ? responseRecord.workspaceId
        : params.scope.workspaceId,
    businessId:
      typeof responseRecord.businessId === "number"
        ? responseRecord.businessId
        : params.scope.businessId,
    scanned: Number(responseRecord.scanned ?? 0),
    suggestions: Number(responseRecord.suggestions ?? 0),
    updatedRows: Number(responseRecord.updatedRows ?? 0),
    clearedRows: Number(responseRecord.clearedRows ?? 0),
    recon_match_pct: Number(responseRecord.recon_match_pct ?? 0)
  };
}

export async function runCloseMonthPipeline(params: {
  request: NextRequest;
  scope: ScopeInput;
  options?: CloseMonthOptions;
}): Promise<CloseMonthPipelineResult> {
  const startedAt = Date.now();
  const month = validateMonth(params.options?.month);
  const beforeSnapshot = await readWorkspaceSnapshot(params.scope.workspaceId);

  const ruleLimit = params.options?.ruleLimit ?? 2000;
  const confidenceThreshold = params.options?.confidenceThreshold ?? 0.65;
  const reconcileLimit = params.options?.reconcileLimit ?? 1200;
  const reconcileMaxDateWindowDays = params.options?.reconcileMaxDateWindowDays ?? 3;
  const reconcileConfidenceThreshold =
    params.options?.reconcileConfidenceThreshold ?? 0.6;
  const sendWhatsAppDigest = params.options?.sendWhatsAppDigest ?? false;

  const categorizeStartedAt = Date.now();
  const categorize = await applyRulesV0ForWorkspace({
    workspaceId: params.scope.workspaceId,
    businessId: params.scope.businessId,
    limit: ruleLimit,
    confidenceThreshold
  });
  const categorizeMs = Date.now() - categorizeStartedAt;

  const reconcileStartedAt = Date.now();
  const reconcile = await runReconcileSuggest({
    request: params.request,
    scope: params.scope,
    limit: reconcileLimit,
    maxDateWindowDays: reconcileMaxDateWindowDays,
    confidenceThreshold: reconcileConfidenceThreshold
  });
  const reconcileMs = Date.now() - reconcileStartedAt;

  const alertsStartedAt = Date.now();
  const alertsResult = await evaluateWorkspaceAlerts({
    workspaceId: params.scope.workspaceId,
    businessId: params.scope.businessId,
    sendWhatsAppDigest
  });
  const alertsMs = Date.now() - alertsStartedAt;

  const reportStartedAt = Date.now();
  const report = await computeMonthlySummary({
    workspaceId: params.scope.workspaceId,
    businessId: params.scope.businessId,
    month
  });
  const reportMs = Date.now() - reportStartedAt;
  const afterSnapshot = await readWorkspaceSnapshot(params.scope.workspaceId);

  const durationMs = Date.now() - startedAt;
  const delta = {
    txTotal: afterSnapshot.txTotal - beforeSnapshot.txTotal,
    txCategorized: afterSnapshot.txCategorized - beforeSnapshot.txCategorized,
    txMatched: afterSnapshot.txMatched - beforeSnapshot.txMatched,
    openAlerts: afterSnapshot.openAlerts - beforeSnapshot.openAlerts
  };
  const dbTouched =
    delta.txTotal !== 0 ||
    delta.txCategorized !== 0 ||
    delta.txMatched !== 0 ||
    delta.openAlerts !== 0 ||
    isoToTime(afterSnapshot.txLatestUpdatedAt) > isoToTime(beforeSnapshot.txLatestUpdatedAt) ||
    isoToTime(afterSnapshot.alertsLatestTouchedAt) >
      isoToTime(beforeSnapshot.alertsLatestTouchedAt);

  return {
    workspaceId: params.scope.workspaceId,
    businessId: params.scope.businessId,
    month: report.month,
    monthLabel: report.monthLabel,
    completedAt: new Date().toISOString(),
    durationMs,
    stageDurations: {
      categorizeMs,
      reconcileMs,
      alertsMs,
      reportMs
    },
    categorize,
    reconcile,
    alerts: {
      result: alertsResult,
      statusCounts: countAlertStatuses(alertsResult)
    },
    report: {
      generatedAt: report.generatedAt,
      metrics: report.metrics
    },
    verification: {
      before: beforeSnapshot,
      after: afterSnapshot,
      delta,
      checks: {
        apiRun: true,
        dbTouched,
        alertsEvaluated: true,
        reportGenerated: Boolean(report.generatedAt)
      }
    }
  };
}
