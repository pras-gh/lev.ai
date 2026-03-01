import { NextRequest, NextResponse } from "next/server";
import { readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IntegrationRow = {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  last_synced_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });
    const db = getDbPool();
    const result = await db.query<IntegrationRow>(
      `
      SELECT
        id::text,
        workspace_id::text,
        provider,
        status,
        last_synced_at,
        meta,
        created_at,
        updated_at
      FROM integrations
      WHERE workspace_id = $1::uuid
      ORDER BY provider ASC
      `,
      [scope.workspaceId]
    );

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      count: result.rows.length,
      integrations: result.rows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list integrations";
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
