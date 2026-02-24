import { NextRequest, NextResponse } from "next/server";
import { readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderStatusRow = {
  provider: string;
  integration_status: string | null;
  integration_last_synced_at: string | null;
  integration_meta: unknown;
  latest_run_id: string | null;
  latest_run_status: string | null;
  latest_run_started_at: string | null;
  latest_run_finished_at: string | null;
  latest_run_rows_fetched: string | null;
  latest_run_rows_ingested: string | null;
  latest_run_rows_deduped: string | null;
  latest_run_error: string | null;
};

type RunRollupRow = {
  active_runs: string;
  failed_runs_last_24h: string;
  latest_run_at: string | null;
};

function toCount(value: string | null | undefined): number {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferSyncHealth(params: {
  activeRuns: number;
  failedRunsLast24h: number;
  providers: ProviderStatusRow[];
}): "idle" | "syncing" | "healthy" | "issues" {
  if (params.activeRuns > 0) {
    return "syncing";
  }

  if (params.providers.length === 0) {
    return "idle";
  }

  const providerHasIssue = params.providers.some(
    (provider) =>
      provider.integration_status === "error" ||
      provider.latest_run_status === "failed" ||
      provider.latest_run_status === "cancelled"
  );

  if (providerHasIssue || params.failedRunsLast24h > 0) {
    return "issues";
  }

  return "healthy";
}

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });
    const db = getDbPool();

    const providerResult = await db.query<ProviderStatusRow>(
      `
      WITH providers AS (
        SELECT provider
        FROM integrations
        WHERE workspace_id = $1::uuid
        UNION
        SELECT provider
        FROM ingestion_runs
        WHERE workspace_id = $1::uuid
      )
      SELECT
        p.provider,
        i.status AS integration_status,
        i.last_synced_at::text AS integration_last_synced_at,
        i.meta AS integration_meta,
        r.id::text AS latest_run_id,
        r.status AS latest_run_status,
        r.started_at::text AS latest_run_started_at,
        r.finished_at::text AS latest_run_finished_at,
        r.rows_fetched::text AS latest_run_rows_fetched,
        r.rows_inserted::text AS latest_run_rows_ingested,
        r.rows_deduped::text AS latest_run_rows_deduped,
        r.error AS latest_run_error
      FROM providers p
      LEFT JOIN integrations i
        ON i.workspace_id = $1::uuid
       AND i.provider = p.provider
      LEFT JOIN LATERAL (
        SELECT
          ir.id,
          ir.status,
          ir.started_at,
          ir.finished_at,
          ir.rows_fetched,
          ir.rows_inserted,
          ir.rows_deduped,
          ir.error
        FROM ingestion_runs ir
        WHERE ir.workspace_id = $1::uuid
          AND ir.provider = p.provider
        ORDER BY ir.created_at DESC, ir.id DESC
        LIMIT 1
      ) r ON TRUE
      ORDER BY p.provider ASC
      `,
      [scope.workspaceId]
    );

    const rollupResult = await db.query<RunRollupRow>(
      `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('queued', 'running'))::text AS active_runs,
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours')::text AS failed_runs_last_24h,
        MAX(COALESCE(finished_at, started_at, created_at))::text AS latest_run_at
      FROM ingestion_runs
      WHERE workspace_id = $1::uuid
      `,
      [scope.workspaceId]
    );

    const rollup = rollupResult.rows[0];
    const activeRuns = toCount(rollup?.active_runs);
    const failedRunsLast24h = toCount(rollup?.failed_runs_last_24h);

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      status: inferSyncHealth({
        activeRuns,
        failedRunsLast24h,
        providers: providerResult.rows
      }),
      activeRuns,
      failedRunsLast24h,
      lastRunAt: rollup?.latest_run_at ?? null,
      providers: providerResult.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sync status";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found") ||
      message.includes("must be")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
