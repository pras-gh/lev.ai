import { getDbPool } from "@/lib/db";
import type { PoolClient } from "pg";

export type AuditActorType = "system" | "user" | "api_key" | "job";

export type AuditLogInput = {
  workspaceId: string;
  businessId?: number | string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  entityType: string;
  entityId: string | number;
  action: string;
  beforeState?: unknown;
  afterState?: unknown;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type Queryable = Pick<PoolClient, "query">;

function toJson(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  return JSON.stringify(value);
}

function isMissingAuditTable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (code === "42P01") {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes('relation "audit_logs" does not exist');
}

export async function writeAuditLog(
  input: AuditLogInput,
  queryable?: Queryable
): Promise<void> {
  const db = queryable ?? getDbPool();
  await db.query(
    `
    INSERT INTO audit_logs (
      workspace_id,
      business_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state,
      request_id,
      ip_address,
      user_agent
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8::jsonb,
      $9::jsonb,
      $10,
      $11::inet,
      $12
    )
    `,
    [
      input.workspaceId,
      input.businessId ?? null,
      input.actorType,
      input.actorId ?? null,
      input.entityType,
      String(input.entityId),
      input.action,
      toJson(input.beforeState),
      toJson(input.afterState),
      input.requestId ?? null,
      input.ipAddress ?? null,
      input.userAgent ?? null
    ]
  );
}

export async function writeAuditLogSafe(
  input: AuditLogInput,
  queryable?: Queryable
): Promise<void> {
  try {
    await writeAuditLog(input, queryable);
  } catch (error) {
    if (isMissingAuditTable(error)) {
      return;
    }
  }
}
