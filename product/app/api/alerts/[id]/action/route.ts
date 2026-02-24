import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalText,
  toPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type DuplicateAlertRow = {
  id: string;
  business_id: string;
  type: string;
  status: string;
  transaction_id: string | null;
  related_transaction_ids: unknown;
};

type AlertAction = "merge" | "ignore" | "resolve" | "snooze" | "reopen";

function parseRelatedTransactionIds(raw: unknown): number[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((value) => Number.parseInt(String(value), 10))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => Number.parseInt(String(value), 10))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function parseAction(raw: unknown): AlertAction | null {
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (
    normalized === "merge" ||
    normalized === "ignore" ||
    normalized === "resolve" ||
    normalized === "snooze" ||
    normalized === "reopen"
  ) {
    return normalized;
  }

  return null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body !== null && typeof body !== "object") {
    return badRequest("Body must be a JSON object");
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const action = parseAction(payload.action);

  if (!action) {
    return badRequest("action must be one of: merge, ignore, resolve, snooze, reopen");
  }

  try {
    const { id } = await params;
    const alertId = toPositiveInt(id, "id");
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });
    const note = toOptionalText(payload.note);
    const keepTransactionIdRaw = payload.keepTransactionId;
    const keepTransactionId =
      keepTransactionIdRaw === undefined || keepTransactionIdRaw === null
        ? undefined
        : toPositiveInt(keepTransactionIdRaw, "keepTransactionId");

    const db = getDbPool();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const alertResult = await client.query<DuplicateAlertRow>(
        `
        SELECT
          id::text,
          business_id::text,
          type,
          status,
          transaction_id::text,
          related_transaction_ids
        FROM alerts
        WHERE id = $1
          AND workspace_id = $2::uuid
        LIMIT 1
        FOR UPDATE
        `,
        [alertId, scope.workspaceId]
      );

      const alert = alertResult.rows[0];
      if (!alert) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }

      if (action === "resolve" || action === "snooze" || action === "reopen") {
        const nextStatus = action === "resolve" ? "resolved" : action === "snooze" ? "snoozed" : "open";
        const resolutionPayload = {
          workflowAction: {
            action,
            note: note ?? null
          }
        };
        const values: Array<number | string> = [
          alertId,
          scope.workspaceId,
          nextStatus,
          JSON.stringify(resolutionPayload)
        ];
        let noteExpression = "";

        if (note) {
          values.push(note);
          noteExpression = `, body = CONCAT(COALESCE(body, message, ''), E'\n\nWorkflow note: ', $5::text)`;
        }

        const result = await client.query(
          `
          UPDATE alerts
          SET
            status = $3,
            resolved_at = CASE WHEN $3 = 'resolved' THEN NOW() ELSE NULL END,
            payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
            ${noteExpression}
          WHERE id = $1
            AND workspace_id = $2::uuid
          RETURNING *
          `,
          values
        );

        await client.query("COMMIT");
        return NextResponse.json({
          action,
          status: nextStatus,
          alert: result.rows[0] ?? null
        });
      }

      if (alert.type !== "duplicate") {
        await client.query("ROLLBACK");
        return badRequest("merge/ignore action is only supported for duplicate alerts");
      }

      if (alert.status === "resolved") {
        await client.query("COMMIT");
        return NextResponse.json({
          action,
          alertId,
          message: "Alert is already resolved"
        });
      }

      const relatedIds = [
        ...(alert.transaction_id ? [Number.parseInt(alert.transaction_id, 10)] : []),
        ...parseRelatedTransactionIds(alert.related_transaction_ids)
      ].filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

      if (action === "merge") {
        const keepId = keepTransactionId ?? relatedIds[0];
        if (!keepId) {
          await client.query("ROLLBACK");
          return badRequest("No transaction IDs found on this duplicate alert");
        }

        if (keepTransactionId !== undefined && !relatedIds.includes(keepTransactionId)) {
          await client.query("ROLLBACK");
          return badRequest("keepTransactionId must be part of related_transaction_ids");
        }

        const mergeIds = relatedIds.filter((txnId) => txnId !== keepId);
        let hiddenTransactions = 0;

        if (mergeIds.length > 0) {
          const hiddenResult = await client.query(
            `
            UPDATE transactions
            SET
              is_hidden = TRUE,
              hidden_at = COALESCE(hidden_at, NOW()),
              hidden_reason = COALESCE(hidden_reason, $3),
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{duplicateMergedInto}',
                to_jsonb($4::bigint),
                true
              ),
              updated_at = NOW()
            WHERE workspace_id = $1::uuid
              AND id = ANY($2::bigint[])
              AND is_hidden = FALSE
            `,
            [
              scope.workspaceId,
              mergeIds,
              "Merged as duplicate via auto-clean suggestion",
              keepId
            ]
          );
          hiddenTransactions = hiddenResult.rowCount ?? 0;
        }

        const resolutionPayload = {
          resolution: {
            action: "merge",
            keepTransactionId: keepId,
            mergedTransactionIds: mergeIds,
            note: note ?? null
          }
        };

        const values: Array<number | string> = [alertId, scope.workspaceId, JSON.stringify(resolutionPayload)];
        let noteExpression = "";

        if (note) {
          values.push(note);
          noteExpression = `, body = CONCAT(COALESCE(body, message, ''), E'\n\nResolution note: ', $4::text)`;
        }

        const resolvedAlertResult = await client.query(
          `
          UPDATE alerts
          SET
            status = 'resolved',
            resolved_at = NOW(),
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
            ${noteExpression}
          WHERE id = $1
            AND workspace_id = $2::uuid
          RETURNING *
          `,
          values
        );

        const overlapIds = relatedIds.length > 0 ? relatedIds : [keepId];
        const siblingsResolved = await client.query(
          `
          UPDATE alerts
          SET
            status = 'resolved',
            resolved_at = NOW(),
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          WHERE workspace_id = $1::uuid
            AND id <> $2
            AND type = 'duplicate'
            AND status = 'open'
            AND (
              transaction_id = ANY($4::bigint[])
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(COALESCE(related_transaction_ids, '[]'::jsonb)) related(value)
                WHERE related.value::bigint = ANY($4::bigint[])
              )
            )
          `,
          [
            scope.workspaceId,
            alertId,
            JSON.stringify({
              resolution: {
                action: "merge",
                reason: "resolved by overlapping duplicate merge"
              }
            }),
            overlapIds
          ]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          action: "merge",
          keepTransactionId: keepId,
          mergedTransactionIds: mergeIds,
          hiddenTransactions,
          resolvedSiblingAlerts: siblingsResolved.rowCount ?? 0,
          alert: resolvedAlertResult.rows[0] ?? null
        });
      }

      const ignorePayload = {
        resolution: {
          action: "ignore",
          note: note ?? null
        }
      };
      const values: Array<number | string> = [alertId, scope.workspaceId, JSON.stringify(ignorePayload)];
      let noteExpression = "";

      if (note) {
        values.push(note);
        noteExpression = `, body = CONCAT(COALESCE(body, message, ''), E'\n\nResolution note: ', $4::text)`;
      }

      const result = await client.query(
        `
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          ${noteExpression}
        WHERE id = $1
          AND workspace_id = $2::uuid
        RETURNING *
        `,
        values
      );

      await client.query("COMMIT");

      return NextResponse.json({
        action: "ignore",
        alert: result.rows[0] ?? null
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process alert action";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
