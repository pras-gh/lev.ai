import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams,
  resolveScope,
  toOptionalPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  getDueDeltaSyncTargets,
  nextDeltaRunAt,
  upsertConnectorCursor
} from "@/lib/connector-sync-engine";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function isSystemSyncAuthorized(request: NextRequest): boolean {
  const expected = [process.env.CONNECTOR_SYNC_KEY, process.env.CRON_SECRET]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);

  if (expected.length === 0) {
    return false;
  }

  const supplied = [
    readBearerToken(request.headers.get("authorization")),
    request.headers.get("x-connector-sync-key")?.trim() ?? null,
    request.nextUrl.searchParams.get("key")?.trim() ?? null
  ].filter((value): value is string => Boolean(value));

  return supplied.some((value) => expected.includes(value));
}

function toBodyObject(body: unknown): Record<string, unknown> {
  if (!body) {
    return {};
  }

  if (typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Body must be a JSON object");
  }

  return body as Record<string, unknown>;
}

function forwardHeaders(request: NextRequest, systemAuthorized: boolean): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  if (systemAuthorized) {
    const key =
      process.env.CONNECTOR_SYNC_KEY?.trim() ||
      process.env.CRON_SECRET?.trim() ||
      request.headers.get("x-connector-sync-key")?.trim() ||
      null;

    if (key) {
      headers.set("x-connector-sync-key", key);
    }

    return headers;
  }

  const toForward = [
    "authorization",
    "x-supabase-access-token",
    "x-access-token",
    "cookie"
  ] as const;

  for (const key of toForward) {
    const value = request.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function ensureWorkspaceCursors(workspaceId: string): Promise<void> {
  const db = getDbPool();
  const providers = await db.query<{ provider: string }>(
    `
    SELECT provider
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND status IN ('connected', 'syncing', 'error')
    ORDER BY provider ASC
    `,
    [workspaceId]
  );

  for (const row of providers.rows) {
    await upsertConnectorCursor({
      workspaceId,
      provider: row.provider,
      stream: "transactions",
      mode: "delta",
      status: "idle",
      nextRunAt: new Date().toISOString(),
      metadata: {
        source: "api.connectors.sync.delta",
        seededFromIntegrations: true
      }
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

function providerMinIntervalMs(provider: string): number {
  const map: Record<string, number> = {
    hdfc: 60_000,
    icici: 60_000,
    gpay: 45_000,
    razorpay: 20_000,
    stripe: 20_000,
    tally: 120_000,
    zohobooks: 120_000,
    whatsapp: 60_000
  };

  return map[provider] ?? 60_000;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number.parseInt(value, 10);
  if (Number.isInteger(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

function shouldRetryHttp(status: number): boolean {
  return status === 429 || status >= 500;
}

async function readProviderSyncState(params: {
  workspaceId: string;
  provider: string;
}): Promise<{ lastSyncedAt: string | null; errorState: string | null }> {
  const db = getDbPool();
  const result = await db.query<{ last_synced_at: string | null; error_state: string | null }>(
    `
    SELECT last_synced_at::text, error_state
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND provider = $2
    LIMIT 1
    `,
    [params.workspaceId, params.provider]
  );

  return {
    lastSyncedAt: result.rows[0]?.last_synced_at ?? null,
    errorState: result.rows[0]?.error_state ?? null
  };
}

async function triggerSyncWithRetry(params: {
  request: NextRequest;
  headers: Headers;
  workspaceId: string;
  provider: string;
  rowCount: number;
  attempts?: number;
}): Promise<{
  ok: boolean;
  status: number;
  responseBody: unknown;
  attempts: number;
  lastError: string | null;
}> {
  const maxAttempts = Math.max(1, Math.min(params.attempts ?? 3, 5));
  let lastError: string | null = null;
  let lastStatus = 0;
  let lastBody: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(new URL("/api/integrations/sync", params.request.url), {
        method: "POST",
        headers: params.headers,
        body: JSON.stringify({
          workspaceId: params.workspaceId,
          provider: params.provider,
          rowCount: params.rowCount,
          syncMode: "delta"
        }),
        cache: "no-store"
      });

      const responseText = await response.text();
      let responseBody: unknown = null;
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText) as unknown;
        } catch {
          responseBody = { raw: responseText };
        }
      }

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          responseBody,
          attempts: attempt,
          lastError: null
        };
      }

      lastStatus = response.status;
      lastBody = responseBody;
      lastError =
        responseBody && typeof responseBody === "object" && "error" in responseBody
          ? String((responseBody as Record<string, unknown>).error ?? `sync failed: ${response.status}`)
          : `sync failed: ${response.status}`;

      if (attempt >= maxAttempts || !shouldRetryHttp(response.status)) {
        break;
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const backoffMs = retryAfterMs ?? Math.min(30_000, 600 * 2 ** (attempt - 1));
      await sleep(backoffMs);
    } catch (error) {
      lastStatus = 0;
      lastBody = null;
      lastError = error instanceof Error ? error.message : "network error";

      if (attempt >= maxAttempts) {
        break;
      }

      const backoffMs = Math.min(30_000, 600 * 2 ** (attempt - 1));
      await sleep(backoffMs);
    }
  }

  return {
    ok: false,
    status: lastStatus || 502,
    responseBody: lastBody ?? { error: lastError ?? "sync failed" },
    attempts: maxAttempts,
    lastError
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const payload = toBodyObject(body);
    const scopeFromBody = readScopeFromBody(payload);
    const scopeFromQuery = readScopeFromSearchParams(request.nextUrl.searchParams);
    const mergedScope = {
      workspaceId: scopeFromBody.workspaceId ?? scopeFromQuery.workspaceId,
      businessId: scopeFromBody.businessId ?? scopeFromQuery.businessId
    };

    const systemAuthorized = isSystemSyncAuthorized(request);

    const scope = mergedScope.workspaceId || mergedScope.businessId
      ? systemAuthorized
        ? await resolveScope(mergedScope, undefined, { allowWorkspaceAutocreate: false })
        : await resolveAuthorizedScope({ request, scope: mergedScope })
      : null;

    if (!scope && !systemAuthorized) {
      return badRequest("Provide workspaceId or businessId, or use connector sync key for global run");
    }

    const limit = toOptionalPositiveInt(payload.limit ?? request.nextUrl.searchParams.get("limit"), "limit") ?? 12;
    const rowCount =
      toOptionalPositiveInt(payload.rowCount ?? request.nextUrl.searchParams.get("rowCount"), "rowCount") ?? 8;

    if (limit > 100) {
      return badRequest("limit cannot be greater than 100");
    }

    if (rowCount < 1 || rowCount > 25) {
      return badRequest("rowCount must be between 1 and 25");
    }

    if (scope?.workspaceId) {
      await ensureWorkspaceCursors(scope.workspaceId);
    }

    const targets = await getDueDeltaSyncTargets({
      workspaceId: scope?.workspaceId,
      limit
    });

    if (targets.length === 0) {
      return NextResponse.json({
        mode: scope?.workspaceId ? "workspace" : "global",
        queued: 0,
        triggered: 0,
        failed: 0,
        message: "No due connector targets"
      });
    }

    const headers = forwardHeaders(request, systemAuthorized);

    const results: Array<{
      workspaceId: string;
      provider: string;
      ok: boolean;
      status: number;
      attempts: number;
      skipped?: boolean;
      reason?: string;
      response: unknown;
    }> = [];

    for (const target of targets) {
      const providerState = await readProviderSyncState({
        workspaceId: target.workspaceId,
        provider: target.provider
      });

      const minInterval = providerMinIntervalMs(target.provider);
      if (providerState.lastSyncedAt) {
        const lastSyncedMs = Date.parse(providerState.lastSyncedAt);
        if (Number.isFinite(lastSyncedMs)) {
          const nextAllowedAt = lastSyncedMs + minInterval;
          if (Date.now() < nextAllowedAt) {
            await upsertConnectorCursor({
              workspaceId: target.workspaceId,
              provider: target.provider,
              stream: target.stream,
              mode: "delta",
              status: "idle",
              nextRunAt: new Date(nextAllowedAt).toISOString(),
              metadata: {
                source: "api.connectors.sync.delta",
                throttled: true,
                minIntervalMs: minInterval
              }
            });

            results.push({
              workspaceId: target.workspaceId,
              provider: target.provider,
              ok: true,
              status: 202,
              attempts: 0,
              skipped: true,
              reason: "provider_rate_limit_window",
              response: {
                message: "Skipped due to provider minimum sync interval",
                minIntervalMs: minInterval,
                nextAllowedAt: new Date(nextAllowedAt).toISOString()
              }
            });
            continue;
          }
        }
      }

      await upsertConnectorCursor({
        workspaceId: target.workspaceId,
        provider: target.provider,
        stream: target.stream,
        mode: "delta",
        status: "queued",
        nextRunAt: nextDeltaRunAt(1),
        metadata: {
          source: "api.connectors.sync.delta",
          queuedAt: new Date().toISOString()
        }
      });

      const syncResult = await triggerSyncWithRetry({
        request,
        headers,
        workspaceId: target.workspaceId,
        provider: target.provider,
        rowCount,
        attempts: 3
      });

      if (!syncResult.ok) {
        const nextRunAt =
          syncResult.status === 429
            ? nextDeltaRunAt(2)
            : providerState.errorState
              ? nextDeltaRunAt(2)
              : nextDeltaRunAt(1);
        await upsertConnectorCursor({
          workspaceId: target.workspaceId,
          provider: target.provider,
          stream: target.stream,
          mode: "delta",
          status: "error",
          nextRunAt,
          error:
            syncResult.responseBody &&
            typeof syncResult.responseBody === "object" &&
            "error" in syncResult.responseBody
              ? String((syncResult.responseBody as Record<string, unknown>).error ?? "sync failed")
              : syncResult.lastError ?? `sync failed with status ${syncResult.status}`,
          metadata: {
            source: "api.connectors.sync.delta",
            lastFailureAt: new Date().toISOString(),
            httpStatus: syncResult.status,
            retryAttempts: syncResult.attempts
          }
        });
      }

      results.push({
        workspaceId: target.workspaceId,
        provider: target.provider,
        ok: syncResult.ok,
        status: syncResult.status,
        attempts: syncResult.attempts,
        response: syncResult.responseBody
      });
    }

    const skipped = results.filter((row) => row.skipped).length;
    const triggered = results.filter((row) => row.ok && !row.skipped).length;
    const failed = results.filter((row) => !row.ok).length;

    return NextResponse.json({
      mode: scope?.workspaceId ? "workspace" : "global",
      queued: targets.length,
      triggered,
      skipped,
      failed,
      nextRun: nextDeltaRunAt(1),
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run connector delta sync";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("must be") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
