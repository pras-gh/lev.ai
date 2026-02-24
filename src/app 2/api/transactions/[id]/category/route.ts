import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams,
  toOptionalPositiveInt,
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

function hasOwn(payload: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("not found")) {
    return 404;
  }

  if (
    message.includes("must be") ||
    message.includes("required") ||
    message.includes("Provide at least one scope identifier")
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  if (!hasOwn(payload, "categoryId")) {
    return badRequest("categoryId is required");
  }

  try {
    const { id } = await params;
    const transactionId = toPositiveInt(id, "id");
    const bodyScope = readScopeFromBody(payload);
    const queryScope = readScopeFromSearchParams(request.nextUrl.searchParams);
    const scope = await resolveAuthorizedScope({
      request,
      scope: {
        workspaceId: bodyScope.workspaceId ?? queryScope.workspaceId,
        businessId: bodyScope.businessId ?? queryScope.businessId
      }
    });
    const categoryId =
      payload.categoryId === null
        ? null
        : toOptionalPositiveInt(payload.categoryId, "categoryId");
    const note = toOptionalText(payload.note) ?? null;

    if (payload.categoryId !== null && categoryId === undefined) {
      return badRequest("categoryId must be a positive integer or null");
    }

    const db = getDbPool();
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      if (categoryId !== null) {
        const categoryCheck = await client.query<{ id: string }>(
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
          await client.query("ROLLBACK");
          return badRequest("categoryId does not belong to this workspace");
        }
      }

      const beforeResult = await client.query(
        `
        SELECT *
        FROM transactions
        WHERE id = $1
          AND workspace_id = $2::uuid
        LIMIT 1
        FOR UPDATE
        `,
        [transactionId, scope.workspaceId]
      );

      const before = beforeResult.rows[0];
      if (!before) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      const updateResult = await client.query(
        `
        UPDATE transactions
        SET
          category_id = $3,
          updated_at = NOW()
        WHERE id = $1
          AND workspace_id = $2::uuid
        RETURNING *
        `,
        [transactionId, scope.workspaceId, categoryId]
      );

      const transaction = updateResult.rows[0];
      if (!transaction) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      try {
        await client.query(
          `
          INSERT INTO transaction_categories (
            workspace_id,
            business_id,
            transaction_id,
            manual_category_id,
            final_category_id,
            is_manual_override,
            override_reason,
            metadata
          )
          VALUES (
            $1::uuid,
            $2,
            $3::bigint,
            $4,
            $4,
            $5,
            $6,
            $7::jsonb
          )
          ON CONFLICT (transaction_id)
          DO UPDATE
          SET
            manual_category_id = EXCLUDED.manual_category_id,
            final_category_id = EXCLUDED.final_category_id,
            is_manual_override = EXCLUDED.is_manual_override,
            override_reason = EXCLUDED.override_reason,
            metadata = COALESCE(transaction_categories.metadata, '{}'::jsonb) || EXCLUDED.metadata,
            updated_at = NOW()
          `,
          [
            scope.workspaceId,
            scope.businessId,
            transactionId,
            categoryId,
            categoryId !== null,
            note,
            JSON.stringify({
              source: "api.transactions.category.patch",
              updatedAt: new Date().toISOString()
            })
          ]
        );
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "")
            : "";
        if (code !== "42P01") {
          throw error;
        }
      }

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
          before_state,
          after_state
        )
        VALUES (
          $1::uuid,
          $2,
          'user',
          $3,
          'transaction',
          $4,
          'transaction.category.patch',
          $5::jsonb,
          $6::jsonb
        )
        `,
        [
          scope.workspaceId,
          scope.businessId,
          scope.userId,
          String(transactionId),
          JSON.stringify(before),
          JSON.stringify(transaction)
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        transaction,
        updated: {
          id: transactionId,
          categoryId
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update transaction category";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
