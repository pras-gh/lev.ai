import { NextRequest, NextResponse } from "next/server";
import { readScopeFromSearchParams, toPositiveInt } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditLogRow = {
  id: number;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(searchParams)
    });

    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? Math.min(toPositiveInt(rawLimit, "limit"), 100) : 20;
    const entityType = (searchParams.get("entityType") ?? "").trim().toLowerCase();
    const entityId = (searchParams.get("entityId") ?? "").trim();

    const filters: string[] = [
      "(al.workspace_id = $1::uuid OR (al.workspace_id IS NULL AND al.business_id = $2))"
    ];
    const values: Array<string | number> = [scope.workspaceId, scope.businessId];
    let index = 3;

    if (entityType) {
      values.push(entityType);
      filters.push(`LOWER(al.entity_type) = $${index}`);
      index += 1;
    }

    if (entityId) {
      values.push(entityId);
      filters.push(`al.entity_id = $${index}`);
      index += 1;
    }

    values.push(limit);
    const whereClause = `WHERE ${filters.join(" AND ")}`;

    const db = getDbPool();
    const result = await db.query<AuditLogRow>(
      `
      SELECT
        al.id::int,
        al.actor_type,
        al.actor_id,
        al.entity_type,
        al.entity_id,
        al.action,
        al.before_state,
        al.after_state,
        al.created_at
      FROM audit_logs al
      ${whereClause}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT $${index}
      `,
      values
    );

    return NextResponse.json({
      count: result.rows.length,
      logs: result.rows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch audit logs";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status = message.includes("must be") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
