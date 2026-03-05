import { NextRequest, NextResponse } from "next/server";
import { badRequest, toOptionalBoolean, toOptionalUuid } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveSessionUser } from "@/lib/api-auth";
import { ensureWorkspaceForUser } from "@/lib/access-layer";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MembershipRow = {
  workspace_id: string;
  business_id: string;
  workspace_name: string;
  business_name: string;
  role: string;
  status: string;
  onboarding_completed_at: string | null;
  created_at: string;
};

function toResponsePayload(row: MembershipRow | null) {
  if (!row) {
    return {
      hasWorkspace: false,
      workspace: null,
      onboarding: {
        completed: false,
        completedAt: null,
        requiresOnboarding: true
      }
    };
  }

  const completed = Boolean(row.onboarding_completed_at);

  return {
    hasWorkspace: true,
    workspace: {
      id: row.workspace_id,
      businessId: Number.parseInt(row.business_id, 10),
      name: row.workspace_name,
      businessName: row.business_name,
      role: row.role,
      status: row.status,
      createdAt: row.created_at
    },
    onboarding: {
      completed,
      completedAt: row.onboarding_completed_at,
      requiresOnboarding: !completed
    }
  };
}

async function loadMembership(params: {
  userId: string;
  workspaceId?: string;
}): Promise<MembershipRow | null> {
  const db = getDbPool();

  if (params.workspaceId) {
    const scoped = await db.query<MembershipRow>(
      `
      SELECT
        wm.workspace_id::text,
        w.business_id::text,
        w.name AS workspace_name,
        b.name AS business_name,
        wm.role,
        wm.status,
        wm.onboarding_completed_at::text,
        wm.created_at::text
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      JOIN businesses b ON b.id = w.business_id
      WHERE wm.user_id = $1::uuid
        AND wm.workspace_id = $2::uuid
        AND wm.status = 'active'
      LIMIT 1
      `,
      [params.userId, params.workspaceId]
    );

    return scoped.rows[0] ?? null;
  }

  const fallback = await db.query<MembershipRow>(
    `
    SELECT
      wm.workspace_id::text,
      w.business_id::text,
      w.name AS workspace_name,
      b.name AS business_name,
      wm.role,
      wm.status,
      wm.onboarding_completed_at::text,
      wm.created_at::text
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    JOIN businesses b ON b.id = w.business_id
    WHERE wm.user_id = $1::uuid
      AND wm.status = 'active'
    ORDER BY wm.created_at DESC, wm.workspace_id DESC
    LIMIT 1
    `,
    [params.userId]
  );

  return fallback.rows[0] ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSessionUser(request);
    const workspaceId = toOptionalUuid(
      request.nextUrl.searchParams.get("workspaceId"),
      "workspaceId"
    );

    let membership = await loadMembership({
      userId: session.userId,
      workspaceId
    });

    if (!workspaceId && !membership) {
      await ensureWorkspaceForUser({
        userId: session.userId,
        email: session.email ?? `${session.userId}@autogen.local`
      });

      membership = await loadMembership({
        userId: session.userId
      });
    }

    if (workspaceId && !membership) {
      return NextResponse.json(
        { error: "Workspace not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json(toResponsePayload(membership));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve onboarding status";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status = message.includes("workspaceId") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!body || typeof body !== "object") {
    return badRequest("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  try {
    const session = await resolveSessionUser(request);
    const workspaceId = toOptionalUuid(payload.workspaceId, "workspaceId");
    if (!workspaceId) {
      return badRequest("workspaceId is required");
    }

    const complete = toOptionalBoolean(payload.complete, "complete") ?? true;
    const db = getDbPool();

    const result = await db.query<MembershipRow>(
      `
      UPDATE workspace_members wm
      SET
        onboarding_completed_at = CASE
          WHEN $3::boolean THEN COALESCE(wm.onboarding_completed_at, NOW())
          ELSE NULL
        END,
        updated_at = NOW()
      FROM workspaces w
      JOIN businesses b ON b.id = w.business_id
      WHERE wm.workspace_id = w.id
        AND wm.workspace_id = $1::uuid
        AND wm.user_id = $2::uuid
        AND wm.status = 'active'
      RETURNING
        wm.workspace_id::text,
        w.business_id::text,
        w.name AS workspace_name,
        b.name AS business_name,
        wm.role,
        wm.status,
        wm.onboarding_completed_at::text,
        wm.created_at::text
      `,
      [workspaceId, session.userId, complete]
    );

    const membership = result.rows[0] ?? null;
    if (!membership) {
      return NextResponse.json(
        { error: "Workspace not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json(toResponsePayload(membership));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update onboarding status";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status = message.includes("workspaceId") || message.includes("complete") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
