import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalNumber,
  toOptionalPositiveInt,
  toOptionalText,
  toOptionalUuid,
  toPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import { writeAuditLogSafe, type AuditActorType } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BatchAction = "categorize" | "match" | "resolve" | "split";

function hasOwn(payload: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseTransactionIds(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("transactionIds must be a non-empty array");
  }

  const unique = new Set<number>();
  for (const id of raw) {
    unique.add(toPositiveInt(id, "transactionIds[]"));
  }

  if (unique.size > 500) {
    throw new Error("transactionIds cannot contain more than 500 ids in one batch");
  }

  return [...unique];
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
    const action = String(payload.action ?? "").trim().toLowerCase() as BatchAction;
    const transactionIds = parseTransactionIds(payload.transactionIds);
    const note = toOptionalText(payload.note);
    const actorTypeRaw =
      typeof payload.actorType === "string" ? payload.actorType.trim().toLowerCase() : "";
    const actorType: AuditActorType =
      actorTypeRaw === "system" ||
      actorTypeRaw === "user" ||
      actorTypeRaw === "api_key" ||
      actorTypeRaw === "job"
        ? actorTypeRaw
        : "user";
    const actorId =
      typeof payload.actorId === "string" && payload.actorId.trim().length > 0
        ? payload.actorId.trim()
        : scope.userId ?? null;
    const db = getDbPool();

    if (action === "categorize") {
      const categoryId = hasOwn(payload, "categoryId")
        ? payload.categoryId === null
          ? null
          : toOptionalPositiveInt(payload.categoryId, "categoryId")
        : undefined;

      if (categoryId === undefined) {
        return badRequest("categoryId is required for action=categorize");
      }

      if (categoryId !== null) {
        const categoryCheck = await db.query<{ id: string }>(
          `
          SELECT id::text
          FROM categories
          WHERE id = $1
            AND workspace_id = $2::uuid
          LIMIT 1
          `,
          [categoryId, scope.workspaceId]
        );

        if (!categoryCheck.rows[0]) {
          return badRequest("categoryId does not belong to this workspace");
        }
      }

      const values: Array<number | string | null | number[]> = [
        categoryId,
        scope.workspaceId,
        transactionIds
      ];
      const noteExpression = note
        ? `, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{batchNote}', to_jsonb($4::text), true)`
        : "";

      if (note) {
        values.push(note);
      }

      const updated = await db.query(
        `
        UPDATE transactions
        SET
          category_id = $1,
          updated_at = NOW()
          ${noteExpression}
        WHERE workspace_id = $2::uuid
          AND id = ANY($3::bigint[])
          AND is_hidden = FALSE
        `,
        values
      );

      await writeAuditLogSafe(
        {
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          actorType,
          actorId,
          entityType: "transaction_batch",
          entityId: `categorize:${Date.now()}`,
          action: "trail.batch.categorize",
          beforeState: {
            categoryIdBefore: "mixed",
            affectedTransactionIds: transactionIds
          },
          afterState: {
            categoryId,
            updatedCount: updated.rowCount ?? 0,
            note: note ?? null,
            evidence: {
              transactionIds,
              source: "api.transactions.batch"
            }
          }
        },
        db
      );

      return NextResponse.json({
        action,
        transactionIds,
        updatedCount: updated.rowCount ?? 0
      });
    }

    if (action === "match") {
      const confidenceProvided = hasOwn(payload, "confidence");
      const confidence = confidenceProvided
        ? payload.confidence === null
          ? null
          : toOptionalNumber(payload.confidence, "confidence")
        : undefined;
      const matchGroupId =
        toOptionalUuid(payload.matchGroupId, "matchGroupId") ?? randomUUID();

      if (confidence !== undefined && confidence !== null && (confidence < 0 || confidence > 1)) {
        return badRequest("confidence must be between 0 and 1");
      }

      const values: Array<string | number | number[] | null> = [
        matchGroupId,
        scope.workspaceId,
        transactionIds
      ];
      let updateConfidence = "";
      let noteExpression = "";

      if (confidenceProvided) {
        values.push(confidence ?? null);
        updateConfidence = `, confidence = $${values.length}`;
      }

      if (note) {
        values.push(note);
        noteExpression = `, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{batchNote}', to_jsonb($${values.length}::text), true)`;
      }

      const updated = await db.query(
        `
        UPDATE transactions
        SET
          matched = TRUE,
          match_group_id = $1::uuid
          ${updateConfidence}
          ${noteExpression},
          updated_at = NOW()
        WHERE workspace_id = $2::uuid
          AND id = ANY($3::bigint[])
          AND is_hidden = FALSE
        `,
        values
      );

      await writeAuditLogSafe(
        {
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          actorType,
          actorId,
          entityType: "transaction_batch",
          entityId: `match:${matchGroupId}`,
          action: "trail.batch.match",
          beforeState: {
            matchedBefore: false,
            affectedTransactionIds: transactionIds
          },
          afterState: {
            matched: true,
            matchGroupId,
            confidence: confidence ?? null,
            updatedCount: updated.rowCount ?? 0,
            note: note ?? null,
            evidence: {
              transactionIds,
              source: "api.transactions.batch"
            }
          }
        },
        db
      );

      return NextResponse.json({
        action,
        transactionIds,
        matchGroupId,
        updatedCount: updated.rowCount ?? 0
      });
    }

    if (action === "resolve") {
      const values: Array<string | number[] | string> = [scope.workspaceId, transactionIds];

      const transactionsResolved = await db.query(
        `
        UPDATE transactions
        SET
          matched = TRUE,
          updated_at = NOW()
        WHERE workspace_id = $1::uuid
          AND id = ANY($2::bigint[])
          AND is_hidden = FALSE
        `,
        values
      );

      let noteExpression = "";
      if (note) {
        values.push(note);
        noteExpression = `, body = CONCAT(COALESCE(body, message, ''), E'\n\nResolved note: ', $3::text)`;
      }

      const alertsResolved = await db.query(
        `
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW()
          ${noteExpression}
        WHERE workspace_id = $1::uuid
          AND status <> 'resolved'
          AND transaction_id = ANY($2::bigint[])
        `,
        values
      );

      await writeAuditLogSafe(
        {
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          actorType,
          actorId,
          entityType: "transaction_batch",
          entityId: `resolve:${Date.now()}`,
          action: "trail.batch.resolve",
          beforeState: {
            unresolvedAlerts: true,
            affectedTransactionIds: transactionIds
          },
          afterState: {
            resolvedTransactions: transactionsResolved.rowCount ?? 0,
            resolvedAlerts: alertsResolved.rowCount ?? 0,
            note: note ?? null,
            evidence: {
              transactionIds,
              source: "api.transactions.batch"
            }
          }
        },
        db
      );

      return NextResponse.json({
        action,
        transactionIds,
        resolvedTransactions: transactionsResolved.rowCount ?? 0,
        resolvedAlerts: alertsResolved.rowCount ?? 0
      });
    }

    if (action === "split") {
      if (transactionIds.length !== 1) {
        return badRequest("action=split requires exactly one transaction id");
      }

      const splitRatio = toOptionalNumber(payload.splitRatio, "splitRatio") ?? 0.5;
      if (splitRatio <= 0 || splitRatio >= 1) {
        return badRequest("splitRatio must be > 0 and < 1");
      }

      const noteText = note ?? "Split transaction";
      const sourceId = transactionIds[0];
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        const sourceResult = await client.query<{
          id: number;
          business_id: number;
          workspace_id: string;
          category_id: number | null;
          external_ref: string | null;
          direction: "credit" | "debit";
          status: "pending" | "posted" | "reversed";
          amount_minor: string;
          currency_code: string;
          occurred_at: string;
          booked_at: string | null;
          description: string | null;
          counterparty: string | null;
          source: string;
          gst_applicable: boolean;
          gst_rate: string | null;
          gst_amount: string | null;
          metadata: Record<string, unknown> | null;
        }>(
          `
          SELECT
            id,
            business_id,
            workspace_id::text,
            category_id,
            external_ref,
            direction::text AS direction,
            status::text AS status,
            amount_minor::text,
            currency_code,
            occurred_at,
            booked_at,
            description,
            counterparty,
            source,
            gst_applicable,
            gst_rate::text,
            gst_amount::text,
            metadata
          FROM transactions
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
            AND is_hidden = FALSE
          LIMIT 1
          FOR UPDATE
          `,
          [scope.workspaceId, sourceId]
        );

        const source = sourceResult.rows[0];
        if (!source) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        if (source.status === "reversed") {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "Cannot split a reversed transaction" },
            { status: 409 }
          );
        }

        const totalAmount = Number(source.amount_minor);
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
          await client.query("ROLLBACK");
          return badRequest("Split source amount must be a positive number");
        }

        const firstAmount = Number((totalAmount * splitRatio).toFixed(2));
        const secondAmount = Number((totalAmount - firstAmount).toFixed(2));
        if (firstAmount <= 0 || secondAmount <= 0) {
          await client.query("ROLLBACK");
          return badRequest("Split ratio produced invalid amounts");
        }

        const metadataBase =
          source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
            ? source.metadata
            : {};
        const baseDescription =
          source.description?.trim() || source.counterparty?.trim() || `Transaction ${source.id}`;
        const baseGstAmount = Number(source.gst_amount ?? "0");
        const firstGstAmount =
          source.gst_amount === null ? null : Number((baseGstAmount * splitRatio).toFixed(2));
        const secondGstAmount =
          source.gst_amount === null ? null : Number((baseGstAmount - (firstGstAmount ?? 0)).toFixed(2));

        const firstInsert = await client.query<{ id: number }>(
          `
          INSERT INTO transactions (
            workspace_id,
            business_id,
            category_id,
            external_ref,
            direction,
            status,
            amount_minor,
            currency_code,
            occurred_at,
            booked_at,
            description,
            counterparty,
            source,
            gst_applicable,
            gst_rate,
            gst_amount,
            matched,
            match_group_id,
            confidence,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            $5::txn_type,
            $6::txn_status,
            $7::numeric(14,2),
            $8,
            $9::timestamptz,
            $10::timestamptz,
            $11,
            $12,
            $13,
            $14,
            $15::numeric(6,3),
            $16::numeric(14,2),
            FALSE,
            NULL,
            NULL,
            $17::jsonb
          )
          RETURNING id::int
          `,
          [
            source.workspace_id,
            source.business_id,
            source.category_id,
            source.external_ref,
            source.direction,
            source.status,
            firstAmount,
            source.currency_code,
            source.occurred_at,
            source.booked_at,
            `${baseDescription} (split 1/2)`,
            source.counterparty,
            source.source,
            source.gst_applicable,
            source.gst_rate,
            firstGstAmount,
            JSON.stringify({
              ...metadataBase,
              split: {
                sourceTransactionId: source.id,
                splitIndex: 1,
                splitRatio,
                note: noteText
              }
            })
          ]
        );

        const secondInsert = await client.query<{ id: number }>(
          `
          INSERT INTO transactions (
            workspace_id,
            business_id,
            category_id,
            external_ref,
            direction,
            status,
            amount_minor,
            currency_code,
            occurred_at,
            booked_at,
            description,
            counterparty,
            source,
            gst_applicable,
            gst_rate,
            gst_amount,
            matched,
            match_group_id,
            confidence,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            $5::txn_type,
            $6::txn_status,
            $7::numeric(14,2),
            $8,
            $9::timestamptz,
            $10::timestamptz,
            $11,
            $12,
            $13,
            $14,
            $15::numeric(6,3),
            $16::numeric(14,2),
            FALSE,
            NULL,
            NULL,
            $17::jsonb
          )
          RETURNING id::int
          `,
          [
            source.workspace_id,
            source.business_id,
            source.category_id,
            source.external_ref,
            source.direction,
            source.status,
            secondAmount,
            source.currency_code,
            source.occurred_at,
            source.booked_at,
            `${baseDescription} (split 2/2)`,
            source.counterparty,
            source.source,
            source.gst_applicable,
            source.gst_rate,
            secondGstAmount,
            JSON.stringify({
              ...metadataBase,
              split: {
                sourceTransactionId: source.id,
                splitIndex: 2,
                splitRatio: 1 - splitRatio,
                note: noteText
              }
            })
          ]
        );

        const createdTransactionIds = [
          firstInsert.rows[0]?.id ?? 0,
          secondInsert.rows[0]?.id ?? 0
        ].filter((id) => Number.isInteger(id) && id > 0);

        await client.query(
          `
          UPDATE transactions
          SET
            is_hidden = TRUE,
            hidden_reason = $3,
            hidden_at = NOW(),
            hidden_by = $4,
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
          `,
          [scope.workspaceId, sourceId, "Split into child transactions", scope.userId]
        );

        await client.query(
          `
          INSERT INTO audit_logs (
            workspace_id,
            business_id,
            actor_type,
            actor_id,
            entity_type,
            entity_id,
            action,
            after_state
          )
          VALUES
            ($1::uuid, $2, 'user', $3, 'transaction', $4, 'transaction.split', $5::jsonb),
            ($1::uuid, $2, 'user', $3, 'transaction', $6, 'transaction.split.child_created', $7::jsonb),
            ($1::uuid, $2, 'user', $3, 'transaction', $8, 'transaction.split.child_created', $9::jsonb)
          `,
          [
            scope.workspaceId,
            scope.businessId,
            scope.userId,
            String(sourceId),
            JSON.stringify({
              splitRatio,
              note: noteText,
              createdTransactionIds
            }),
            String(createdTransactionIds[0] ?? ""),
            JSON.stringify({
              sourceTransactionId: sourceId,
              amount: firstAmount
            }),
            String(createdTransactionIds[1] ?? ""),
            JSON.stringify({
              sourceTransactionId: sourceId,
              amount: secondAmount
            })
          ]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          action,
          transactionIds,
          split: {
            sourceTransactionId: sourceId,
            createdTransactionIds,
            splitRatio,
            note: noteText
          }
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    return badRequest("action must be one of: categorize, match, resolve, split");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process batch request";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found") ||
      message.includes("cannot contain") ||
      message.includes("non-empty") ||
      message.includes("requires exactly") ||
      message.includes("splitRatio")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
