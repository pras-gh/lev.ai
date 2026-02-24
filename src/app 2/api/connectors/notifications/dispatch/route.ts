import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutboxRow = {
  id: string;
  workspace_id: string;
  event_type: string;
  dedupe_key: string;
  payload: Record<string, unknown>;
  attempt_count: string;
};

type ChannelTarget = {
  channel: "dashboard" | "whatsapp" | "email" | "webhook";
  destination: string | null;
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

function isSystemAuthorized(request: NextRequest): boolean {
  const expected = [
    process.env.CONNECTOR_SYNC_KEY,
    process.env.CRON_SECRET,
    process.env.ALERT_ENGINE_KEY
  ]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);

  if (expected.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  const supplied = [
    readBearerToken(request.headers.get("authorization")),
    request.headers.get("x-connector-sync-key")?.trim() ?? null,
    request.headers.get("x-alert-engine-key")?.trim() ?? null,
    request.nextUrl.searchParams.get("key")?.trim() ?? null
  ].filter((value): value is string => Boolean(value));

  return supplied.some((value) => expected.includes(value));
}

function toPositiveInt(raw: string | null, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

async function resolveChannelTargets(workspaceId: string): Promise<ChannelTarget[]> {
  const db = getDbPool();
  const result = await db.query<{
    provider: string;
    status: string;
    meta: Record<string, unknown> | null;
  }>(
    `
    SELECT provider, status, meta
    FROM integrations
    WHERE workspace_id = $1::uuid
      AND status IN ('connected', 'syncing')
    `,
    [workspaceId]
  );

  const channels: ChannelTarget[] = [{ channel: "dashboard", destination: workspaceId }];

  for (const row of result.rows) {
    const meta = row.meta ?? {};

    if (row.provider === "whatsapp") {
      const destination =
        typeof meta.alertPhone === "string" && meta.alertPhone.trim()
          ? meta.alertPhone.trim()
          : null;
      channels.push({ channel: "whatsapp", destination });
      continue;
    }

    if (row.provider === "zohobooks") {
      channels.push({ channel: "email", destination: "finance@workspace.local" });
      continue;
    }
  }

  return channels;
}

export async function POST(request: NextRequest) {
  if (!isSystemAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = toPositiveInt(request.nextUrl.searchParams.get("limit"), 25);
  const db = getDbPool();

  const client = await db.connect();
  try {
    const outboxResult = await client.query<OutboxRow>(
      `
      SELECT
        id::text,
        workspace_id::text,
        event_type,
        dedupe_key,
        payload,
        attempt_count::text
      FROM event_outbox
      WHERE status IN ('pending', 'failed')
        AND available_at <= NOW()
      ORDER BY available_at ASC, id ASC
      LIMIT $1
      `,
      [Math.min(limit, 100)]
    );

    if (!outboxResult.rows.length) {
      return NextResponse.json({ picked: 0, sent: 0, failed: 0, message: "No pending events" });
    }

    let sent = 0;
    let failed = 0;

    for (const row of outboxResult.rows) {
      const eventId = Number.parseInt(row.id, 10);
      const attemptCount = Number.parseInt(row.attempt_count, 10) || 0;

      await client.query(
        `
        UPDATE event_outbox
        SET
          status = 'processing',
          attempt_count = attempt_count + 1,
          last_attempt_at = NOW(),
          updated_at = NOW()
        WHERE id = $1::bigint
        `,
        [eventId]
      );

      try {
        const channels = await resolveChannelTargets(row.workspace_id);

        for (const channel of channels) {
          await client.query(
            `
            INSERT INTO delivery_attempts (
              workspace_id,
              outbox_id,
              channel,
              destination,
              status,
              payload,
              attempted_at
            )
            VALUES (
              $1::uuid,
              $2::bigint,
              $3,
              $4,
              'success',
              $5::jsonb,
              NOW()
            )
            `,
            [
              row.workspace_id,
              eventId,
              channel.channel,
              channel.destination,
              JSON.stringify({
                eventType: row.event_type,
                dedupeKey: row.dedupe_key,
                channel: channel.channel,
                destination: channel.destination,
                payload: row.payload
              })
            ]
          );
        }

        await client.query(
          `
          UPDATE event_outbox
          SET
            status = 'sent',
            last_error = NULL,
            updated_at = NOW()
          WHERE id = $1::bigint
          `,
          [eventId]
        );

        sent += 1;
      } catch (error) {
        failed += 1;

        const message = error instanceof Error ? error.message : "Delivery failed";

        await client.query(
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
            'dashboard',
            $3,
            'failed',
            $4,
            $5::jsonb,
            NOW()
          )
          `,
          [
            row.workspace_id,
            eventId,
            row.workspace_id,
            message,
            JSON.stringify({
              eventType: row.event_type,
              dedupeKey: row.dedupe_key,
              attempt: attemptCount + 1
            })
          ]
        );

        const nextRetryMinutes = Math.min(60, Math.max(5, (attemptCount + 1) * 5));

        await client.query(
          `
          UPDATE event_outbox
          SET
            status = CASE WHEN attempt_count >= 5 THEN 'dead_letter' ELSE 'failed' END,
            available_at = NOW() + ($2::text || ' minutes')::interval,
            last_error = $3,
            updated_at = NOW()
          WHERE id = $1::bigint
          `,
          [eventId, String(nextRetryMinutes), message]
        );
      }
    }

    return NextResponse.json({
      picked: outboxResult.rows.length,
      sent,
      failed,
      generatedAt: new Date().toISOString()
    });
  } finally {
    client.release();
  }
}
