import { getDbPool } from "@/lib/db";
import type { PoolClient } from "pg";
import {
  CATEGORIZE_V0_VERSION,
  buildCategoryNameIdMap,
  categorizeTransactionV0,
  resolveCategoryIdByCategoryName
} from "@/src/lib/categorizeV0";
import {
  buildHashDescription,
  computeTransactionHash,
  extractAccountHintFromMetadata
} from "@/lib/transaction-hash";

const ALLOWED_DIRECTIONS = new Set(["credit", "debit"] as const);
const ALLOWED_STATUS = new Set(["pending", "posted", "reversed"] as const);
const ALLOWED_ACTOR_TYPES = new Set(["system", "user", "api_key", "job"] as const);

export type TransactionDirection = "credit" | "debit";
export type TransactionStatus = "pending" | "posted" | "reversed";
export type ActorType = "system" | "user" | "api_key" | "job";

export type InsertTransactionInput = {
  businessId: number;
  categoryId?: number | null;
  externalRef?: string | null;
  direction: TransactionDirection;
  amountMinor: number;
  currencyCode?: string;
  occurredAt?: string;
  description?: string | null;
  counterparty?: string | null;
  status?: TransactionStatus;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type TransactionRecord = {
  id: number;
  business_id: number;
  category_id: number | null;
  external_ref: string | null;
  direction: TransactionDirection;
  amount_minor: string;
  currency_code: string;
  occurred_at: string;
  description: string | null;
  counterparty: string | null;
  status: TransactionStatus;
  source: string;
  metadata: Record<string, unknown>;
  is_hidden: boolean;
  hidden_reason: string | null;
  hidden_at: string | null;
  hidden_by: string | null;
  reversal_of_transaction_id: number | null;
  reversed_by_transaction_id: number | null;
  created_at: string;
  updated_at: string;
};

function toCurrencyCode(value?: string): string {
  if (!value) {
    return "INR";
  }

  return value.trim().toUpperCase();
}

function validatePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function oppositeDirection(direction: TransactionDirection): TransactionDirection {
  return direction === "credit" ? "debit" : "credit";
}

function validateActorType(actorType?: ActorType): ActorType {
  if (!actorType) {
    return "system";
  }

  if (!ALLOWED_ACTOR_TYPES.has(actorType)) {
    throw new Error("actorType must be one of: system, user, api_key, job");
  }

  return actorType;
}

async function insertAuditLog(
  client: PoolClient,
  params: {
    businessId: number | null;
    actorType: ActorType;
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    beforeState?: unknown;
    afterState?: unknown;
  }
): Promise<void> {
  await client.query(
    `
    INSERT INTO audit_logs (
      business_id,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
    `,
    [
      params.businessId,
      params.actorType,
      params.actorId ?? null,
      params.entityType,
      params.entityId,
      params.action,
      params.beforeState ? JSON.stringify(params.beforeState) : null,
      params.afterState ? JSON.stringify(params.afterState) : null
    ]
  );
}

function validateInput(input: InsertTransactionInput): void {
  validatePositiveInteger(input.businessId, "businessId");

  if (!ALLOWED_DIRECTIONS.has(input.direction)) {
    throw new Error("direction must be one of: credit, debit");
  }

  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("amountMinor must be a positive integer in minor units (e.g. paise)");
  }

  if (input.categoryId !== undefined && input.categoryId !== null) {
    validatePositiveInteger(input.categoryId, "categoryId");
  }

  if (input.status && !ALLOWED_STATUS.has(input.status)) {
    throw new Error("status must be one of: pending, posted, reversed");
  }

  if (input.status === "reversed") {
    throw new Error("Cannot create a transaction directly with status=reversed");
  }

  if (input.occurredAt && Number.isNaN(Date.parse(input.occurredAt))) {
    throw new Error("occurredAt must be a valid ISO date string");
  }

  const currencyCode = toCurrencyCode(input.currencyCode);
  if (currencyCode.length !== 3) {
    throw new Error("currencyCode must be a 3-letter ISO code");
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type CategoryLookupRow = {
  id: string;
  name: string;
};

export async function insertTransaction(
  input: InsertTransactionInput
): Promise<TransactionRecord> {
  validateInput(input);

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    const baseMetadata = isJsonObject(input.metadata) ? { ...input.metadata } : {};
    const hashDescription = buildHashDescription([
      input.description ?? null,
      input.counterparty ?? null,
      input.externalRef ?? null
    ]);
    const accountHint =
      extractAccountHintFromMetadata(baseMetadata) ?? input.counterparty ?? null;
    const rowHash = computeTransactionHash({
      date: occurredAt,
      amount: input.amountMinor,
      description: hashDescription,
      account: accountHint
    });

    let resolvedCategoryId = input.categoryId ?? null;
    let categorizationMeta: ReturnType<typeof categorizeTransactionV0> | null = null;

    if (resolvedCategoryId === null) {
      const match = categorizeTransactionV0({
        description: input.description ?? null,
        merchant: input.counterparty ?? null,
        reference: input.externalRef ?? null
      });

      if (match.categoryName && match.confidence >= 0.65) {
        const categoryRows = await client.query<CategoryLookupRow>(
          `
          SELECT id::text, name
          FROM categories
          WHERE business_id = $1
          `,
          [input.businessId]
        );

        const categoryMap = buildCategoryNameIdMap(
          categoryRows.rows
            .map((row) => {
              try {
                return { id: BigInt(row.id), name: row.name };
              } catch {
                return null;
              }
            })
            .filter((row): row is { id: bigint; name: string } => Boolean(row))
        );
        const resolved = resolveCategoryIdByCategoryName({
          categoryName: match.categoryName,
          categoryMap
        });

        if (resolved !== null) {
          const numericResolved = Number.parseInt(resolved.toString(), 10);
          if (Number.isInteger(numericResolved) && numericResolved > 0) {
            resolvedCategoryId = numericResolved;
            categorizationMeta = match;
          }
        }
      }
    }

    const metadataPayload: Record<string, unknown> = {
      ...baseMetadata,
      dedupe: {
        ...(isJsonObject(baseMetadata.dedupe) ? baseMetadata.dedupe : {}),
        hash: rowHash,
        formula: "sha256(date|amount|normalized_desc|account)"
      }
    };

    if (categorizationMeta) {
      metadataPayload.categorization = {
        ...(isJsonObject(baseMetadata.categorization) ? baseMetadata.categorization : {}),
        version: CATEGORIZE_V0_VERSION,
        autoTagged: true,
        categoryName: categorizationMeta.categoryName,
        confidence: categorizationMeta.confidence,
        matchedRule: categorizationMeta.matchedRule ?? null,
        tags: categorizationMeta.tags
      };
    }

    const result = await client.query<TransactionRecord>(
      `
      INSERT INTO transactions (
        business_id,
        category_id,
        external_ref,
        direction,
        amount_minor,
        currency_code,
        occurred_at,
        description,
        counterparty,
        status,
        source,
        metadata,
        row_hash
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::timestamptz,
        $8,
        $9,
        COALESCE($10, 'posted'),
        COALESCE($11, 'manual'),
        COALESCE($12::jsonb, '{}'::jsonb),
        $13
      )
      RETURNING *
      `,
      [
        input.businessId,
        resolvedCategoryId,
        input.externalRef ?? null,
        input.direction,
        input.amountMinor,
        toCurrencyCode(input.currencyCode),
        occurredAt.toISOString(),
        input.description ?? null,
        input.counterparty ?? null,
        input.status ?? null,
        input.source ?? null,
        JSON.stringify(metadataPayload),
        rowHash
      ]
    );

    if (!result.rows[0]) {
      throw new Error("Failed to insert transaction");
    }

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    const errorCode = (error as { code?: string } | null)?.code;
    const constraintName = (error as { constraint?: string } | null)?.constraint ?? "";

    if (
      errorCode === "23505" &&
      (constraintName === "transactions_workspace_hash_uniq" ||
        constraintName === "transactions_workspace_rowhash_uniq" ||
        constraintName === "transactions_business_rowhash_uniq")
    ) {
      throw new Error("Duplicate transaction hash detected for this workspace");
    }

    throw error;
  } finally {
    client.release();
  }
}

export type QueryTransactionsOptions = {
  businessId: number;
  limit?: number;
  direction?: TransactionDirection;
  status?: TransactionStatus;
  includeDeleted?: boolean;
  // Backward-compatible alias for includeDeleted.
  includeHidden?: boolean;
};

function shouldIncludeDeleted(options: {
  includeDeleted?: boolean;
  includeHidden?: boolean;
}): boolean {
  if (options.includeDeleted !== undefined) {
    return options.includeDeleted;
  }

  if (options.includeHidden !== undefined) {
    return options.includeHidden;
  }

  return false;
}

export async function queryTransactionsByBusiness(
  options: QueryTransactionsOptions
): Promise<TransactionRecord[]> {
  validatePositiveInteger(options.businessId, "businessId");

  const limit = options.limit ?? 50;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 200) {
    throw new Error("limit must be an integer between 1 and 200");
  }

  const values: Array<number | string> = [options.businessId];
  const filters: string[] = ["business_id = $1"];

  if (!shouldIncludeDeleted(options)) {
    filters.push("is_hidden = FALSE");
  }

  if (options.direction) {
    if (!ALLOWED_DIRECTIONS.has(options.direction)) {
      throw new Error("direction must be one of: credit, debit");
    }

    values.push(options.direction);
    filters.push(`direction = $${values.length}`);
  }

  if (options.status) {
    if (!ALLOWED_STATUS.has(options.status)) {
      throw new Error("status must be one of: pending, posted, reversed");
    }

    values.push(options.status);
    filters.push(`status = $${values.length}`);
  }

  values.push(limit);
  const pool = getDbPool();

  const result = await pool.query<TransactionRecord>(
    `
    SELECT *
    FROM transactions
    WHERE ${filters.join(" AND ")}
    ORDER BY occurred_at DESC, id DESC
    LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
}

export async function getTransactionById(options: {
  businessId: number;
  workspaceId?: string;
  transactionId: number;
  includeDeleted?: boolean;
  // Backward-compatible alias for includeDeleted.
  includeHidden?: boolean;
}): Promise<TransactionRecord> {
  validatePositiveInteger(options.businessId, "businessId");
  validatePositiveInteger(options.transactionId, "transactionId");

  const values: Array<number | string> = [options.transactionId, options.businessId];
  let workspaceClause = "";
  if (options.workspaceId) {
    values.push(options.workspaceId);
    workspaceClause = ` AND workspace_id = $${values.length}::uuid`;
  }

  let hiddenClause = "";

  if (!shouldIncludeDeleted(options)) {
    hiddenClause = " AND is_hidden = FALSE";
  }

  const pool = getDbPool();
  const result = await pool.query<TransactionRecord>(
    `
    SELECT *
    FROM transactions
    WHERE id = $1
      AND business_id = $2
      ${workspaceClause}
      ${hiddenClause}
    LIMIT 1
    `,
    values
  );

  const transaction = result.rows[0];
  if (!transaction) {
    throw new Error("Transaction not found");
  }

  return transaction;
}

export type ReportingPolicy = "strict_ledger" | "ui_ledger";

export type TransactionReportingSummary = {
  policy: ReportingPolicy;
  totals: {
    creditMinor: string;
    debitMinor: string;
    netMinor: string;
  };
  excluded: {
    softDeletedCount: number;
    softDeletedNetMinor: string;
    badImportCount: number;
    badImportNetMinor: string;
  };
  range: {
    fromDate?: string;
    toDate?: string;
  };
};

type TransactionReportQueryRow = {
  strict_credit_minor: string;
  strict_debit_minor: string;
  strict_net_minor: string;
  ui_credit_minor: string;
  ui_debit_minor: string;
  ui_net_minor: string;
  excluded_soft_deleted_net_minor: string;
  excluded_bad_import_net_minor: string;
  soft_deleted_count: number;
  bad_import_count: number;
};

export async function getTransactionReportingSummary(options: {
  businessId: number;
  workspaceId?: string;
  policy?: ReportingPolicy;
  fromDate?: string;
  toDate?: string;
}): Promise<TransactionReportingSummary> {
  validatePositiveInteger(options.businessId, "businessId");

  if (options.fromDate && Number.isNaN(Date.parse(options.fromDate))) {
    throw new Error("fromDate must be a valid ISO date string");
  }

  if (options.toDate && Number.isNaN(Date.parse(options.toDate))) {
    throw new Error("toDate must be a valid ISO date string");
  }

  const policy = options.policy ?? "strict_ledger";
  if (policy !== "strict_ledger" && policy !== "ui_ledger") {
    throw new Error("policy must be one of: strict_ledger, ui_ledger");
  }

  const badImportCondition = `
    is_hidden = TRUE
    AND (
      COALESCE(hidden_reason, '') ILIKE '%bad import%'
      OR COALESCE(hidden_reason, '') ILIKE '%bad_import%'
      OR COALESCE(hidden_reason, '') ILIKE '%invalid import%'
    )
  `;

  const values: Array<number | string> = [];
  const filters: string[] = ["status <> 'pending'"];

  if (options.workspaceId) {
    values.push(options.workspaceId);
    filters.push(`workspace_id = $${values.length}::uuid`);
  } else {
    values.push(options.businessId);
    filters.push(`business_id = $${values.length}`);
  }

  if (options.fromDate) {
    values.push(options.fromDate);
    filters.push(`occurred_at >= $${values.length}::timestamptz`);
  }

  if (options.toDate) {
    values.push(options.toDate);
    filters.push(`occurred_at <= $${values.length}::timestamptz`);
  }

  const pool = getDbPool();
  const result = await pool.query<TransactionReportQueryRow>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS strict_credit_minor,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS strict_debit_minor,
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END), 0)::text AS strict_net_minor,
      COALESCE(SUM(CASE WHEN is_hidden = FALSE AND direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS ui_credit_minor,
      COALESCE(SUM(CASE WHEN is_hidden = FALSE AND direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS ui_debit_minor,
      COALESCE(SUM(CASE WHEN is_hidden = FALSE AND direction = 'credit' THEN amount_minor WHEN is_hidden = FALSE AND direction = 'debit' THEN -amount_minor ELSE 0 END), 0)::text AS ui_net_minor,
      COALESCE(SUM(CASE WHEN is_hidden = TRUE AND direction = 'credit' THEN amount_minor WHEN is_hidden = TRUE AND direction = 'debit' THEN -amount_minor ELSE 0 END), 0)::text AS excluded_soft_deleted_net_minor,
      COALESCE(SUM(CASE WHEN ${badImportCondition} AND direction = 'credit' THEN amount_minor WHEN ${badImportCondition} AND direction = 'debit' THEN -amount_minor ELSE 0 END), 0)::text AS excluded_bad_import_net_minor,
      COUNT(*) FILTER (WHERE is_hidden = TRUE)::int AS soft_deleted_count,
      COUNT(*) FILTER (WHERE ${badImportCondition})::int AS bad_import_count
    FROM transactions
    WHERE ${filters.join(" AND ")}
    `,
    values
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to compute transaction report summary");
  }

  const totals =
    policy === "strict_ledger"
      ? {
          creditMinor: row.strict_credit_minor,
          debitMinor: row.strict_debit_minor,
          netMinor: row.strict_net_minor
        }
      : {
          creditMinor: row.ui_credit_minor,
          debitMinor: row.ui_debit_minor,
          netMinor: row.ui_net_minor
        };

  return {
    policy,
    totals,
    excluded: {
      softDeletedCount: row.soft_deleted_count,
      softDeletedNetMinor: row.excluded_soft_deleted_net_minor,
      badImportCount: row.bad_import_count,
      badImportNetMinor: row.excluded_bad_import_net_minor
    },
    range: {
      fromDate: options.fromDate,
      toDate: options.toDate
    }
  };
}

export type SetTransactionVisibilityInput = {
  businessId: number;
  workspaceId?: string;
  transactionId: number;
  hidden: boolean;
  reason?: string;
  actorType?: ActorType;
  actorId?: string;
};

export async function setTransactionVisibility(
  input: SetTransactionVisibilityInput
): Promise<TransactionRecord> {
  validatePositiveInteger(input.businessId, "businessId");
  validatePositiveInteger(input.transactionId, "transactionId");

  if (input.hidden && (!input.reason || !input.reason.trim())) {
    throw new Error("reason is required when hiding a transaction");
  }

  const actorType = validateActorType(input.actorType);
  const actorId = input.actorId?.trim() || null;

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const selectValues: Array<number | string> = [input.transactionId, input.businessId];
    let selectWorkspaceClause = "";
    if (input.workspaceId) {
      selectValues.push(input.workspaceId);
      selectWorkspaceClause = ` AND workspace_id = $${selectValues.length}::uuid`;
    }

    const beforeResult = await client.query<TransactionRecord>(
      `
      SELECT *
      FROM transactions
      WHERE id = $1 AND business_id = $2
      ${selectWorkspaceClause}
      FOR UPDATE
      `,
      selectValues
    );

    const before = beforeResult.rows[0];
    if (!before) {
      throw new Error("Transaction not found");
    }

    const updateValues: Array<number | string | boolean | null> = [
      input.transactionId,
      input.businessId,
      input.hidden,
      input.reason?.trim() ?? null,
      actorId
    ];
    let updateWorkspaceClause = "";
    if (input.workspaceId) {
      updateValues.push(input.workspaceId);
      updateWorkspaceClause = ` AND workspace_id = $${updateValues.length}::uuid`;
    }

    const updatedResult = await client.query<TransactionRecord>(
      `
      UPDATE transactions
      SET
        is_hidden = $3,
        hidden_reason = CASE WHEN $3 THEN $4 ELSE NULL END,
        hidden_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
        hidden_by = CASE WHEN $3 THEN COALESCE($5, 'system') ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1 AND business_id = $2
        ${updateWorkspaceClause}
      RETURNING *
      `,
      updateValues
    );

    const updated = updatedResult.rows[0];
    if (!updated) {
      throw new Error("Transaction not found");
    }

    await insertAuditLog(client, {
      businessId: input.businessId,
      actorType,
      actorId,
      entityType: "transaction",
      entityId: String(input.transactionId),
      action: input.hidden ? "soft_hide" : "unhide",
      beforeState: before,
      afterState: updated
    });

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type CreateReversalInput = {
  businessId: number;
  workspaceId?: string;
  transactionId: number;
  reason: string;
  actorType?: ActorType;
  actorId?: string;
  markOriginalReversed?: boolean;
  occurredAt?: string;
  source?: string;
};

export type ReversalResult = {
  original: TransactionRecord;
  reversal: TransactionRecord;
};

export async function createReversalTransaction(
  input: CreateReversalInput
): Promise<ReversalResult> {
  validatePositiveInteger(input.businessId, "businessId");
  validatePositiveInteger(input.transactionId, "transactionId");

  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error("reason is required to create a reversal transaction");
  }

  if (input.occurredAt && Number.isNaN(Date.parse(input.occurredAt))) {
    throw new Error("occurredAt must be a valid ISO date string");
  }

  const actorType = validateActorType(input.actorType);
  const actorId = input.actorId?.trim() || null;
  const markOriginalReversed = input.markOriginalReversed ?? true;

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const originalValues: Array<number | string> = [input.transactionId, input.businessId];
    let originalWorkspaceClause = "";
    if (input.workspaceId) {
      originalValues.push(input.workspaceId);
      originalWorkspaceClause = ` AND workspace_id = $${originalValues.length}::uuid`;
    }

    const originalResult = await client.query<TransactionRecord>(
      `
      SELECT *
      FROM transactions
      WHERE id = $1 AND business_id = $2
      ${originalWorkspaceClause}
      FOR UPDATE
      `,
      originalValues
    );

    const original = originalResult.rows[0];

    if (!original) {
      throw new Error("Transaction not found");
    }

    if (original.status !== "posted") {
      throw new Error("Only posted transactions can be reversed");
    }

    if (original.reversed_by_transaction_id) {
      throw new Error("Transaction is already reversed");
    }

    if (original.reversal_of_transaction_id) {
      throw new Error("Cannot reverse a reversal transaction directly");
    }

    const reversalResult = await client.query<TransactionRecord>(
      `
      INSERT INTO transactions (
        business_id,
        workspace_id,
        category_id,
        direction,
        amount_minor,
        currency_code,
        occurred_at,
        description,
        counterparty,
        status,
        source,
        metadata,
        reversal_of_transaction_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        COALESCE($7::timestamptz, NOW()),
        $8,
        $9,
        'posted',
        COALESCE($10, 'reversal'),
        $11::jsonb,
        $12
      )
      RETURNING *
      `,
      [
        original.business_id,
        input.workspaceId ?? null,
        original.category_id,
        oppositeDirection(original.direction),
        Number(original.amount_minor),
        original.currency_code,
        input.occurredAt ?? null,
        `Reversal of transaction #${original.id}: ${reason}`,
        original.counterparty,
        input.source ?? null,
        JSON.stringify({
          reason,
          reversedTransactionId: original.id,
          originalMetadata: original.metadata
        }),
        original.id
      ]
    );

    const reversal = reversalResult.rows[0];

    if (!reversal) {
      throw new Error("Failed to create reversal transaction");
    }

    let updatedOriginal = original;

    if (markOriginalReversed) {
      const markValues: Array<number | string> = [original.id, original.business_id, reversal.id];
      let markWorkspaceClause = "";
      if (input.workspaceId) {
        markValues.push(input.workspaceId);
        markWorkspaceClause = ` AND workspace_id = $${markValues.length}::uuid`;
      }

      const updatedOriginalResult = await client.query<TransactionRecord>(
        `
        UPDATE transactions
        SET
          status = 'reversed',
          reversed_by_transaction_id = $3,
          updated_at = NOW()
        WHERE id = $1 AND business_id = $2
          ${markWorkspaceClause}
        RETURNING *
        `,
        markValues
      );

      const row = updatedOriginalResult.rows[0];
      if (!row) {
        throw new Error("Failed to mark original transaction as reversed");
      }

      updatedOriginal = row;
    }

    await insertAuditLog(client, {
      businessId: original.business_id,
      actorType,
      actorId,
      entityType: "transaction",
      entityId: String(reversal.id),
      action: "create_reversal",
      beforeState: null,
      afterState: reversal
    });

    if (markOriginalReversed) {
      await insertAuditLog(client, {
        businessId: original.business_id,
        actorType,
        actorId,
        entityType: "transaction",
        entityId: String(original.id),
        action: "mark_reversed",
        beforeState: original,
        afterState: updatedOriginal
      });
    }

    await client.query("COMMIT");

    return {
      original: updatedOriginal,
      reversal
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
