import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  parsePagination,
  readScopeFromSearchParams
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "queued",
  "running",
  "success",
  "partial",
  "failed",
  "cancelled"
]);

type SyncRunRow = {
  id: string;
  workspace_id: string;
  source_type: string;
  mode: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  rows_ingested: string;
  errors: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  total: string;
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const { page, pageSize } = parsePagination(params);
    const status = params.get("status")?.trim().toLowerCase() ?? "";
    const provider = params.get("provider")?.trim().toLowerCase() ?? "";

    if (status && !ALLOWED_STATUS.has(status)) {
      return badRequest(
        "status must be one of: queued, running, success, partial, failed, cancelled"
      );
    }

    const filters: string[] = ["sr.workspace_id = $1::uuid"];
    const values: Array<string | number> = [scope.workspaceId];
    let index = 2;

    if (status) {
      values.push(status);
      filters.push(`sr.status = $${index}`);
      index += 1;
    }

    if (provider) {
      values.push(provider);
      filters.push(`c.provider = $${index}`);
      index += 1;
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;
    const db = getDbPool();

    const totalResult = await db.query<CountRow>(
      `
      SELECT COUNT(*)::text AS total
      FROM sync_runs sr
      INNER JOIN connections c ON c.id = sr.connection_id
      ${whereClause}
      `,
      values
    );

    const offset = (page - 1) * pageSize;
    const rowsResult = await db.query<SyncRunRow>(
      `
      SELECT
        sr.id::text,
        sr.workspace_id::text,
        c.provider AS source_type,
        sr.type AS mode,
        sr.status,
        sr.started_at::text,
        sr.finished_at::text,
        COALESCE(
          sr.stats_json->>'rows_ingested',
          sr.stats_json->>'rows_inserted',
          sr.stats_json->>'rowsFetched',
          '0'
        ) AS rows_ingested,
        sr.error AS errors,
        sr.stats_json AS metadata,
        sr.created_at::text,
        sr.updated_at::text
      FROM sync_runs sr
      INNER JOIN connections c ON c.id = sr.connection_id
      ${whereClause}
      ORDER BY sr.created_at DESC, sr.id DESC
      LIMIT $${index}
      OFFSET $${index + 1}
      `,
      [...values, pageSize, offset]
    );

    const total = Number(totalResult.rows[0]?.total ?? "0");

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      runs: rowsResult.rows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sync runs";
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
