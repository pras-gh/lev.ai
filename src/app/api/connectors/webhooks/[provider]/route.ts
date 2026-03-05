import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams,
  resolveScope,
  toOptionalText
} from "@/lib/api-utils";
import {
  buildWebhookDedupeKey,
  ensureIntegrationSourceAccount,
  enqueueConnectorWebhookEvent,
  enqueueNotificationOutbox,
  finalizeSourceEvent,
  finishSyncRun,
  nextDeltaRunAt,
  runLedgerPipelinePostIngest,
  startSyncRun,
  upsertConnection,
  upsertSourceEvent,
  updateConnectorWebhookEventStatus,
  upsertCanonicalRecord,
  upsertConnectorCursor
} from "@/lib/connector-sync-engine";
import { getDbPool } from "@/lib/db";
import {
  INTEGRATION_PROVIDERS,
  integrationProviderLabel,
  isIntegrationProviderId,
  type IntegrationProviderId
} from "@/lib/integration-catalog";
import { getProviderAdapter } from "@/lib/connectors/registry";
import { normalizeCanonicalTransaction } from "@/lib/transaction-normalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ provider: string }>;
};

type InboundWebhookPayload = {
  id?: string;
  eventId?: string;
  type?: string;
  eventType?: string;
  timestamp?: string;
  occurredAt?: string;
  externalRef?: string;
  reference?: string;
  direction?: string;
  amount?: number | string;
  currency?: string;
  description?: string;
  counterparty?: string;
  merchant?: string;
  [key: string]: unknown;
};

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

function isWebhookAuthorized(request: NextRequest): boolean {
  const expected = (process.env.CONNECTOR_WEBHOOK_SECRET ?? process.env.CRON_SECRET ?? "").trim();

  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const supplied = [
    readBearerToken(request.headers.get("authorization")),
    request.headers.get("x-connector-webhook-key")?.trim() ?? null,
    request.nextUrl.searchParams.get("key")?.trim() ?? null
  ].filter((value): value is string => Boolean(value));

  return supplied.includes(expected);
}

function timingSafeHexEqual(leftHex: string, rightHex: string): boolean {
  try {
    const left = Buffer.from(leftHex.trim(), "hex");
    const right = Buffer.from(rightHex.trim(), "hex");

    if (left.length === 0 || right.length === 0 || left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

type ProviderSignatureCheck = {
  required: boolean;
  verified: boolean;
  scheme: string | null;
  reason?: string;
};

function verifyRazorpaySignature(request: NextRequest, rawBody: string): ProviderSignatureCheck {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) {
    return {
      required: false,
      verified: false,
      scheme: "razorpay_hmac_sha256"
    };
  }

  const signature = request.headers.get("x-razorpay-signature")?.trim() ?? "";
  if (!signature) {
    return {
      required: true,
      verified: false,
      scheme: "razorpay_hmac_sha256",
      reason: "Missing x-razorpay-signature header"
    };
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const verified = timingSafeHexEqual(signature, expected);
  return {
    required: true,
    verified,
    scheme: "razorpay_hmac_sha256",
    reason: verified ? undefined : "Invalid Razorpay webhook signature"
  };
}

function verifyStripeSignature(request: NextRequest, rawBody: string): ProviderSignatureCheck {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) {
    return {
      required: false,
      verified: false,
      scheme: "stripe_hmac_sha256"
    };
  }

  const signatureHeader = request.headers.get("stripe-signature")?.trim() ?? "";
  if (!signatureHeader) {
    return {
      required: true,
      verified: false,
      scheme: "stripe_hmac_sha256",
      reason: "Missing stripe-signature header"
    };
  }

  const parts = signatureHeader
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestampPart || signatureParts.length === 0) {
    return {
      required: true,
      verified: false,
      scheme: "stripe_hmac_sha256",
      reason: "Malformed stripe-signature header"
    };
  }

  const timestamp = timestampPart.slice(2);
  const toleranceSeconds = Number.parseInt(
    process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS?.trim() ?? "300",
    10
  );

  if (Number.isInteger(toleranceSeconds) && toleranceSeconds > 0) {
    const timestampSeconds = Number.parseInt(timestamp, 10);
    if (Number.isInteger(timestampSeconds)) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) {
        return {
          required: true,
          verified: false,
          scheme: "stripe_hmac_sha256",
          reason: "Stripe signature timestamp outside tolerance window"
        };
      }
    }
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const verified = signatureParts.some((candidate) => timingSafeHexEqual(candidate, expected));

  return {
    required: true,
    verified,
    scheme: "stripe_hmac_sha256",
    reason: verified ? undefined : "Invalid Stripe webhook signature"
  };
}

function verifyProviderWebhookSignature(params: {
  request: NextRequest;
  provider: IntegrationProviderId;
  rawBody: string;
}): ProviderSignatureCheck {
  if (params.provider === "razorpay") {
    return verifyRazorpaySignature(params.request, params.rawBody);
  }

  if (params.provider === "stripe") {
    return verifyStripeSignature(params.request, params.rawBody);
  }

  return {
    required: false,
    verified: false,
    scheme: null
  };
}

function computeFallbackEventId(provider: string, payload: InboundWebhookPayload): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider,
        payload
      })
    )
    .digest("hex");
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return badRequest("Invalid JSON body");
  }

  let body: unknown;
  try {
    body = rawBody ? (JSON.parse(rawBody) as unknown) : {};
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Body must be a JSON object");
  }

  const payload = body as InboundWebhookPayload;
  const { provider: providerParam } = await params;
  const providerNormalized = providerParam.trim().toLowerCase();

  if (!isIntegrationProviderId(providerNormalized)) {
    return badRequest(
      `provider must be one of: ${INTEGRATION_PROVIDERS.map((provider) => provider.id).join(", ")}`
    );
  }

  const provider = providerNormalized as IntegrationProviderId;
  const signatureCheck = verifyProviderWebhookSignature({
    request,
    provider,
    rawBody
  });
  const genericAuthorized = isWebhookAuthorized(request);

  if (signatureCheck.required && !signatureCheck.verified) {
    return NextResponse.json(
      {
        error: signatureCheck.reason ?? "Invalid provider webhook signature",
        provider,
        signature: {
          required: signatureCheck.required,
          verified: signatureCheck.verified,
          scheme: signatureCheck.scheme
        }
      },
      { status: 401 }
    );
  }

  if (!signatureCheck.required && !genericAuthorized) {
    return NextResponse.json({ error: "Unauthorized webhook call" }, { status: 401 });
  }

  try {
    const scopeFromBody = readScopeFromBody(payload as Record<string, unknown>);
    const scopeFromQuery = readScopeFromSearchParams(request.nextUrl.searchParams);

    const scope = await resolveScope(
      {
        workspaceId: scopeFromBody.workspaceId ?? scopeFromQuery.workspaceId,
        businessId: scopeFromBody.businessId ?? scopeFromQuery.businessId
      },
      undefined,
      { allowWorkspaceAutocreate: false }
    );

    const providerAdapter = getProviderAdapter(provider);
    const adapterContext = {
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      provider
    } as const;
    const adapterWebhook = await providerAdapter.webhook_handler(
      { request, payload: payload as Record<string, unknown> },
      adapterContext
    );
    const normalizedRows = await providerAdapter.normalize(
      adapterWebhook.transactions,
      adapterContext
    );
    const webhookRows =
      normalizedRows.length > 0 ? normalizedRows : adapterWebhook.transactions;

    if (webhookRows.length === 0) {
      return NextResponse.json(
        {
          message: "Webhook received but no canonical transactions were emitted",
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          provider,
          eventId: adapterWebhook.eventId
        },
        { status: 202 }
      );
    }

    const primaryRow = webhookRows[0];
    const standard = normalizeCanonicalTransaction({
      workspaceId: scope.workspaceId,
      source: provider,
      row: primaryRow
    });
    const eventId =
      adapterWebhook.eventId?.trim() ||
      toOptionalText(payload.eventId) ||
      toOptionalText(payload.id) ||
      request.headers.get("x-event-id")?.trim() ||
      computeFallbackEventId(provider, payload);
    const eventType =
      adapterWebhook.eventType?.trim() ||
      toOptionalText(payload.eventType) ||
      toOptionalText(payload.type) ||
      "transaction.created";
    const direction = standard.type;
    const amount = standard.amount;
    const currencyCode = standard.currency_code;
    const description = standard.description;
    const counterparty = standard.counterparty;
    const occurredAt = standard.date;
    const externalRef = standard.external_id ?? primaryRow.externalTxnId;
    const connectionScopes =
      provider === "whatsapp"
        ? ["messages:write", "contacts:read"]
        : ["transactions:read", "balances:read"];

    const db = getDbPool();
    const client = await db.connect();
    const connection = await upsertConnection({
      client,
      workspaceId: scope.workspaceId,
      provider,
      status: "syncing",
      scopes: connectionScopes,
      metadata: {
        source: "api.connectors.webhooks",
        eventType,
        eventId,
        adapter: providerAdapter.provider
      }
    });

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

    const syncRunId = await startSyncRun({
      client,
      workspaceId: scope.workspaceId,
      connectionId: connection.connectionId,
      type: "webhook",
      stats: {
        provider,
        eventId,
        eventType,
        transactionCount: webhookRows.length
      }
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
        { error: "Unable to resolve provider account for webhook idempotency model" },
        { status: 500 }
      );
    }

    const webhookIngress = await enqueueConnectorWebhookEvent({
      client,
      workspaceId: scope.workspaceId,
      provider,
      eventId,
      eventType,
      occurredAt,
      payload,
      metadata: {
        source: "api.connectors.webhooks",
        providerLabel: integrationProviderLabel(provider),
        adapter: providerAdapter.provider,
        adapterMetadata: adapterWebhook.metadata ?? null,
        transactionCount: webhookRows.length,
        signature: {
          required: signatureCheck.required,
          verified: signatureCheck.required ? true : genericAuthorized,
          scheme: signatureCheck.scheme
        }
      }
    });

    if (webhookIngress.duplicate) {
      await finishSyncRun({
        client,
        workspaceId: scope.workspaceId,
        syncRunId,
        status: "cancelled",
        stats: {
          provider,
          eventId,
          duplicateWebhookEvent: true
        }
      });
      client.release();
      return NextResponse.json(
        {
          message: "Duplicate webhook ignored",
          workspaceId: scope.workspaceId,
          provider,
          eventId,
          duplicate: true
        },
        { status: 202 }
      );
    }

    let insertedTransactionId: number | null = null;

    try {
      await client.query("BEGIN");

      const sourceEvent = await upsertSourceEvent({
        client,
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        connectionId: connection.connectionId,
        source: provider,
        accountId,
        externalTxnId: externalRef,
        eventType,
        payload: {
          raw: payload,
          adapter: {
            provider: providerAdapter.provider,
            metadata: adapterWebhook.metadata ?? null
          },
          canonical: primaryRow
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

        await updateConnectorWebhookEventStatus({
          client,
          workspaceId: scope.workspaceId,
          webhookEventId: webhookIngress.webhookEventId ?? 0,
          status: "ignored"
        });

        await upsertConnection({
          client,
          workspaceId: scope.workspaceId,
          provider,
          status: "connected",
          scopes: connectionScopes,
          metadata: {
            source: "api.connectors.webhooks",
            duplicateSourceEvent: true,
            eventId,
            adapter: providerAdapter.provider
          }
        });

        await finishSyncRun({
          client,
          workspaceId: scope.workspaceId,
          syncRunId,
          status: "partial",
          stats: {
            provider,
            eventId,
            duplicateSourceEvent: true
          }
        });

        await client.query("COMMIT");
        return NextResponse.json(
          {
            message: "Duplicate source event ignored",
            workspaceId: scope.workspaceId,
            provider,
            eventId,
            duplicate: true
          },
          { status: 202 }
        );
      }

      const insertResult = await client.query<{ id: string }>(
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
          gst_candidate
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
          FALSE,
          FALSE
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
          direction,
          amount,
          currencyCode,
          occurredAt,
          description,
          counterparty,
          standard.source,
          provider,
          externalRef,
          accountId,
          JSON.stringify({
            standard_transaction_schema: {
              workspace_id: standard.workspace_id,
              date: standard.date,
              description: standard.description,
              amount: standard.amount,
              type: standard.type,
              category: standard.category,
              source: standard.source,
              created_at: standard.created_at
            },
            integration: {
              provider,
              providerLabel: integrationProviderLabel(provider),
              source: "webhook",
              eventId,
              eventType,
              adapter: providerAdapter.provider,
              adapterMetadata: adapterWebhook.metadata ?? null,
              signature: {
                required: signatureCheck.required,
                verified: signatureCheck.required ? true : genericAuthorized,
                scheme: signatureCheck.scheme
              }
            }
          }),
          buildWebhookDedupeKey({
            provider,
            workspaceId: scope.workspaceId,
            eventId,
            externalId: externalRef
          })
        ]
      );

      insertedTransactionId = insertResult.rows[0]?.id
        ? Number.parseInt(insertResult.rows[0].id, 10)
        : null;

      const canonical = await upsertCanonicalRecord({
        client,
        record: {
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          provider,
          entityKind: "transaction",
          externalId: externalRef,
          occurredAt,
          direction,
          amount,
          currencyCode,
          description,
          counterparty,
          rawPayload: {
            payload,
            canonical: primaryRow,
            adapter: {
              provider: providerAdapter.provider,
              metadata: adapterWebhook.metadata ?? null
            }
          },
          normalizedPayload: {
            standard_transaction_schema: {
              workspace_id: standard.workspace_id,
              date: standard.date,
              description: standard.description,
              amount: standard.amount,
              type: standard.type,
              category: standard.category,
              source: standard.source,
              created_at: standard.created_at
            },
            eventId,
            eventType,
            direction,
            amount,
            counterparty,
            description,
            externalRef,
            adapter: providerAdapter.provider
          },
          transactionId: insertedTransactionId,
          ingestionRunId: null
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

      await upsertConnectorCursor({
        client,
        workspaceId: scope.workspaceId,
        provider,
        stream: "transactions",
        mode: "webhook_replay",
        status: "idle",
        cursor: eventId,
        lastRunAt: new Date().toISOString(),
        nextRunAt: nextDeltaRunAt(1),
        metadata: {
          source: "api.connectors.webhooks",
          eventType,
          eventId,
          adapter: providerAdapter.provider
        }
      });

      await client.query(
        `
        INSERT INTO integrations (
          workspace_id,
          provider,
          status,
          last_synced_at,
          last_cursor,
          backfill_status,
          error_state,
          meta
        )
        VALUES (
          $1::uuid,
          $2,
          'connected',
          NOW(),
          $3,
          'completed',
          NULL,
          $4::jsonb
        )
        ON CONFLICT (workspace_id, provider)
        DO UPDATE
        SET
          status = 'connected',
          last_synced_at = NOW(),
          last_cursor = EXCLUDED.last_cursor,
          backfill_status = 'completed',
          error_state = NULL,
          meta = COALESCE(integrations.meta, '{}'::jsonb) || EXCLUDED.meta,
          updated_at = NOW()
        `,
        [
          scope.workspaceId,
          provider,
          eventId,
          JSON.stringify({
            lastWebhookEventId: eventId,
            lastWebhookEventType: eventType,
            lastWebhookProcessedAt: new Date().toISOString(),
            adapter: providerAdapter.provider
          })
        ]
      );

      const outboxId = await enqueueNotificationOutbox({
        client,
        workspaceId: scope.workspaceId,
        eventType: "connector.webhook.processed",
        dedupeKey: `${provider}:${eventId}`,
        payload: {
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          provider,
          eventId,
          eventType,
          transactionId: insertedTransactionId,
          inserted: Boolean(insertedTransactionId)
        }
      });

      await updateConnectorWebhookEventStatus({
        client,
        workspaceId: scope.workspaceId,
        webhookEventId: webhookIngress.webhookEventId ?? 0,
        status: "processed"
      });

      await upsertConnection({
        client,
        workspaceId: scope.workspaceId,
        provider,
        status: "connected",
        scopes: connectionScopes,
        metadata: {
          source: "api.connectors.webhooks",
          lastEventId: eventId,
          lastEventType: eventType,
          lastProcessedAt: new Date().toISOString(),
          adapter: providerAdapter.provider
        }
      });

      await finishSyncRun({
        client,
        workspaceId: scope.workspaceId,
        syncRunId,
        status: "success",
        stats: {
          provider,
          eventId,
          eventType,
          insertedTransactionId,
          outboxId
        }
      });

      await client.query("COMMIT");

      const pipeline = await runLedgerPipelinePostIngest({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        runRules: true,
        runAlerts: true,
        sendWhatsAppDigest: false
      });

      return NextResponse.json({
        message: "Webhook processed",
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        provider,
        eventId,
        eventType,
        insertedTransactionId,
        outboxId,
        pipeline
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (webhookIngress.webhookEventId) {
        await updateConnectorWebhookEventStatus({
          client,
          workspaceId: scope.workspaceId,
          webhookEventId: webhookIngress.webhookEventId,
          status: "failed",
          error: error instanceof Error ? error.message : "Webhook processing failed"
        });
      }

      await upsertConnection({
        client,
        workspaceId: scope.workspaceId,
        provider,
        status: "error",
        scopes: connectionScopes,
        metadata: {
          source: "api.connectors.webhooks",
          failedEventId: eventId,
          failedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Webhook processing failed",
          adapter: providerAdapter.provider
        }
      });

      await finishSyncRun({
        client,
        workspaceId: scope.workspaceId,
        syncRunId,
        status: "failed",
        error: error instanceof Error ? error.message : "Webhook processing failed",
        stats: {
          provider,
          eventId,
          eventType
        }
      });

      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process webhook";
    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("must be") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  return NextResponse.json({
    ok: true,
    provider,
    hint: "POST JSON payload to this endpoint with workspaceId (or businessId).",
    auth: "Use provider signature for Razorpay/Stripe (when configured), otherwise use x-connector-webhook-key or Bearer token.",
    providerSignature: {
      razorpay: "x-razorpay-signature (HMAC SHA256 of raw body with RAZORPAY_WEBHOOK_SECRET)",
      stripe:
        "stripe-signature (HMAC SHA256 v1 over `${timestamp}.${rawBody}` with STRIPE_WEBHOOK_SECRET)"
    },
    example: {
      workspaceId: request.nextUrl.searchParams.get("workspaceId") ?? "<workspace-uuid>",
      eventId: randomUUID(),
      eventType: "transaction.created",
      direction: "credit",
      amount: 1000,
      currency: "INR",
      description: "Webhook transaction",
      counterparty: "API Source"
    }
  });
}
