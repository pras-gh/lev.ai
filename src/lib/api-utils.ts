import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getDbPool } from "@/lib/db";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ApiScopeInput = {
  businessId?: number;
  workspaceId?: string;
};

export type ResolvedScope = {
  businessId: number;
  workspaceId: string;
};

type ScopeRow = {
  workspace_id: string;
  business_id: string;
};

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function parseBooleanQuery(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error("Boolean query params must be true or false");
}

export function toPositiveInt(raw: unknown, fieldName: string): number {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw.trim())
        : Number.NaN;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
}

export function toOptionalPositiveInt(raw: unknown, fieldName: string): number | undefined {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  return toPositiveInt(raw, fieldName);
}

export function toUuid(raw: unknown, fieldName: string): string {
  if (typeof raw !== "string") {
    throw new Error(`${fieldName} must be a UUID string`);
  }

  const trimmed = raw.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }

  return trimmed;
}

export function toOptionalUuid(raw: unknown, fieldName: string): string | undefined {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  return toUuid(raw, fieldName);
}

export function toOptionalText(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toOptionalNumber(raw: unknown, fieldName: string): number | undefined {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return value;
}

export function toOptionalBoolean(raw: unknown, fieldName: string): boolean | undefined {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  throw new Error(`${fieldName} must be true or false`);
}

export function readScopeFromSearchParams(params: URLSearchParams): ApiScopeInput {
  const businessIdRaw = params.get("businessId");
  const workspaceIdRaw = params.get("workspaceId");

  return {
    businessId: businessIdRaw ? toPositiveInt(businessIdRaw, "businessId") : undefined,
    workspaceId: workspaceIdRaw ? toUuid(workspaceIdRaw, "workspaceId") : undefined
  };
}

export function readScopeFromBody(body: Record<string, unknown>): ApiScopeInput {
  return {
    businessId: toOptionalPositiveInt(body.businessId, "businessId"),
    workspaceId: toOptionalUuid(body.workspaceId, "workspaceId")
  };
}

export function parsePagination(params: URLSearchParams): { page: number; pageSize: number } {
  const pageRaw = params.get("page");
  const limitRaw = params.get("limit");

  const page = pageRaw ? toPositiveInt(pageRaw, "page") : 1;
  const pageSize = limitRaw ? toPositiveInt(limitRaw, "limit") : 25;

  if (pageSize > 200) {
    throw new Error("limit cannot be greater than 200");
  }

  return { page, pageSize };
}

export async function resolveScope(
  scope: ApiScopeInput,
  client?: PoolClient,
  options?: {
    allowWorkspaceAutocreate?: boolean;
  }
): Promise<ResolvedScope> {
  if (!scope.businessId && !scope.workspaceId) {
    throw new Error("Provide at least one scope identifier: workspaceId or businessId");
  }

  const db = client ?? getDbPool();

  if (scope.workspaceId && scope.businessId) {
    const result = await db.query<ScopeRow>(
      `
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
        AND business_id = $2
      LIMIT 1
      `,
      [scope.workspaceId, scope.businessId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("workspaceId and businessId do not belong to the same workspace");
    }

    return {
      workspaceId: row.workspace_id,
      businessId: Number(row.business_id)
    };
  }

  if (scope.workspaceId) {
    const result = await db.query<ScopeRow>(
      `
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE id = $1::uuid
      LIMIT 1
      `,
      [scope.workspaceId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("workspaceId not found");
    }

    return {
      workspaceId: row.workspace_id,
      businessId: Number(row.business_id)
    };
  }

  const businessId = scope.businessId as number;
  const allowWorkspaceAutocreate = options?.allowWorkspaceAutocreate ?? true;

  let result = await db.query<ScopeRow>(
    `
    SELECT id::text AS workspace_id, business_id::text
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,
    [businessId]
  );

  if (!result.rows[0] && allowWorkspaceAutocreate) {
    await db.query(
      `
      INSERT INTO workspaces (business_id, name)
      SELECT id, COALESCE(NULLIF(TRIM(name), ''), 'Workspace ' || id::text)
      FROM businesses
      WHERE id = $1
      ON CONFLICT (business_id) DO NOTHING
      `,
      [businessId]
    );

    result = await db.query<ScopeRow>(
      `
      SELECT id::text AS workspace_id, business_id::text
      FROM workspaces
      WHERE business_id = $1
      LIMIT 1
      `,
      [businessId]
    );
  }

  const row = result.rows[0];
  if (!row) {
    throw new Error("businessId not found");
  }

  return {
    workspaceId: row.workspace_id,
    businessId: Number(row.business_id)
  };
}
