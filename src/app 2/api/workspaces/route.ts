import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveSessionUser } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkspaceRow = {
  id: string;
  name: string;
  business_id: string;
  business_name: string;
  role: string;
  status: string;
  created_at: string;
};

type BusinessInsertRow = {
  id: string;
  name: string;
  public_id: string | null;
};

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toUuid(value: unknown): string | undefined {
  const text = toOptionalText(value);
  if (!text) {
    return undefined;
  }

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(text)) {
    throw new Error("workspaceId must be a valid UUID");
  }

  return text;
}

async function loadWorkspaceByMembership(params: {
  workspaceId: string;
  userId: string;
}): Promise<WorkspaceRow | null> {
  const db = getDbPool();
  const result = await db.query<WorkspaceRow>(
    `
    SELECT
      w.id::text,
      w.name,
      w.business_id::text,
      b.name AS business_name,
      wm.role,
      wm.status,
      w.created_at::text
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

  return result.rows[0] ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSessionUser(request);
    const db = getDbPool();
    const result = await db.query<WorkspaceRow>(
      `
      SELECT
        w.id::text,
        w.name,
        w.business_id::text,
        b.name AS business_name,
        wm.role,
        wm.status,
        w.created_at::text
      FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      JOIN businesses b ON b.id = w.business_id
      WHERE wm.user_id = $1::uuid
        AND wm.status = 'active'
      ORDER BY w.created_at DESC, w.id DESC
      `,
      [session.userId]
    );

    return NextResponse.json({
      workspaces: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        businessId: Number.parseInt(row.business_id, 10),
        businessName: row.business_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list workspaces";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: 500 });
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
    const workspaceId = toUuid(payload.workspaceId);

    if (workspaceId) {
      const existing = await loadWorkspaceByMembership({
        workspaceId,
        userId: session.userId
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Workspace not found for this user" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        workspace: {
          id: existing.id,
          name: existing.name,
          businessId: Number.parseInt(existing.business_id, 10),
          businessName: existing.business_name,
          role: existing.role,
          status: existing.status
        },
        created: false
      });
    }

    const businessNameInput = toOptionalText(payload.businessName);
    if (!businessNameInput) {
      return badRequest("businessName is required when workspaceId is not provided");
    }

    const workspaceNameInput = toOptionalText(payload.workspaceName);
    const legalNameInput = toOptionalText(payload.legalName);

    const db = getDbPool();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      let insertedBusiness: BusinessInsertRow | null = null;
      const normalized = businessNameInput.replace(/\s+/g, " ").trim();

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const candidateName =
          attempt === 0 ? normalized : `${normalized} (${String(attempt + 1)})`;

        try {
          const businessResult = await client.query<BusinessInsertRow>(
            `
            INSERT INTO businesses (name, legal_name)
            VALUES ($1, $2)
            RETURNING id::text, name, public_id
            `,
            [candidateName, legalNameInput ?? null]
          );
          insertedBusiness = businessResult.rows[0] ?? null;
          if (insertedBusiness) {
            break;
          }
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code?: unknown }).code ?? "")
              : "";

          if (code === "23505") {
            continue;
          }

          throw error;
        }
      }

      if (!insertedBusiness) {
        throw new Error("Unable to create business. Try a different business name.");
      }

      const businessId = Number.parseInt(insertedBusiness.id, 10);
      if (!Number.isInteger(businessId) || businessId <= 0) {
        throw new Error("Failed to resolve new business id");
      }

      const workspaceLabel =
        workspaceNameInput ?? `${insertedBusiness.name} Workspace`;

      const workspaceResult = await client.query<WorkspaceRow>(
        `
        INSERT INTO workspaces (business_id, name)
        VALUES ($1, $2)
        ON CONFLICT (business_id)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING
          id::text,
          name,
          business_id::text,
          ''::text AS business_name,
          'owner'::text AS role,
          'active'::text AS status,
          created_at::text
        `,
        [businessId, workspaceLabel]
      );

      const workspace = workspaceResult.rows[0];
      if (!workspace) {
        throw new Error("Failed to create workspace");
      }

      await client.query(
        `
        INSERT INTO workspace_members (
          workspace_id,
          user_id,
          role,
          status
        )
        VALUES ($1::uuid, $2::uuid, 'owner', 'active')
        ON CONFLICT (workspace_id, user_id)
        DO UPDATE
        SET
          role = 'owner',
          status = 'active',
          updated_at = NOW()
        `,
        [workspace.id, session.userId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        workspace: {
          id: workspace.id,
          name: workspace.name,
          businessId,
          businessName: insertedBusiness.name,
          role: "owner",
          status: "active"
        },
        created: true
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert workspace";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("workspaceId") || message.includes("businessName") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
