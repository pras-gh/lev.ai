import type { PoolClient } from "pg";
import { getDbPool } from "@/lib/db";

type MembershipRow = {
  workspace_id: string;
  business_id: string;
  workspace_name: string;
  onboarding_completed_at: string | null;
};

type BusinessRow = {
  id: string;
  name: string;
};

export type WorkspaceBootstrapResult = {
  workspaceId: string;
  businessId: number;
  workspaceName: string;
  created: boolean;
  onboardingCompleted: boolean;
};

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveNamesFromEmail(email: string): { businessName: string; workspaceName: string } {
  const localPart = email.split("@")[0] ?? "Trail";
  const normalized = localPart.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "Trail";
  const brand = toTitleCase(normalized).slice(0, 48);

  return {
    businessName: `${brand} Business`,
    workspaceName: `${brand} Workspace`
  };
}

async function findActiveMembership(params: {
  userId: string;
  client: PoolClient;
}): Promise<MembershipRow | null> {
  const result = await params.client.query<MembershipRow>(
    `
    SELECT
      wm.workspace_id::text,
      w.business_id::text,
      w.name AS workspace_name,
      wm.onboarding_completed_at::text
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = $1::uuid
      AND wm.status = 'active'
    ORDER BY wm.created_at ASC
    LIMIT 1
    `,
    [params.userId]
  );

  return result.rows[0] ?? null;
}

async function upsertUser(params: {
  userId: string;
  email: string;
  client: PoolClient;
}): Promise<void> {
  await params.client.query(
    `
    INSERT INTO users (id, email)
    VALUES ($1::uuid, LOWER($2))
    ON CONFLICT (id)
    DO UPDATE
    SET
      email = EXCLUDED.email,
      updated_at = NOW()
    `,
    [params.userId, params.email]
  );
}

export async function ensureUserRecord(params: {
  userId: string;
  email: string;
  client?: PoolClient;
}): Promise<void> {
  const pool = getDbPool();
  const managedClient = params.client ? null : await pool.connect();
  const client = params.client ?? managedClient!;

  try {
    await upsertUser({
      userId: params.userId,
      email: params.email,
      client
    });
  } finally {
    managedClient?.release();
  }
}

export async function ensureWorkspaceForUser(params: {
  userId: string;
  email: string;
  client?: PoolClient;
}): Promise<WorkspaceBootstrapResult> {
  const pool = getDbPool();
  const managedClient = params.client ? null : await pool.connect();
  const client = params.client ?? managedClient!;

  try {
    if (!params.client) {
      await client.query("BEGIN");
    }

    await upsertUser({
      userId: params.userId,
      email: params.email,
      client
    });

    const existing = await findActiveMembership({
      userId: params.userId,
      client
    });

    if (existing) {
      if (!params.client) {
        await client.query("COMMIT");
      }

      return {
        workspaceId: existing.workspace_id,
        businessId: Number.parseInt(existing.business_id, 10),
        workspaceName: existing.workspace_name,
        created: false,
        onboardingCompleted: Boolean(existing.onboarding_completed_at)
      };
    }

    const { businessName, workspaceName } = deriveNamesFromEmail(params.email);

    const businessResult = await client.query<BusinessRow>(
      `
      INSERT INTO businesses (name, legal_name, country_code, timezone, base_currency, is_active)
      VALUES ($1, $2, 'IN', 'Asia/Kolkata', 'INR', TRUE)
      RETURNING id::text, name
      `,
      [businessName, businessName]
    );

    const business = businessResult.rows[0];
    if (!business) {
      throw new Error("Failed to create business");
    }

    const workspaceResult = await client.query<{ id: string; name: string }>(
      `
      INSERT INTO workspaces (business_id, name, owner_id)
      VALUES ($1, $2, $3::uuid)
      RETURNING id::text, name
      `,
      [business.id, workspaceName, params.userId]
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
        status,
        onboarding_completed_at
      )
      VALUES ($1::uuid, $2::uuid, 'owner', 'active', NULL)
      ON CONFLICT (workspace_id, user_id)
      DO UPDATE
      SET
        role = 'owner',
        status = 'active',
        updated_at = NOW()
      `,
      [workspace.id, params.userId]
    );

    if (!params.client) {
      await client.query("COMMIT");
    }

    return {
      workspaceId: workspace.id,
      businessId: Number.parseInt(business.id, 10),
      workspaceName: workspace.name,
      created: true,
      onboardingCompleted: false
    };
  } catch (error) {
    if (!params.client) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    managedClient?.release();
  }
}
