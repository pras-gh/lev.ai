import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalPositiveInt,
  toOptionalText,
  toPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import {
  createReversalTransaction,
  getTransactionById,
  setTransactionVisibility,
  type ActorType
} from "@/lib/transactions";

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
    message.includes("already reversed") ||
    message.includes("Only posted") ||
    message.includes("Cannot reverse")
  ) {
    return 409;
  }

  if (
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("Cannot") ||
    message.includes("Boolean") ||
    message.includes("Provide at least one scope identifier")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const transactionId = toPositiveInt(id, "id");
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true";
    const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "true";

    const transaction = await getTransactionById({
      transactionId,
      businessId: scope.businessId,
      workspaceId: scope.workspaceId,
      includeDeleted,
      includeHidden
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get transaction";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

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
    const transactionId = toPositiveInt(id, "id");
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });

    const actorType = payload.actorType as ActorType | undefined;
    const actorId = typeof payload.actorId === "string" ? payload.actorId : scope.userId;
    const actorTypeValue: ActorType =
      actorType === "system" ||
      actorType === "user" ||
      actorType === "api_key" ||
      actorType === "job"
        ? actorType
        : "user";

    if (payload.action === "reverse") {
      const reason = typeof payload.reason === "string" ? payload.reason : "";
      const markOriginalReversed =
        typeof payload.markOriginalReversed === "boolean"
          ? payload.markOriginalReversed
          : undefined;
      const occurredAt = typeof payload.occurredAt === "string" ? payload.occurredAt : undefined;
      const source = typeof payload.source === "string" ? payload.source : undefined;

      const result = await createReversalTransaction({
        transactionId,
        businessId: scope.businessId,
        workspaceId: scope.workspaceId,
        reason,
        actorType,
        actorId,
        markOriginalReversed,
        occurredAt,
        source
      });

      return NextResponse.json(result, { status: 201 });
    }

    if (payload.action === "hide") {
      const reason = typeof payload.reason === "string" ? payload.reason : "";

      const transaction = await setTransactionVisibility({
        transactionId,
        businessId: scope.businessId,
        workspaceId: scope.workspaceId,
        hidden: true,
        reason,
        actorType,
        actorId
      });

      return NextResponse.json({ transaction });
    }

    if (payload.action === "unhide") {
      const transaction = await setTransactionVisibility({
        transactionId,
        businessId: scope.businessId,
        workspaceId: scope.workspaceId,
        hidden: false,
        actorType,
        actorId
      });

      return NextResponse.json({ transaction });
    }

    const categoryProvided = hasOwn(payload, "categoryId");
    const gstApplicableProvided = hasOwn(payload, "gstApplicable");
    const gstRateProvided = hasOwn(payload, "gstRate");
    const gstAmountProvided = hasOwn(payload, "gstAmount");
    const notesProvided = hasOwn(payload, "notes");

    if (
      !categoryProvided &&
      !gstApplicableProvided &&
      !gstRateProvided &&
      !gstAmountProvided &&
      !notesProvided
    ) {
      return badRequest(
        "Unsupported PATCH payload. Use action=reverse|hide|unhide or provide categoryId/gstApplicable/gstRate/gstAmount/notes"
      );
    }

    const categoryId = categoryProvided
      ? payload.categoryId === null
        ? null
        : toOptionalPositiveInt(payload.categoryId, "categoryId")
      : undefined;
    const gstApplicable = gstApplicableProvided
      ? toOptionalBoolean(payload.gstApplicable, "gstApplicable")
      : undefined;
    const gstRate = gstRateProvided
      ? payload.gstRate === null
        ? null
        : toOptionalNumber(payload.gstRate, "gstRate")
      : undefined;
    const gstAmount = gstAmountProvided
      ? payload.gstAmount === null
        ? null
        : toOptionalNumber(payload.gstAmount, "gstAmount")
      : undefined;
    const notes = notesProvided
      ? payload.notes === null
        ? null
        : toOptionalText(payload.notes)
      : undefined;

    if (notesProvided && payload.notes !== null && typeof payload.notes !== "string") {
      return badRequest("notes must be a string or null");
    }

    if (gstApplicableProvided && gstApplicable === undefined) {
      return badRequest("gstApplicable must be true or false");
    }

    if (gstRate !== undefined && gstRate !== null && gstRate < 0) {
      return badRequest("gstRate cannot be negative");
    }

    if (gstAmount !== undefined && gstAmount !== null && gstAmount < 0) {
      return badRequest("gstAmount cannot be negative");
    }

    const db = getDbPool();
    const beforeResult = await db.query(
      `
      SELECT *
      FROM transactions
      WHERE id = $1
        AND workspace_id = $2::uuid
      LIMIT 1
      `,
      [transactionId, scope.workspaceId]
    );
    const beforeState = beforeResult.rows[0];
    if (!beforeState) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (categoryProvided && categoryId !== null && categoryId !== undefined) {
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

    const setClauses: string[] = [];
    const values: Array<number | string | boolean | null> = [transactionId, scope.workspaceId];
    let index = 3;

    if (categoryProvided) {
      values.push(categoryId ?? null);
      setClauses.push(`category_id = $${index}`);
      index += 1;
    }

    if (gstApplicableProvided) {
      values.push(gstApplicable ?? false);
      setClauses.push(`gst_applicable = $${index}`);
      index += 1;
    }

    if (gstRateProvided) {
      values.push(gstRate ?? null);
      setClauses.push(`gst_rate = $${index}`);
      index += 1;
    }

    if (gstAmountProvided) {
      values.push(gstAmount ?? null);
      setClauses.push(`gst_amount = $${index}`);
      index += 1;
    }

    if (notesProvided) {
      if (notes === null || notes === undefined) {
        setClauses.push("metadata = COALESCE(metadata, '{}'::jsonb) - 'notes'");
      } else {
        values.push(notes);
        setClauses.push(
          `metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{notes}', to_jsonb($${index}::text), true)`
        );
        index += 1;
      }
    }

    setClauses.push("updated_at = NOW()");

    const result = await db.query(
      `
      UPDATE transactions
      SET ${setClauses.join(", ")}
      WHERE id = $1
        AND workspace_id = $2::uuid
      RETURNING *
      `,
      values
    );

    const transaction = result.rows[0];
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const changedFields = [
      categoryProvided ? "categoryId" : null,
      gstApplicableProvided ? "gstApplicable" : null,
      gstRateProvided ? "gstRate" : null,
      gstAmountProvided ? "gstAmount" : null,
      notesProvided ? "notes" : null
    ].filter((field): field is string => Boolean(field));

    const action =
      changedFields.length === 1 && changedFields[0] === "categoryId"
        ? "transaction.category.patch"
        : "transaction.patch";

    try {
      await db.query(
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
          $3,
          $4,
          'transaction',
          $5,
          $6,
          $7::jsonb,
          $8::jsonb
        )
        `,
        [
          scope.workspaceId,
          scope.businessId,
          actorTypeValue,
          actorId ?? null,
          String(transactionId),
          action,
          JSON.stringify({
            ...beforeState,
            changedFields
          }),
          JSON.stringify(transaction)
        ]
      );
    } catch {
      // Do not fail a transaction update because of audit log insert issues.
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update transaction";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Hard delete is disabled for ledger safety. Use PATCH action=reverse or PATCH action=hide instead."
    },
    { status: 405, headers: { Allow: "GET, PATCH" } }
  );
}
