import type { PoolClient } from "pg";
import { getDbPool } from "@/lib/db";
import { writeAuditLogSafe } from "@/lib/audit-log";
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

type CategoryRow = {
  id: string;
  name: string;
};

type TransactionRow = {
  id: string;
  business_id: string;
  occurred_at: string;
  amount_minor: string;
  description: string | null;
  counterparty: string | null;
  external_ref: string | null;
  category_id: string | null;
  metadata: unknown;
};

type DuplicateAlertFingerprintRow = {
  fingerprint: string | null;
};

type CountRow = {
  count: string;
};

type CoverageRow = {
  total: string;
  tagged: string;
};

const HASH_FORMULA = "sha256(date|amount|normalized_desc|account)";

export type ApplyRulesV0Input = {
  workspaceId: string;
  businessId: number;
  limit?: number;
  confidenceThreshold?: number;
  includeDeleted?: boolean;
};

export type ApplyRulesV0Result = {
  scanned: number;
  updated: number;
  tagged: number;
  duplicateSuggestionsCreated: number;
  duplicateSuggestionsOpen: number;
  coverage: {
    total: number;
    tagged: number;
    ratio: number;
  };
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildDuplicateFingerprint(hash: string, transactionIds: number[]): string {
  const sorted = [...transactionIds].sort((a, b) => a - b);
  return `dup:${hash}:${sorted.join(",")}`;
}

async function resolveExistingDuplicateFingerprints(
  client: PoolClient,
  workspaceId: string
): Promise<Set<string>> {
  const result = await client.query<DuplicateAlertFingerprintRow>(
    `
    SELECT payload->>'fingerprint' AS fingerprint
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND type = 'duplicate'
      AND status IN ('open', 'snoozed')
    `,
    [workspaceId]
  );

  return new Set(
    result.rows
      .map((row) => row.fingerprint)
      .filter((fingerprint): fingerprint is string => Boolean(fingerprint))
  );
}

export async function applyRulesV0ForWorkspace(
  input: ApplyRulesV0Input
): Promise<ApplyRulesV0Result> {
  const limit = input.limit ?? 1000;
  const confidenceThreshold = input.confidenceThreshold ?? 0.65;
  const includeDeleted = input.includeDeleted ?? false;

  if (!Number.isInteger(limit) || limit <= 0 || limit > 10_000) {
    throw new Error("limit must be an integer between 1 and 10000");
  }

  if (confidenceThreshold < 0 || confidenceThreshold > 1) {
    throw new Error("confidenceThreshold must be between 0 and 1");
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const categoriesResult = await client.query<CategoryRow>(
      `
      SELECT id::text, name
      FROM categories
      WHERE workspace_id = $1::uuid
      `,
      [input.workspaceId]
    );

    const categoryMap = buildCategoryNameIdMap(
      categoriesResult.rows
        .map((row) => {
          try {
            return { id: BigInt(row.id), name: row.name };
          } catch {
            return null;
          }
        })
        .filter((row): row is { id: bigint; name: string } => Boolean(row))
    );

    const visibilityFilter = includeDeleted ? "" : "AND t.is_hidden = FALSE";
    const transactionsResult = await client.query<TransactionRow>(
      `
      SELECT
        t.id::text,
        t.business_id::text,
        t.occurred_at::text,
        t.amount_minor::text,
        t.description,
        t.counterparty,
        t.external_ref,
        t.category_id::text,
        t.metadata
      FROM transactions t
      WHERE t.workspace_id = $1::uuid
        AND t.status IN ('posted', 'reversed')
        ${visibilityFilter}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $2
      `,
      [input.workspaceId, limit]
    );

    let tagged = 0;
    let updated = 0;
    const hashGroups = new Map<string, number[]>();

    for (const row of transactionsResult.rows) {
      const id = toPositiveInt(row.id);
      if (id === null) {
        continue;
      }

      const categoryResult = categorizeTransactionV0({
        description: row.description,
        merchant: row.counterparty,
        reference: row.external_ref
      });
      const matchedCategoryId = categoryResult.categoryName
        ? resolveCategoryIdByCategoryName({
            categoryName: categoryResult.categoryName,
            categoryMap
          })
        : null;

      const normalizedDescription = buildHashDescription([
        row.description,
        row.counterparty,
        row.external_ref
      ]);
      const accountHint =
        extractAccountHintFromMetadata(row.metadata) ?? row.counterparty ?? null;
      const rowHash = computeTransactionHash({
        date: row.occurred_at,
        amount: row.amount_minor,
        description: normalizedDescription,
        account: accountHint
      });

      const grouped = hashGroups.get(rowHash) ?? [];
      grouped.push(id);
      hashGroups.set(rowHash, grouped);

      const existingMetadata = isJsonObject(row.metadata) ? row.metadata : {};
      const existingDedupe = isJsonObject(existingMetadata.dedupe)
        ? existingMetadata.dedupe
        : {};
      const existingCategorization = isJsonObject(existingMetadata.categorization)
        ? existingMetadata.categorization
        : {};

      const nextMetadata: Record<string, unknown> = {
        ...existingMetadata,
        dedupe: {
          ...existingDedupe,
          hash: rowHash,
          formula: HASH_FORMULA
        }
      };

      const shouldWriteCategorization =
        Boolean(categoryResult.categoryName) && categoryResult.confidence >= confidenceThreshold;
      if (shouldWriteCategorization) {
        nextMetadata.categorization = {
          ...existingCategorization,
          version: CATEGORIZE_V0_VERSION,
          autoTagged: matchedCategoryId !== null,
          categoryName: categoryResult.categoryName,
          confidence: categoryResult.confidence,
          matchedRule: categoryResult.matchedRule ?? null,
          tags: categoryResult.tags
        };
      }

      const metadataChanged =
        JSON.stringify(existingMetadata) !== JSON.stringify(nextMetadata);
      const shouldTag =
        row.category_id === null &&
        matchedCategoryId !== null &&
        categoryResult.confidence >= confidenceThreshold;

      if (!metadataChanged && !shouldTag) {
        continue;
      }

      const values: Array<string | null> = [String(id), JSON.stringify(nextMetadata), input.workspaceId];
      const setClauses = ["metadata = $2::jsonb", "updated_at = NOW()"];

      if (shouldTag && matchedCategoryId !== null) {
        values.push(matchedCategoryId.toString());
        setClauses.push(`category_id = $${values.length}`);
        values.push(categoryResult.confidence.toString());
        setClauses.push(`confidence = $${values.length}::numeric`);
        tagged += 1;
      }

      await client.query(
        `
        UPDATE transactions
        SET ${setClauses.join(", ")}
        WHERE id = $1::bigint
          AND workspace_id = $3::uuid
        `,
        values
      );
      updated += 1;

      if (shouldTag && matchedCategoryId !== null) {
        await writeAuditLogSafe(
          {
            workspaceId: input.workspaceId,
            businessId: row.business_id,
            actorType: "system",
            actorId: "trail_rules_v0",
            entityType: "transaction",
            entityId: row.id,
            action: "trail.transaction.auto_categorized",
            beforeState: {
              categoryId: row.category_id,
              confidence: null
            },
            afterState: {
              categoryId: matchedCategoryId.toString(),
              confidence: categoryResult.confidence,
              matchedRule: categoryResult.matchedRule ?? null,
              modelVersion: CATEGORIZE_V0_VERSION,
              evidence: {
                transactionIds: [id],
                source: "rules_engine_v0",
                description: row.description,
                counterparty: row.counterparty,
                externalRef: row.external_ref
              }
            }
          },
          client
        );
      }
    }

    const duplicateCandidates = [...hashGroups.entries()]
      .map(([hash, ids]) => ({
        hash,
        ids: [...new Set(ids)].sort((a, b) => a - b)
      }))
      .filter((entry) => entry.ids.length > 1);
    const activeFingerprints = duplicateCandidates.map((entry) =>
      buildDuplicateFingerprint(entry.hash, entry.ids)
    );

    const existingFingerprints = await resolveExistingDuplicateFingerprints(
      client,
      input.workspaceId
    );
    let duplicateSuggestionsCreated = 0;

    for (const candidate of duplicateCandidates) {
      const fingerprint = buildDuplicateFingerprint(candidate.hash, candidate.ids);
      if (existingFingerprints.has(fingerprint)) {
        continue;
      }

      await client.query(
        `
        INSERT INTO alerts (
          business_id,
          workspace_id,
          transaction_id,
          alert_type,
          type,
          severity,
          status,
          message,
          title,
          body,
          related_transaction_ids,
          payload
        )
        VALUES (
          $1,
          $2::uuid,
          $3,
          'duplicate',
          'duplicate',
          'warning',
          'open',
          'Potential duplicate transaction detected by rules engine.',
          'Auto-clean suggestion: potential duplicate',
          $4,
          $5::jsonb,
          $6::jsonb
        )
        `,
        [
          input.businessId,
          input.workspaceId,
          candidate.ids[0],
          `${candidate.ids.length} transaction(s) share the same hash. Action: Merge / Ignore.`,
          JSON.stringify(candidate.ids),
          JSON.stringify({
            source: "rules_engine_v0",
            fingerprint,
            hash: candidate.hash,
            suggestedAction: "merge",
            suggestedKeepTransactionId: candidate.ids[0] ?? null
          })
        ]
      );

      existingFingerprints.add(fingerprint);
      duplicateSuggestionsCreated += 1;
    }

    if (activeFingerprints.length > 0) {
      await client.query(
        `
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
        WHERE workspace_id = $1::uuid
          AND type = 'duplicate'
          AND status = 'open'
          AND COALESCE(payload->>'source', '') = 'rules_engine_v0'
          AND COALESCE(payload->>'fingerprint', '') <> ''
          AND NOT ((payload->>'fingerprint') = ANY($2::text[]))
        `,
        [
          input.workspaceId,
          activeFingerprints,
          JSON.stringify({
            resolution: {
              action: "auto_resolve",
              reason: "duplicate group no longer active"
            }
          })
        ]
      );
    } else {
      await client.query(
        `
        UPDATE alerts
        SET
          status = 'resolved',
          resolved_at = NOW(),
          payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
        WHERE workspace_id = $1::uuid
          AND type = 'duplicate'
          AND status = 'open'
          AND COALESCE(payload->>'source', '') = 'rules_engine_v0'
        `,
        [
          input.workspaceId,
          JSON.stringify({
            resolution: {
              action: "auto_resolve",
              reason: "no active duplicate groups"
            }
          })
        ]
      );
    }

    const openDuplicateResult = await client.query<CountRow>(
      `
      SELECT COUNT(*)::text AS count
      FROM alerts
      WHERE workspace_id = $1::uuid
        AND type = 'duplicate'
        AND status = 'open'
      `,
      [input.workspaceId]
    );
    const duplicateSuggestionsOpen = Number(openDuplicateResult.rows[0]?.count ?? "0");

    const coverageResult = await client.query<CoverageRow>(
      `
      SELECT
        COUNT(*) FILTER (WHERE is_hidden = FALSE)::text AS total,
        COUNT(*) FILTER (WHERE is_hidden = FALSE AND category_id IS NOT NULL)::text AS tagged
      FROM transactions
      WHERE workspace_id = $1::uuid
      `,
      [input.workspaceId]
    );
    const coverageTotal = Number(coverageResult.rows[0]?.total ?? "0");
    const coverageTagged = Number(coverageResult.rows[0]?.tagged ?? "0");

    await client.query("COMMIT");

    return {
      scanned: transactionsResult.rows.length,
      updated,
      tagged,
      duplicateSuggestionsCreated,
      duplicateSuggestionsOpen,
      coverage: {
        total: coverageTotal,
        tagged: coverageTagged,
        ratio: coverageTotal > 0 ? coverageTagged / coverageTotal : 0
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
