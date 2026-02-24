import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { evaluateWorkspaceAlerts } from "@/lib/alert-engine";
import { getDbPool } from "@/lib/db";
import {
  INTEGRATION_PROVIDERS,
  integrationProviderLabel,
  type IntegrationProviderId
} from "@/lib/integration-catalog";
import { applyRulesV0ForWorkspace } from "@/lib/rules-engine-v0";

export type CanonicalEntityKind =
  | "transaction"
  | "invoice"
  | "refund"
  | "payout"
  | "fee"
  | "adjustment";

export type CanonicalDirection = "credit" | "debit" | null;

export type CanonicalRecordInput = {
  workspaceId: string;
  businessId: number;
  provider: string;
  entityKind: CanonicalEntityKind;
  externalId?: string | null;
  occurredAt?: string | Date | null;
  direction?: CanonicalDirection;
  amount?: number | string | null;
  currencyCode?: string | null;
  description?: string | null;
  counterparty?: string | null;
  rawPayload?: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown>;
  transactionId?: number | null;
  ingestionRunId?: number | null;
};

type IdRow = {
  id: string;
};

type ExistingAccountRow = {
  id: string;
};

type ExistingSourceEventRow = {
  id: string;
  transaction_id: string | null;
};

type ExistingConnectionRow = {
  id: string;
};

export type SyncCursorMode = "initial_backfill" | "delta" | "webhook_replay";

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveBigInt(value: string | null | undefined): bigint | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = BigInt(value);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeCurrency(code: string | null | undefined): string {
  if (!code) {
    return "INR";
  }

  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 3) {
    return "INR";
  }

  return normalized;
}

function toNumericText(value: number | string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(2);
}

function safeJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (code === "42P01") {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes('relation "connector_tokens" does not exist') ||
    message.includes('relation "connections" does not exist') ||
    message.includes('relation "sync_runs" does not exist') ||
    message.includes('relation "connector_sync_cursors" does not exist') ||
    message.includes('relation "connector_webhook_events" does not exist') ||
    message.includes('relation "source_events" does not exist') ||
    message.includes('relation "canonical_records" does not exist')
  );
}

export function buildTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function maskToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 6) {
    return "••••••";
  }

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-2)}`;
}

export async function upsertConnectorToken(params: {
  client?: PoolClient;
  workspaceId: string;
  provider: string;
  token: string;
  scopes?: string[];
  expiresAt?: string | Date | null;
  metadata?: Record<string, unknown>;
}): Promise<{
  stored: boolean;
  tokenHash: string;
  tokenHint: string;
  tokenId: number | null;
}> {
  const tokenHash = buildTokenHash(params.token);
  const tokenHint = maskToken(params.token);

  const db = params.client ?? getDbPool();
  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO connector_tokens (
        workspace_id,
        provider,
        token_hash,
        token_hint,
        token_ciphertext,
        scopes,
        status,
        expires_at,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        'active',
        $7::timestamptz,
        $8::jsonb
      )
      ON CONFLICT (workspace_id, provider, token_hash)
      DO UPDATE
      SET
        status = 'active',
        token_hint = EXCLUDED.token_hint,
        expires_at = EXCLUDED.expires_at,
        metadata = COALESCE(connector_tokens.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.provider,
        tokenHash,
        tokenHint,
        params.token,
        JSON.stringify(params.scopes ?? []),
        toIsoString(params.expiresAt),
        JSON.stringify(params.metadata ?? {})
      ]
    );

    return {
      stored: true,
      tokenHash,
      tokenHint,
      tokenId: parsePositiveInt(result.rows[0]?.id)
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        stored: false,
        tokenHash,
        tokenHint,
        tokenId: null
      };
    }

    throw error;
  }
}

export async function upsertConnection(params: {
  client?: PoolClient;
  workspaceId: string;
  provider: string;
  status: "connected" | "syncing" | "error" | "disconnected";
  scopes?: string[];
  secretsRef?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ stored: boolean; connectionId: string | null }> {
  const db = params.client ?? getDbPool();

  try {
    const result = await db.query<ExistingConnectionRow>(
      `
      INSERT INTO connections (
        workspace_id,
        provider,
        status,
        scopes,
        secrets_ref,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4::jsonb,
        $5,
        $6::jsonb
      )
      ON CONFLICT (workspace_id, provider)
      DO UPDATE
      SET
        status = EXCLUDED.status,
        scopes = EXCLUDED.scopes,
        secrets_ref = COALESCE(EXCLUDED.secrets_ref, connections.secrets_ref),
        metadata = COALESCE(connections.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.provider,
        params.status,
        JSON.stringify(params.scopes ?? []),
        params.secretsRef ?? null,
        JSON.stringify(params.metadata ?? {})
      ]
    );

    return {
      stored: true,
      connectionId: result.rows[0]?.id ?? null
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        stored: false,
        connectionId: null
      };
    }

    throw error;
  }
}

export async function startSyncRun(params: {
  client?: PoolClient;
  workspaceId: string;
  connectionId: string;
  type: "backfill" | "delta" | "webhook";
  stats?: Record<string, unknown>;
}): Promise<number | null> {
  const db = params.client ?? getDbPool();
  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO sync_runs (
        workspace_id,
        connection_id,
        type,
        started_at,
        status,
        stats_json
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        NOW(),
        'running',
        $4::jsonb
      )
      RETURNING id::text
      `,
      [params.workspaceId, params.connectionId, params.type, JSON.stringify(params.stats ?? {})]
    );

    return parsePositiveInt(result.rows[0]?.id);
  } catch (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }
}

export async function finishSyncRun(params: {
  client?: PoolClient;
  workspaceId: string;
  syncRunId: number | null;
  status: "success" | "partial" | "failed" | "cancelled";
  stats?: Record<string, unknown>;
  error?: string | null;
}): Promise<void> {
  if (!params.syncRunId) {
    return;
  }

  const db = params.client ?? getDbPool();
  try {
    await db.query(
      `
      UPDATE sync_runs
      SET
        status = $3,
        finished_at = NOW(),
        error = $4,
        stats_json = COALESCE(stats_json, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,
      [
        params.syncRunId,
        params.workspaceId,
        params.status,
        params.error ?? null,
        JSON.stringify(params.stats ?? {})
      ]
    );
  } catch (error) {
    if (isMissingRelationError(error)) {
      return;
    }

    throw error;
  }
}

function accountTypeForProvider(provider: string): "bank" | "wallet" | "other" {
  const providerDef = INTEGRATION_PROVIDERS.find((item) => item.id === provider);
  if (!providerDef) {
    return "other";
  }

  if (providerDef.kind === "bank") {
    return "bank";
  }

  if (providerDef.kind === "payments") {
    return "wallet";
  }

  return "other";
}

export async function ensureIntegrationSourceAccount(params: {
  client?: PoolClient;
  workspaceId: string;
  businessId: number;
  provider: string;
}): Promise<string | null> {
  const db = params.client ?? getDbPool();

  try {
    const existingAccount = await db.query<ExistingAccountRow>(
      `
      SELECT a.id::text
      FROM accounts a
      LEFT JOIN integrations i ON i.id = a.integration_id
      WHERE a.workspace_id = $1::uuid
        AND (
          i.provider = $2
          OR (a.metadata->>'provider') = $2
        )
      ORDER BY a.created_at ASC
      LIMIT 1
      `,
      [params.workspaceId, params.provider]
    );

    if (existingAccount.rows[0]?.id) {
      return existingAccount.rows[0].id;
    }

    const inserted = await db.query<ExistingAccountRow>(
      `
      INSERT INTO accounts (
        workspace_id,
        business_id,
        integration_id,
        account_type,
        name,
        currency_code,
        is_active,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        (
          SELECT id
          FROM integrations
          WHERE workspace_id = $1::uuid
            AND provider = $3
          LIMIT 1
        ),
        $4,
        $5,
        'INR',
        TRUE,
        $6::jsonb
      )
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.businessId,
        params.provider,
        accountTypeForProvider(params.provider),
        `${integrationProviderLabel(params.provider)} Primary`,
        JSON.stringify({
          provider: params.provider,
          createdBy: "connector_sync_engine"
        })
      ]
    );

    return inserted.rows[0]?.id ?? null;
  } catch (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }
}

export async function upsertSourceEvent(params: {
  client?: PoolClient;
  workspaceId: string;
  businessId: number;
  connectionId: string;
  source: string;
  accountId: string;
  externalTxnId: string;
  eventType?: string;
  payload?: Record<string, unknown>;
}): Promise<{
  stored: boolean;
  sourceEventId: number | null;
  existingTransactionId: bigint | null;
}> {
  const db = params.client ?? getDbPool();

  try {
    const result = await db.query<ExistingSourceEventRow>(
      `
      INSERT INTO source_events (
        workspace_id,
        business_id,
        connection_id,
        source,
        account_id,
        external_id,
        external_txn_id,
        event_type,
        status,
        payload,
        payload_json,
        received_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3::uuid,
        $4,
        $5::uuid,
        $6,
        $6,
        $7,
        'received',
        $8::jsonb,
        $8::jsonb,
        NOW()
      )
      ON CONFLICT (connection_id, external_id)
      DO UPDATE
      SET
        last_seen_at = NOW(),
        seen_count = source_events.seen_count + 1,
        payload = EXCLUDED.payload,
        payload_json = EXCLUDED.payload_json,
        event_type = EXCLUDED.event_type,
        updated_at = NOW()
      RETURNING id::text, transaction_id::text
      `,
      [
        params.workspaceId,
        params.businessId,
        params.connectionId,
        params.source,
        params.accountId,
        params.externalTxnId,
        params.eventType ?? "transaction",
        JSON.stringify(params.payload ?? {})
      ]
    );

    return {
      stored: true,
      sourceEventId: parsePositiveInt(result.rows[0]?.id),
      existingTransactionId: parsePositiveBigInt(result.rows[0]?.transaction_id)
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        stored: false,
        sourceEventId: null,
        existingTransactionId: null
      };
    }

    throw error;
  }
}

export async function finalizeSourceEvent(params: {
  client?: PoolClient;
  workspaceId: string;
  sourceEventId: number;
  transactionId?: bigint | null;
  canonicalRecordId?: bigint | null;
  status: "processed" | "duplicate" | "error";
  error?: string | null;
}): Promise<void> {
  const db = params.client ?? getDbPool();

  try {
    await db.query(
      `
      UPDATE source_events
      SET
        transaction_id = COALESCE($3::bigint, transaction_id),
        canonical_record_id = COALESCE($4::bigint, canonical_record_id),
        status = $5,
        error = $6,
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,
      [
        params.sourceEventId,
        params.workspaceId,
        params.transactionId ? params.transactionId.toString() : null,
        params.canonicalRecordId ? params.canonicalRecordId.toString() : null,
        params.status,
        params.error ?? null
      ]
    );
  } catch (error) {
    if (isMissingRelationError(error)) {
      return;
    }

    throw error;
  }
}

export async function upsertConnectorCursor(params: {
  client?: PoolClient;
  workspaceId: string;
  provider: string;
  stream?: string;
  mode?: SyncCursorMode;
  status?: "idle" | "queued" | "running" | "error";
  cursor?: string | null;
  lastRunAt?: string | Date | null;
  nextRunAt?: string | Date | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ stored: boolean; cursorId: number | null }> {
  const db = params.client ?? getDbPool();
  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO connector_sync_cursors (
        workspace_id,
        provider,
        stream,
        cursor,
        sync_mode,
        status,
        last_run_at,
        next_run_at,
        error,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::timestamptz,
        $8::timestamptz,
        $9,
        $10::jsonb
      )
      ON CONFLICT (workspace_id, provider, stream)
      DO UPDATE
      SET
        cursor = EXCLUDED.cursor,
        sync_mode = EXCLUDED.sync_mode,
        status = EXCLUDED.status,
        last_run_at = COALESCE(EXCLUDED.last_run_at, connector_sync_cursors.last_run_at),
        next_run_at = COALESCE(EXCLUDED.next_run_at, connector_sync_cursors.next_run_at),
        error = EXCLUDED.error,
        metadata = COALESCE(connector_sync_cursors.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.provider,
        params.stream ?? "transactions",
        params.cursor ?? null,
        params.mode ?? "delta",
        params.status ?? "idle",
        toIsoString(params.lastRunAt),
        toIsoString(params.nextRunAt),
        params.error ?? null,
        JSON.stringify(params.metadata ?? {})
      ]
    );

    return {
      stored: true,
      cursorId: parsePositiveInt(result.rows[0]?.id)
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { stored: false, cursorId: null };
    }

    throw error;
  }
}

export async function enqueueConnectorWebhookEvent(params: {
  client?: PoolClient;
  workspaceId: string;
  provider: string;
  eventId: string;
  eventType: string;
  occurredAt?: string | Date | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<{
  accepted: boolean;
  duplicate: boolean;
  webhookEventId: number | null;
}> {
  const db = params.client ?? getDbPool();

  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO connector_webhook_events (
        workspace_id,
        provider,
        event_id,
        event_type,
        status,
        occurred_at,
        payload,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        'received',
        $5::timestamptz,
        $6::jsonb,
        $7::jsonb
      )
      ON CONFLICT (workspace_id, provider, event_id)
      DO NOTHING
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.provider,
        params.eventId,
        params.eventType,
        toIsoString(params.occurredAt),
        JSON.stringify(params.payload),
        JSON.stringify(params.metadata ?? {})
      ]
    );

    const webhookEventId = parsePositiveInt(result.rows[0]?.id);
    return {
      accepted: true,
      duplicate: webhookEventId === null,
      webhookEventId
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        accepted: false,
        duplicate: false,
        webhookEventId: null
      };
    }

    throw error;
  }
}

export async function updateConnectorWebhookEventStatus(params: {
  client?: PoolClient;
  workspaceId: string;
  webhookEventId: number;
  status: "processed" | "failed" | "ignored";
  error?: string | null;
}): Promise<void> {
  const db = params.client ?? getDbPool();

  try {
    await db.query(
      `
      UPDATE connector_webhook_events
      SET
        status = $3,
        processed_at = CASE WHEN $3 IN ('processed', 'ignored') THEN NOW() ELSE processed_at END,
        error = $4,
        updated_at = NOW()
      WHERE id = $1::bigint
        AND workspace_id = $2::uuid
      `,
      [params.webhookEventId, params.workspaceId, params.status, params.error ?? null]
    );
  } catch (error) {
    if (isMissingRelationError(error)) {
      return;
    }

    throw error;
  }
}

export async function upsertCanonicalRecord(params: {
  client?: PoolClient;
  record: CanonicalRecordInput;
}): Promise<{ stored: boolean; canonicalId: number | null }> {
  const db = params.client ?? getDbPool();
  const record = params.record;

  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO canonical_records (
        workspace_id,
        business_id,
        provider,
        entity_kind,
        external_id,
        occurred_at,
        direction,
        amount_minor,
        currency_code,
        description,
        counterparty,
        raw_payload,
        normalized_payload,
        transaction_id,
        ingestion_run_id
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::timestamptz,
        $7::txn_type,
        $8::numeric,
        $9::char(3),
        $10,
        $11,
        $12::jsonb,
        $13::jsonb,
        $14::bigint,
        $15::bigint
      )
      ON CONFLICT (workspace_id, provider, entity_kind, external_id)
      DO UPDATE
      SET
        occurred_at = EXCLUDED.occurred_at,
        direction = EXCLUDED.direction,
        amount_minor = EXCLUDED.amount_minor,
        currency_code = EXCLUDED.currency_code,
        description = EXCLUDED.description,
        counterparty = EXCLUDED.counterparty,
        raw_payload = EXCLUDED.raw_payload,
        normalized_payload = EXCLUDED.normalized_payload,
        transaction_id = COALESCE(EXCLUDED.transaction_id, canonical_records.transaction_id),
        ingestion_run_id = COALESCE(EXCLUDED.ingestion_run_id, canonical_records.ingestion_run_id),
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        record.workspaceId,
        record.businessId,
        record.provider,
        record.entityKind,
        record.externalId ?? null,
        toIsoString(record.occurredAt),
        record.direction ?? null,
        toNumericText(record.amount),
        normalizeCurrency(record.currencyCode),
        record.description ?? null,
        record.counterparty ?? null,
        JSON.stringify(safeJson(record.rawPayload)),
        JSON.stringify(safeJson(record.normalizedPayload)),
        record.transactionId ?? null,
        record.ingestionRunId ?? null
      ]
    );

    return {
      stored: true,
      canonicalId: parsePositiveInt(result.rows[0]?.id)
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { stored: false, canonicalId: null };
    }

    throw error;
  }
}

export function buildWebhookDedupeKey(params: {
  provider: string;
  workspaceId: string;
  eventId?: string | null;
  externalId?: string | null;
}): string {
  const stable = [
    params.provider,
    params.workspaceId,
    params.eventId ?? "",
    params.externalId ?? ""
  ].join("|");

  return createHash("sha256").update(stable).digest("hex");
}

export async function enqueueNotificationOutbox(params: {
  client?: PoolClient;
  workspaceId: string;
  eventType: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  availableAt?: string | Date | null;
}): Promise<number | null> {
  const db = params.client ?? getDbPool();

  try {
    const result = await db.query<IdRow>(
      `
      INSERT INTO event_outbox (
        workspace_id,
        event_type,
        dedupe_key,
        payload,
        status,
        available_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4::jsonb,
        'pending',
        COALESCE($5::timestamptz, NOW())
      )
      ON CONFLICT (workspace_id, event_type, dedupe_key)
      DO UPDATE
      SET
        payload = EXCLUDED.payload,
        status = 'pending',
        available_at = COALESCE(EXCLUDED.available_at, NOW()),
        last_error = NULL,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.eventType,
        params.dedupeKey,
        JSON.stringify(params.payload),
        toIsoString(params.availableAt)
      ]
    );

    return parsePositiveInt(result.rows[0]?.id);
  } catch {
    return null;
  }
}

export function nextDeltaRunAt(hours = 1): string {
  const value = Number.isFinite(hours) && hours > 0 ? hours : 1;
  return new Date(Date.now() + value * 60 * 60 * 1000).toISOString();
}

export async function runLedgerPipelinePostIngest(params: {
  workspaceId: string;
  businessId: number;
  runRules?: boolean;
  runAlerts?: boolean;
  sendWhatsAppDigest?: boolean;
}): Promise<{
  rules:
    | {
        ok: true;
        scanned: number;
        tagged: number;
        duplicateSuggestionsOpen: number;
      }
    | { ok: false; error: string }
    | null;
  alerts:
    | {
        ok: true;
        openCount: number;
      }
    | { ok: false; error: string }
    | null;
}> {
  const runRules = params.runRules ?? true;
  const runAlerts = params.runAlerts ?? true;

  let rules: {
    ok: true;
    scanned: number;
    tagged: number;
    duplicateSuggestionsOpen: number;
  } | { ok: false; error: string } | null = null;

  if (runRules) {
    try {
      const result = await applyRulesV0ForWorkspace({
        workspaceId: params.workspaceId,
        businessId: params.businessId,
        limit: 1500,
        confidenceThreshold: 0.65
      });

      rules = {
        ok: true,
        scanned: result.scanned,
        tagged: result.tagged,
        duplicateSuggestionsOpen: result.duplicateSuggestionsOpen
      };
    } catch (error) {
      rules = {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to run categorization rules"
      };
    }
  }

  let alerts: {
    ok: true;
    openCount: number;
  } | { ok: false; error: string } | null = null;

  if (runAlerts) {
    try {
      const result = await evaluateWorkspaceAlerts({
        workspaceId: params.workspaceId,
        businessId: params.businessId,
        sendWhatsAppDigest: params.sendWhatsAppDigest ?? false
      });

      const openCount = Object.values(result.alerts).filter(
        (item) => item.alert.status === "opened" || item.alert.status === "updated"
      ).length;
      alerts = {
        ok: true,
        openCount
      };
    } catch (error) {
      alerts = {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to run alert evaluation"
      };
    }
  }

  return {
    rules,
    alerts
  };
}

export async function getDueDeltaSyncTargets(params: {
  client?: Pool | PoolClient;
  workspaceId?: string;
  limit?: number;
}): Promise<
  Array<{
    workspaceId: string;
    provider: IntegrationProviderId;
    stream: string;
    cursor: string | null;
    mode: SyncCursorMode;
  }>
> {
  const db = params.client ?? getDbPool();
  const values: Array<string | number> = [];
  const filters = ["c.status IN ('idle', 'queued', 'error')", "(c.next_run_at IS NULL OR c.next_run_at <= NOW())"];

  if (params.workspaceId) {
    values.push(params.workspaceId);
    filters.push(`c.workspace_id = $${values.length}::uuid`);
  }

  const limit = params.limit ?? 20;
  values.push(limit);

  const result = await db.query<{
    workspace_id: string;
    provider: string;
    stream: string;
    cursor: string | null;
    sync_mode: SyncCursorMode;
  }>(
    `
    SELECT
      c.workspace_id::text,
      c.provider,
      c.stream,
      c.cursor,
      c.sync_mode
    FROM connector_sync_cursors c
    WHERE ${filters.join(" AND ")}
    ORDER BY c.next_run_at NULLS FIRST, c.updated_at ASC
    LIMIT $${values.length}
    `,
    values
  );

  const output: Array<{
    workspaceId: string;
    provider: IntegrationProviderId;
    stream: string;
    cursor: string | null;
    mode: SyncCursorMode;
  }> = [];

  for (const row of result.rows) {
    if (!row.provider) {
      continue;
    }

    output.push({
      workspaceId: row.workspace_id,
      provider: row.provider as IntegrationProviderId,
      stream: row.stream,
      cursor: row.cursor,
      mode: row.sync_mode
    });
  }

  return output;
}

export function providerSyncSummary(provider: string): {
  provider: string;
  providerLabel: string;
  syncMode: "backfill_then_delta";
  transport: "api_pull + webhook";
} {
  return {
    provider,
    providerLabel: integrationProviderLabel(provider),
    syncMode: "backfill_then_delta",
    transport: "api_pull + webhook"
  };
}
