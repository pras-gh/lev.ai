import { NextRequest, NextResponse } from "next/server";
import { badRequest, readScopeFromBody } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderRow = {
  provider: string;
};

function toObjectBody(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Body must be a JSON object");
  }

  return value as Record<string, unknown>;
}

function toOptionalProvider(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function toOptionalRowCount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("rowCount must be a positive integer");
  }

  return parsed;
}

function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  const authHeaders = [
    "authorization",
    "x-supabase-access-token",
    "x-access-token",
    "cookie"
  ] as const;

  for (const key of authHeaders) {
    const value = request.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function resolveFallbackProvider(workspaceId: string): Promise<string> {
  const db = getDbPool();
  const result = await db.query<ProviderRow>(
    `
    SELECT provider
    FROM integrations
    WHERE workspace_id = $1::uuid
    ORDER BY
      CASE status
        WHEN 'connected' THEN 0
        WHEN 'syncing' THEN 1
        WHEN 'error' THEN 2
        ELSE 3
      END,
      updated_at DESC
    LIMIT 1
    `,
    [workspaceId]
  );

  return result.rows[0]?.provider ?? "hdfc";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const payload = toObjectBody(body);
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });
    const provider =
      toOptionalProvider(payload.provider) ??
      toOptionalProvider(payload.source) ??
      (await resolveFallbackProvider(scope.workspaceId));
    const rowCount = toOptionalRowCount(payload.rowCount);

    const forwardedPayload: Record<string, unknown> = {
      ...payload,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      provider
    };

    if (rowCount !== undefined) {
      forwardedPayload.rowCount = rowCount;
    }

    const syncResponse = await fetch(new URL("/api/integrations/sync", request.url), {
      method: "POST",
      headers: forwardHeaders(request),
      body: JSON.stringify(forwardedPayload),
      cache: "no-store"
    });

    const responseText = await syncResponse.text();
    let responseBody: unknown = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText) as unknown;
      } catch {
        responseBody = { raw: responseText };
      }
    }

    if (!syncResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to trigger sync run",
          provider,
          details: responseBody
        },
        { status: syncResponse.status }
      );
    }

    return NextResponse.json({
      trigger: "manual",
      provider,
      ...(typeof responseBody === "object" && responseBody !== null
        ? (responseBody as Record<string, unknown>)
        : { result: responseBody })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to trigger sync";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    if (message.includes("Body must be a JSON object") || message.includes("rowCount must be")) {
      return badRequest(message);
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
