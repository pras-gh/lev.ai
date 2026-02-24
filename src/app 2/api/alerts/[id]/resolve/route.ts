import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalText,
  toPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function resolveAlert(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    const alertId = toPositiveInt(id, "id");
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });
    const note = toOptionalText(payload.note);
    const resolutionPayload = {
      resolution: {
        action: "resolve",
        note: note ?? null
      }
    };
    const values: Array<number | string> = [
      alertId,
      scope.workspaceId,
      JSON.stringify(resolutionPayload)
    ];

    let noteExpression = "";
    if (note) {
      values.push(note);
      noteExpression = `, body = CONCAT(COALESCE(body, message, ''), E'\n\nResolved note: ', $4::text)`;
    }

    const db = getDbPool();
    const result = await db.query(
      `
      UPDATE alerts
      SET
        status = 'resolved',
        resolved_at = NOW(),
        payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
        metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        ${noteExpression}
      WHERE id = $1
        AND workspace_id = $2::uuid
      RETURNING *
      `,
      values
    );

    const alert = result.rows[0];
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve alert";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return resolveAlert(request, context);
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return resolveAlert(request, context);
}
