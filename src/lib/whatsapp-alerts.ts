import { createHash } from "node:crypto";
import { getDbPool } from "@/lib/db";

const ALERT_DIGEST_TYPES = [
  "gst_due",
  "itc_mismatch",
  "refund_spike",
  "reconciliation_gap",
  "cash_runway_risk",
  "sync_failure",
  "anomaly_detected"
] as const;

const DEFAULT_COOLDOWN_HOURS = 6;
const DEFAULT_MAX_ALERT_LINES = 5;

type IntegrationRow = {
  id: string;
  status: string;
  meta: unknown;
};

type AlertRow = {
  id: string;
  type: string;
  severity: string;
  title: string | null;
  body: string | null;
  message: string;
  created_at: string;
};

type IntegrationMeta = Record<string, unknown>;

export type WhatsAppDigestResult =
  | {
      status: "skipped";
      reason: string;
      alertCount: number;
      preview: string;
    }
  | {
      status: "sent";
      reason: string;
      alertCount: number;
      destination: string;
      preview: string;
      webhook: string;
    }
  | {
      status: "failed";
      reason: string;
      alertCount: number;
      preview: string;
      error: string;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toIsoNow(): string {
  return new Date().toISOString();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (/^\d{8,15}$/.test(digits)) {
      return `+${digits}`;
    }
    return null;
  }

  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}

function resolveDestination(meta: IntegrationMeta | null): string | null {
  if (!meta) {
    return null;
  }

  const candidates = [
    meta.alertPhone,
    meta.recipientPhone,
    meta.phone,
    meta.to,
    meta.recipient,
    meta.recipientNumber,
    meta.mobile
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const normalized = normalizePhone(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function resolveWebhook(meta: IntegrationMeta | null): string | null {
  const candidates = [
    meta && typeof meta.alertWebhookUrl === "string" ? meta.alertWebhookUrl : null,
    meta && typeof meta.whatsappWebhookUrl === "string" ? meta.whatsappWebhookUrl : null,
    meta && typeof meta.webhookUrl === "string" ? meta.webhookUrl : null,
    process.env.WHATSAPP_ALERT_WEBHOOK_URL ?? null
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const trimmed = candidate.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
  }

  return null;
}

function readCooldownHours(meta: IntegrationMeta | null): number {
  const envParsed = toNumber(process.env.WHATSAPP_ALERT_COOLDOWN_HOURS);
  if (envParsed !== null && envParsed >= 0) {
    return envParsed;
  }

  if (meta) {
    const metaParsed = toNumber(meta.alertCooldownHours);
    if (metaParsed !== null && metaParsed >= 0) {
      return metaParsed;
    }
  }

  return DEFAULT_COOLDOWN_HOURS;
}

function readProactiveEnabled(meta: IntegrationMeta | null): boolean {
  if (!meta) {
    return true;
  }

  const value = meta.proactiveEnabled;
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return true;
}

function shouldSuppressByCooldown(params: {
  meta: IntegrationMeta | null;
  digestHash: string;
  now: Date;
}): boolean {
  const { meta } = params;
  if (!meta) {
    return false;
  }

  const lastDigest =
    typeof meta.lastAlertDigestHash === "string" ? meta.lastAlertDigestHash : null;
  const lastSentRaw =
    typeof meta.lastAlertSentAt === "string" ? meta.lastAlertSentAt : null;

  if (!lastDigest || !lastSentRaw) {
    return false;
  }

  if (lastDigest !== params.digestHash) {
    return false;
  }

  const lastSent = new Date(lastSentRaw);
  if (!Number.isFinite(lastSent.getTime())) {
    return false;
  }

  const cooldownMs = readCooldownHours(meta) * 60 * 60 * 1000;
  if (cooldownMs <= 0) {
    return false;
  }

  return params.now.getTime() - lastSent.getTime() < cooldownMs;
}

function severityRank(value: string): number {
  const normalized = value.toLowerCase();
  if (normalized === "critical") {
    return 0;
  }
  if (normalized === "warning") {
    return 1;
  }
  return 2;
}

function composeMessage(params: {
  alerts: AlertRow[];
  workspaceId: string;
  businessId: number;
  appBaseUrl?: string | null;
}): { message: string; preview: string; digestHash: string } {
  const topAlerts = [...params.alerts]
    .sort((a, b) => {
      const bySeverity = severityRank(a.severity) - severityRank(b.severity);
      if (bySeverity !== 0) {
        return bySeverity;
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    })
    .slice(0, DEFAULT_MAX_ALERT_LINES);

  const headerTime = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  });

  const lines = topAlerts.map((alert, index) => {
    const title = escapeLine(alert.title ?? alert.message);
    return `${index + 1}. [${alert.severity.toUpperCase()}] ${title}`;
  });

  const appBase = (params.appBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const dashboardUrl =
    appBase.startsWith("http://") || appBase.startsWith("https://")
      ? `${appBase.replace(/\/+$/, "")}/app/ledger?workspaceId=${encodeURIComponent(
          params.workspaceId
        )}&panel=issues`
      : null;

  const parts = [
    `LEV Alert Digest (${headerTime})`,
    `Workspace: ${params.workspaceId}`,
    `Open critical issues: ${params.alerts.length}`,
    ...lines
  ];

  if (dashboardUrl) {
    parts.push(`Review now: ${dashboardUrl}`);
  }

  const message = parts.join("\n");
  const preview = lines[0] ?? "No alert headline";

  const digestPayload = params.alerts.map((alert) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title ?? alert.message
  }));

  const digestHash = createHash("sha256")
    .update(JSON.stringify(digestPayload))
    .digest("hex");

  return { message, preview, digestHash };
}

async function patchIntegrationMeta(params: {
  workspaceId: string;
  patch: Record<string, unknown>;
}): Promise<void> {
  const db = getDbPool();
  await db.query(
    `
    UPDATE integrations
    SET
      meta = COALESCE(meta, '{}'::jsonb) || $2::jsonb,
      updated_at = NOW()
    WHERE workspace_id = $1::uuid
      AND provider = 'whatsapp'
    `,
    [params.workspaceId, JSON.stringify(params.patch)]
  );
}

export async function sendProactiveWhatsAppAlertDigest(params: {
  workspaceId: string;
  businessId: number;
  appBaseUrl?: string;
}): Promise<WhatsAppDigestResult> {
  const db = getDbPool();
  const now = new Date();

  const integrationResult = await db.query<IntegrationRow>(
    `
    SELECT
      id::text,
      status,
      meta
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND provider = 'whatsapp'
    LIMIT 1
    `,
    [params.workspaceId]
  );
  const integration = integrationResult.rows[0];
  const integrationMeta = asRecord(integration?.meta) ?? null;

  if (!integration) {
    return {
      status: "skipped",
      reason: "whatsapp_integration_not_connected",
      alertCount: 0,
      preview: "No WhatsApp integration row for workspace"
    };
  }

  if ((integration.status ?? "").toLowerCase() !== "connected") {
    return {
      status: "skipped",
      reason: "whatsapp_integration_not_connected",
      alertCount: 0,
      preview: "WhatsApp integration status is not connected"
    };
  }

  if (!readProactiveEnabled(integrationMeta)) {
    return {
      status: "skipped",
      reason: "proactive_digest_disabled",
      alertCount: 0,
      preview: "Proactive WhatsApp digest is disabled for this workspace"
    };
  }

  const destination = resolveDestination(integrationMeta);
  if (!destination) {
    return {
      status: "skipped",
      reason: "whatsapp_destination_missing",
      alertCount: 0,
      preview: "Configure recipient phone in integration meta"
    };
  }

  const alertsResult = await db.query<AlertRow>(
    `
    SELECT
      id::text,
      type,
      severity,
      title,
      body,
      message,
      created_at::text
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND type = ANY($2::text[])
    ORDER BY created_at DESC, id DESC
    LIMIT 25
    `,
    [params.workspaceId, ALERT_DIGEST_TYPES]
  );

  if (alertsResult.rows.length === 0) {
    return {
      status: "skipped",
      reason: "no_open_alerts",
      alertCount: 0,
      preview: "No open proactive alerts to notify"
    };
  }

  const { message, preview, digestHash } = composeMessage({
    alerts: alertsResult.rows,
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    appBaseUrl: params.appBaseUrl ?? null
  });

  if (
    shouldSuppressByCooldown({
      meta: integrationMeta,
      digestHash,
      now
    })
  ) {
    return {
      status: "skipped",
      reason: "cooldown_active_same_digest",
      alertCount: alertsResult.rows.length,
      preview
    };
  }

  const webhook = resolveWebhook(integrationMeta);
  if (!webhook) {
    return {
      status: "skipped",
      reason: "whatsapp_webhook_missing",
      alertCount: alertsResult.rows.length,
      preview
    };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "whatsapp",
        source: "alert_engine_v0",
        workspaceId: params.workspaceId,
        businessId: params.businessId,
        to: destination,
        message,
        alerts: alertsResult.rows.map((alert) => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title ?? alert.message
        })),
        sentAt: toIsoNow()
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const error = `Webhook responded ${response.status}${body ? `: ${body}` : ""}`;

      await patchIntegrationMeta({
        workspaceId: params.workspaceId,
        patch: {
          lastAlertSendStatus: "error",
          lastAlertSendAt: toIsoNow(),
          lastAlertSendError: error
        }
      });

      return {
        status: "failed",
        reason: "whatsapp_webhook_error",
        alertCount: alertsResult.rows.length,
        preview,
        error
      };
    }

    await patchIntegrationMeta({
      workspaceId: params.workspaceId,
      patch: {
        lastAlertDigestHash: digestHash,
        lastAlertSentAt: toIsoNow(),
        lastAlertSendStatus: "sent",
        lastAlertDestination: destination,
        lastAlertPreview: preview,
        proactiveMode: "daily_digest_v1"
      }
    });

    return {
      status: "sent",
      reason: "sent",
      alertCount: alertsResult.rows.length,
      destination,
      preview,
      webhook
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown WhatsApp webhook error";

    await patchIntegrationMeta({
      workspaceId: params.workspaceId,
      patch: {
        lastAlertSendStatus: "error",
        lastAlertSendAt: toIsoNow(),
        lastAlertSendError: message
      }
    });

    return {
      status: "failed",
      reason: "whatsapp_webhook_error",
      alertCount: alertsResult.rows.length,
      preview,
      error: message
    };
  }
}
