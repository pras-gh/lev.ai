import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import {
  badRequest,
  readScopeFromBody,
  resolveScope,
  toOptionalPositiveInt,
  toOptionalText
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  ensureIntegrationSourceAccount,
  finalizeSourceEvent,
  enqueueNotificationOutbox,
  finishSyncRun,
  nextDeltaRunAt,
  runLedgerPipelinePostIngest,
  startSyncRun,
  upsertConnection,
  upsertSourceEvent,
  upsertCanonicalRecord,
  upsertConnectorCursor,
  type SyncCursorMode
} from "@/lib/connector-sync-engine";
import { getDbPool } from "@/lib/db";
import { getProviderAdapter } from "@/lib/connectors/registry";
import {
  INTEGRATION_PROVIDERS,
  integrationProviderLabel,
  isIntegrationProviderId
} from "@/lib/integration-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdRow = {
  id: string;
};

type ControlPlaneRunIds = {
  jobRunId: number | null;
  ingestionRunId: number | null;
};

type DeliveryAttemptStatus = "success" | "failed" | "retrying";
type Queryable = Pick<PoolClient, "query">;

function hashIntegrationRow(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function normalizeStableText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parsePositiveId(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseSyncMode(value: unknown): SyncCursorMode {
  if (typeof value !== "string") {
    return "delta";
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "initial_backfill" ||
    normalized === "delta" ||
    normalized === "webhook_replay"
  ) {
    return normalized;
  }

  return "delta";
}

function readBearerToken(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer") {
    return null;
  }

  return token?.trim() || null;
}

function isSystemSyncAuthorized(request: NextRequest): boolean {
  const candidates = [process.env.CONNECTOR_SYNC_KEY, process.env.CRON_SECRET]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);

  if (candidates.length === 0) {
    return false;
  }

  const provided = [
    readBearerToken(request.headers.get("authorization")),
    request.headers.get("x-connector-sync-key")?.trim() ?? null,
    request.nextUrl.searchParams.get("key")?.trim() ?? null
  ].filter((value): value is string => Boolean(value));

  return provided.some((value) => candidates.includes(value));
}

function isControlPlaneUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  if (code === "42P01") {
    return true;
  }

  return (
    message.includes('relation "ingestion_runs" does not exist') ||
    message.includes('relation "job_runs" does not exist') ||
    message.includes('relation "event_outbox" does not exist') ||
    message.includes('relation "delivery_attempts" does not exist')
  );
}

async function safeCreateSyncRunRecords(params: {
  client: PoolClient;
  workspaceId: string;
  provider: string;
  jobId: string;
  rowCount: number;
}): Promise<ControlPlaneRunIds> {
  try {
    const jobDedupeKey = `${params.provider}:${params.jobId}`;
    const jobRunResult = await params.client.query<IdRow>(
      `
      INSERT INTO job_runs (
        workspace_id,
        job_type,
        dedupe_key,
        status,
        started_at,
        metrics
      )
      VALUES (
        $1::uuid,
        'integration.sync',
        $2,
        'running',
        NOW(),
        $3::jsonb
      )
      RETURNING id::text
      `,
      [
        params.workspaceId,
        jobDedupeKey,
        JSON.stringify({
          provider: params.provider,
          rowCount: params.rowCount,
          syncMode: "adapter_pull_v1"
        })
      ]
    );

    const ingestionRunResult = await params.client.query<IdRow>(
      `
      INSERT INTO ingestion_runs (
        workspace_id,
        provider,
        mode,
        status,
        started_at,
        metadata
      )
      VALUES (
        $1::uuid,
        $2,
        'adapter_pull_v1',
        'running',
        NOW(),
        $3::jsonb
      )
      RETURNING id::text
      `,
      [
        params.workspaceId,
        params.provider,
        JSON.stringify({
          jobId: params.jobId,
          rowCount: params.rowCount,
          source: "api.integrations.sync"
        })
      ]
    );

    return {
      jobRunId: parsePositiveId(jobRunResult.rows[0]?.id),
      ingestionRunId: parsePositiveId(ingestionRunResult.rows[0]?.id)
    };
  } catch (error) {
    if (isControlPlaneUnavailable(error)) {
      return { jobRunId: null, ingestionRunId: null };
    }

    return { jobRunId: null, ingestionRunId: null };
  }
}

async function safeMarkSyncSuccess(params: {
  client: PoolClient;
  workspaceId: string;
  provider: string;
  jobId: string;
  runIds: ControlPlaneRunIds;
  rowsFetched: number;
  rowsInserted: number;
  rowsDeduped: number;
  integrationStatus: string;
}): Promise<void> {
  try {
    if (params.runIds.ingestionRunId) {
      await params.client.query(
        `
        UPDATE ingestion_runs
        SET
          status = 'success',
          finished_at = NOW(),
          rows_fetched = $3,
          rows_inserted = $4,
          rows_deduped = $5,
          metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,
        [
          params.runIds.ingestionRunId,
          params.workspaceId,
          params.rowsFetched,
          params.rowsInserted,
          params.rowsDeduped,
          JSON.stringify({
            provider: params.provider,
            integrationStatus: params.integrationStatus,
            completedBy: "api.integrations.sync"
          })
        ]
      );
    }

    if (params.runIds.jobRunId) {
      await params.client.query(
        `
        UPDATE job_runs
        SET
          status = 'success',
          finished_at = NOW(),
          metrics = COALESCE(metrics, '{}'::jsonb) || $3::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,
        [
          params.runIds.jobRunId,
          params.workspaceId,
          JSON.stringify({
            provider: params.provider,
            jobId: params.jobId,
            rowsFetched: params.rowsFetched,
            rowsInserted: params.rowsInserted,
            rowsDeduped: params.rowsDeduped
          })
        ]
      );
    }
  } catch {
    // Control-plane writes are non-blocking for primary sync flow.
  }
}

async function safeMarkSyncFailure(params: {
  client: PoolClient;
  workspaceId: string;
  provider: string;
  jobId: string;
  runIds: ControlPlaneRunIds;
  errorMessage: string;
}): Promise<void> {
  try {
    if (params.runIds.ingestionRunId) {
      await params.client.query(
        `
        UPDATE ingestion_runs
        SET
          status = 'failed',
          finished_at = NOW(),
          error = $3,
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,
        [
          params.runIds.ingestionRunId,
          params.workspaceId,
          params.errorMessage,
          JSON.stringify({ provider: params.provider, jobId: params.jobId })
        ]
      );
    }

    if (params.runIds.jobRunId) {
      await params.client.query(
        `
        UPDATE job_runs
        SET
          status = 'failed',
          finished_at = NOW(),
          error = $3,
          metrics = COALESCE(metrics, '{}'::jsonb) || $4::jsonb
        WHERE id = $1::bigint
          AND workspace_id = $2::uuid
        `,
        [
          params.runIds.jobRunId,
          params.workspaceId,
          params.errorMessage,
          JSON.stringify({ provider: params.provider, jobId: params.jobId })
        ]
      );
    }
  } catch {
    // Control-plane writes are non-blocking for primary sync flow.
  }
}

async function safeEnqueueSyncOutbox(params: {
  client: PoolClient;
  workspaceId: string;
  provider: string;
  jobId: string;
  status: "success" | "failed";
  payload: Record<string, unknown>;
}): Promise<number | null> {
  try {
    const result = await params.client.query<IdRow>(
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
        'integration.sync.result',
        $2,
        $3::jsonb,
        'pending',
        NOW()
      )
      ON CONFLICT (workspace_id, event_type, dedupe_key)
      DO UPDATE
      SET
        payload = EXCLUDED.payload,
        status = 'pending',
        available_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
      RETURNING id::text
      `,
      [
        params.workspaceId,
        `${params.provider}:${params.jobId}:${params.status}`,
        JSON.stringify({
          provider: params.provider,
          jobId: params.jobId,
          status: params.status,
          ...params.payload
        })
      ]
    );

    return parsePositiveId(result.rows[0]?.id);
  } catch {
    return null;
  }
}

async function safeInsertDeliveryAttempt(params: {
  client: PoolClient;
  workspaceId: string;
  outboxId: number | null;
  channel: "dashboard" | "webhook" | "whatsapp" | "email";
  destination: string | null;
  status: DeliveryAttemptStatus;
  error?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  if (!params.outboxId) {
    return;
  }

  try {
    await params.client.query(
      `
      INSERT INTO delivery_attempts (
        workspace_id,
        outbox_id,
        channel,
        destination,
        status,
        error,
        payload,
        attempted_at
      )
      VALUES (
        $1::uuid,
        $2::bigint,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        NOW()
      )
      `,
      [
        params.workspaceId,
        params.outboxId,
        params.channel,
        params.destination,
        params.status,
        params.error ?? null,
        JSON.stringify(params.payload)
      ]
    );
  } catch {
    // Control-plane writes are non-blocking for primary sync flow.
  }
}

async function readIntegrationCursor(params: {
  queryable: Queryable;
  workspaceId: string;
  provider: string;
}): Promise<string | null> {
  const result = await params.queryable.query<{ last_cursor: string | null }>(
    `
    SELECT last_cursor
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND provider = $2
    LIMIT 1
    `,
    [params.workspaceId, params.provider]
  );

  return result.rows[0]?.last_cursor ?? null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  try {
    const scopeInput = readScopeFromBody(payload);
    const scope = isSystemSyncAuthorized(request)
      ? await resolveScope(scopeInput, undefined, { allowWorkspaceAutocreate: false })
      : await resolveAuthorizedScope({
          request,
          scope: scopeInput
        });
    const providerRaw = toOptionalText(payload.provider)?.toLowerCase();
    const rowCount = toOptionalPositiveInt(payload.rowCount, "rowCount") ?? 6;
    const syncMode = parseSyncMode(payload.syncMode ?? payload.mode);

    if (rowCount < 1 || rowCount > 25) {
      return badRequest("rowCount must be between 1 and 25");
    }

    if (!providerRaw || !isIntegrationProviderId(providerRaw)) {
      return badRequest(
        `provider must be one of: ${INTEGRATION_PROVIDERS.map((provider) => provider.id).join(", ")}`
      );
    }

    const provider = providerRaw;
    const providerAdapter = getProviderAdapter(provider);
    const jobId = randomUUID();
    const triggeredAt = new Date();
    const db = getDbPool();
    const adapterContext = {
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      provider
    } as const;
    const previousCursor = await readIntegrationCursor({
      queryable: db,
      workspaceId: scope.workspaceId,
      provider
    });
    const pullInput = {
      cursor: previousCursor,
      limit: rowCount
    };
    const pullResult =
      syncMode === "initial_backfill"
        ? await providerAdapter.backfill(pullInput, adapterContext)
        : await providerAdapter.delta(pullInput, adapterContext);
    const normalizedRows = await providerAdapter.normalize(pullResult.transactions, adapterContext);
    const rows = normalizedRows.length > 0 ? normalizedRows : pullResult.transactions;
    const nextCursorFromProvider = pullResult.nextCursor;
    const connectionScopes =
      provider === "whatsapp"
        ? ["messages:write", "contacts:read"]
        : ["transactions:read", "balances:read"];
    const triggeredMeta = {
      lastSyncJobId: jobId,
      lastSyncTriggeredAt: triggeredAt.toISOString(),
      lastSyncStatus: "syncing",
      mode: "adapter_pull_v1",
      syncMode,
      providerLabel: integrationProviderLabel(provider),
      previousCursor,
      adapterMetadata: pullResult.metadata ?? null
    };
    const client = await db.connect();

    const connection = await upsertConnection({
      client,
      workspaceId: scope.workspaceId,
      provider,
      status: "syncing",
      scopes: connectionScopes,
      metadata: {
        source: "api.integrations.sync",
        syncMode,
        adapter: providerAdapter.provider
      }
    });

    const syncRunId = connection.connectionId
      ? await startSyncRun({
          client,
          workspaceId: scope.workspaceId,
          connectionId: connection.connectionId,
          type: syncMode === "initial_backfill" ? "backfill" : "delta",
          stats: {
            provider,
            rowCount: rows.length,
            jobId
          }
        })
      : null;

    if (!connection.connectionId) {
      client.release();
      return NextResponse.json(
        {
          error:
            "Connection model unavailable. Apply latest migrations to enable canonical sync model."
        },
        { status: 500 }
      );
    }

    const runIds = await safeCreateSyncRunRecords({
      client,
      workspaceId: scope.workspaceId,
      provider,
      jobId,
      rowCount: rows.length
    });

    const accountId = await ensureIntegrationSourceAccount({
      client,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      provider
    });

    if (!accountId) {
      await finishSyncRun({
        client,
        workspaceId: scope.workspaceId,
        syncRunId,
        status: "failed",
        error: "Unable to resolve provider account"
      });
      client.release();
      return NextResponse.json(
        { error: "Unable to resolve provider account for sync idempotency model" },
        { status: 500 }
      );
    }

    await upsertConnectorCursor({
      client,
      workspaceId: scope.workspaceId,
      provider,
      stream: "transactions",
      mode: syncMode,
      status: "running",
      lastRunAt: triggeredAt.toISOString(),
      metadata: {
        source: "api.integrations.sync",
        jobId,
        rowCount: rows.length
      }
    });

    try {
      await client.query("BEGIN");

      await client.query(
        `
        INSERT INTO integrations (
          workspace_id,
          provider,
          status,
          meta,
          backfill_status,
          error_state
        )
        VALUES ($1::uuid, $2, 'syncing', $3::jsonb, $4, NULL)
        ON CONFLICT (workspace_id, provider)
        DO UPDATE
        SET
          status = 'syncing',
          backfill_status = $4,
          error_state = NULL,
          meta = COALESCE(integrations.meta, '{}'::jsonb) || EXCLUDED.meta,
          updated_at = NOW()
        `,
        [
          scope.workspaceId,
          provider,
          JSON.stringify(triggeredMeta),
          syncMode === "initial_backfill" ? "running" : "completed"
        ]
      );

      let inserted = 0;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const externalRef = row.externalTxnId;
        const stableRowHash = hashIntegrationRow(
          [
            scope.workspaceId,
            provider,
            row.occurredAt,
            row.direction,
            row.amount,
            normalizeStableText(row.description),
            normalizeStableText(row.counterparty)
          ].join("|")
        );

        const sourceEvent = await upsertSourceEvent({
          client,
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          connectionId: connection.connectionId,
          source: provider,
          accountId,
          externalTxnId: externalRef,
          eventType: "transaction",
          payload: {
            provider,
            jobId,
            rowNumber: index + 1,
            ...row
          }
        });

        if (sourceEvent.existingTransactionId) {
          if (sourceEvent.sourceEventId) {
            await finalizeSourceEvent({
              client,
              workspaceId: scope.workspaceId,
              sourceEventId: sourceEvent.sourceEventId,
              transactionId: sourceEvent.existingTransactionId,
              status: "duplicate"
            });
          }
          continue;
        }

        const insertResult = await client.query(
          `
          INSERT INTO transactions (
            business_id,
            workspace_id,
            account_id,
            external_ref,
            external_id,
            direction,
            amount_minor,
            currency_code,
            occurred_at,
            description,
            counterparty,
            status,
            source,
            source_provider,
            source_external_id,
            account_ref,
            metadata,
            row_hash,
            gst_applicable,
            gst_candidate,
            gst_rate,
            gst_amount
          )
          VALUES (
            $1,
            $2::uuid,
            $3::uuid,
            $4,
            $5,
            $6::txn_type,
            $7::numeric,
            $8::char(3),
            $9::timestamptz,
            $10,
            $11,
            'posted',
            $12,
            $13,
            $14,
            $15,
            $16::jsonb,
            $17,
            $18,
            $19,
            $20::numeric,
            $21::numeric
          )
          ON CONFLICT DO NOTHING
          RETURNING id::text
          `,
          [
            scope.businessId,
            scope.workspaceId,
            accountId,
            externalRef,
            externalRef,
            row.direction,
            row.amount,
            row.currencyCode,
            row.occurredAt,
            row.description,
            row.counterparty,
            provider,
            provider,
            externalRef,
            accountId,
            JSON.stringify({
              integration: {
                provider,
                providerLabel: integrationProviderLabel(provider),
                syncMode: "adapter_pull_v1",
                syncJobId: jobId,
                rowNumber: index + 1,
                adapterMetadata: pullResult.metadata ?? null
              }
            }),
            stableRowHash,
            row.gstApplicable,
            row.gstApplicable,
            row.gstRate,
            row.gstAmount
          ]
        );

        inserted += insertResult.rowCount ?? 0;

        const insertedTransactionId = parsePositiveId(insertResult.rows[0]?.id);
        const canonical = await upsertCanonicalRecord({
          client,
          record: {
            workspaceId: scope.workspaceId,
            businessId: scope.businessId,
            provider,
            entityKind: "transaction",
            externalId: externalRef,
            occurredAt: row.occurredAt,
            direction: row.direction,
            amount: row.amount,
            currencyCode: row.currencyCode,
            description: row.description,
            counterparty: row.counterparty,
            rawPayload: {
              provider,
              jobId,
              rowNumber: index + 1,
              ...row,
              pullMetadata: pullResult.metadata ?? null
            },
            normalizedPayload: {
              reference: externalRef,
              direction: row.direction,
              amount: row.amount,
              counterparty: row.counterparty,
              description: row.description
            },
            transactionId: insertedTransactionId,
            ingestionRunId: runIds.ingestionRunId
          }
        });

        if (sourceEvent.sourceEventId) {
          await finalizeSourceEvent({
            client,
            workspaceId: scope.workspaceId,
            sourceEventId: sourceEvent.sourceEventId,
            transactionId: insertedTransactionId ? BigInt(insertedTransactionId) : null,
            canonicalRecordId: canonical.canonicalId ? BigInt(canonical.canonicalId) : null,
            status: insertedTransactionId ? "processed" : "duplicate"
          });
        }
      }

      const rowsDeduped = Math.max(0, rows.length - inserted);
      const finishedAt = new Date().toISOString();
      const nextCursor =
        nextCursorFromProvider ??
        rows[rows.length - 1]?.externalTxnId ??
        previousCursor ??
        `${provider}:${jobId}:${rows.length}`;
      const successMeta = {
        lastSyncJobId: jobId,
        lastSyncStatus: "success",
        lastSyncTriggeredAt: triggeredAt.toISOString(),
        lastSyncFinishedAt: finishedAt,
        lastSyncRowsInserted: inserted,
        lastSyncRowsDeduped: rowsDeduped,
        mode: "adapter_pull_v1",
        lastCursor: nextCursor,
        comingSoon: "More providers and live connector auth are coming soon."
      };

      const updatedIntegration = await client.query(
        `
        UPDATE integrations
        SET
          status = 'connected',
          last_synced_at = NOW(),
          last_cursor = $3,
          backfill_status = 'completed',
          error_state = NULL,
          meta = COALESCE(meta, '{}'::jsonb) || $4::jsonb,
          updated_at = NOW()
        WHERE workspace_id = $1::uuid
          AND provider = $2
        RETURNING *
        `,
        [
          scope.workspaceId,
          provider,
          nextCursor,
          JSON.stringify(successMeta)
        ]
      );

      await upsertConnection({
        client,
        workspaceId: scope.workspaceId,
        provider,
        status: "connected",
        scopes: connectionScopes,
        metadata: {
          source: "api.integrations.sync",
          lastCursor: nextCursor,
          lastSyncedAt: finishedAt
        }
      });

      await client.query("COMMIT");

      await safeMarkSyncSuccess({
        client,
        workspaceId: scope.workspaceId,
        provider,
        jobId,
        runIds,
        rowsFetched: rows.length,
        rowsInserted: inserted,
        rowsDeduped,
        integrationStatus: "connected"
      });

      const outboxId = await safeEnqueueSyncOutbox({
        client,
        workspaceId: scope.workspaceId,
        provider,
        jobId,
        status: "success",
        payload: {
          rowsFetched: rows.length,
          rowsInserted: inserted,
          rowsDeduped,
          finishedAt
        }
      });

      await safeInsertDeliveryAttempt({
        client,
        workspaceId: scope.workspaceId,
        outboxId,
        channel: "dashboard",
        destination: provider,
        status: "success",
        payload: {
          kind: "integration.sync",
          provider,
          rowsInserted: inserted,
          rowsDeduped
        }
      });

      const nextDeltaAt = nextDeltaRunAt(1);
      const cursorResult = await upsertConnectorCursor({
        client,
        workspaceId: scope.workspaceId,
        provider,
        stream: "transactions",
        mode: "delta",
        status: "idle",
        cursor: nextCursor,
        lastRunAt: finishedAt,
        nextRunAt: nextDeltaAt,
        metadata: {
          source: "api.integrations.sync",
          completedBy: "adapter_pull_v1",
          rowsFetched: rows.length,
          rowsInserted: inserted,
          rowsDeduped
        }
      });

      const pipeline = await runLedgerPipelinePostIngest({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        runRules: true,
        runAlerts: true,
        sendWhatsAppDigest: false
      });

      const ledgerOutboxId = await enqueueNotificationOutbox({
        client,
        workspaceId: scope.workspaceId,
        eventType: "ledger.pipeline.completed",
        dedupeKey: `${provider}:${jobId}:ledger_pipeline`,
        payload: {
          provider,
          jobId,
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          rowsInserted: inserted,
          rowsDeduped,
          pipeline,
          nextDeltaAt
        }
      });

      await finishSyncRun({
        client,
        workspaceId: scope.workspaceId,
        syncRunId,
        status: "success",
        stats: {
          provider,
          rowsFetched: rows.length,
          rowsInserted: inserted,
          rowsDeduped,
          nextCursor,
          nextDeltaAt,
          jobId
        }
      });

      return NextResponse.json({
        message: "Integration synced",
        job: {
          id: jobId,
          provider,
          status: "success",
          rowsFetched: rows.length,
          rowsInserted: inserted,
          rowsDeduped
        },
        controlPlane: {
          jobRunId: runIds.jobRunId,
          ingestionRunId: runIds.ingestionRunId,
          outboxId,
          ledgerOutboxId,
          cursorId: cursorResult.cursorId
        },
        pipeline,
        integration: updatedIntegration.rows[0] ?? null
      });
    } catch (error) {
      await client.query("ROLLBACK");

      const failureMessage =
        error instanceof Error ? error.message : "Failed to run integration adapter sync";

      try {
        await client.query(
          `
          INSERT INTO integrations (
            workspace_id,
            provider,
            status,
            meta,
            backfill_status,
            error_state
          )
          VALUES ($1::uuid, $2, 'error', $3::jsonb, 'failed', $4)
          ON CONFLICT (workspace_id, provider)
          DO UPDATE
          SET
            status = 'error',
            backfill_status = 'failed',
            error_state = $4,
            meta = COALESCE(integrations.meta, '{}'::jsonb) || EXCLUDED.meta,
            updated_at = NOW()
          `,
          [
            scope.workspaceId,
            provider,
            JSON.stringify({
              lastSyncJobId: jobId,
              lastSyncStatus: "error",
              lastSyncTriggeredAt: triggeredAt.toISOString(),
              error: failureMessage
            }),
            failureMessage
          ]
        );
      } catch {
        // keep original failure
      }

      await upsertConnection({
        client,
        workspaceId: scope.workspaceId,
        provider,
        status: "error",
        scopes: connectionScopes,
        metadata: {
          source: "api.integrations.sync",
          error: failureMessage,
          failedAt: new Date().toISOString()
        }
      });

      await safeMarkSyncFailure({
        client,
        workspaceId: scope.workspaceId,
        provider,
        jobId,
        runIds,
        errorMessage: failureMessage
      });

      const outboxId = await safeEnqueueSyncOutbox({
        client,
        workspaceId: scope.workspaceId,
        provider,
        jobId,
        status: "failed",
        payload: {
          rowsFetched: rows.length,
          error: failureMessage
        }
      });

      await safeInsertDeliveryAttempt({
        client,
        workspaceId: scope.workspaceId,
        outboxId,
        channel: "dashboard",
        destination: provider,
        status: "failed",
        error: failureMessage,
        payload: {
          kind: "integration.sync",
          provider,
          error: failureMessage
        }
      });

      await upsertConnectorCursor({
        client,
        workspaceId: scope.workspaceId,
        provider,
        stream: "transactions",
        mode: syncMode,
        status: "error",
        lastRunAt: triggeredAt.toISOString(),
        nextRunAt: nextDeltaRunAt(1),
        error: failureMessage,
        metadata: {
          source: "api.integrations.sync",
          jobId
        }
      });

      await finishSyncRun({
        client,
        workspaceId: scope.workspaceId,
        syncRunId,
        status: "failed",
        error: failureMessage,
        stats: {
          provider,
          rowsFetched: rows.length,
          jobId
        }
      });

      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to trigger integration sync";
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
