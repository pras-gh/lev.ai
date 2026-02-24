import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalNumber,
  toOptionalPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CandidateRow = {
  id: string;
  occurred_at: string;
  amount_minor: string;
  counterparty: string | null;
  description: string | null;
  external_ref: string | null;
};

type Suggestion = {
  leftId: number;
  rightId: number;
  score: number;
  dateDiffDays: number;
  merchantSimilarity: number;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...setA, ...setB]).size;
  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

function toDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function toAmount(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.abs(parsed);
}

function daysDiff(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60 * 24);
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
    const limit = toOptionalPositiveInt(payload.limit, "limit") ?? 600;
    const maxDateWindowDays = toOptionalNumber(payload.maxDateWindowDays, "maxDateWindowDays") ?? 3;
    const confidenceThreshold =
      toOptionalNumber(payload.confidenceThreshold, "confidenceThreshold") ?? 0.6;

    if (!Number.isInteger(limit) || limit <= 0 || limit > 2000) {
      return badRequest("limit must be an integer between 1 and 2000");
    }

    if (maxDateWindowDays <= 0 || maxDateWindowDays > 30) {
      return badRequest("maxDateWindowDays must be between 1 and 30");
    }

    if (confidenceThreshold < 0 || confidenceThreshold > 1) {
      return badRequest("confidenceThreshold must be between 0 and 1");
    }

    const db = getDbPool();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const candidatesResult = await client.query<CandidateRow>(
        `
        SELECT
          id::text,
          occurred_at::text,
          amount_minor::text,
          counterparty,
          description,
          external_ref
        FROM transactions
        WHERE workspace_id = $1::uuid
          AND is_hidden = FALSE
          AND matched = FALSE
          AND status IN ('posted', 'reversed')
        ORDER BY occurred_at DESC, id DESC
        LIMIT $2
        FOR UPDATE
        `,
        [scope.workspaceId, limit]
      );

      const rows = candidatesResult.rows
        .map((row) => {
          const id = Number.parseInt(row.id, 10);
          const date = toDate(row.occurred_at);
          const amount = toAmount(row.amount_minor);
          const merchantText = normalizeText(
            [row.counterparty, row.description, row.external_ref].filter(Boolean).join(" ")
          );

          if (!Number.isInteger(id) || id <= 0 || !date || amount === null) {
            return null;
          }

          return {
            id,
            date,
            amount,
            merchantTokens: tokenize(merchantText)
          };
        })
        .filter(
          (
            row
          ): row is { id: number; date: Date; amount: number; merchantTokens: string[] } =>
            Boolean(row)
        );

      const suggestions: Suggestion[] = [];

      for (let i = 0; i < rows.length; i += 1) {
        const left = rows[i];

        for (let j = i + 1; j < rows.length; j += 1) {
          const right = rows[j];

          if (Math.abs(left.amount - right.amount) > 0.0001) {
            continue;
          }

          const dateDiff = daysDiff(left.date, right.date);
          if (dateDiff > maxDateWindowDays) {
            continue;
          }

          const merchantSimilarity = jaccard(left.merchantTokens, right.merchantTokens);
          if (merchantSimilarity <= 0) {
            continue;
          }

          const dateScore = Math.max(0, 1 - dateDiff / maxDateWindowDays);
          const score = Number((0.5 + dateScore * 0.2 + merchantSimilarity * 0.3).toFixed(4));

          if (score < confidenceThreshold) {
            continue;
          }

          suggestions.push({
            leftId: left.id,
            rightId: right.id,
            score,
            dateDiffDays: Number(dateDiff.toFixed(3)),
            merchantSimilarity: Number(merchantSimilarity.toFixed(4))
          });
        }
      }

      suggestions.sort((a, b) => b.score - a.score);
      const used = new Set<number>();
      const selected: Suggestion[] = [];

      for (const suggestion of suggestions) {
        if (used.has(suggestion.leftId) || used.has(suggestion.rightId)) {
          continue;
        }

        selected.push(suggestion);
        used.add(suggestion.leftId);
        used.add(suggestion.rightId);
      }

      const touchedIds = rows.map((row) => row.id);
      const suggestedIds = new Set<number>();
      for (const suggestion of selected) {
        suggestedIds.add(suggestion.leftId);
        suggestedIds.add(suggestion.rightId);
      }

      const nowIso = new Date().toISOString();
      let updatedRows = 0;

      for (const suggestion of selected) {
        const groupId = randomUUID();

        const leftUpdate = await client.query(
          `
          UPDATE transactions
          SET
            confidence = $3::numeric,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{reconciliationSuggestion}',
              $4::jsonb,
              true
            ),
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
            AND matched = FALSE
            AND is_hidden = FALSE
          `,
          [
            scope.workspaceId,
            suggestion.leftId,
            suggestion.score,
            JSON.stringify({
              candidateTransactionId: suggestion.rightId,
              score: suggestion.score,
              dateDiffDays: suggestion.dateDiffDays,
              merchantSimilarity: suggestion.merchantSimilarity,
              method: "amount_date_merchant_v1",
              suggestedGroupId: groupId,
              generatedAt: nowIso
            })
          ]
        );
        updatedRows += leftUpdate.rowCount ?? 0;

        const rightUpdate = await client.query(
          `
          UPDATE transactions
          SET
            confidence = $3::numeric,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{reconciliationSuggestion}',
              $4::jsonb,
              true
            ),
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = $2::bigint
            AND matched = FALSE
            AND is_hidden = FALSE
          `,
          [
            scope.workspaceId,
            suggestion.rightId,
            suggestion.score,
            JSON.stringify({
              candidateTransactionId: suggestion.leftId,
              score: suggestion.score,
              dateDiffDays: suggestion.dateDiffDays,
              merchantSimilarity: suggestion.merchantSimilarity,
              method: "amount_date_merchant_v1",
              suggestedGroupId: groupId,
              generatedAt: nowIso
            })
          ]
        );
        updatedRows += rightUpdate.rowCount ?? 0;
      }

      const staleIds = touchedIds.filter((id) => !suggestedIds.has(id));
      let clearedRows = 0;
      if (staleIds.length > 0) {
        const staleResult = await client.query(
          `
          UPDATE transactions
          SET
            confidence = NULL,
            metadata = COALESCE(metadata, '{}'::jsonb) - 'reconciliationSuggestion',
            updated_at = NOW()
          WHERE workspace_id = $1::uuid
            AND id = ANY($2::bigint[])
            AND matched = FALSE
            AND is_hidden = FALSE
            AND (
              confidence IS NOT NULL
              OR COALESCE(metadata, '{}'::jsonb) ? 'reconciliationSuggestion'
            )
          `,
          [scope.workspaceId, staleIds]
        );
        clearedRows = staleResult.rowCount ?? 0;
      }

      const coverageResult = await client.query<{ total: string; matched: string }>(
        `
        SELECT
          COUNT(*) FILTER (WHERE is_hidden = FALSE AND status <> 'pending')::text AS total,
          COUNT(*) FILTER (WHERE is_hidden = FALSE AND status <> 'pending' AND matched = TRUE)::text AS matched
        FROM transactions
        WHERE workspace_id = $1::uuid
        `,
        [scope.workspaceId]
      );
      const total = Number(coverageResult.rows[0]?.total ?? "0");
      const matched = Number(coverageResult.rows[0]?.matched ?? "0");
      const reconMatchPct = total > 0 ? (matched / total) * 100 : 100;

      await writeAuditLogSafe(
        {
          workspaceId: scope.workspaceId,
          businessId: scope.businessId,
          actorType: "system",
          actorId: "trail_reconciliation_v1",
          entityType: "reconciliation",
          entityId: `suggest:${Date.now()}`,
          action: "trail.reconciliation.suggestions.generated",
          beforeState: {
            scanned: rows.length,
            threshold: confidenceThreshold
          },
          afterState: {
            suggestions: selected.length,
            updatedRows,
            clearedRows,
            reconMatchPct: Number(reconMatchPct.toFixed(2)),
            confidenceThreshold,
            method: "amount_date_merchant_v1",
            evidence: {
              transactionIds: [...suggestedIds],
              pairs: selected.slice(0, 50).map((item) => ({
                transactionIds: [item.leftId, item.rightId],
                confidence: item.score,
                merchantSimilarity: item.merchantSimilarity,
                dateDiffDays: item.dateDiffDays
              }))
            }
          }
        },
        client
      );

      await client.query("COMMIT");

      return NextResponse.json({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        scanned: rows.length,
        suggestions: selected.length,
        updatedRows,
        clearedRows,
        recon_match_pct: Number(reconMatchPct.toFixed(2))
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate reconciliation suggestions";
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
