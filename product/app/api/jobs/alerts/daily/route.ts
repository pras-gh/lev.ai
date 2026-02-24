import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams,
  resolveScope
} from "@/lib/api-utils";
import {
  evaluateWorkspaceAlerts,
  runDailyAlertEvaluation,
  type EvaluateWorkspaceAlertsResult
} from "@/lib/alert-engine";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EngineOptions = {
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
};

type IdRow = {
  id: string;
};

type RunningJobStartResult = {
  jobRunId: number | null;
  activeConflict: boolean;
};

type DeliveryAttemptStatus = "success" | "failed" | "retrying";

function readBearerToken(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer") {
    return null;
  }

  return token?.trim() || null;
}

function isAuthorized(request: NextRequest): boolean {
  const candidates = [process.env.ALERT_ENGINE_KEY, process.env.CRON_SECRET]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);

  if (candidates.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  const bearer = readBearerToken(request.headers.get("authorization"));
  const headerKey = request.headers.get("x-alert-engine-key")?.trim() || null;
  const queryKey = request.nextUrl.searchParams.get("key")?.trim() || null;
  const provided = [bearer, headerKey, queryKey].filter(
    (value): value is string => Boolean(value)
  );

  return provided.some((value) => candidates.includes(value));
}

function parseOptionalPositiveInt(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

function parseOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number`);
  }

  return parsed;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

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

  throw new Error(`${fieldName} must be true or false`);
}

function parseOptionalHttpUrl(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a URL string`);
  }

  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use http or https`);
  }

  return trimmed;
}

function optionsFromSearchParams(params: URLSearchParams): EngineOptions {
  return {
    limit: parseOptionalPositiveInt(params.get("limit"), "limit"),
    gstDueLookaheadDays: parseOptionalPositiveInt(
      params.get("gstDueLookaheadDays"),
      "gstDueLookaheadDays"
    ),
    itcMismatchThreshold: parseOptionalPositiveInt(
      params.get("itcMismatchThreshold"),
      "itcMismatchThreshold"
    ),
    refundSpikeRatioThreshold: parseOptionalNumber(
      params.get("refundSpikeRatioThreshold"),
      "refundSpikeRatioThreshold"
    ),
    cashRunwayThresholdDays: parseOptionalNumber(
      params.get("cashRunwayThresholdDays"),
      "cashRunwayThresholdDays"
    ),
    reconciliationGapThresholdPct: parseOptionalNumber(
      params.get("reconciliationGapThresholdPct"),
      "reconciliationGapThresholdPct"
    ),
    syncFailureLookbackHours: parseOptionalPositiveInt(
      params.get("syncFailureLookbackHours"),
      "syncFailureLookbackHours"
    ),
    anomalyRatioThreshold: parseOptionalNumber(
      params.get("anomalyRatioThreshold") ?? params.get("expenseSpikeRatioThreshold"),
      "anomalyRatioThreshold"
    ),
    anomalyMinDelta: parseOptionalNumber(
      params.get("anomalyMinDelta") ?? params.get("expenseSpikeMinDelta"),
      "anomalyMinDelta"
    ),
    sendWhatsAppDigest: parseOptionalBoolean(
      params.get("sendWhatsAppDigest"),
      "sendWhatsAppDigest"
    ),
    appBaseUrl: parseOptionalHttpUrl(params.get("appBaseUrl"), "appBaseUrl")
  };
}

function optionsFromBody(body: Record<string, unknown>): EngineOptions {
  return {
    limit: parseOptionalPositiveInt(body.limit, "limit"),
    gstDueLookaheadDays: parseOptionalPositiveInt(
      body.gstDueLookaheadDays,
      "gstDueLookaheadDays"
    ),
    itcMismatchThreshold: parseOptionalPositiveInt(
      body.itcMismatchThreshold,
      "itcMismatchThreshold"
    ),
    refundSpikeRatioThreshold: parseOptionalNumber(
      body.refundSpikeRatioThreshold,
      "refundSpikeRatioThreshold"
    ),
    cashRunwayThresholdDays: parseOptionalNumber(
      body.cashRunwayThresholdDays,
      "cashRunwayThresholdDays"
    ),
    reconciliationGapThresholdPct: parseOptionalNumber(
      body.reconciliationGapThresholdPct,
      "reconciliationGapThresholdPct"
    ),
    syncFailureLookbackHours: parseOptionalPositiveInt(
      body.syncFailureLookbackHours,
      "syncFailureLookbackHours"
    ),
    anomalyRatioThreshold: parseOptionalNumber(
      body.anomalyRatioThreshold ?? body.expenseSpikeRatioThreshold,
      "anomalyRatioThreshold"
    ),
    anomalyMinDelta: parseOptionalNumber(
      body.anomalyMinDelta ?? body.expenseSpikeMinDelta,
      "anomalyMinDelta"
    ),
    sendWhatsAppDigest: parseOptionalBoolean(
      body.sendWhatsAppDigest,
      "sendWhatsAppDigest"
    ),
    appBaseUrl: parseOptionalHttpUrl(body.appBaseUrl, "appBaseUrl")
  };
}

function parsePositiveId(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isControlPlaneUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  if (code === "42P01") {
    return true;
  }

  return (
    message.includes('relation "job_runs" does not exist') ||
    message.includes('relation "event_outbox" does not exist') ||
    message.includes('relation "delivery_attempts" does not exist')
  );
}

async function safeStartRunningAlertJob(params: {
  workspaceId: string;
  dedupeKey: string;
  options: EngineOptions;
}): Promise<RunningJobStartResult> {
  const db = getDbPool();

  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO job_runs (
        workspace_id,
        job_type,
        dedupe_key,
        status,
        started_at,
        metrics
      )
      VALUES (
        $1::uuid,
        'alerts.daily',
        $2,
        'running',
        NOW(),
        $3::jsonb
      )
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.dedupeKey,
        JSON.stringify({ mode: 'workspace', options: params.options })
      ]
    );

    return {
      jobRunId: parsePositiveId(result.rows[0]?.id),
      activeConflict: false
    };
  } catch (error) {
    if (isControlPlaneUnavailable(error)) {
      return { jobRunId: null, activeConflict: false };
    }

    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (code === "23505") {
      return { jobRunId: null, activeConflict: true };
    }

    return { jobRunId: null, activeConflict: false };
  }
}

async function safeFinalizeAlertJob(params: {
  jobRunId: number | null;
  workspaceId: string;
  status: "success" | "failed";
  metrics: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  if (!params.jobRunId) {
    return;
  }

  const db = getDbPool();

  try {
    await db.query(
      `
      UPDATE job_runs
      SET
        status = $3,
        finished_at = NOW(),
        error = CASE WHEN $4::text IS NULL THEN error ELSE $4::text END,
        metrics = COALESCE(metrics, '{}'::jsonb) || $5::jsonb
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,
      [
        params.jobRunId,
        params.workspaceId,
        params.status,
        params.error ?? null,
        JSON.stringify(params.metrics)
      ]
    );
  } catch {
    // Non-blocking control-plane update.
  }
}

async function safeRecordCompletedAlertJob(params: {
  workspaceId: string;
  dedupeKey: string;
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  metrics: Record<string, unknown>;
  error?: string;
}): Promise<number | null> {
  const db = getDbPool();

  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO job_runs (
        workspace_id,
        job_type,
        dedupe_key,
        attempt,
        status,
        started_at,
        finished_at,
        error,
        metrics
      )
      VALUES (
        $1::uuid,
        'alerts.daily',
        $2,
        1,
        $3,
        $4::timestamptz,
        $5::timestamptz,
        $6,
        $7::jsonb
      )
      ON CONFLICT (workspace_id, job_type, dedupe_key, attempt)
      DO UPDATE
      SET
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        error = EXCLUDED.error,
        metrics = EXCLUDED.metrics,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.dedupeKey,
        params.status,
        params.startedAt,
        params.finishedAt,
        params.error ?? null,
        JSON.stringify(params.metrics)
      ]
    );

    return parsePositiveId(result.rows[0]?.id);
  } catch {
    return null;
  }
}

async function safeEnqueueAlertOutbox(params: {
  workspaceId: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
}): Promise<number | null> {
  const db = getDbPool();

  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO event_outbox (
        workspace_id,
        event_type,
        dedupe_key,
        payload,
        status,
        available_at
      )
      VALUES (
        $1::uuid,
        'alerts.evaluation.completed',
        $2,
        $3::jsonb,
        'pending',
        NOW()
      )
      ON CONFLICT (workspace_id, event_type, dedupe_key)
      DO UPDATE
      SET
        payload = EXCLUDED.payload,
        status = 'pending',
        available_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
      RETURNING id::text
      `,
      [params.workspaceId, params.dedupeKey, JSON.stringify(params.payload)]
    );

    return parsePositiveId(result.rows[0]?.id);
  } catch {
    return null;
  }
}

function extractWhatsAppDelivery(result: EvaluateWorkspaceAlertsResult): {
  status: DeliveryAttemptStatus;
  destination: string | null;
  error: string | null;
  payload: Record<string, unknown>;
} | null {
  const digest = result.whatsAppDigest;
  if (!digest) {
    return null;
  }

  if (digest.status === "sent") {
    return {
      status: "success",
      destination: digest.destination,
      error: null,
      payload: {
        channel: "whatsapp",
        reason: digest.reason,
        alertCount: digest.alertCount,
        preview: digest.preview,
        webhook: digest.webhook
      }
    };
  }

  if (digest.status === "failed") {
    return {
      status: "failed",
      destination: null,
      error: digest.error,
      payload: {
        channel: "whatsapp",
        reason: digest.reason,
        alertCount: digest.alertCount,
        preview: digest.preview,
        error: digest.error
      }
    };
  }

  return null;
}

async function safeInsertDeliveryAttempt(params: {
  workspaceId: string;
  outboxId: number | null;
  channel: "whatsapp" | "email" | "webhook" | "dashboard";
  destination: string | null;
  status: DeliveryAttemptStatus;
  error?: string;
  payload: Record<string, unknown>;
}): Promise<boolean> {
  if (!params.outboxId) {
    return false;
  }

  const db = getDbPool();

  try {
    await db.query(
      `
      INSERT INTO delivery_attempts (
        workspace_id,
        outbox_id,
        channel,
        destination,
        status,
        error,
        payload,
        attempted_at
      )
      VALUES (
        $1::uuid,
        $2::bigint,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        NOW()
      )
      `,
      [
        params.workspaceId,
        params.outboxId,
        params.channel,
        params.destination,
        params.status,
        params.error ?? null,
        JSON.stringify(params.payload)
      ]
    );

    return true;
  } catch {
    return false;
  }
}

function alertStatusesFromResult(result: EvaluateWorkspaceAlertsResult) {
  return {
    gst_due: result.alerts.gstDue.alert.status,
    itc_mismatch: result.alerts.itcMismatch.alert.status,
    refund_spike: result.alerts.refundSpike.alert.status,
    reconciliation_gap: result.alerts.reconciliationGap.alert.status,
    cash_runway_risk: result.alerts.cashRunwayRisk.alert.status,
    sync_failure: result.alerts.syncFailure.alert.status,
    anomaly_detected: result.alerts.anomalyDetected.alert.status
  };
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.includes("already running")) {
    return 409;
  }

  if (
    message.includes("must be") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found")
  ) {
    return 400;
  }

  return 500;
}

async function runWithScope(params: {
  scopeInput: ReturnType<typeof readScopeFromSearchParams>;
  options: EngineOptions;
}) {
  const hasScope =
    params.scopeInput.workspaceId !== undefined ||
    params.scopeInput.businessId !== undefined;

  if (hasScope) {
    const scope = await resolveScope(params.scopeInput);
    const dedupeKey = `workspace:${randomUUID()}`;

    const startRun = await safeStartRunningAlertJob({
      workspaceId: scope.workspaceId,
      dedupeKey,
      options: params.options
    });

    if (startRun.activeConflict) {
      return NextResponse.json(
        { error: "An alerts.daily job is already running for this workspace" },
        { status: 409 }
      );
    }

    try {
      const result = await evaluateWorkspaceAlerts({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        gstDueLookaheadDays: params.options.gstDueLookaheadDays,
        itcMismatchThreshold: params.options.itcMismatchThreshold,
        refundSpikeRatioThreshold: params.options.refundSpikeRatioThreshold,
        cashRunwayThresholdDays: params.options.cashRunwayThresholdDays,
        reconciliationGapThresholdPct: params.options.reconciliationGapThresholdPct,
        syncFailureLookbackHours: params.options.syncFailureLookbackHours,
        anomalyRatioThreshold: params.options.anomalyRatioThreshold,
        anomalyMinDelta: params.options.anomalyMinDelta,
        sendWhatsAppDigest: params.options.sendWhatsAppDigest ?? true,
        appBaseUrl: params.options.appBaseUrl
      });

      await safeFinalizeAlertJob({
        jobRunId: startRun.jobRunId,
        workspaceId: scope.workspaceId,
        status: "success",
        metrics: {
          mode: "workspace",
          alertStatuses: alertStatusesFromResult(result),
          whatsAppDigestStatus: result.whatsAppDigest?.status ?? null
        }
      });

      const outboxId = await safeEnqueueAlertOutbox({
        workspaceId: scope.workspaceId,
        dedupeKey,
        payload: {
          mode: "workspace",
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          alerts: alertStatusesFromResult(result)
        }
      });

      const whatsAppDelivery = extractWhatsAppDelivery(result);
      const deliveryTracked = whatsAppDelivery
        ? await safeInsertDeliveryAttempt({
            workspaceId: scope.workspaceId,
            outboxId,
            channel: "whatsapp",
            destination: whatsAppDelivery.destination,
            status: whatsAppDelivery.status,
            error: whatsAppDelivery.error ?? undefined,
            payload: whatsAppDelivery.payload
          })
        : false;

      return NextResponse.json({
        mode: "workspace",
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        result,
        controlPlane: {
          jobRunId: startRun.jobRunId,
          outboxId,
          deliveryTracked
        }
      });
    } catch (error) {
      await safeFinalizeAlertJob({
        jobRunId: startRun.jobRunId,
        workspaceId: scope.workspaceId,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to evaluate alerts",
        metrics: {
          mode: "workspace",
          failed: true
        }
      });
      throw error;
    }
  }

  const summary = await runDailyAlertEvaluation({
    limit: params.options.limit,
    gstDueLookaheadDays: params.options.gstDueLookaheadDays,
    itcMismatchThreshold: params.options.itcMismatchThreshold,
    refundSpikeRatioThreshold: params.options.refundSpikeRatioThreshold,
    cashRunwayThresholdDays: params.options.cashRunwayThresholdDays,
    reconciliationGapThresholdPct: params.options.reconciliationGapThresholdPct,
    syncFailureLookbackHours: params.options.syncFailureLookbackHours,
    anomalyRatioThreshold: params.options.anomalyRatioThreshold,
    anomalyMinDelta: params.options.anomalyMinDelta,
    sendWhatsAppDigest: params.options.sendWhatsAppDigest,
    appBaseUrl: params.options.appBaseUrl
  });

  let jobRunsWritten = 0;
  let outboxWritten = 0;
  let deliveryAttemptsWritten = 0;

  for (const result of summary.results) {
    const workspaceDedupeKey = `daily:${summary.startedAt}:${result.workspaceId}`;

    const runId = await safeRecordCompletedAlertJob({
      workspaceId: result.workspaceId,
      dedupeKey: workspaceDedupeKey,
      status: "success",
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      metrics: {
        businessId: result.businessId,
        whatsAppDigestStatus: result.whatsAppDigest?.status ?? null,
        alertStatuses: alertStatusesFromResult(result)
      }
    });

    if (runId) {
      jobRunsWritten += 1;
    }

    const outboxId = await safeEnqueueAlertOutbox({
      workspaceId: result.workspaceId,
      dedupeKey: workspaceDedupeKey,
      payload: {
        mode: "daily",
        workspaceId: result.workspaceId,
        businessId: result.businessId,
        startedAt: summary.startedAt,
        finishedAt: summary.finishedAt,
        alerts: alertStatusesFromResult(result)
      }
    });

    if (outboxId) {
      outboxWritten += 1;
    }

    const whatsAppDelivery = extractWhatsAppDelivery(result);
    if (whatsAppDelivery) {
      const insertedAttempt = await safeInsertDeliveryAttempt({
        workspaceId: result.workspaceId,
        outboxId,
        channel: "whatsapp",
        destination: whatsAppDelivery.destination,
        status: whatsAppDelivery.status,
        error: whatsAppDelivery.error ?? undefined,
        payload: whatsAppDelivery.payload
      });

      if (insertedAttempt) {
        deliveryAttemptsWritten += 1;
      }
    }
  }

  for (const failure of summary.failures) {
    const failureDedupeKey = `daily:${summary.startedAt}:${failure.workspaceId}:failed`;
    const runId = await safeRecordCompletedAlertJob({
      workspaceId: failure.workspaceId,
      dedupeKey: failureDedupeKey,
      status: "failed",
      startedAt: summary.startedAt,
      finishedAt: summary.finishedAt,
      error: failure.error,
      metrics: {
        businessId: failure.businessId,
        failed: true,
        error: failure.error
      }
    });

    if (runId) {
      jobRunsWritten += 1;
    }
  }

  return NextResponse.json({
    mode: "daily",
    summary,
    controlPlane: {
      jobRunsWritten,
      outboxWritten,
      deliveryAttemptsWritten
    }
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scopeInput = readScopeFromSearchParams(request.nextUrl.searchParams);
    const options = optionsFromSearchParams(request.nextUrl.searchParams);
    return await runWithScope({ scopeInput, options });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run alert engine";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body !== null && typeof body !== "object") {
    return badRequest("Body must be a JSON object");
  }

  const payload = (body ?? {}) as Record<string, unknown>;

  try {
    const scopeInput = readScopeFromBody(payload);
    const options = optionsFromBody(payload);
    return await runWithScope({ scopeInput, options });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run alert engine";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
