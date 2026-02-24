import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalText
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  nextDeltaRunAt,
  upsertConnection,
  upsertConnectorCursor,
  upsertConnectorToken
} from "@/lib/connector-sync-engine";
import { getDbPool } from "@/lib/db";
import {
  INTEGRATION_PROVIDERS,
  integrationProviderLabel,
  isIntegrationProviderId
} from "@/lib/integration-catalog";
import { getProviderAdapter } from "@/lib/connectors/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskCredentialToken(token: string): string {
  const trimmed = token.trim();
  if (trimmed.length <= 6) {
    return "••••••";
  }

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-2)}`;
}

function normalizePhone(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned) {
    return undefined;
  }

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (/^\d{8,15}$/.test(digits)) {
      return `+${digits}`;
    }
    return undefined;
  }

  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return undefined;
}

function toOptionalHttpUrl(value: string | undefined, fieldName: string): string | undefined {
  if (!value) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use http or https`);
  }

  return value;
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
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });
    const providerRaw = toOptionalText(payload.provider)?.toLowerCase();

    if (!providerRaw || !isIntegrationProviderId(providerRaw)) {
      return badRequest(
        `provider must be one of: ${INTEGRATION_PROVIDERS.map((provider) => provider.id).join(", ")}`
      );
    }

    const provider = providerRaw;
    const providerAdapter = getProviderAdapter(provider);
    const providedCredentialToken =
      toOptionalText(payload.credentialToken) ?? toOptionalText(payload.token);
    const credentialTokenInput = providedCredentialToken ?? "coming_soon_placeholder";
    const accountLabel = toOptionalText(payload.accountLabel) ?? integrationProviderLabel(provider);
    const defaultScopes =
      provider === "whatsapp"
        ? ["messages:write", "contacts:read"]
        : ["transactions:read", "balances:read"];
    const authorization = await providerAdapter.authorize(
      {
        token: providedCredentialToken,
        scopesHint: defaultScopes,
        accountLabel
      },
      {
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        provider
      }
    );
    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.reason ?? "Provider authorization failed" },
        { status: 400 }
      );
    }

    const health = await providerAdapter.healthcheck({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      provider
    });
    const grantedScopes = authorization.scopes.length > 0 ? authorization.scopes : defaultScopes;
    const metaPatch: Record<string, unknown> = {
      mode: "guided_connect_v1",
      credentialsConfigured: true,
      credentialTokenPlaceholder: maskCredentialToken(credentialTokenInput),
      accountLabel,
      providerLabel: integrationProviderLabel(provider),
      providerAdapter: providerAdapter.provider,
      adapterHealth: health,
      grantedScopes,
      trustLayer: {
        access: "read_only",
        movesMoney: false,
        revokeAnytime: true,
        auditLogged: true
      },
      connectedAt: new Date().toISOString(),
      comingSoon: "More integrations and live auth flows are coming soon."
    };

    if (provider === "whatsapp") {
      const alertPhoneInput =
        toOptionalText(payload.alertPhone) ??
        toOptionalText(payload.recipientPhone) ??
        toOptionalText(payload.phone) ??
        toOptionalText(payload.to);
      const alertPhone = normalizePhone(alertPhoneInput);
      if (alertPhoneInput && !alertPhone) {
        return badRequest("alertPhone must be a valid phone number with country code");
      }

      const alertWebhookInput =
        toOptionalText(payload.alertWebhookUrl) ??
        toOptionalText(payload.whatsappWebhookUrl) ??
        toOptionalText(payload.webhookUrl);
      const alertWebhookUrl = toOptionalHttpUrl(alertWebhookInput, "alertWebhookUrl");

      const alertCooldownHours = toOptionalNumber(
        payload.alertCooldownHours ?? payload.cooldownHours,
        "alertCooldownHours"
      );
      if (
        alertCooldownHours !== undefined &&
        (alertCooldownHours < 0 || alertCooldownHours > 168)
      ) {
        return badRequest("alertCooldownHours must be between 0 and 168");
      }

      const proactiveEnabled = toOptionalBoolean(
        payload.proactiveEnabled ?? payload.sendWhatsAppDigest,
        "proactiveEnabled"
      );

      metaPatch.mode = "guided_connect_whatsapp_v1";
      metaPatch.proactiveMode = "daily_digest_v1";
      metaPatch.comingSoon =
        "Richer WhatsApp templates and more channels are coming soon.";

      if (alertPhone) {
        metaPatch.alertPhone = alertPhone;
      }
      if (alertWebhookUrl) {
        metaPatch.alertWebhookUrl = alertWebhookUrl;
      }
      if (alertCooldownHours !== undefined) {
        metaPatch.alertCooldownHours = alertCooldownHours;
      }
      if (proactiveEnabled !== undefined) {
        metaPatch.proactiveEnabled = proactiveEnabled;
      }

      const setupHints: string[] = [];
      if (!alertPhone) {
        setupHints.push("Add alertPhone to receive proactive WhatsApp digests.");
      }
      if (!alertWebhookUrl && !process.env.WHATSAPP_ALERT_WEBHOOK_URL) {
        setupHints.push(
          "Add alertWebhookUrl or set WHATSAPP_ALERT_WEBHOOK_URL for delivery."
        );
      }

      if (setupHints.length > 0) {
        metaPatch.setupHints = setupHints;
      }
    }

    const tokenVaultResult = providedCredentialToken
      ? await upsertConnectorToken({
          workspaceId: scope.workspaceId,
          provider,
          token: providedCredentialToken,
          scopes: grantedScopes,
          metadata: {
            source: "api.integrations.connect",
            providerLabel: integrationProviderLabel(provider),
            adapter: providerAdapter.provider
          }
        })
      : {
          stored: false,
          tokenHash: "",
          tokenHint: maskCredentialToken(credentialTokenInput),
          tokenId: null
        };

    const connectionResult = await upsertConnection({
      workspaceId: scope.workspaceId,
      provider,
      status: "connected",
      scopes: grantedScopes,
      secretsRef: tokenVaultResult.tokenId
        ? `connector_tokens:${tokenVaultResult.tokenId}`
        : null,
      metadata: {
        source: "api.integrations.connect",
        providerLabel: integrationProviderLabel(provider),
        adapter: providerAdapter.provider,
        adapterHealth: health
      }
    });

    const db = getDbPool();
    const result = await db.query(
      `
      INSERT INTO integrations (
        workspace_id,
        provider,
        status,
        meta,
        last_cursor,
        backfill_status,
        error_state
      )
      VALUES ($1::uuid, $2, 'connected', $3::jsonb, NULL, 'pending', NULL)
      ON CONFLICT (workspace_id, provider)
      DO UPDATE
      SET
        status = 'connected',
        meta = COALESCE(integrations.meta, '{}'::jsonb) || EXCLUDED.meta,
        error_state = NULL,
        backfill_status = CASE
          WHEN integrations.backfill_status = 'completed' THEN 'completed'
          ELSE 'pending'
        END,
        updated_at = NOW()
      RETURNING *
      `,
      [scope.workspaceId, provider, JSON.stringify(metaPatch)]
    );

    const cursorResult = await upsertConnectorCursor({
      workspaceId: scope.workspaceId,
      provider,
      stream: "transactions",
      mode: "initial_backfill",
      status: "queued",
      nextRunAt: new Date().toISOString(),
      metadata: {
        source: "api.integrations.connect",
        syncPlan: "backfill_then_delta",
        nextDeltaAt: nextDeltaRunAt(1)
      }
    });

    return NextResponse.json(
      {
        message: "Integration connected",
        integration: result.rows[0],
        connectorPlatform: {
          tokenVault: {
            stored: tokenVaultResult.stored,
            tokenId: tokenVaultResult.tokenId,
            tokenHint: tokenVaultResult.tokenHint
          },
          cursor: {
            stored: cursorResult.stored,
            cursorId: cursorResult.cursorId,
            mode: "initial_backfill"
          },
          connection: {
            stored: connectionResult.stored,
            connectionId: connectionResult.connectionId
          },
          adapter: {
            provider: providerAdapter.provider,
            grantedScopes,
            health
          },
          trustLayer: {
            access: "Read-only access",
            movesMoney: "Trail never moves money",
            revoke: "Revoke anytime",
            auditTrail: "Every Trail change is audit-logged"
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect integration";
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
