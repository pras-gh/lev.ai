import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  parseBooleanQuery,
  parsePagination,
  readScopeFromSearchParams
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import {
  evaluateWorkspaceAlerts,
  FIRST_FIVE_ALERT_TYPES
} from "@/lib/alert-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set(["open", "snoozed", "resolved", "all"]);
const ALLOWED_SEVERITY = new Set(["critical", "warning", "info"]);
const ALLOWED_TYPE: ReadonlySet<string> = new Set([
  ...FIRST_FIVE_ALERT_TYPES,
  "duplicate",
  "unmatched",
  "cash_runway",
  "itc_available",
  "vendor_mismatch_risk",
  "expense_spike_anomaly"
]);

type AlertRow = {
  id: number;
  public_id: string;
  workspace_id: string;
  business_id: number;
  transaction_id: number | null;
  type: string;
  alert_type: string;
  severity: string;
  status: string;
  title: string | null;
  body: string | null;
  message: string;
  related_transaction_ids: unknown;
  payload: unknown;
  metadata: unknown;
  action_url: string | null;
  created_at: string;
  resolved_at: string | null;
};

function parseRelatedTransactionIds(raw: unknown): number[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((value) => Number.parseInt(String(value), 10))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => Number.parseInt(String(value), 10))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function toObjectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const { page, pageSize } = parsePagination(params);
    const refresh = parseBooleanQuery(params.get("refresh")) ?? false;
    const status = (params.get("status") ?? "open").trim().toLowerCase();
    const severity = params.get("severity")?.trim().toLowerCase();
    const type = params.get("type")?.trim().toLowerCase();

    if (!ALLOWED_STATUS.has(status)) {
      return badRequest("status must be one of: open, snoozed, resolved, all");
    }

    if (severity && !ALLOWED_SEVERITY.has(severity)) {
      return badRequest("severity must be one of: critical, warning, info");
    }

    if (type && !ALLOWED_TYPE.has(type)) {
      return badRequest(`type must be one of: ${[...ALLOWED_TYPE].join(", ")}`);
    }

    if (refresh && (status === "open" || status === "all")) {
      await evaluateWorkspaceAlerts({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId
      });
    }

    const filters: string[] = ["a.workspace_id = $1::uuid"];
    const values: Array<string | number | string[]> = [scope.workspaceId];
    let index = 2;

    if (status !== "all") {
      values.push(status);
      filters.push(`a.status = $${index}`);
      index += 1;
    }

    if (severity) {
      values.push(severity);
      filters.push(`a.severity = $${index}`);
      index += 1;
    }

    if (type) {
      values.push(type);
      filters.push(`a.type = $${index}`);
      index += 1;
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;
    const db = getDbPool();

    const totalResult = await db.query<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM alerts a
      ${whereClause}
      `,
      values
    );

    const offset = (page - 1) * pageSize;
    const rowsResult = await db.query<AlertRow>(
      `
      SELECT
        a.id,
        a.public_id,
        a.workspace_id::text,
        a.business_id,
        a.transaction_id,
        a.type,
        a.alert_type,
        a.severity,
        a.status,
        a.title,
        a.body,
        a.message,
        a.related_transaction_ids,
        a.payload,
        a.metadata,
        a.action_url,
        a.created_at,
        a.resolved_at
      FROM alerts a
      ${whereClause}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${index}
      OFFSET $${index + 1}
      `,
      [...values, pageSize, offset]
    );

    const total = Number(totalResult.rows[0]?.total ?? "0");

    const alerts = rowsResult.rows.map((row) => {
      const relatedTransactionIds = parseRelatedTransactionIds(row.related_transaction_ids);
      const affectedTransactionIds = [
        ...(row.transaction_id ? [row.transaction_id] : []),
        ...relatedTransactionIds
      ].filter((value, index, all) => Number.isInteger(value) && value > 0 && all.indexOf(value) === index);

      const payloadRecord = toObjectOrNull(row.payload);
      const metadataRecord = toObjectOrNull(row.metadata);

      return {
        ...row,
        payload: payloadRecord,
        metadata: metadataRecord,
        meta: metadataRecord ?? payloadRecord,
        affected_transaction_ids: affectedTransactionIds
      };
    });

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      alerts
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list alerts";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Boolean") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
